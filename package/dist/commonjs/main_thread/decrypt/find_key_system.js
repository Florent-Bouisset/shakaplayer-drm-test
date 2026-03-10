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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
exports.extractCodecSupportListFromConfiguration = extractCodecSupportListFromConfiguration;
exports.default = getMediaKeySystemAccess;
exports.testKeySystem = testKeySystem;
var can_rely_on_request_media_key_system_access_1 = require("../../compat/can_rely_on_request_media_key_system_access");
var generate_init_data_1 = require("../../compat/generate_init_data");
var should_renew_media_key_system_access_1 = require("../../compat/should_renew_media_key_system_access");
var config_1 = require("../../config");
var errors_1 = require("../../errors");
var log_1 = require("../../log");
var are_codecs_compatible_1 = require("../../utils/are_codecs_compatible");
var array_includes_1 = require("../../utils/array_includes");
var flat_map_1 = require("../../utils/flat_map");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var media_keys_attacher_1 = require("./utils/media_keys_attacher");
/**
 * Takes a `newConfiguration` `MediaKeySystemConfiguration`, that is intended
 * for the creation of a `MediaKeySystemAccess`, and a `prevConfiguration`
 * `MediaKeySystemConfiguration`, that was the one used at creation of the
 * current `MediaKeySystemAccess`.
 *
 * This function will then return `true` if it determined that the new
 * configuration is conceptually compatible with the one used before, and
 * `false` otherwise.
 * @param {Object} newConfiguration - New wanted `MediaKeySystemConfiguration`
 * @param {Object} prevConfiguration - The `MediaKeySystemConfiguration` that is
 * relied on util now.
 * @returns {boolean} - `true` if `newConfiguration` is compatible with
 * `prevConfiguration`.
 */
