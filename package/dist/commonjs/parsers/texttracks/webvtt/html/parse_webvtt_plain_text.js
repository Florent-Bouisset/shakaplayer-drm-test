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
exports.default = parseWebVTTPlainText;
var buffer_source_to_uint8_1 = require("../../../../utils/buffer_source_to_uint8");
var string_parsing_1 = require("../../../../utils/string_parsing");
var get_cue_blocks_1 = require("../get_cue_blocks");
var get_style_blocks_1 = require("../get_style_blocks");
var parse_cue_block_1 = require("../parse_cue_block");
var parse_style_block_1 = require("../parse_style_block");
var utils_1 = require("../utils");
var to_html_1 = require("./to_html");
/**
 * Parse WebVTT from text. Returns an array with:
 * - start : start of current cue, in seconds
 * - end : end of current cue, in seconds
 * - content : HTML formatted cue.
 *
 * Global style is parsed and applied to div element.
 * Specific style is parsed and applied to class element.
 *
 * @throws Error - Throws if the given WebVTT string is invalid.
 * @param {string|BufferSource} text - The whole webvtt subtitles to parse
 * @param {Object} _context
 * @param {Number} timeOffset - Offset to add to start and end times, in seconds
 * @return {Array.<Object>}
 */
function parseWebVTTPlainText(text, _context, timeOffset) {
    var textStr;
    if (typeof text === "string") {
        textStr = text;
    }
    else {
        // Assume UTF-8
        textStr = (0, string_parsing_1.utf8ToStr)((0, buffer_source_to_uint8_1.default)(text));
    }
    var newLineChar = /\r\n|\n|\r/g; // CRLF|LF|CR
    var linified = textStr.split(newLineChar);
    var cuesArray = [];
    if (/^WEBVTT( |\t|\n|\r|$)/.exec(linified[0]) === null) {
        throw new Error("Can't parse WebVTT: Invalid File.");
    }
    var firstLineAfterHeader = (0, utils_1.getFirstLineAfterHeader)(linified);
    var styleBlocks = (0, get_style_blocks_1.default)(linified, firstLineAfterHeader);
    var cueBlocks = (0, get_cue_blocks_1.default)(linified, firstLineAfterHeader);
    var styles = (0, parse_style_block_1.default)(styleBlocks);
    for (var i = 0; i < cueBlocks.length; i++) {
        var cueObject = (0, parse_cue_block_1.default)(cueBlocks[i], timeOffset);
        if (cueObject !== null) {
            var htmlCue = (0, to_html_1.default)(cueObject, styles);
            cuesArray.push(htmlCue);
        }
    }
    return cuesArray;
}
