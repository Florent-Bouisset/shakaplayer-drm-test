/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import log from "../../../../log";
import { SUPPORTED_ADAPTATIONS_TYPE } from "../../../../manifest";
import arrayFind from "../../../../utils/array_find";
import arrayFindIndex from "../../../../utils/array_find_index";
import arrayIncludes from "../../../../utils/array_includes";
import isNonEmptyString from "../../../../utils/is_non_empty_string";
import isNullOrUndefined from "../../../../utils/is_null_or_undefined";
import attachTrickModeTrack from "./attach_trickmode_track";
import inferAdaptationType, { getThumbnailAdaptationSetInfo, } from "./infer_adaptation_type";
import parseRepresentations from "./parse_representations";
import resolveBaseURLs from "./resolve_base_urls";
/**
 * Detect if the accessibility given defines an adaptation for the visually
 * impaired.
 * Based on DVB Document A168 (DVB-DASH) and DASH-IF 4.3.
 * @param {Object} accessibility
 * @returns {Boolean}
 */
function isVisuallyImpaired(accessibility) {
    if (accessibility === undefined) {
        return false;
    }
    const isVisuallyImpairedAudioDvbDash = accessibility.schemeIdUri === "urn:tva:metadata:cs:AudioPurposeCS:2007" &&
        accessibility.value === "1";
    const isVisuallyImpairedDashIf = accessibility.schemeIdUri === "urn:mpeg:dash:role:2011" &&
        accessibility.value === "description";
    return isVisuallyImpairedAudioDvbDash || isVisuallyImpairedDashIf;
}
/**
 * Detect if the accessibility given defines an adaptation for the hard of
 * hearing.
 * Based on DVB Document A168 (DVB-DASH) and DASH specification.
 * @param {Array.<Object>} accessibilities
 * @param {Array.<Object>} roles
 * @returns {Boolean}
 */
function isCaptionning(accessibilities, roles) {
    if (accessibilities !== undefined) {
        const hasDvbClosedCaptionSignaling = accessibilities.some((accessibility) => accessibility.schemeIdUri === "urn:tva:metadata:cs:AudioPurposeCS:2007" &&
            accessibility.value === "2");
        if (hasDvbClosedCaptionSignaling) {
            return true;
        }
    }
    if (roles !== undefined) {
        const hasDashCaptionSinaling = roles.some((role) => role.schemeIdUri === "urn:mpeg:dash:role:2011" && role.value === "caption");
        if (hasDashCaptionSinaling) {
            return true;
        }
    }
    return false;
}
/**
 * Detect if the accessibility given defines an AdaptationSet containing a sign
 * language interpretation.
 * Based on DASH-IF 4.3.
 * @param {Object} accessibility
 * @returns {Boolean}
 */
function hasSignLanguageInterpretation(accessibility) {
    if (accessibility === undefined) {
        return false;
    }
    return (accessibility.schemeIdUri === "urn:mpeg:dash:role:2011" &&
        accessibility.value === "sign");
}
/**
 * Contruct Adaptation ID from the information we have.
 * @param {Object} adaptation
 * @param {Object} infos
 * @returns {string}
 */
function getAdaptationID(adaptation, infos) {
    if (isNonEmptyString(adaptation.attributes.id)) {
        return adaptation.attributes.id;
    }
    const { isClosedCaption, isForcedSubtitle, isAudioDescription, isSignInterpreted, isTrickModeTrack, type, } = infos;
    let idString = type;
    if (isNonEmptyString(adaptation.attributes.language)) {
        idString += `-${adaptation.attributes.language}`;
    }
    if (isClosedCaption === true) {
        idString += "-cc";
    }
    if (isForcedSubtitle === true) {
        idString += "-cc";
    }
    if (isAudioDescription === true) {
        idString += "-ad";
    }
    if (isSignInterpreted === true) {
        idString += "-si";
    }
    if (isTrickModeTrack) {
        idString += "-trickMode";
    }
    if (isNonEmptyString(adaptation.attributes.contentType)) {
        idString += `-${adaptation.attributes.contentType}`;
    }
    if (isNonEmptyString(adaptation.attributes.codecs)) {
        idString += `-${adaptation.attributes.codecs}`;
    }
    if (isNonEmptyString(adaptation.attributes.mimeType)) {
        idString += `-${adaptation.attributes.mimeType}`;
    }
    if (adaptation.attributes.frameRate !== undefined) {
        idString += `-${String(adaptation.attributes.frameRate)}`;
    }
    return idString;
}
/**
 * Returns a list of ID this adaptation can be seamlessly switched to
 * @param {Object} adaptation
 * @returns {Array.<string>}
 */
