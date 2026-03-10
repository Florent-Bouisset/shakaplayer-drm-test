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
exports.default = shouldRenewMediaKeySystemAccess;
var config_1 = require("../config");
var env_detector_1 = require("./env_detector");
/**
 * Returns true if the current target require the MediaKeySystemAccess to be
 * renewed on each content.
 * @returns {Boolean}
 */
function shouldRenewMediaKeySystemAccess(keySystem) {
    var FORCE_SHOULD_RENEW_MEDIA_KEY_SYSTEM_ACCESS = config_1.default.getCurrent().FORCE_SHOULD_RENEW_MEDIA_KEY_SYSTEM_ACCESS;
    if (FORCE_SHOULD_RENEW_MEDIA_KEY_SYSTEM_ACCESS) {
        return true;
    }
    return (keySystem.indexOf("playready") !== -1 &&
        (env_detector_1.default.browser === env_detector_1.default.BROWSERS.Ie11 ||
            env_detector_1.default.browser === env_detector_1.default.BROWSERS.EdgeChromium ||
            env_detector_1.default.browser === env_detector_1.default.BROWSERS.Firefox));
}
