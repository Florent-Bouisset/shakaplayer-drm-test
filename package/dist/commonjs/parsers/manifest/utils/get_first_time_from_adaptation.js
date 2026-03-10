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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getFirstPositionFromAdaptation;
/**
 * Returns "first time of reference" from the adaptation given, considering a
 * dynamic content.
 * Undefined if a time could not be found.
 *
 * We consider the latest first time from every representations in the given
 * adaptation.
 * @param {Object} adaptation
 * @returns {Number|undefined}
 */
function getFirstPositionFromAdaptation(adaptation) {
    var e_1, _a;
    var representations = adaptation.representations;
    var max = null;
    try {
        for (var representations_1 = __values(representations), representations_1_1 = representations_1.next(); !representations_1_1.done; representations_1_1 = representations_1.next()) {
            var representation = representations_1_1.value;
            var firstPosition = representation.index.getFirstAvailablePosition();
            if (firstPosition === undefined) {
                // we cannot tell
                return undefined;
            }
            if (firstPosition !== null) {
                max = max === null ? firstPosition : Math.max(max, firstPosition);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (representations_1_1 && !representations_1_1.done && (_a = representations_1.return)) _a.call(representations_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    if (max === null) {
        // It means that all positions were null === no segments (yet?)
        return null;
    }
    return max;
}
