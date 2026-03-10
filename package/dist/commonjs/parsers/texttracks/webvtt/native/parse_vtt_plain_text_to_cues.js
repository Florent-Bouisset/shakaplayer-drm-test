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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = parseWebVTTPlainTextToVTTCues;
var is_vtt_cue_1 = require("../../../../compat/is_vtt_cue");
var buffer_source_to_uint8_1 = require("../../../../utils/buffer_source_to_uint8");
var string_parsing_1 = require("../../../../utils/string_parsing");
var get_cue_blocks_1 = require("../get_cue_blocks");
var get_style_blocks_1 = require("../get_style_blocks");
var parse_cue_block_1 = require("../parse_cue_block");
var parse_style_block_1 = require("../parse_style_block");
var utils_1 = require("../utils");
var set_settings_on_cue_1 = require("./set_settings_on_cue");
var to_native_cue_1 = require("./to_native_cue");
// Simple VTT to ICompatVTTCue parser:
// Just parse cues and associated settings.
// Does not take into consideration STYLE and REGION blocks.
/**
 * Parse whole WEBVTT file into an array of cues, to be inserted in a video's
 * TrackElement.
 * @param {string|BufferSource} input
 * @param {Object} _context
 * @param {Number} timeOffset
 * @returns {Array.<ICompatVTTCue|TextTrackCue>}
 */
function parseWebVTTPlainTextToVTTCues(input, _context, timeOffset) {
    var e_1, _a;
    var vttStr;
    if (typeof input === "string") {
        vttStr = input;
    }
    else {
        // Assume UTF-8
        vttStr = (0, string_parsing_1.utf8ToStr)((0, buffer_source_to_uint8_1.default)(input));
    }
    // WEBVTT authorize CRLF, LF or CR as line terminators
    var lines = vttStr.split(/\r\n|\n|\r/);
    if (!/^WEBVTT($| |\t)/.test(lines[0])) {
        throw new Error("Can't parse WebVTT: Invalid file.");
    }
    var firstLineAfterHeader = (0, utils_1.getFirstLineAfterHeader)(lines);
    var cueBlocks = (0, get_cue_blocks_1.default)(lines, firstLineAfterHeader);
    var styleBlocks = (0, get_style_blocks_1.default)(lines, firstLineAfterHeader);
    var styles = (0, parse_style_block_1.default)(styleBlocks);
    var cues = [];
    try {
        for (var cueBlocks_1 = __values(cueBlocks), cueBlocks_1_1 = cueBlocks_1.next(); !cueBlocks_1_1.done; cueBlocks_1_1 = cueBlocks_1.next()) {
            var cueBlock = cueBlocks_1_1.value;
            var cueObject = (0, parse_cue_block_1.default)(cueBlock, timeOffset);
            if (cueObject !== null) {
                var nativeCue = (0, to_native_cue_1.default)(cueObject, styles);
                if (nativeCue !== null) {
                    if ((0, is_vtt_cue_1.default)(nativeCue)) {
                        (0, set_settings_on_cue_1.default)(cueObject.settings, nativeCue);
                    }
                    cues.push(nativeCue);
                }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (cueBlocks_1_1 && !cueBlocks_1_1.done && (_a = cueBlocks_1.return)) _a.call(cueBlocks_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return cues;
}