function isNewMediaKeySystemConfigurationCompatibleWithPreviousOne(newConfiguration, prevConfiguration) {
    var e_1, _a;
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    if (newConfiguration.label !== prevConfiguration.label) {
        return false;
    }
    var prevDistinctiveIdentifier = (_b = prevConfiguration.distinctiveIdentifier) !== null && _b !== void 0 ? _b : "optional";
    var newDistinctiveIdentifier = (_c = newConfiguration.distinctiveIdentifier) !== null && _c !== void 0 ? _c : "optional";
    if (prevDistinctiveIdentifier !== newDistinctiveIdentifier) {
        return false;
    }
    var prevPersistentState = (_d = prevConfiguration.persistentState) !== null && _d !== void 0 ? _d : "optional";
    var newPersistentState = (_e = newConfiguration.persistentState) !== null && _e !== void 0 ? _e : "optional";
    if (prevPersistentState !== newPersistentState) {
        return false;
    }
    var prevInitDataTypes = (_f = prevConfiguration.initDataTypes) !== null && _f !== void 0 ? _f : [];
    var newInitDataTypes = (_g = newConfiguration.initDataTypes) !== null && _g !== void 0 ? _g : [];
    if (!isArraySubsetOf(newInitDataTypes, prevInitDataTypes)) {
        return false;
    }
    var prevSessionTypes = (_h = prevConfiguration.sessionTypes) !== null && _h !== void 0 ? _h : [];
    var newSessionTypes = (_j = newConfiguration.sessionTypes) !== null && _j !== void 0 ? _j : [];
    if (!isArraySubsetOf(newSessionTypes, prevSessionTypes)) {
        return false;
    }
    var _loop_1 = function (prop) {
        var newCapabilities = (_k = newConfiguration[prop]) !== null && _k !== void 0 ? _k : [];
        var prevCapabilities = (_l = prevConfiguration[prop]) !== null && _l !== void 0 ? _l : [];
        var wasFound = newCapabilities.every(function (n) {
            var _a, _b, _c, _d, _e, _f;
            for (var i = 0; i < prevCapabilities.length; i++) {
                var prevCap = prevCapabilities[i];
                if (((_a = prevCap.robustness) !== null && _a !== void 0 ? _a : "") === ((_b = n.robustness) !== null && _b !== void 0 ? _b : "") ||
                    ((_c = prevCap.encryptionScheme) !== null && _c !== void 0 ? _c : null) === ((_d = n.encryptionScheme) !== null && _d !== void 0 ? _d : null) ||
                    ((_e = prevCap.robustness) !== null && _e !== void 0 ? _e : "") === ((_f = n.robustness) !== null && _f !== void 0 ? _f : "")) {
                    return true;
                }
            }
            return false;
        });
        if (!wasFound) {
            return { value: false };
        }
    };
    try {
        for (var _m = __values(["audioCapabilities", "videoCapabilities"]), _o = _m.next(); !_o.done; _o = _m.next()) {
            var prop = _o.value;
            var state_1 = _loop_1(prop);
            if (typeof state_1 === "object")
                return state_1.value;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_o && !_o.done && (_a = _m.return)) _a.call(_m);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return true;
}
/**
 * Find key system canonical name from key system type.
 * @param {string} ksType - Obtained via inversion
 * @returns {string|undefined} - Either the canonical name, or undefined.
 */
function findKeySystemCanonicalName(ksType) {
    var e_2, _a;
    var EME_KEY_SYSTEMS = config_1.default.getCurrent().EME_KEY_SYSTEMS;
    try {
        for (var _b = __values(Object.keys(EME_KEY_SYSTEMS)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var ksName = _c.value;
            if ((0, array_includes_1.default)(EME_KEY_SYSTEMS[ksName], ksType)) {
                return ksName;
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return undefined;
}
/**
 * Build configuration for the requestMediaKeySystemAccess EME API, based
 * on the current keySystem object.
 * @param {Object} keySystemTypeInfo
 * @returns {Array.<Object>} - Configuration to give to the
 * requestMediaKeySystemAccess API.
 */
function buildKeySystemConfigurations(keySystemTypeInfo) {
    var keyName = keySystemTypeInfo.keyName, keyType = keySystemTypeInfo.keyType, keySystem = keySystemTypeInfo.keySystemOptions;
    var sessionTypes;
    var persistentState = "optional";
    var distinctiveIdentifier = "optional";
    if (Array.isArray(keySystem.wantedSessionTypes)) {
        sessionTypes = keySystem.wantedSessionTypes;
        if ((0, array_includes_1.default)(keySystem.wantedSessionTypes, "persistent-license") &&
            !(0, is_null_or_undefined_1.default)(keySystem.persistentLicenseConfig)) {
            persistentState = "required";
        }
    }
    else if (!(0, is_null_or_undefined_1.default)(keySystem.persistentLicenseConfig)) {
        persistentState = "required";
        sessionTypes = ["persistent-license"];
    }
    else {
        sessionTypes = ["temporary"];
    }
    if (!(0, is_null_or_undefined_1.default)(keySystem.persistentState)) {
        persistentState = keySystem.persistentState;
    }
    if (!(0, is_null_or_undefined_1.default)(keySystem.distinctiveIdentifier)) {
        distinctiveIdentifier = keySystem.distinctiveIdentifier;
    }
    var _a = config_1.default.getCurrent(), EME_DEFAULT_AUDIO_CODECS = _a.EME_DEFAULT_AUDIO_CODECS, EME_DEFAULT_VIDEO_CODECS = _a.EME_DEFAULT_VIDEO_CODECS, EME_DEFAULT_WIDEVINE_ROBUSTNESSES = _a.EME_DEFAULT_WIDEVINE_ROBUSTNESSES, EME_DEFAULT_PLAYREADY_RECOMMENDATION_ROBUSTNESSES = _a.EME_DEFAULT_PLAYREADY_RECOMMENDATION_ROBUSTNESSES;
    // From the W3 EME spec, we have to provide videoCapabilities and
    // audioCapabilities.
    // These capabilities must specify a codec (even though you can use a
    // completely different codec afterward).
    // It is also strongly recommended to specify the required security
    // robustness. As we do not want to forbide any security level, we specify
    // every existing security level from highest to lowest so that the best
    // security level is selected.
    // More details here:
    // https://storage.googleapis.com/wvdocs/Chrome_EME_Changes_and_Best_Practices.pdf
    // https://www.w3.org/TR/encrypted-media/#get-supported-configuration-and-consent
    var audioCapabilities;
    var videoCapabilities;
    var audioCapabilitiesConfig = keySystem.audioCapabilitiesConfig, videoCapabilitiesConfig = keySystem.videoCapabilitiesConfig;
    if ((audioCapabilitiesConfig === null || audioCapabilitiesConfig === void 0 ? void 0 : audioCapabilitiesConfig.type) === "full") {
        audioCapabilities = audioCapabilitiesConfig.value;
    }
    else {
        var audioRobustnesses = void 0;
        if ((audioCapabilitiesConfig === null || audioCapabilitiesConfig === void 0 ? void 0 : audioCapabilitiesConfig.type) === "robustness") {
            audioRobustnesses = audioCapabilitiesConfig.value;
        }
        else if (keyName === "widevine") {
            audioRobustnesses = EME_DEFAULT_WIDEVINE_ROBUSTNESSES;
        }
        else if (keyType === "com.microsoft.playready.recommendation") {
            audioRobustnesses = EME_DEFAULT_PLAYREADY_RECOMMENDATION_ROBUSTNESSES;
        }
        else {
            audioRobustnesses = [];
        }
        if (audioRobustnesses.length === 0) {
            audioRobustnesses.push(undefined);
        }
        var audioCodecs_1 = (audioCapabilitiesConfig === null || audioCapabilitiesConfig === void 0 ? void 0 : audioCapabilitiesConfig.type) === "contentType"
            ? audioCapabilitiesConfig.value
            : EME_DEFAULT_AUDIO_CODECS;
        audioCapabilities = (0, flat_map_1.default)(audioRobustnesses, function (robustness) {
            return audioCodecs_1.map(function (contentType) {
                return robustness !== undefined ? { contentType: contentType, robustness: robustness } : { contentType: contentType };
            });
        });
    }
    if ((videoCapabilitiesConfig === null || videoCapabilitiesConfig === void 0 ? void 0 : videoCapabilitiesConfig.type) === "full") {
        videoCapabilities = videoCapabilitiesConfig.value;
    }
    else {
        var videoRobustnesses = void 0;
        if ((videoCapabilitiesConfig === null || videoCapabilitiesConfig === void 0 ? void 0 : videoCapabilitiesConfig.type) === "robustness") {
            videoRobustnesses = videoCapabilitiesConfig.value;
        }
        else if (keyName === "widevine") {
            videoRobustnesses = EME_DEFAULT_WIDEVINE_ROBUSTNESSES;
        }
        else if (keyType === "com.microsoft.playready.recommendation") {
            videoRobustnesses = EME_DEFAULT_PLAYREADY_RECOMMENDATION_ROBUSTNESSES;
        }
        else {
            videoRobustnesses = [];
        }
        if (videoRobustnesses.length === 0) {
            videoRobustnesses.push(undefined);
        }
        var videoCodecs_1 = (videoCapabilitiesConfig === null || videoCapabilitiesConfig === void 0 ? void 0 : videoCapabilitiesConfig.type) === "contentType"
            ? videoCapabilitiesConfig.value
            : EME_DEFAULT_VIDEO_CODECS;
        videoCapabilities = (0, flat_map_1.default)(videoRobustnesses, function (robustness) {
            return videoCodecs_1.map(function (contentType) {
                return robustness !== undefined ? { contentType: contentType, robustness: robustness } : { contentType: contentType };
            });
        });
    }
    var wantedMediaKeySystemConfiguration = {
        initDataTypes: ["cenc"],
        videoCapabilities: videoCapabilities,
        audioCapabilities: audioCapabilities,
        distinctiveIdentifier: distinctiveIdentifier,
        persistentState: persistentState,
        sessionTypes: sessionTypes,
    };
    if (audioCapabilitiesConfig !== undefined) {
        if (videoCapabilitiesConfig !== undefined) {
            return [wantedMediaKeySystemConfiguration];
        }
        return [
            wantedMediaKeySystemConfiguration,
            __assign(__assign({}, wantedMediaKeySystemConfiguration), { 
                // Re-try without `videoCapabilities` in case the EME implementation is
                // buggy
                videoCapabilities: undefined }),
        ];
    }
    else if (videoCapabilitiesConfig !== undefined) {
        return [
            wantedMediaKeySystemConfiguration,
            __assign(__assign({}, wantedMediaKeySystemConfiguration), { 
                // Re-try without `audioCapabilities` in case the EME implementation is
                // buggy
                audioCapabilities: undefined }),
        ];
    }
    return [
        wantedMediaKeySystemConfiguration,
        // Some legacy implementations have issues with `audioCapabilities` and
        // `videoCapabilities`, so we're including a supplementary
        // `MediaKeySystemConfiguration` without those properties.
        __assign(__assign({}, wantedMediaKeySystemConfiguration), { audioCapabilities: undefined, videoCapabilities: undefined }),
    ];
}
/**
 * Extract from the current mediaKeys the supported Codecs.
 * @param {Object} initialConfiguration - The MediaKeySystemConfiguration given
 * to the `navigator.requestMediaKeySystemAccess` API.
 * @param {Object | undefined} mksConfiguration - The result of
 * getConfiguration() of the media keys.
 * @return {Array} The list of supported codec by the CDM.
 */
function extractCodecSupportListFromConfiguration(initialConfiguration, mksConfiguration) {
    var _a, _b, _c, _d, _e, _f;
    var testedAudioCodecs = (_b = (_a = initialConfiguration.audioCapabilities) === null || _a === void 0 ? void 0 : _a.map(function (v) { return v.contentType; })) !== null && _b !== void 0 ? _b : [];
    var testedVideoCodecs = (_d = (_c = initialConfiguration.videoCapabilities) === null || _c === void 0 ? void 0 : _c.map(function (v) { return v.contentType; })) !== null && _d !== void 0 ? _d : [];
    var testedCodecs = testedAudioCodecs
        .concat(testedVideoCodecs)
        .filter(function (c) { return c !== undefined; });
    var supportedVideoCodecs = (_e = mksConfiguration.videoCapabilities) === null || _e === void 0 ? void 0 : _e.map(function (entry) { return entry.contentType; });
    var supportedAudioCodecs = (_f = mksConfiguration.audioCapabilities) === null || _f === void 0 ? void 0 : _f.map(function (entry) { return entry.contentType; });
    var supportedCodecs = __spreadArray(__spreadArray([], __read((supportedVideoCodecs !== null && supportedVideoCodecs !== void 0 ? supportedVideoCodecs : [])), false), __read((supportedAudioCodecs !== null && supportedAudioCodecs !== void 0 ? supportedAudioCodecs : [])), false).filter(function (contentType) { return contentType !== undefined; });
    if (supportedCodecs.length === 0) {
        // Some legacy implementations have issues with `audioCapabilities` and
        // `videoCapabilities` in requestMediaKeySystemAccess so the codecs are not provided.
        // In this case, we can't tell which codec is supported or not.
        // Let's instead provide an empty list.
        // Note: on a correct EME implementation, if a list of codec is provided
        // with `audioCapabilities` or `videoCapabilities`, but none of them is supported,
        // requestMediaKeySystemAccess should yield an error "NotSupported" and we should
        // never reach this code.
        return [];
    }
    var codecSupportList = testedCodecs.map(function (codec) {
        var _a = (0, are_codecs_compatible_1.parseCodec)(codec), codecs = _a.codecs, mimeType = _a.mimeType;
        var isSupported = (0, array_includes_1.default)(supportedCodecs, codec);
        return {
            codec: codecs,
            mimeType: mimeType,
            result: isSupported,
        };
    });
    return codecSupportList;
}
/**
 * Try to find a compatible key system from the keySystems array given.
 *
 * This function will request a MediaKeySystemAccess based on the various
 * keySystems provided.
 *
 * This Promise might either:
 *   - resolves the MediaKeySystemAccess and the keySystems as an object, when
 *     found.
 *   - reject if no compatible key system has been found.
 *
 * @param {Object} eme - current EME implementation
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystemsConfigs - The keySystems you want to test.
 * @param {Object} cancelSignal
 * @returns {Promise.<Object>}
 */
function getMediaKeySystemAccess(eme, mediaElement, keySystemsConfigs, cancelSignal) {
    log_1.default.info("DRM", "Searching for compatible MediaKeySystemAccess");
    /** Array of set keySystems for this content. */
    var keySystemsType = keySystemsConfigs.reduce(function (arr, keySystemOptions) {
        var EME_KEY_SYSTEMS = config_1.default.getCurrent().EME_KEY_SYSTEMS;
        var managedRDNs = EME_KEY_SYSTEMS[keySystemOptions.type];
        var ksType;
        if (!(0, is_null_or_undefined_1.default)(managedRDNs)) {
            ksType = managedRDNs.map(function (keyType) {
                var keyName = keySystemOptions.type;
                return { keyName: keyName, keyType: keyType, keySystemOptions: keySystemOptions };
            });
        }
        else {
            var keyName = findKeySystemCanonicalName(keySystemOptions.type);
            var keyType = keySystemOptions.type;
            ksType = [{ keyName: keyName, keyType: keyType, keySystemOptions: keySystemOptions }];
        }
        return arr.concat(ksType);
    }, []);
    return recursivelyTestKeySystems(0);
    /**
     * Test all key system configuration stored in `keySystemsType` one by one
     * recursively.
     * Returns a Promise which will emit the MediaKeySystemAccess if one was
     * found compatible with one of the configurations or just reject if none
     * were found to be compatible.
     * @param {Number} index - The index in `keySystemsType` to start from.
     * Should be set to `0` when calling directly.
     * @returns {Promise.<Object>}
     */
    function recursivelyTestKeySystems(index) {
        return __awaiter(this, void 0, void 0, function () {
            var chosenType, keyType, keySystemOptions, keySystemConfigurations, keySystemAccess, currentState, configIdx, keySystemConfiguration, _1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // if we iterated over the whole keySystemsType Array, quit on error
                        if (index >= keySystemsType.length) {
                            throw new errors_1.EncryptedMediaError("INCOMPATIBLE_KEYSYSTEMS", "No key system compatible with your wanted " +
                                "configuration has been found in the current " +
                                "browser.", {
                                keyStatuses: undefined,
                                keySystemConfiguration: undefined,
                                keySystem: undefined,
                            });
                        }
                        if ((0, is_null_or_undefined_1.default)(eme.requestMediaKeySystemAccess)) {
                            throw new Error("requestMediaKeySystemAccess is not implemented in your browser.");
                        }
                        chosenType = keySystemsType[index];
                        keyType = chosenType.keyType, keySystemOptions = chosenType.keySystemOptions;
                        keySystemConfigurations = buildKeySystemConfigurations(chosenType);
                        log_1.default.debug("DRM", "Request keysystem access", {
                            keyType: keyType,
                            index: index,
                            length: keySystemsType.length,
                        });
                        return [4 /*yield*/, media_keys_attacher_1.default.getAttachedMediaKeysState(mediaElement)];
                    case 1:
                        currentState = _a.sent();
                        configIdx = 0;
                        _a.label = 2;
                    case 2:
                        if (!(configIdx < keySystemConfigurations.length)) return [3 /*break*/, 7];
                        keySystemConfiguration = keySystemConfigurations[configIdx];
                        // Check if the current `MediaKeySystemAccess` created cannot be reused here
                        if (currentState !== null &&
                            !(0, should_renew_media_key_system_access_1.default)(currentState.mediaKeySystemAccess.keySystem) &&
                            // TODO: Do it with MediaKeySystemAccess.prototype.keySystem instead?
                            keyType === currentState.mediaKeySystemAccess.keySystem &&
                            eme.implementation === currentState.emeImplementation.implementation &&
                            isNewMediaKeySystemConfigurationCompatibleWithPreviousOne(keySystemConfiguration, currentState.askedConfiguration)) {
                            log_1.default.info("DRM", "Found cached compatible keySystem");
                            return [2 /*return*/, Promise.resolve({
                                    type: "reuse-media-key-system-access",
                                    value: {
                                        mediaKeySystemAccess: currentState.mediaKeySystemAccess,
                                        askedConfiguration: currentState.askedConfiguration,
                                        options: keySystemOptions,
                                        codecSupport: extractCodecSupportListFromConfiguration(currentState.askedConfiguration, currentState.mediaKeySystemAccess.getConfiguration()),
                                    },
                                })];
                        }
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, testKeySystem(eme, keyType, [keySystemConfiguration])];
                    case 4:
                        keySystemAccess = _a.sent();
                        log_1.default.info("DRM", "Found compatible keysystem", {
                            keyType: keyType,
                            index: index,
                            configIndex: configIdx,
                        });
                        return [2 /*return*/, {
                                type: "create-media-key-system-access",
                                value: {
                                    options: keySystemOptions,
                                    mediaKeySystemAccess: keySystemAccess,
                                    askedConfiguration: keySystemConfiguration,
                                    codecSupport: extractCodecSupportListFromConfiguration(keySystemConfiguration, keySystemAccess.getConfiguration()),
                                },
                            }];
                    case 5:
                        _1 = _a.sent();
                        log_1.default.debug("DRM", "Rejected access to keysystem", {
                            keyType: keyType,
                            index: index,
                            configIndex: configIdx,
                        });
                        if (cancelSignal.cancellationError !== null) {
                            throw cancelSignal.cancellationError;
                        }
                        return [3 /*break*/, 6];
                    case 6:
                        configIdx++;
                        return [3 /*break*/, 2];
                    case 7: return [2 /*return*/, recursivelyTestKeySystems(index + 1)];
                }
            });
        });
    }
}
/**
 * Test a key system configuration, resolves with the MediaKeySystemAccess
 * or reject if the key system is unsupported.
 * @param {Object} eme - current EME implementation
 * @param {string} keyType - The KeySystem string to test (ex: com.microsoft.playready.recommendation)
 * @param {Array.<MediaKeySystemMediaCapability>} keySystemConfigurations - Configurations for this keySystem
 * @returns Promise resolving with the MediaKeySystemAccess. Rejects if unsupported.
 */
function testKeySystem(eme, keyType, keySystemConfigurations) {
    return __awaiter(this, void 0, void 0, function () {
        var keySystemAccess, mediaKeys, session, initData, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, eme.requestMediaKeySystemAccess(keyType, keySystemConfigurations)];
                case 1:
                    keySystemAccess = _a.sent();
                    if (!!(0, can_rely_on_request_media_key_system_access_1.canRelyOnRequestMediaKeySystemAccess)(keyType)) return [3 /*break*/, 6];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 5, , 6]);
                    return [4 /*yield*/, keySystemAccess.createMediaKeys()];
                case 3:
                    mediaKeys = _a.sent();
                    session = mediaKeys.createSession();
                    initData = (0, generate_init_data_1.generatePlayReadyInitData)(generate_init_data_1.DUMMY_PLAY_READY_HEADER);
                    return [4 /*yield*/, session.generateRequest("cenc", initData)];
                case 4:
                    _a.sent();
                    session.close().catch(function () {
                        log_1.default.warn("DRM", "Failed to close the dummy session");
                    });
                    return [3 /*break*/, 6];
                case 5:
                    err_1 = _a.sent();
                    log_1.default.debug("DRM", "KeySystemAccess was granted but it is not usable");
                    throw err_1;
                case 6: return [2 /*return*/, keySystemAccess];
            }
        });
    });
}
/**
 * Returns `true` if `arr1`'s values are entirely contained in `arr2`.
 * @param {string} arr1
 * @param {string} arr2
 * @return {boolean}
 */
function isArraySubsetOf(arr1, arr2) {
    for (var i = 0; i < arr1.length; i++) {
        if (!(0, array_includes_1.default)(arr2, arr1[i])) {
            return false;
        }
    }
    return true;
}
