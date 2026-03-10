"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = parseMp4EmbeddedWebVttToVTTCues;
var buffer_source_to_uint8_1 = require("../../../../utils/buffer_source_to_uint8");
var string_parsing_1 = require("../../../../utils/string_parsing");
var parse_mp4_embedded_wvtt_1 = require("../parse_mp4_embedded_wvtt");
var to_native_cue_1 = require("./to_native_cue");
/**
 * Parse WebVTT subtitles format when embedded in an MP4 file.
 * @throws Error - Throws if the given WebVTT format.
 * @param {string | BufferSource} input - The whole webvtt subtitles to parse
 * @param {Object} context
 * @param {Number} timeOffset - Offset to add to start and end times, in seconds
 * @return {Array.<Object>}
 */
function parseMp4EmbeddedWebVttToVTTCues(input, _a, timeOffset) {
    var initTimescale = _a.initTimescale;
    if (typeof input === "string") {
        return (0, parse_mp4_embedded_wvtt_1.default)((0, string_parsing_1.strToUtf8)(input), initTimescale !== null && initTimescale !== void 0 ? initTimescale : 1, timeOffset, to_native_cue_1.default);
    }
    else {
        return (0, parse_mp4_embedded_wvtt_1.default)((0, buffer_source_to_uint8_1.default)(input), initTimescale !== null && initTimescale !== void 0 ? initTimescale : 1, timeOffset, to_native_cue_1.default);
    }
}
