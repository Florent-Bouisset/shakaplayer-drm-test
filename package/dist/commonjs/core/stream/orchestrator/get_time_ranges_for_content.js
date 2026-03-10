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
exports.default = getTimeRangesForContent;
var log_1 = require("../../../log");
var ranges_1 = require("../../../utils/ranges");
var segment_sinks_1 = require("../../segment_sinks");
/**
 * Returns the buffered ranges which hold the given content.
 * Returns the whole buffered ranges if some of it is unknown.
 * @param {Object} segmentSink
 * @param {Array.<Object>} contents
 * @returns {Array.<Object>}
 */
function getTimeRangesForContent(segmentSink, contents) {
    var e_1, _a, e_2, _b;
    if (contents.length === 0) {
        return [];
    }
    var ranges = [];
    var inventory = segmentSink.getLastKnownInventory();
    var pendingOperations = segmentSink.getPendingOperations();
    var _loop_1 = function (chunk) {
        var hasContent = contents.some(function (content) {
            return (chunk.infos.period.id === content.period.id &&
                chunk.infos.adaptation.id === content.adaptation.id &&
                chunk.infos.representation.id === content.representation.id);
        });
        if (hasContent) {
            var bufferedStart = chunk.bufferedStart, bufferedEnd = chunk.bufferedEnd;
            if (bufferedStart === undefined || bufferedEnd === undefined) {
                log_1.default.warn("Stream", "No buffered start or end found from a segment.", {
                    bufferType: chunk.infos.adaptation.type,
                    segmentStart: chunk.infos.segment.time,
                });
                return { value: [{ start: 0, end: Number.MAX_VALUE }] };
            }
            var previousLastElement = ranges[ranges.length - 1];
            if (previousLastElement !== undefined &&
                previousLastElement.end === bufferedStart) {
                previousLastElement.end = bufferedEnd;
            }
            else {
                ranges.push({ start: bufferedStart, end: bufferedEnd });
            }
        }
    };
    try {
        for (var inventory_1 = __values(inventory), inventory_1_1 = inventory_1.next(); !inventory_1_1.done; inventory_1_1 = inventory_1.next()) {
            var chunk = inventory_1_1.value;
            var state_1 = _loop_1(chunk);
            if (typeof state_1 === "object")
                return state_1.value;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (inventory_1_1 && !inventory_1_1.done && (_a = inventory_1.return)) _a.call(inventory_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var _loop_2 = function (operation) {
        if (operation.type !== segment_sinks_1.SegmentSinkOperation.Push) {
            return "continue";
        }
        var pushInfo = operation.value;
        var hasContent = contents.some(function (content) {
            return (pushInfo.inventoryInfos.period.id === content.period.id &&
                pushInfo.inventoryInfos.adaptation.id === content.adaptation.id &&
                pushInfo.inventoryInfos.representation.id === content.representation.id);
        });
        if (hasContent) {
            (0, ranges_1.insertInto)(ranges, {
                start: pushInfo.inventoryInfos.start,
                end: pushInfo.inventoryInfos.end,
            });
        }
    };
    try {
        for (var pendingOperations_1 = __values(pendingOperations), pendingOperations_1_1 = pendingOperations_1.next(); !pendingOperations_1_1.done; pendingOperations_1_1 = pendingOperations_1.next()) {
            var operation = pendingOperations_1_1.value;
            _loop_2(operation);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (pendingOperations_1_1 && !pendingOperations_1_1.done && (_b = pendingOperations_1.return)) _b.call(pendingOperations_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return ranges;
}
