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
import arrayIncludes from "../../../../utils/array_includes";
import isNonEmptyString from "../../../../utils/is_non_empty_string";
import isNullOrUndefined from "../../../../utils/is_null_or_undefined";
/** Different `role`s a text Adaptation can be. */
const SUPPORTED_TEXT_TYPES = ["subtitle", "caption"];
/**
 * From a thumbnail AdaptationSet, returns core information such as the number
 * of tiles vertically and horizontally per image.
 *
 * Returns `null` if the information could not be parsed.
 * @param {Object} adaptation
 * @returns {Object|null}
 */
export function getThumbnailAdaptationSetInfo(adaptation, representation) {
    var _a, _b, _c, _d;
    const thumbnailProp = (_b = arrayFind((_a = adaptation.children.essentialProperties) !== null && _a !== void 0 ? _a : [], (p) => p.schemeIdUri === "http://dashif.org/guidelines/thumbnail_tile" ||
        p.schemeIdUri === "http://dashif.org/thumbnail_tile")) !== null && _b !== void 0 ? _b : arrayFind((_d = (_c = (representation !== null && representation !== void 0 ? representation : adaptation.children.representations[0])) === null || _c === void 0 ? void 0 : _c.children.essentialProperties) !== null && _d !== void 0 ? _d : [], (p) => p.schemeIdUri === "http://dashif.org/guidelines/thumbnail_tile" ||
        p.schemeIdUri === "http://dashif.org/thumbnail_tile");
    if (thumbnailProp === undefined) {
        return null;
    }
    const tilesRegex = /(\d+)x(\d+)/;
    if (thumbnailProp === undefined ||
        thumbnailProp.value === undefined ||
        !tilesRegex.test(thumbnailProp.value)) {
        log.warn("dash", "Invalid thumbnails Representation, no tile-related information");
        return null;
    }
    const match = thumbnailProp.value.match(tilesRegex);
    const horizontalTiles = parseInt(match[1], 10);
    const verticalTiles = parseInt(match[2], 10);
    return {
        horizontalTiles,
        verticalTiles,
    };
}
/**
 * Infers the type of adaptation from codec and mimetypes found in it.
 *
 * This follows the guidelines defined by the DASH-IF IOP:
 *   - one adaptation set contains a single media type
 *   - The order of verifications are:
 *       1. mimeType
 *       2. Role
 *       3. codec
 *
 * Note: This is based on DASH-IF-IOP-v4.0 with some more freedom.
 * @param {Object} adaptation
 * @param {Array.<Object>} representations
 * @returns {string} - "audio"|"video"|"text"|"metadata"|"unknown"
 */
export default function inferAdaptationType(adaptation, representations) {
    if (adaptation.attributes.contentType === "image") {
        if (getThumbnailAdaptationSetInfo(adaptation) !== null) {
            return "thumbnails";
        }
        return undefined;
    }
    const adaptationMimeType = isNonEmptyString(adaptation.attributes.mimeType)
        ? adaptation.attributes.mimeType
        : null;
    const adaptationCodecs = isNonEmptyString(adaptation.attributes.codecs)
        ? adaptation.attributes.codecs
        : null;
    const adaptationRoles = !isNullOrUndefined(adaptation.children.roles)
        ? adaptation.children.roles
        : null;
    function fromMimeType(mimeType, roles) {
        const topLevel = mimeType.split("/")[0];
        if (arrayIncludes(SUPPORTED_ADAPTATIONS_TYPE, topLevel)) {
            return topLevel;
        }
        if (mimeType === "application/ttml+xml") {
            return "text";
        }
        // manage DASH-IF mp4-embedded subtitles and metadata
        if (mimeType === "application/mp4") {
            if (roles !== null) {
                if (arrayFind(roles, (role) => role.schemeIdUri === "urn:mpeg:dash:role:2011" &&
                    arrayIncludes(SUPPORTED_TEXT_TYPES, role.value)) !== undefined) {
                    return "text";
                }
            }
            return undefined;
        }
    }
    function fromCodecs(codecs) {
        switch (codecs.substring(0, 3)) {
            case "avc":
            case "hev":
            case "hvc":
            case "vp8":
            case "vp9":
            case "av1":
                return "video";
            case "vtt":
                return "text";
        }
        switch (codecs.substring(0, 4)) {
            case "mp4a":
                return "audio";
            case "wvtt":
            case "stpp":
                return "text";
        }
    }
    if (adaptationMimeType !== null) {
        const typeFromMimeType = fromMimeType(adaptationMimeType, adaptationRoles);
        if (typeFromMimeType !== undefined) {
            return typeFromMimeType;
        }
    }
    if (adaptationCodecs !== null) {
        const typeFromCodecs = fromCodecs(adaptationCodecs);
        if (typeFromCodecs !== undefined) {
            return typeFromCodecs;
        }
    }
    for (let i = 0; i < representations.length; i++) {
        const representation = representations[i];
        const { mimeType, codecs } = representation.attributes;
        if (mimeType !== undefined) {
            const typeFromMimeType = fromMimeType(mimeType, adaptationRoles);
            if (typeFromMimeType !== undefined) {
                return typeFromMimeType;
            }
        }
        if (codecs !== undefined) {
            const typeFromCodecs = fromCodecs(codecs);
            if (typeFromCodecs !== undefined) {
                return typeFromCodecs;
            }
        }
    }
    return undefined;
}
