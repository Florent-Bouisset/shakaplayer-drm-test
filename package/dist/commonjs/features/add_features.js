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
 * WITHOUT WARRANTIE OR CONDITIONS OF ANY KIND, either express or implied.
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
exports.default = addFeatures;
var is_null_or_undefined_1 = require("../utils/is_null_or_undefined");
var features_object_1 = require("./features_object");
/**
 * @param {Array.<Object>} featureFuncList
 */
function addFeatures(featureFuncList) {
    var e_1, _a;
    try {
        for (var featureFuncList_1 = __values(featureFuncList), featureFuncList_1_1 = featureFuncList_1.next(); !featureFuncList_1_1.done; featureFuncList_1_1 = featureFuncList_1.next()) {
            var addFeature = featureFuncList_1_1.value;
            if (typeof addFeature === "function") {
                addFeature(features_object_1.default);
            }
            else if (!(0, is_null_or_undefined_1.default)(addFeature) &&
                typeof addFeature._addFeature === "function") {
                addFeature._addFeature(features_object_1.default);
            }
            else {
                throw new Error("Unrecognized feature");
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (featureFuncList_1_1 && !featureFuncList_1_1.done && (_a = featureFuncList_1.return)) _a.call(featureFuncList_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
}