function getAdaptationSetSwitchingIDs(adaptation) {
    if (!isNullOrUndefined(adaptation.children.supplementalProperties)) {
        const { supplementalProperties } = adaptation.children;
        for (const supplementalProperty of supplementalProperties) {
            if (supplementalProperty.schemeIdUri ===
                "urn:mpeg:dash:adaptation-set-switching:2016" &&
                !isNullOrUndefined(supplementalProperty.value)) {
                return supplementalProperty.value
                    .split(",")
                    .map((id) => id.trim())
                    .filter((id) => isNonEmptyString(id));
            }
        }
    }
    return [];
}
/**
 * Process AdaptationSets intermediate representations to return under its final
 * form.
 * Note that the AdaptationSets returned are sorted by priority (from the most
 * priority to the least one).
 * @param {Array.<Object>} adaptationsIR
 * @param {Object} context
 * @returns {Array.<Object>}
 */
export default function parseAdaptationSets(adaptationsIR, context) {
    var _a, _b, _c, _d, _e, _f, _g;
    const parsedAdaptations = { video: [], audio: [], text: [] };
    const parsedThumbnailTracks = [];
    const trickModeAdaptations = [];
    const adaptationSwitchingInfos = {};
    const parsedAdaptationsIDs = [];
    for (let adaptationIdx = 0; adaptationIdx < adaptationsIR.length; adaptationIdx++) {
        const adaptation = adaptationsIR[adaptationIdx];
        const adaptationChildren = adaptation.children;
        const { essentialProperties, roles, label } = adaptationChildren;
        const isMainAdaptation = Array.isArray(roles) &&
            roles.some((role) => role.value === "main") &&
            roles.some((role) => role.schemeIdUri === "urn:mpeg:dash:role:2011");
        const representationsIR = adaptation.children.representations;
        const availabilityTimeComplete = (_a = adaptation.attributes.availabilityTimeComplete) !== null && _a !== void 0 ? _a : context.availabilityTimeComplete;
        let availabilityTimeOffset;
        if (adaptation.attributes.availabilityTimeOffset !== undefined ||
            context.availabilityTimeOffset !== undefined) {
            availabilityTimeOffset =
                ((_b = adaptation.attributes.availabilityTimeOffset) !== null && _b !== void 0 ? _b : 0) +
                    ((_c = context.availabilityTimeOffset) !== null && _c !== void 0 ? _c : 0);
        }
        const type = inferAdaptationType(adaptation, representationsIR);
        if (type === undefined) {
            continue;
        }
        const priority = (_d = adaptation.attributes.selectionPriority) !== null && _d !== void 0 ? _d : 1;
        const originalID = adaptation.attributes.id;
        const adaptationSetSwitchingIDs = getAdaptationSetSwitchingIDs(adaptation);
        const parentSegmentTemplates = [];
        if (context.segmentTemplate !== undefined) {
            parentSegmentTemplates.push(context.segmentTemplate);
        }
        if (adaptation.children.segmentTemplate !== undefined) {
            parentSegmentTemplates.push(adaptation.children.segmentTemplate);
        }
        const reprCtxt = {
            availabilityTimeComplete,
            availabilityTimeOffset,
            baseURLs: resolveBaseURLs(context.baseURLs, adaptationChildren.baseURLs),
            contentProtectionParser: context.contentProtectionParser,
            manifestBoundsCalculator: context.manifestBoundsCalculator,
            end: context.end,
            isDynamic: context.isDynamic,
            isLastPeriod: context.isLastPeriod,
            manifestProfiles: context.manifestProfiles,
            parentSegmentTemplates,
            receivedTime: context.receivedTime,
            start: context.start,
            unsafelyBaseOnPreviousAdaptation: null,
        };
        const trickModeProperty = Array.isArray(essentialProperties)
            ? arrayFind(essentialProperties, (scheme) => {
                return scheme.schemeIdUri === "http://dashif.org/guidelines/trickmode";
            })
            : undefined;
        const trickModeAttachedAdaptationIds = (_e = trickModeProperty === null || trickModeProperty === void 0 ? void 0 : trickModeProperty.value) === null || _e === void 0 ? void 0 : _e.split(" ");
        const isTrickModeTrack = trickModeAttachedAdaptationIds !== undefined;
        const { accessibilities } = adaptationChildren;
        let isDub;
        if (roles !== undefined && roles.some((role) => role.value === "dub")) {
            isDub = true;
        }
        let isClosedCaption;
        if (type !== "text") {
            isClosedCaption = false;
        }
        else {
            isClosedCaption = isCaptionning(accessibilities, roles);
        }
        let isForcedSubtitle;
        if (type === "text" &&
            roles !== undefined &&
            roles.some((role) => role.value === "forced-subtitle" || role.value === "forced_subtitle")) {
            isForcedSubtitle = true;
        }
        let isAudioDescription;
        if (type !== "audio") {
            isAudioDescription = false;
        }
        else if (accessibilities !== undefined) {
            isAudioDescription = accessibilities.some(isVisuallyImpaired);
        }
        let isSignInterpreted;
        if (type !== "video") {
            isSignInterpreted = false;
        }
        else if (accessibilities !== undefined) {
            isSignInterpreted = accessibilities.some(hasSignLanguageInterpretation);
        }
        let adaptationID = getAdaptationID(adaptation, {
            isAudioDescription,
            isForcedSubtitle,
            isClosedCaption,
            isSignInterpreted,
            isTrickModeTrack,
            type,
        });
        // Avoid duplicate IDs
        while (arrayIncludes(parsedAdaptationsIDs, adaptationID)) {
            adaptationID += "-dup";
        }
        const newID = adaptationID;
        parsedAdaptationsIDs.push(adaptationID);
        reprCtxt.unsafelyBaseOnPreviousAdaptation =
            (_g = (_f = context.unsafelyBaseOnPreviousPeriod) === null || _f === void 0 ? void 0 : _f.getAdaptation(adaptationID)) !== null && _g !== void 0 ? _g : null;
        const representations = parseRepresentations(representationsIR, adaptation, reprCtxt);
        if (type === "thumbnails") {
            const track = createThumbnailTracks(adaptation, representations);
            if (track !== null) {
                parsedThumbnailTracks.push(...track);
            }
            continue;
        }
        const parsedAdaptationSet = {
            id: adaptationID,
            representations,
            type,
            isTrickModeTrack,
        };
        if (!isNullOrUndefined(adaptation.attributes.language)) {
            parsedAdaptationSet.language = adaptation.attributes.language;
        }
        if (!isNullOrUndefined(isClosedCaption)) {
            parsedAdaptationSet.closedCaption = isClosedCaption;
        }
        if (!isNullOrUndefined(isAudioDescription)) {
            parsedAdaptationSet.audioDescription = isAudioDescription;
        }
        if (isDub === true) {
            parsedAdaptationSet.isDub = true;
        }
        if (isForcedSubtitle !== undefined) {
            parsedAdaptationSet.forcedSubtitles = isForcedSubtitle;
        }
        if (isSignInterpreted === true) {
            parsedAdaptationSet.isSignInterpreted = true;
        }
        if (label !== undefined) {
            parsedAdaptationSet.label = label;
        }
        if (trickModeAttachedAdaptationIds !== undefined) {
            trickModeAdaptations.push({
                adaptation: parsedAdaptationSet,
                trickModeAttachedAdaptationIds,
            });
        }
        else {
            // look if we have to merge this into another Adaptation
            let mergedIntoIdx = -1;
            for (const id of adaptationSetSwitchingIDs) {
                const switchingInfos = adaptationSwitchingInfos[id];
                if (switchingInfos !== undefined &&
                    switchingInfos.newID !== newID &&
                    arrayIncludes(switchingInfos.adaptationSetSwitchingIDs, originalID)) {
                    mergedIntoIdx = arrayFindIndex(parsedAdaptations[type], (a) => a[0].id === id);
                    const mergedInto = parsedAdaptations[type][mergedIntoIdx];
                    if (mergedInto !== undefined &&
                        mergedInto[0].audioDescription === parsedAdaptationSet.audioDescription &&
                        mergedInto[0].closedCaption === parsedAdaptationSet.closedCaption &&
                        mergedInto[0].language === parsedAdaptationSet.language) {
                        log.info("dash", 'merging "switchable" AdaptationSets', { originalID, id });
                        mergedInto[0].representations.push(...parsedAdaptationSet.representations);
                        mergedInto[1] = {
                            priority: Math.max(priority, mergedInto[1].priority),
                            isMainAdaptation: isMainAdaptation || mergedInto[1].isMainAdaptation,
                            indexInMpd: Math.min(adaptationIdx, mergedInto[1].indexInMpd),
                        };
                        break;
                    }
                }
            }
            if (mergedIntoIdx < 0) {
                parsedAdaptations[type].push([
                    parsedAdaptationSet,
                    { priority, isMainAdaptation, indexInMpd: adaptationIdx },
                ]);
            }
        }
        if (!isNullOrUndefined(originalID) &&
            isNullOrUndefined(adaptationSwitchingInfos[originalID])) {
            adaptationSwitchingInfos[originalID] = {
                newID,
                adaptationSetSwitchingIDs,
            };
        }
    }
    const adaptationsPerType = SUPPORTED_ADAPTATIONS_TYPE.reduce((acc, adaptationType) => {
        const adaptationsParsedForType = parsedAdaptations[adaptationType];
        if (adaptationsParsedForType.length > 0) {
            adaptationsParsedForType.sort(compareAdaptations);
            acc[adaptationType] = adaptationsParsedForType.map(([parsedAdaptation]) => parsedAdaptation);
        }
        return acc;
    }, {});
    parsedAdaptations.video.sort(compareAdaptations);
    attachTrickModeTrack(adaptationsPerType, trickModeAdaptations);
    return {
        adaptations: adaptationsPerType,
        thumbnailTracks: parsedThumbnailTracks,
    };
}
/**
 * From the given attributes, returns a parsed thumbnail track, or null if it
 * fails to do so.
 * @param {Object} adaptation
 * @param {Array.<Object>} representations
 * @returns {Object|null}
 */
