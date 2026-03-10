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
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", { value: true });
exports.READY_STATES = exports.isManagedMediaSource = exports.MediaSource_ = void 0;
var global_scope_1 = require("../utils/global_scope");
// Trick to ensure our own types are compatible to TypeScript's
function assertTypeCompatibility() {
    // noop
}
/* eslint-disable @typescript-eslint/no-restricted-types */
assertTypeCompatibility();
assertTypeCompatibility();
assertTypeCompatibility();
assertTypeCompatibility();
assertTypeCompatibility();
assertTypeCompatibility();
assertTypeCompatibility();
/** MediaSource implementation, including vendored implementations. */
var gs = global_scope_1.default;
var MediaSource_ = (_e = (_d = (_c = (_b = (_a = gs === null || gs === void 0 ? void 0 : gs.MediaSource) !== null && _a !== void 0 ? _a : gs === null || gs === void 0 ? void 0 : gs.MozMediaSource) !== null && _b !== void 0 ? _b : gs === null || gs === void 0 ? void 0 : gs.WebKitMediaSource) !== null && _c !== void 0 ? _c : gs === null || gs === void 0 ? void 0 : gs.MSMediaSource) !== null && _d !== void 0 ? _d : gs === null || gs === void 0 ? void 0 : gs.ManagedMediaSource) !== null && _e !== void 0 ? _e : undefined;
exports.MediaSource_ = MediaSource_;
var isManagedMediaSource = MediaSource_ !== undefined && MediaSource_ === (gs === null || gs === void 0 ? void 0 : gs.ManagedMediaSource);
exports.isManagedMediaSource = isManagedMediaSource;
/** List an HTMLMediaElement's possible values for its readyState property. */
var READY_STATES = {
    HAVE_NOTHING: 0,
    HAVE_METADATA: 1,
    HAVE_CURRENT_DATA: 2,
    HAVE_FUTURE_DATA: 3,
    HAVE_ENOUGH_DATA: 4,
};
exports.READY_STATES = READY_STATES;
