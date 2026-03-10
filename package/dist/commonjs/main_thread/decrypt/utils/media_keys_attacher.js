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
var set_media_keys_1 = require("../../../compat/eme/set_media_keys");
var errors_1 = require("../../../errors");
var log_1 = require("../../../log");
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
// Store the MediaKeys infos attached to a media element.
var currentMediaState = new WeakMap();
exports.default = {
    /**
     * Attach new MediaKeys infos set on a HMTLMediaElement.
     * @param {HTMLMediaElement} mediaElement
     * @param {Object} mediaKeysInfo
     * @returns {Promise}
     */
    attach: function (mediaElement, mediaKeysInfo) {
        return __awaiter(this, void 0, void 0, function () {
            var previousState, pendingTask;
            return __generator(this, function (_a) {
                previousState = currentMediaState.get(mediaElement);
                pendingTask = attachMediaKeys(mediaElement, previousState, mediaKeysInfo).then(function () {
                    currentMediaState.set(mediaElement, {
                        pendingTask: null,
                        mediaKeysState: mediaKeysInfo,
                    });
                }, function () {
                    currentMediaState.set(mediaElement, {
                        pendingTask: null,
                        mediaKeysState: null,
                    });
                });
                currentMediaState.set(mediaElement, {
                    pendingTask: pendingTask,
                    mediaKeysState: mediaKeysInfo,
                });
                return [2 /*return*/, pendingTask];
            });
        });
    },
    /**
     * Get MediaKeys information expected to be linked to the given
     * `HTMLMediaElement`.
     *
     * Unlike `getAttachedMediaKeysState`, this method is synchronous and will
     * also return the expected state when `MediaKeys` attachment is still
     * pending and thus when that state is not truly applied (and where it
     * might fail before being applied).
     *
     * As such, only call this method if you want the currently expected state,
     * not the actual one.
     * @param {HTMLMediaElement} mediaElement
     * @returns {Array}
     */
    getAwaitedState: function (mediaElement) {
        var _a;
        var currentState = currentMediaState.get(mediaElement);
        return (_a = currentState === null || currentState === void 0 ? void 0 : currentState.mediaKeysState) !== null && _a !== void 0 ? _a : null;
    },
    /**
     * Get MediaKeys information set on a HMTLMediaElement.
     *
     * This method is asynchronous because that state may still be in a process
     * of being attached to the `HTMLMediaElement` (and the state we're
     * currently setting may not work out).
     * @param {HTMLMediaElement} mediaElement
     * @returns {Object|null}
     */
    getAttachedMediaKeysState: function (mediaElement) {
        return __awaiter(this, void 0, void 0, function () {
            var currentState;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        currentState = currentMediaState.get(mediaElement);
                        if (currentState === undefined) {
                            return [2 /*return*/, null];
                        }
                        if (!(currentState.pendingTask !== null)) return [3 /*break*/, 2];
                        return [4 /*yield*/, currentState.pendingTask];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, this.getAttachedMediaKeysState(mediaElement)];
                    case 2: return [2 /*return*/, currentState.mediaKeysState];
                }
            });
        });
    },
    /**
     * Remove MediaKeys currently set on a HMTLMediaElement and update state
     * accordingly.
     * @param {HTMLMediaElement} mediaElement
     * @returns {Promise}
     */
    clearMediaKeys: function (mediaElement) {
        var previousState = currentMediaState.get(mediaElement);
        var pendingTask = clearMediaKeys(mediaElement, previousState).then(function () {
            currentMediaState.set(mediaElement, {
                pendingTask: null,
                mediaKeysState: null,
            });
        }, function () {
            currentMediaState.set(mediaElement, {
                pendingTask: null,
                mediaKeysState: null,
            });
        });
        currentMediaState.set(mediaElement, {
            pendingTask: pendingTask,
            mediaKeysState: null,
        });
        return pendingTask;
    },
};
/**
 * Ensure that the last `MediaKeys` set on the given HTMLMediaElement is
 * attached.
 *
 * The returned Promise never rejects, it will just log an error if the
 * previous attachment failed.
 *
 * @param {Object} previousState
 * @returns {Promise.<undefined>}
 */
