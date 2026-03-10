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
exports.default = probeMatchMedia;
var global_scope_1 = require("../../../../utils/global_scope");
var is_null_or_undefined_1 = require("../../../../utils/is_null_or_undefined");
/**
 * @param {Object} config
 * @returns {string}
 */
function probeMatchMedia(config) {
    if (typeof global_scope_1.default.matchMedia !== "function") {
        throw new Error("matchMedia API not available");
    }
    if ((0, is_null_or_undefined_1.default)(config.display) ||
        config.display.colorSpace === undefined ||
        config.display.colorSpace.length === 0) {
        throw new Error("Not enough arguments for calling matchMedia.");
    }
    var match = global_scope_1.default.matchMedia("(color-gamut: ".concat(config.display.colorSpace, ")"));
    if (match.media === "not all") {
        throw new Error("Bad arguments for calling matchMedia.");
    }
    return match.matches ? "Supported" : "NotSupported";
}