function createThumbnailTracks(adaptation, representations) {
    var _a, _b;
    const tracks = [];
    for (let i = 0; i < representations.length; i++) {
        const representation = representations[i];
        if (representation !== undefined) {
            if (representation.mimeType === undefined) {
                log.warn("dash", "Invalid thumbnails Representation, no mime-type");
                continue;
            }
            const tileInfo = getThumbnailAdaptationSetInfo(adaptation, adaptation.children.representations[i]);
            if (tileInfo === null) {
                continue;
            }
            if (representation.height === undefined) {
                log.warn("dash", "Invalid thumbnails Representation, no height information");
                continue;
            }
            if (representation.width === undefined) {
                log.warn("dash", "Invalid thumbnails Representation, no width information");
                continue;
            }
            const start = (_a = representation.index.getFirstAvailablePosition()) !== null && _a !== void 0 ? _a : undefined;
            const end = (_b = representation.index.getEnd()) !== null && _b !== void 0 ? _b : undefined;
            let segmentDuration;
            const targetDuration = representation.index.getTargetSegmentDuration();
            if (targetDuration !== undefined && targetDuration.isPrecize) {
                segmentDuration = targetDuration.duration;
            }
            else {
                log.warn("dash", "Cannot produce duration estimate for thumbnail track");
            }
            tracks.push({
                id: representation.id,
                cdnMetadata: representation.cdnMetadata,
                index: representation.index,
                mimeType: representation.mimeType,
                height: representation.height,
                width: representation.width,
                horizontalTiles: tileInfo.horizontalTiles,
                verticalTiles: tileInfo.verticalTiles,
                start,
                end,
                tileDuration: segmentDuration === undefined
                    ? undefined
                    : segmentDuration / (tileInfo.horizontalTiles * tileInfo.verticalTiles),
            });
        }
    }
    return tracks;
}
/**
 * Compare groups of parsed AdaptationSet, alongside some ordering metadata,
 * allowing to easily sort them through JavaScript's `Array.prototype.sort`
 * method.
 * @param {Array.<Object>} a
 * @param {Array.<Object>} b
 * @returns {number}
 */
function compareAdaptations(a, b) {
    const priorityDiff = b[1].priority - a[1].priority;
    if (priorityDiff !== 0) {
        return priorityDiff;
    }
    if (a[1].isMainAdaptation !== b[1].isMainAdaptation) {
        return a[1].isMainAdaptation ? -1 : 1;
    }
    return a[1].indexInMpd - b[1].indexInMpd;
}
