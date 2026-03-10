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
exports.default = parseSRTStringToHTML;
/**
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */
// Parse SRT subtitles into HTML.
// Done for fun. Understand <b>, <i>, <u> and <font color="#ff0000" /> type
// of tags.
var buffer_source_to_uint8_1 = require("../../../utils/buffer_source_to_uint8");
var string_parsing_1 = require("../../../utils/string_parsing");
var get_cue_blocks_1 = require("./get_cue_blocks");
var parse_cue_1 = require("./parse_cue");
/**
 * @param {string|BufferSource} input
 * @param {Object} _context
 * @param {Number} timeOffset
 * @returns {Array.<Object>}
 */
function parseSRTStringToHTML(input, _context, timeOffset) {
    var e_1, _a;
    var srtStr;
    if (typeof input !== "string") {
        // Assume UTF-8
        // TODO: detection?
        srtStr = (0, string_parsing_1.utf8ToStr)((0, buffer_source_to_uint8_1.default)(input));
    }
    else {
        srtStr = input;
    }
    // Even if srt only authorize CRLF, we will also take LF or CR as line
    // terminators for resilience
    var lines = srtStr.split(/\r\n|\n|\r/);
    var cueBlocks = (0, get_cue_blocks_1.default)(lines);
    var cues = [];
    try {
        for (var cueBlocks_1 = __values(cueBlocks), cueBlocks_1_1 = cueBlocks_1.next(); !cueBlocks_1_1.done; cueBlocks_1_1 = cueBlocks_1.next()) {
            var cueBlock = cueBlocks_1_1.value;
            var cueObject = (0, parse_cue_1.default)(cueBlock, timeOffset);
            if (cueObject !== null) {
                var htmlCue = toHTML(cueObject);
                if (htmlCue !== null) {
                    cues.push(htmlCue);
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
/**
 * @param {Object} cueObj
 * @param {number} cueObj.start
 * @param {number} cueObj.end
 * @param {Array.<string>} cueObj.payload
 * @returns {Object|null}
 */
function toHTML(cueObj) {
    var start = cueObj.start, end = cueObj.end, payload = cueObj.payload;
    var pEl = document.createElement("div");
    pEl.className = "rxp-texttrack-p";
    pEl.style.fontSize = "28px";
    pEl.style.position = "absolute";
    pEl.style.bottom = "5%";
    pEl.style.width = "100%";
    pEl.style.textAlign = "center";
    pEl.style.color = "#fff";
    pEl.style.textShadow =
        "-1px -1px 2px #000," +
            "1px -1px 2px #000," +
            "-1px 1px 2px #000," +
            "1px 1px 2px #000";
    for (var i = 0; i < payload.length; i++) {
        if (i !== 0) {
            pEl.appendChild(document.createElement("br"));
        }
        var span = generateSpansFromSRTText(payload[i]);
        pEl.appendChild(span);
    }
    return {
        start: start,
        end: end,
        element: pEl,
    };
}
/**
 * Take a single srt line and convert it into a span with the right style while
 * avoiding XSS.
 * What we do is set a whitelist of authorized tags, and recreate the
 * corresponding tag from scratch.
 * Supported tags:
 *   - <b>: make content bold
 *   - <i>: make content italic
 *   - <u>: draw underline on content
 *   - <font color="x">: add color x to the content
 * @param {string} text
 * @returns {HTMLElement}
 */
function generateSpansFromSRTText(text) {
    var secureDiv = document.createElement("div");
    secureDiv.innerHTML = text;
    var _loop = function (node) {
        var childNodes = node.childNodes;
        var span = document.createElement("span");
        span.className = "rxp-texttrack-span";
        for (var i = 0; i < childNodes.length; i++) {
            var currentNode = childNodes[i];
            if (currentNode.nodeName === "#text") {
                var linifiedText = currentNode.wholeText.split("\n");
                for (var line = 0; line < linifiedText.length; line++) {
                    if (line !== 0) {
                        span.appendChild(document.createElement("br"));
                    }
                    if (linifiedText[line].length > 0) {
                        var textNode = document.createTextNode(linifiedText[line]);
                        span.appendChild(textNode);
                    }
                }
            }
            else if (currentNode.nodeName === "B") {
                var spanChild = _loop(currentNode);
                spanChild.style.fontWeight = "bold";
                span.appendChild(spanChild);
            }
            else if (currentNode.nodeName === "I") {
                var spanChild = _loop(currentNode);
                spanChild.style.fontStyle = "italic";
                span.appendChild(spanChild);
            }
            else if (currentNode.nodeName === "U") {
                var spanChild = _loop(currentNode);
                spanChild.style.textDecoration = "underline";
                span.appendChild(spanChild);
            }
            else if (isNodeFontWithColorProp(currentNode) &&
                typeof currentNode.color === "string") {
                // TODO loop through attributes to find color?
                var spanChild = _loop(currentNode);
                spanChild.style.color = currentNode.color;
                span.appendChild(spanChild);
            }
            else {
                var spanChild = _loop(currentNode);
                span.appendChild(spanChild);
            }
        }
        return span;
    };
    return _loop(secureDiv);
}
/**
 * Returns `true` if the given node is a `<font>` element which contains a
 * `color` attribute.
 * @param {Node} node
 * @returns {boolean}
 */
function isNodeFontWithColorProp(node) {
    return node.nodeName === "FONT" && "color" in node;
}