function awaitMediaKeysAttachment(previousState) {
    return __awaiter(this, void 0, void 0, function () {
        var promise, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    promise = previousState.pendingTask;
                    if ((0, is_null_or_undefined_1.default)(promise)) {
                        return [2 /*return*/];
                    }
                    log_1.default.info("DRM", "Awaiting previous MediaKeys attachment operation");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, previousState.pendingTask];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _a.sent();
                    log_1.default.info("DRM", "previous MediaKeys attachment operation failed", err_1 instanceof Error ? err_1 : "Unknown error");
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function attachMediaKeys(mediaElement, previousState, mediaKeysInfo) {
    return __awaiter(this, void 0, void 0, function () {
        var closeAllSessions, err_2, errMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(previousState !== undefined)) return [3 /*break*/, 4];
                    if (!(previousState.pendingTask !== null)) return [3 /*break*/, 2];
                    // Ensure the `MediaKeys` has been fully attached to the HTMLMediaElement before
                    // resetting things, to avoid browser errors due to an invalid state.
                    return [4 /*yield*/, awaitMediaKeysAttachment(previousState)];
                case 1:
                    // Ensure the `MediaKeys` has been fully attached to the HTMLMediaElement before
                    // resetting things, to avoid browser errors due to an invalid state.
                    _a.sent();
                    _a.label = 2;
                case 2:
                    closeAllSessions = !(0, is_null_or_undefined_1.default)(previousState.mediaKeysState) &&
                        previousState.mediaKeysState.loadedSessionsStore !==
                            mediaKeysInfo.loadedSessionsStore
                        ? previousState.mediaKeysState.loadedSessionsStore.closeAllSessions()
                        : Promise.resolve();
                    return [4 /*yield*/, closeAllSessions];
                case 3:
                    _a.sent();
                    if (mediaElement.mediaKeys === mediaKeysInfo.mediaKeys) {
                        log_1.default.debug("DRM", "Right MediaKeys already set");
                        return [2 /*return*/];
                    }
                    _a.label = 4;
                case 4:
                    log_1.default.info("DRM", "Attaching MediaKeys to the media element");
                    _a.label = 5;
                case 5:
                    _a.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, (0, set_media_keys_1.setMediaKeys)(mediaKeysInfo.emeImplementation, mediaElement, mediaKeysInfo.mediaKeys)];
                case 6:
                    _a.sent();
                    log_1.default.info("DRM", "MediaKeys attached with success");
                    return [3 /*break*/, 8];
                case 7:
                    err_2 = _a.sent();
                    errMessage = err_2 instanceof Error ? err_2.toString() : "Unknown Error";
                    throw new errors_1.EncryptedMediaError("MEDIA_KEYS_ATTACHMENT_ERROR", "Could not attach the MediaKeys to the media element: " + errMessage, {
                        keyStatuses: undefined,
                        keySystemConfiguration: mediaKeysInfo.mediaKeySystemAccess.getConfiguration(),
                        keySystem: mediaKeysInfo.mediaKeySystemAccess.keySystem,
                    });
                case 8: return [2 /*return*/];
            }
        });
    });
}
function clearMediaKeys(mediaElement, previousState) {
    return __awaiter(this, void 0, void 0, function () {
        var loadedSessionsStore;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (previousState === undefined) {
                        return [2 /*return*/];
                    }
                    if (!(previousState.pendingTask !== null)) return [3 /*break*/, 2];
                    // Ensure the `MediaKeys` has been fully attached to the HTMLMediaElement before
                    // resetting things, to avoid browser errors due to an invalid state.
                    return [4 /*yield*/, awaitMediaKeysAttachment(previousState)];
                case 1:
                    // Ensure the `MediaKeys` has been fully attached to the HTMLMediaElement before
                    // resetting things, to avoid browser errors due to an invalid state.
                    _a.sent();
                    _a.label = 2;
                case 2:
                    if (previousState.mediaKeysState === null) {
                        return [2 /*return*/];
                    }
                    log_1.default.info("DRM", "Disposing of the current MediaKeys");
                    loadedSessionsStore = previousState.mediaKeysState.loadedSessionsStore;
                    return [4 /*yield*/, loadedSessionsStore.closeAllSessions()];
                case 3:
                    _a.sent();
                    return [2 /*return*/, (0, set_media_keys_1.setMediaKeys)(previousState.mediaKeysState.emeImplementation, mediaElement, null)];
            }
        });
    });
}
