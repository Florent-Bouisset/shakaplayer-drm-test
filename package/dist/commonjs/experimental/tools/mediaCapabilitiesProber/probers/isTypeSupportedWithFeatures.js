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
exports.default = probeTypeWithFeatures;
var global_scope_1 = require("../../../../utils/global_scope");
var is_null_or_undefined_1 = require("../../../../utils/is_null_or_undefined");
var defaultCodecsFinder_1 = require("./defaultCodecsFinder");
/**
 * @returns {boolean}
 */
function isTypeSupportedWithFeaturesAPIAvailable() {
    if (!("MSMediaKeys" in global_scope_1.default)) {
        // MSMediaKeys API not available
        return false;
    }
    if (!("isTypeSupportedWithFeatures" in
        global_scope_1.default.MSMediaKeys)) {
        // isTypeSupportedWithFeatures not available
        return false;
    }
    return true;
}
/**
 * Rely on `MSMediaKeys`-only API `isTypeSupportedWithFeatures` to check for
 * several potential features.
 * @param {Object} config
 * @returns {Promise}
 */
function probeTypeWithFeatures(config) {
    return __awaiter(this, void 0, void 0, function () {
        function formatSupport(support) {
            if (support === "") {
                throw new Error("Bad arguments for calling isTypeSupportedWithFeatures");
            }
            else {
                switch (support) {
                    case "Not Supported":
                        return "NotSupported";
                    case "Maybe":
                        return "Unknown";
                    case "Probably":
                        return "Supported";
                    default:
                        return "Unknown";
                }
            }
        }
        var keySystem, type, features, result;
        return __generator(this, function (_a) {
            if (!isTypeSupportedWithFeaturesAPIAvailable()) {
                throw new Error("MSMediaKeys.isTypeSupportedWithFeatures is not available");
            }
            keySystem = config.keySystem;
            type = (function () {
                if (keySystem === undefined ||
                    keySystem.type === undefined ||
                    keySystem.type.length === 0) {
                    return "org.w3.clearkey";
                }
                return keySystem.type;
            })();
            features = formatTypeSupportedWithFeaturesConfigForAPI(config);
            result = global_scope_1.default.MSMediaKeys.isTypeSupportedWithFeatures(type, features);
            return [2 /*return*/, formatSupport(result)];
        });
    });
}
/**
 * @param {Object} config
 * @returns {string|null}
 */
function formatTypeSupportedWithFeaturesConfigForAPI(config) {
    var video = config.video, audio = config.audio, outputHdcp = config.hdcp, display = config.display;
    var defaultVideoCodec = (0, defaultCodecsFinder_1.findDefaultVideoCodec)();
    var str = (function () {
        if (video === undefined ||
            video.contentType === undefined ||
            video.contentType.length === 0) {
            return defaultVideoCodec;
        }
        return video.contentType;
    })();
    if (audio !== undefined &&
        audio.contentType !== undefined &&
        audio.contentType.length > 0) {
        var regex = /codecs="(.*?)"/;
        var match = regex.exec(audio.contentType);
        if (!(0, is_null_or_undefined_1.default)(match)) {
            var codec = match[1];
            str = str.substring(0, str.length - 2) + "," + codec;
        }
    }
    var feat = [];
    if (video !== undefined && video.width !== undefined && video.width > 0) {
        feat.push("decode-res-x=" + video.width.toString() + "");
    }
    if (video !== undefined && video.height !== undefined && video.height > 0) {
        feat.push("decode-res-y=" + video.height.toString() + "");
    }
    if (video !== undefined &&
        video.bitsPerComponent !== undefined &&
        video.bitsPerComponent > 0) {
        feat.push("decode-bpc=" + video.bitsPerComponent.toString() + "");
    }
    if (video !== undefined && video.bitrate !== undefined && video.bitrate > 0) {
        feat.push("decode-bitrate=" + video.bitrate.toString() + "");
    }
    if (video !== undefined &&
        video.framerate !== undefined &&
        video.framerate.length > 0) {
        feat.push("decode-fps=" + video.framerate + "");
    }
    if (display !== undefined) {
        if (display.width !== undefined && display.width > 0) {
            feat.push("display-res-x=" + display.width.toString() + "");
        }
        if (display.height !== undefined && display.height > 0) {
            feat.push("display-res-y=" + display.height.toString() + "");
        }
        if (display.bitsPerComponent !== undefined && display.bitsPerComponent > 0) {
            feat.push("display-bpc=" + display.bitsPerComponent.toString() + "");
        }
    }
    if (outputHdcp !== undefined && outputHdcp.length > 0) {
        var specifiedHDCPinConfig = parseFloat(outputHdcp);
        var hdcp = specifiedHDCPinConfig >= 2.2 ? 2 : 1;
        feat.push("hdcp=" + hdcp.toString());
    }
    if (feat.length > 0) {
        str += ";" + "features=";
        str += '"' + feat.join(",") + '"';
    }
    return str;
}
