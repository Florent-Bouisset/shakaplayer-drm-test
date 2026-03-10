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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getKeySystemConfiguration;
var media_keys_attacher_1 = require("./utils/media_keys_attacher");
/**
 * Returns the name of the current key system used as well as its configuration,
 * as reported by the `MediaKeySystemAccess` itself.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Array|null}
 */
function getKeySystemConfiguration(mediaElement) {
    var currentState = media_keys_attacher_1.default.getAwaitedState(mediaElement);
    if (currentState === null) {
        return null;
    }
    return [
        currentState.mediaKeySystemAccess.keySystem,
        currentState.mediaKeySystemAccess.getConfiguration(),
    ];
}
