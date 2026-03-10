"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getISOBMFFTextTrackFormat = getISOBMFFTextTrackFormat;
exports.getPlainTextTrackFormat = getPlainTextTrackFormat;
exports.getISOBMFFEmbeddedTextTrackData = getISOBMFFEmbeddedTextTrackData;
exports.getPlainTextTrackData = getPlainTextTrackData;
var log_1 = require("../../log");
var isobmff_1 = require("../../parsers/containers/isobmff");
var starts_with_1 = require("../../utils/starts_with");
var string_parsing_1 = require("../../utils/string_parsing");
/**
 * Returns the a string expliciting the format of a text track when that text
 * track is embedded into a ISOBMFF file.
 * @param {string|undefined} codecs
 * @returns {string}
 */
function getISOBMFFTextTrackFormat(codecs) {
    if (codecs === undefined) {
        throw new Error("Cannot parse subtitles: unknown format");
    }
    switch (codecs.toLowerCase()) {
        case "stpp": // stpp === TTML in MP4
        case "stpp.ttml":
        case "stpp.ttml.im1t":
            return "ttml";
        case "wvtt": // wvtt === WebVTT in MP4
            return "vtt";
    }
    throw new Error("The codec used for the subtitles " + "\"".concat(codecs, "\" is not managed yet."));
}
/**
 * Returns the a string expliciting the format of a text track in plain text.
 * @param {string|undefined} codecs
 * @param {string|undefined} mimeType
 * @returns {string}
 */
function getPlainTextTrackFormat(codecs, mimeType) {
    switch (mimeType) {
        case "application/ttml+xml":
            return "ttml";
        case "application/x-sami":
        case "application/smil":
            return "sami";
        case "text/vtt":
            return "vtt";
    }
    if (codecs !== undefined) {
        var codeLC = codecs.toLowerCase();
        if (codeLC === "srt") {
            return "srt";
        }
    }
    throw new Error("could not find a text-track parser for the type ".concat(mimeType !== null && mimeType !== void 0 ? mimeType : ""));
}
/**
 * @param {Object} content
 * @param {ArrayBuffer|UInt8Array|null} chunkBytes
 * @param {number|undefined} initTimescale
 * @param {Object|null} chunkInfos
 * @param {boolean} isChunked
 * @returns {Object|null}
 */
function getISOBMFFEmbeddedTextTrackData(_a, chunkBytes, initTimescale, chunkInfos, isChunked) {
    var segment = _a.segment, language = _a.language, codecs = _a.codecs;
    if (segment.isInit) {
        return null;
    }
    var startTime;
    var endTime;
    if (chunkInfos === null) {
        if (!isChunked) {
            log_1.default.warn("utils", "Unavailable time data for current text track.");
        }
        else {
            startTime = segment.time;
            endTime = segment.end;
        }
    }
    else {
        startTime = chunkInfos.time;
        if (chunkInfos.duration !== undefined) {
            endTime = startTime + chunkInfos.duration;
        }
        else if (!isChunked && segment.complete) {
            endTime = startTime + segment.duration;
        }
    }
    var type = getISOBMFFTextTrackFormat(codecs);
    var mdat = (0, isobmff_1.getMDAT)(chunkBytes);
    var mdatStr = mdat !== null ? (0, string_parsing_1.utf8ToStr)(mdat) : "";
    if (codecs === "wvtt" &&
        !(0, starts_with_1.default)(mdatStr, "WEBVTT") &&
        !(0, starts_with_1.default)(mdatStr, "\xfe\xffWEBVTT")) {
        // From how I understand it, we're here in a special WebVTT format  embedded
        // in an MP4 where the whole chunk contains information, now just the MDAT
        return {
            data: chunkBytes,
            type: "mp4vtt",
            language: language,
            start: startTime,
            end: endTime,
            initTimescale: initTimescale !== null && initTimescale !== void 0 ? initTimescale : null,
        };
    }
    return {
        data: mdatStr,
        type: type,
        language: language,
        start: startTime,
        end: endTime,
        initTimescale: initTimescale !== null && initTimescale !== void 0 ? initTimescale : null,
    };
}
/**
 * @param {Object} context
 * @param {ArrayBuffer|UInt8Array|null} textTrackData
 * @param {number|undefined} initTimescale
 * @param {boolean} isChunked
 * @returns {Object|null}
 */
function getPlainTextTrackData(context, textTrackData, initTimescale, isChunked) {
    var segment = context.segment;
    if (segment.isInit) {
        return null;
    }
    var start;
    var end;
    if (isChunked) {
        log_1.default.warn("utils", "Unavailable time data for current text track.");
    }
    else {
        start = segment.time;
        if (segment.complete) {
            end = segment.time + segment.duration;
        }
    }
    var type = getPlainTextTrackFormat(context.codecs, context.mimeType);
    return {
        data: textTrackData,
        type: type,
        language: context.language,
        start: start,
        end: end,
        initTimescale: initTimescale !== null && initTimescale !== void 0 ? initTimescale : null,
    };
}
