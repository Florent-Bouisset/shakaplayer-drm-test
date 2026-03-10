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
import { MediaError } from "../../errors";
import arrayFind from "../../utils/array_find";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import { getAdaptations, getSupportedAdaptations, periodContainsTime } from "../utils";
import Adaptation from "./adaptation";
/**
 * Class representing the tracks and qualities available from a given time
 * period in the the Manifest.
 * @class Period
 */
export default class Period {
    /**
     * @constructor
     * @param {Object} args
     * @param {function|undefined} [representationFilter]
     */
    constructor(args, cachedCodecSupport, representationFilter) {
        this.id = args.id;
        this.adaptations = createAdaptationsObject(args.adaptations, cachedCodecSupport, representationFilter);
        if (isArrayEmpty(this.adaptations.video) && isArrayEmpty(this.adaptations.audio)) {
            throw new MediaError("MANIFEST_PARSE_ERROR", "The manifest has no video nor audio tracks.");
        }
        this.thumbnailTracks = args.thumbnailTracks.map((thumbnailTrack) => ({
            id: thumbnailTrack.id,
            mimeType: thumbnailTrack.mimeType,
            index: thumbnailTrack.index,
            cdnMetadata: thumbnailTrack.cdnMetadata,
            height: thumbnailTrack.height,
            width: thumbnailTrack.width,
            horizontalTiles: thumbnailTrack.horizontalTiles,
            verticalTiles: thumbnailTrack.verticalTiles,
            start: thumbnailTrack.start,
            end: thumbnailTrack.end,
            tileDuration: thumbnailTrack.tileDuration,
        }));
        this.duration = args.duration;
        this.start = args.start;
        if (!isNullOrUndefined(this.duration) && !isNullOrUndefined(this.start)) {
            this.end = this.start + this.duration;
        }
        this.streamEvents = args.streamEvents === undefined ? [] : args.streamEvents;
    }
    /**
     * Some environments (e.g. in a WebWorker) may not have the capability to know
     * if a mimetype+codec combination is supported on the current platform.
     *
     * Calling `refreshCodecSupport` manually once the codecs supported are known
     * by the current environnement allows to work-around this issue.
     *
     * @param {Array.<Object>} unsupportedAdaptations - Array on which
     * `Adaptation`s objects which are now known to have no supported
     * `Representation` will be pushed.
     * This array might be useful for minor error reporting.
     * @param {Array.<Object>} cachedCodecSupport
     */
    refreshCodecSupport(unsupportedAdaptations, cachedCodecSupport) {
        Object.keys(this.adaptations).forEach((ttype) => {
            const adaptationsForType = this.adaptations[ttype];
            if (adaptationsForType === undefined) {
                return;
            }
            for (const adaptation of adaptationsForType) {
                if (!adaptation.supportStatus.hasCodecWithUndefinedSupport) {
                    // Go to next adaptation as an optimisation measure.
                    // NOTE this only is true if we never change a codec from supported
                    // to unsuported and its opposite.
                    continue;
                }
                const wasSupported = adaptation.supportStatus.hasSupportedCodec;
                adaptation.refreshCodecSupport(cachedCodecSupport);
                if (wasSupported !== false &&
                    adaptation.supportStatus.hasSupportedCodec === false) {
                    unsupportedAdaptations.push(adaptation);
                }
            }
        }, {});
    }
    /**
     * Returns every `Adaptations` (or `tracks`) linked to that Period, in an
     * Array.
     * @returns {Array.<Object>}
     */
    getAdaptations() {
        return getAdaptations(this);
    }
    /**
     * Returns every `Adaptations` (or `tracks`) linked to that Period for a
     * given type.
     * @param {string} adaptationType
     * @returns {Array.<Object>}
     */
    getAdaptationsForType(adaptationType) {
        const adaptationsForType = this.adaptations[adaptationType];
        return adaptationsForType !== null && adaptationsForType !== void 0 ? adaptationsForType : [];
    }
    /**
     * Returns the Adaptation linked to the given ID.
     * @param {number|string} wantedId
     * @returns {Object|undefined}
     */
    getAdaptation(wantedId) {
        return arrayFind(this.getAdaptations(), ({ id }) => wantedId === id);
    }
    /**
     * Returns Adaptations that contain Representations in supported codecs.
     * @param {string|undefined} type - If set filter on a specific Adaptation's
     * type. Will return for all types if `undefined`.
     * @returns {Array.<Adaptation>}
     */
    getSupportedAdaptations(type) {
        return getSupportedAdaptations(this, type);
    }
    /**
     * Returns true if the give time is in the time boundaries of this `Period`.
     * @param {number} time
     * @param {object|null} nextPeriod - Period coming chronologically just
     * after in the same Manifest. `null` if this instance is the last `Period`.
     * @returns {boolean}
     */
    containsTime(time, nextPeriod) {
        return periodContainsTime(this, time, nextPeriod);
    }
    /**
     * Format the current `Period`'s properties into a
     * `IPeriodMetadata` format which can better be communicated through
     * another thread.
     *
     * Please bear in mind however that the returned object will not be updated
     * when the current `Period` instance is updated, it is only a
     * snapshot at the current time.
     *
     * If you want to keep that data up-to-date with the current `Period`
     * instance, you will have to do it yourself.
     *
     * @returns {Object}
     */
    getMetadataSnapshot() {
        const adaptations = {};
        const baseAdaptations = this.getAdaptations();
        for (const adaptation of baseAdaptations) {
            let currentAdaps = adaptations[adaptation.type];
            if (currentAdaps === undefined) {
                currentAdaps = [];
                adaptations[adaptation.type] = currentAdaps;
            }
            currentAdaps.push(adaptation.getMetadataSnapshot());
        }
        return {
            start: this.start,
            end: this.end,
            id: this.id,
            streamEvents: this.streamEvents,
            adaptations,
            thumbnailTracks: this.thumbnailTracks.map((thumbnailTrack) => ({
                id: thumbnailTrack.id,
                mimeType: thumbnailTrack.mimeType,
                height: thumbnailTrack.height,
                width: thumbnailTrack.width,
                horizontalTiles: thumbnailTrack.horizontalTiles,
                verticalTiles: thumbnailTrack.verticalTiles,
                start: thumbnailTrack.start,
                end: thumbnailTrack.end,
                tileDuration: thumbnailTrack.tileDuration,
            })),
        };
    }
}
function isArrayEmpty(array) {
    if (!Array.isArray(array)) {
        return true;
    }
    else {
        return array.length === 0;
    }
}
/**
 * Creates an object representing adaptations grouped by track type,
 * from the given parsed adaptations.
 * @param {Object} adaptations
 * @param {Object} cachedCodecSupport
 * @param {Object|undefined}representationFilter
 * @returns {Object}
 */
function createAdaptationsObject(adaptations, cachedCodecSupport, representationFilter) {
    const manifestAdaptations = {};
    for (const [type, adaptationsForType] of Object.entries(adaptations)) {
        if (isNullOrUndefined(adaptationsForType)) {
            continue;
        }
        manifestAdaptations[type] = adaptationsForType
            .map((adaptation) => {
            const newAdaptation = new Adaptation(adaptation, cachedCodecSupport, {
                representationFilter,
            });
            return newAdaptation;
        })
            .filter((adaptation) => adaptation.representations.length > 0);
    }
    return manifestAdaptations;
}
