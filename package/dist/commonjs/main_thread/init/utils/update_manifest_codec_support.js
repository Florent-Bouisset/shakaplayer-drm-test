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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCodecsWithUnknownSupport = getCodecsWithUnknownSupport;
exports.updateManifestCodecSupport = updateManifestCodecSupport;
var is_codec_supported_1 = require("../../../compat/is_codec_supported");
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
var decrypt_1 = require("../../decrypt");
function getCodecsWithUnknownSupport(manifest) {
    var e_1, _a, e_2, _b, e_3, _c;
    var _d, _e, _f, _g, _h;
    var codecsWithUnknownSupport = [];
    try {
        for (var _j = __values(manifest.periods), _k = _j.next(); !_k.done; _k = _j.next()) {
            var period = _k.value;
            var checkedAdaptations = __spreadArray(__spreadArray([], __read(((_d = period.adaptations.video) !== null && _d !== void 0 ? _d : [])), false), __read(((_e = period.adaptations.audio) !== null && _e !== void 0 ? _e : [])), false);
            try {
                for (var checkedAdaptations_1 = (e_2 = void 0, __values(checkedAdaptations)), checkedAdaptations_1_1 = checkedAdaptations_1.next(); !checkedAdaptations_1_1.done; checkedAdaptations_1_1 = checkedAdaptations_1.next()) {
                    var adaptation = checkedAdaptations_1_1.value;
                    if (!adaptation.supportStatus.hasCodecWithUndefinedSupport) {
                        continue;
                    }
                    try {
                        for (var _l = (e_3 = void 0, __values(adaptation.representations)), _m = _l.next(); !_m.done; _m = _l.next()) {
                            var representation = _m.value;
                            if (representation.isSupported === undefined) {
                                codecsWithUnknownSupport.push({
                                    mimeType: (_f = representation.mimeType) !== null && _f !== void 0 ? _f : "",
                                    codec: (_h = (_g = representation.codecs) === null || _g === void 0 ? void 0 : _g[0]) !== null && _h !== void 0 ? _h : "",
                                });
                            }
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (_m && !_m.done && (_c = _l.return)) _c.call(_l);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (checkedAdaptations_1_1 && !checkedAdaptations_1_1.done && (_b = checkedAdaptations_1.return)) _b.call(checkedAdaptations_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_k && !_k.done && (_a = _j.return)) _a.call(_j);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return codecsWithUnknownSupport;
}
/**
 * Ensure that all `Representation` and `Adaptation` have a known status
 * for their codec support and probe it for cases where that's not the
 * case.
 *
 * Because probing for codec support is always synchronous in the main thread,
 * calling this function ensures that support is now known.
 *
 * @param {Object} manifest - The manifest to update
 * @param {Object|null} contentDecryptor - The current content decryptor
 * @param {boolean} isPlayingWithMSEinWorker - True if WebWorker is used with MSE in worker
 * @returns {Array.<Object>}
 */
function updateManifestCodecSupport(manifest, contentDecryptor, mediaElement, isPlayingWithMSEinWorker) {
    var codecSupportMap = new Map();
    var updatedCodecs = [];
    var efficientlyGetCodecSupport = function (mimeType, codec) {
        var _a;
        var inputCodec = "".concat(mimeType !== null && mimeType !== void 0 ? mimeType : "", ";codecs=\"").concat(codec !== null && codec !== void 0 ? codec : "", "\"");
        var baseData = codecSupportMap.get(inputCodec);
        if (baseData !== undefined) {
            return baseData;
        }
        var newData;
        var isSupported = (0, is_codec_supported_1.default)(mediaElement, inputCodec);
        if (!isSupported) {
            newData = {
                isSupportedClear: false,
                isSupportedEncrypted: false,
            };
        }
        else if ((0, is_null_or_undefined_1.default)(contentDecryptor)) {
            newData = {
                isSupportedClear: true,
                // This is ambiguous. Less assume that with no ContentDecryptor, an
                // encrypted codec is supported
                isSupportedEncrypted: true,
            };
        }
        else if (contentDecryptor.getState() === decrypt_1.ContentDecryptorState.Initializing) {
            newData = {
                isSupportedClear: true,
                isSupportedEncrypted: undefined,
            };
        }
        else {
            newData = {
                isSupportedClear: true,
                isSupportedEncrypted: (_a = contentDecryptor.isCodecSupported(mimeType !== null && mimeType !== void 0 ? mimeType : "", codec !== null && codec !== void 0 ? codec : "")) !== null && _a !== void 0 ? _a : true,
            };
        }
        codecSupportMap.set(inputCodec, newData);
        updatedCodecs.push({
            codec: codec !== null && codec !== void 0 ? codec : "",
            mimeType: mimeType !== null && mimeType !== void 0 ? mimeType : "",
            supported: newData.isSupportedClear,
            supportedIfEncrypted: newData.isSupportedEncrypted,
        });
        return newData;
    };
    manifest.periods.forEach(function (p) {
        var _a, _b, _c;
        __spreadArray(__spreadArray(__spreadArray([], __read(((_a = p.adaptations.audio) !== null && _a !== void 0 ? _a : [])), false), __read(((_b = p.adaptations.video) !== null && _b !== void 0 ? _b : [])), false), __read(((_c = p.adaptations.text) !== null && _c !== void 0 ? _c : [])), false).forEach(function (adaptation) {
            var hasSupportedCodec = false;
            var hasCodecWithUndefinedSupport = false;
            adaptation.representations.forEach(function (representation) {
                var e_4, _a;
                var _b, _c;
                if (representation.isCodecSupportedInWebWorker === false &&
                    isPlayingWithMSEinWorker) {
                    representation.isSupported = false;
                    return;
                }
                if (representation.isSupported !== undefined) {
                    if (representation.isSupported) {
                        hasSupportedCodec = true;
                    }
                    // We already knew the support for that one, continue to next one
                    return;
                }
                var isEncrypted = representation.contentProtections !== undefined;
                var mimeType = (_b = representation.mimeType) !== null && _b !== void 0 ? _b : "";
                var codecs = (_c = representation.codecs) !== null && _c !== void 0 ? _c : [];
                if (codecs.length === 0) {
                    codecs = [""];
                }
                try {
                    for (var codecs_1 = __values(codecs), codecs_1_1 = codecs_1.next(); !codecs_1_1.done; codecs_1_1 = codecs_1.next()) {
                        var codec = codecs_1_1.value;
                        var codecSupportInfo = efficientlyGetCodecSupport(mimeType, codec);
                        if (!isEncrypted) {
                            representation.isSupported = codecSupportInfo.isSupportedClear;
                        }
                        else if (representation.isSupported !== codecSupportInfo.isSupportedEncrypted) {
                            representation.isSupported = codecSupportInfo.isSupportedEncrypted;
                        }
                        if (representation.isSupported === undefined) {
                            hasCodecWithUndefinedSupport = true;
                        }
                        else if (representation.isSupported) {
                            hasSupportedCodec = true;
                            representation.codecs = [codec];
                            // Don't test subsequent codecs for that Representation
                            break;
                        }
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (codecs_1_1 && !codecs_1_1.done && (_a = codecs_1.return)) _a.call(codecs_1);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            });
            adaptation.supportStatus.hasCodecWithUndefinedSupport =
                hasCodecWithUndefinedSupport;
            if (hasCodecWithUndefinedSupport && !hasSupportedCodec) {
                adaptation.supportStatus.hasSupportedCodec = undefined;
            }
            else {
                adaptation.supportStatus.hasSupportedCodec = hasSupportedCodec;
            }
        });
    });
    return updatedCodecs;
}
