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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCodec = parseCodec;
var array_find_1 = require("./array_find");
var starts_with_1 = require("./starts_with");
/**
 * This function is a shortcut that helps differentiate two codecs
 * of the form "audio/mp4;codecs=\"av1.40.2\"".
 *
 * @param codecA
 * @param codecB
 * @returns A boolean that tell whether or not those two codecs provided are even.
 */
function areCodecsCompatible(a, b) {
    var _a = parseCodec(a), mimeTypeA = _a.mimeType, codecsA = _a.codecs;
    var _b = parseCodec(b), mimeTypeB = _b.mimeType, codecsB = _b.codecs;
    if (mimeTypeA !== mimeTypeB) {
        return false;
    }
    if (codecsA === "" || codecsB === "") {
        return false;
    }
    var initialPartA = codecsA.split(".")[0];
    initialPartA = initialPartA === "hev1" ? "hvc1" : initialPartA;
    var initialPartB = codecsB.split(".")[0];
    initialPartB = initialPartB === "hev1" ? "hvc1" : initialPartB;
    if (initialPartA !== initialPartB) {
        return false;
    }
    return true;
}
var LENGTH_OF_CODEC_PREFIX = "codecs=".length;
function parseCodec(unparsedCodec) {
    var _a;
    var _b = __read(unparsedCodec.split(";")), mimeType = _b[0], props = _b.slice(1);
    var codecs = (_a = (0, array_find_1.default)(props, function (prop) { return (0, starts_with_1.default)(prop, "codecs="); })) !== null && _a !== void 0 ? _a : "";
    // remove the 'codecs=' prefix
    codecs = codecs.substring(LENGTH_OF_CODEC_PREFIX);
    // remove the leading and trailing quote
    if (codecs[0] === '"') {
        codecs = codecs.substring(1, codecs.length - 1);
    }
    return { mimeType: mimeType, codecs: codecs };
}
exports.default = areCodecsCompatible;
