"use strict";
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
exports.default = isCompatibleCodecSupported;
var are_codecs_compatible_1 = require("../../../utils/are_codecs_compatible");
/**
 * Find the first codec in the provided codec list that is compatible with the given mimeType and codec.
 * This first codec is called the "compatible codec". Return true if the "compatible codec"
 * is supported or false if it's not supported. If no "compatible codec" has been found, return undefined.
 *
 * @param {string} mimeType - The MIME type to check.
 * @param {string} codec - The codec to check.
 * @param {Array} codecList - The list of codecs to check against.
 * @returns {boolean|undefined} - True if the "compatible codec" is supported, false if not,
 * or undefined if no "compatible codec" is found.
 */
function isCompatibleCodecSupported(mimeType, codec, codecList) {
    var e_1, _a;
    var inputCodec = "".concat(mimeType, ";codecs=\"").concat(codec, "\"");
    var sameMimeTypeCodec = codecList.filter(function (c) { return c.mimeType === mimeType; });
    if (sameMimeTypeCodec.length === 0) {
        // No codec with the same MIME type was found.
        return undefined;
    }
    try {
        for (var sameMimeTypeCodec_1 = __values(sameMimeTypeCodec), sameMimeTypeCodec_1_1 = sameMimeTypeCodec_1.next(); !sameMimeTypeCodec_1_1.done; sameMimeTypeCodec_1_1 = sameMimeTypeCodec_1.next()) {
            var _b = sameMimeTypeCodec_1_1.value, currentCodec = _b.codec, currentMimeType = _b.mimeType, result = _b.result;
            var existingCodec = "".concat(currentMimeType, ";codecs=\"").concat(currentCodec, "\"");
            if ((0, are_codecs_compatible_1.default)(inputCodec, existingCodec)) {
                return result;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (sameMimeTypeCodec_1_1 && !sameMimeTypeCodec_1_1.done && (_a = sameMimeTypeCodec_1.return)) _a.call(sameMimeTypeCodec_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    // No compatible codec was found.
    return undefined;
}
