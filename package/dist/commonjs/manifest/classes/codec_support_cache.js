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
/**
 * Class setting up a cache of which codec is currently known to be supported or
 * not.
 *
 * We keep this only at the Manifest level because external conditions can change
 * from Manifest to Manifest (e.g. not the same decryption cabalities used etc.).
 */
var CodecSupportCache = /** @class */ (function () {
    /**
     * Constructs an CodecSupportCache instance.
     * @param {Array} codecList - List of codec support information.
     */
    function CodecSupportCache(codecList) {
        this.supportMap = new Map();
        this.addCodecs(codecList);
    }
    /**
     * Adds codec support information to this `CodecSupportCache`.
     * @param {Array} codecList - List of codec support information.
     */
    CodecSupportCache.prototype.addCodecs = function (codecList) {
        var e_1, _a;
        try {
            for (var codecList_1 = __values(codecList), codecList_1_1 = codecList_1.next(); !codecList_1_1.done; codecList_1_1 = codecList_1.next()) {
                var codec = codecList_1_1.value;
                var mimeTypeMap = this.supportMap.get(codec.mimeType);
                if (mimeTypeMap === undefined) {
                    mimeTypeMap = new Map();
                    this.supportMap.set(codec.mimeType, mimeTypeMap);
                }
                mimeTypeMap.set(codec.codec, {
                    supported: codec.supported,
                    supportedIfEncrypted: codec.supportedIfEncrypted,
                });
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (codecList_1_1 && !codecList_1_1.done && (_a = codecList_1.return)) _a.call(codecList_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    /**
     * Checks if a codec is supported for a given MIME type.
     * @param {string} mimeType - The MIME type to check.
     * @param {string} codec - The codec to check.
     * @param {boolean} isEncrypted - Whether the content is encrypted.
     * @returns {boolean | undefined} - `true` if the codec is supported, `false`
     * if not, or `undefined` if no support information is found.
     */
    CodecSupportCache.prototype.isSupported = function (mimeType, codec, isEncrypted) {
        var mimeTypeMap = this.supportMap.get(mimeType);
        if (mimeTypeMap === undefined) {
            return undefined;
        }
        var result = mimeTypeMap.get(codec);
        if (result === undefined) {
            return undefined;
        }
        if (isEncrypted) {
            return result.supportedIfEncrypted;
        }
        else {
            return result.supported;
        }
    };
    return CodecSupportCache;
}());
exports.default = CodecSupportCache;
