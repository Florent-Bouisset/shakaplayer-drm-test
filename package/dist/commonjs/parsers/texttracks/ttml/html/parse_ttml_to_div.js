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
exports.default = parseTTMLToDiv;
var buffer_source_to_uint8_1 = require("../../../../utils/buffer_source_to_uint8");
var string_parsing_1 = require("../../../../utils/string_parsing");
var parse_ttml_1 = require("../parse_ttml");
var apply_default_ttml_paragraph_style_1 = require("./apply_default_ttml_paragraph_style");
var parse_cue_1 = require("./parse_cue");
/**
 * Create array of objects which should represent the given TTML text track.
 * These objects have the following structure
 *   - start {Number}: start time, in seconds, at which the cue should
 *     be displayed
 *   - end {Number}: end time, in seconds, at which the cue should
 *     be displayed
 *   - element {HTMLElement}: <div> element representing the cue, with the
 *     right style. This div should then be appended to an element having
 *     the exact size of the wanted region the text track provide cues for.
 *
 * TODO TTML parsing is still pretty heavy on the CPU.
 * Optimizations have been done, principally to avoid using too much XML APIs,
 * but we can still do better.
 * @param {string|BufferSource} input
 * @param {Object} _context
 * @param {number} timeOffset
 */
function parseTTMLToDiv(input, _context, timeOffset) {
    var e_1, _a;
    var str;
    if (typeof input !== "string") {
        // Assume UTF-8
        // TODO: detection?
        str = (0, string_parsing_1.utf8ToStr)((0, buffer_source_to_uint8_1.default)(input));
    }
    else {
        str = input;
    }
    var parsedCues = (0, parse_ttml_1.default)(str, timeOffset);
    var cues = [];
    try {
        for (var parsedCues_1 = __values(parsedCues), parsedCues_1_1 = parsedCues_1.next(); !parsedCues_1_1.done; parsedCues_1_1 = parsedCues_1.next()) {
            var parsedCue = parsedCues_1_1.value;
            var paragraphStyle = parsedCue.paragraphStyle;
            if ((0, apply_default_ttml_paragraph_style_1.shouldApplyDefaultTTMLStyle)(paragraphStyle)) {
                (0, apply_default_ttml_paragraph_style_1.applyDefaultTTMLStyle)(paragraphStyle);
            }
            var cue = (0, parse_cue_1.default)(parsedCue);
            if (cue !== null) {
                cues.push(cue);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (parsedCues_1_1 && !parsedCues_1_1.done && (_a = parsedCues_1.return)) _a.call(parsedCues_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return cues;
}
