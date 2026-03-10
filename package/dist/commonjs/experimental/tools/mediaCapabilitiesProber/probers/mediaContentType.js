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
exports.default = probeContentType;
var browser_compatibility_types_1 = require("../../../../compat/browser_compatibility_types");
var is_null_or_undefined_1 = require("../../../../utils/is_null_or_undefined");
/**
 * @param {Object} config
 * @returns {Promise}
 */
function probeContentType(config) {
    if ((0, is_null_or_undefined_1.default)(browser_compatibility_types_1.MediaSource_)) {
        throw new Error("MediaSource API not available");
    }
    if (typeof browser_compatibility_types_1.MediaSource_.isTypeSupported !== "function") {
        throw new Error("MediaSource.isTypeSupported API not available");
    }
    var contentTypes = [];
    if (config.video !== undefined &&
        config.video.contentType !== undefined &&
        config.video.contentType.length > 0) {
        contentTypes.push(config.video.contentType);
    }
    if (config.audio !== undefined &&
        config.audio.contentType !== undefined &&
        config.audio.contentType.length > 0) {
        contentTypes.push(config.audio.contentType);
    }
    if (contentTypes.length === 0) {
        throw new Error("Not enough arguments for calling isTypeSupported.");
    }
    for (var i = 0; i < contentTypes.length; i++) {
        if (!browser_compatibility_types_1.MediaSource_.isTypeSupported(contentTypes[i])) {
            return "NotSupported";
        }
    }
    return "Supported";
}
