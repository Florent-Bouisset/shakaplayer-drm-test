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
Object.defineProperty(exports, "__esModule", { value: true });
var can_rely_on_request_media_key_system_access_1 = require("../../../compat/can_rely_on_request_media_key_system_access");
var eme_1 = require("../../../compat/eme");
var generate_init_data_1 = require("../../../compat/generate_init_data");
var log_1 = require("./log");
var decodingInfo_1 = require("./probers/decodingInfo");
var HDCPPolicy_1 = require("./probers/HDCPPolicy");
var isTypeSupportedWithFeatures_1 = require("./probers/isTypeSupportedWithFeatures");
var mediaContentType_1 = require("./probers/mediaContentType");
var mediaDisplayInfos_1 = require("./probers/mediaDisplayInfos");
/**
 * A set of API to probe media capabilites.
 * Each API allow to evalute a specific feature (HDCP support, decoding infos, etc)
 * and relies on different browser API to probe capabilites.
 */
var mediaCapabilitiesProber = {
    /**
     * Set logger level
     * @param {string} level
     */
    set LogLevel(level) {
        log_1.default.setLevel(level, log_1.default.getFormat());
    },
    /**
     * Get logger level
     * @returns {string}
     */
    get LogLevel() {
        return log_1.default.getLevel();
    },
    /**
     * @param {string} keySystemType - Reverse domain name of the wanted key
     * system.
     * @param {Array.<MediaKeySystemConfiguration>} keySystemConfiguration - DRM
     * configuration wanted.
     * @returns {Promise.<MediaKeySystemConfiguration>} - Resolved the
     * MediaKeySystemConfiguration actually obtained if the given configuration is
     * compatible or a rejected Promise if not.
     */
    checkDrmConfiguration: function (keySystemType, keySystemConfiguration) {
        return __awaiter(this, void 0, void 0, function () {
            var eme, error, mksa, mediaKeys, session, initData, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        eme = (0, eme_1.default)("auto");
                        if (eme === null) {
                            error = new Error("EME not supported in current environment");
                            throw error;
                        }
                        return [4 /*yield*/, eme.requestMediaKeySystemAccess(keySystemType, keySystemConfiguration)];
                    case 1:
                        mksa = _a.sent();
                        if (!!(0, can_rely_on_request_media_key_system_access_1.canRelyOnRequestMediaKeySystemAccess)(keySystemType)) return [3 /*break*/, 7];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 5, , 6]);
                        return [4 /*yield*/, mksa.createMediaKeys()];
                    case 3:
                        mediaKeys = _a.sent();
                        session = mediaKeys.createSession();
                        initData = (0, generate_init_data_1.generatePlayReadyInitData)(generate_init_data_1.DUMMY_PLAY_READY_HEADER);
                        return [4 /*yield*/, session.generateRequest("cenc", initData)];
                    case 4:
                        _a.sent();
                        session.close().catch(function () {
                            log_1.default.warn("MediaCapabilitiesProber", "Failed to close the dummy session");
                        });
                        return [2 /*return*/, mksa.getConfiguration()];
                    case 5:
                        err_1 = _a.sent();
                        log_1.default.debug("MediaCapabilitiesProber", "KeySystemAccess was granted but it is not usable");
                        return [2 /*return*/, Promise.reject(new Error("Failed to generare a license-request with this keySystem: " +
                                (err_1 instanceof Error ? err_1.toString() : "Unknown Error")))];
                    case 6: return [3 /*break*/, 8];
                    case 7: return [2 /*return*/, mksa.getConfiguration()];
                    case 8: return [2 /*return*/];
                }
            });
        });
    },
    /**
     * Get HDCP status. Evaluates if current equipement support given
     * HDCP revision.
     * @param {string} hdcpVersion - The wanted HDCP version to test (e.g.
     * `"1.1"`).
     * @returns {Promise.<string>} - Returns a Promise which rejects if the
     * browser API we need to rely on unexpectedly fail.
     *
     * If they resolve, resolve with one of the following string:
     *
     *   - `"Supported"`: The HDCP version is probably supported
     *
     *   - `"NotSupported"`: The HDCP version is probably not supported
     *
     *   - `"Unknown"`: It is unknown if the HDCP version may be supported or not.
     */
    getStatusForHDCP: function (hdcpVersion) {
        return __awaiter(this, void 0, void 0, function () {
            var res, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (hdcpVersion === undefined || hdcpVersion.length === 0) {
                            throw new Error("Bad Arguments: No HDCP Policy specified.");
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, isTypeSupportedWithFeatures_1.default)({ hdcp: hdcpVersion })];
                    case 2:
                        res = _b.sent();
                        switch (res) {
                            case "NotSupported":
                            case "Supported":
                                return [2 /*return*/, res];
                            case "Unknown":
                                // continue
                                break;
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/, (0, HDCPPolicy_1.default)(hdcpVersion)];
                }
            });
        });
    },
    /**
     * Get decoding capabilities from a given video and/or audio
     * configuration.
     * TODO check alongside key system.
     * @param {Object} mediaConfig
     * @returns {Promise.<string>}
     */
    getDecodingCapabilities: function (mediaConfig) {
        return __awaiter(this, void 0, void 0, function () {
            var config, isCodecSupported, status_1, error, res, _a, res, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        config = {
                            type: mediaConfig.type,
                            video: mediaConfig.video,
                            audio: mediaConfig.audio,
                        };
                        isCodecSupported = false;
                        try {
                            status_1 = (0, mediaContentType_1.default)(config);
                            if (status_1 === "Supported") {
                                isCodecSupported = true;
                            }
                            else if (status_1 === "NotSupported") {
                                return [2 /*return*/, "NotSupported"];
                            }
                        }
                        catch (err) {
                            error = err instanceof Error ? err : new Error("Unknown error");
                            log_1.default.error("MediaCapabilitiesProber", "probeContentType failed", error);
                        }
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, isTypeSupportedWithFeatures_1.default)(config)];
                    case 2:
                        res = _c.sent();
                        if (res === "NotSupported") {
                            return [2 /*return*/, "NotSupported"];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _c.sent();
                        return [3 /*break*/, 4];
                    case 4:
                        _c.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, (0, decodingInfo_1.default)(config)];
                    case 5:
                        res = _c.sent();
                        return [2 /*return*/, res];
                    case 6:
                        _b = _c.sent();
                        return [2 /*return*/, isCodecSupported ? "Supported" : "Unknown"];
                    case 7: return [2 /*return*/];
                }
            });
        });
    },
    /**
     * Get display capabilites. Tells if display can output
     * with specific video and/or audio constrains.
     * TODO I'm sure there's now newer APIs we can use for this (e.g. CSS etc.)
     * @param {Object} displayConfig
     * @returns {Promise.<string>}
     */
    getDisplayCapabilities: function (displayConfig) {
        return __awaiter(this, void 0, void 0, function () {
            var config, matchMediaSupported, status_2, res, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        config = { display: displayConfig };
                        try {
                            status_2 = (0, mediaDisplayInfos_1.default)(config);
                            if (status_2 === "Supported") {
                                matchMediaSupported = true;
                            }
                            else {
                                return [2 /*return*/, "NotSupported"];
                            }
                        }
                        catch (_c) {
                            // We do not care here
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, isTypeSupportedWithFeatures_1.default)(config)];
                    case 2:
                        res = _b.sent();
                        if (res === "NotSupported") {
                            return [2 /*return*/, "NotSupported"];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/, matchMediaSupported === true ? "Supported" : "Unknown"];
                }
            });
        });
    },
};
exports.default = mediaCapabilitiesProber;
