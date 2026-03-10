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
exports.default = extractTimingsInfos;
var log_1 = require("../../log");
var isobmff_1 = require("../../parsers/containers/isobmff");
var isobmff_2 = require("./isobmff");
/**
 * Try to obtain time information from the given data.
 * @param {Uint8Array} data
 * @param {boolean} isChunked
 * @param {Object} segment
 * @param {boolean} isLive
 * @returns {Object}
 */
function extractTimingsInfos(data, isChunked, initTimescale, segment, isLive) {
    var e_1, _a;
    var _b;
    var nextSegments = [];
    var chunkInfos;
    var tfxdSegment;
    var tfrfSegments;
    if (isLive) {
        var traf = (0, isobmff_1.getTRAF)(data);
        if (traf !== null) {
            tfrfSegments = (0, isobmff_2.parseTfrf)(traf);
            tfxdSegment = (0, isobmff_2.parseTfxd)(traf);
        }
        else {
            log_1.default.warn("smooth", "could not find traf atom");
        }
    }
    if (tfrfSegments !== undefined) {
        try {
            for (var tfrfSegments_1 = __values(tfrfSegments), tfrfSegments_1_1 = tfrfSegments_1.next(); !tfrfSegments_1_1.done; tfrfSegments_1_1 = tfrfSegments_1.next()) {
                var tfrfSeg = tfrfSegments_1_1.value;
                nextSegments.push({
                    time: tfrfSeg.time,
                    duration: tfrfSeg.duration,
                    timescale: initTimescale,
                });
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (tfrfSegments_1_1 && !tfrfSegments_1_1.done && (_a = tfrfSegments_1.return)) _a.call(tfrfSegments_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    if (tfxdSegment !== undefined) {
        chunkInfos = {
            time: tfxdSegment.time / initTimescale,
            duration: tfxdSegment.duration / initTimescale,
        };
        return { nextSegments: nextSegments, chunkInfos: chunkInfos, scaledSegmentTime: tfxdSegment.time };
    }
    if (isChunked || !segment.complete) {
        return { nextSegments: nextSegments, chunkInfos: null, scaledSegmentTime: undefined };
    }
    var segmentDuration = segment.duration * initTimescale;
    // we could always make a mistake when reading a container.
    // If the estimate is too far from what the segment seems to imply, take
    // the segment infos instead.
    var maxDecodeTimeDelta = Math.min(initTimescale * 0.9, segmentDuration / 4);
    var trunDuration = (0, isobmff_1.getDurationFromTrun)(data);
    var scaledSegmentTime = ((_b = segment.privateInfos) === null || _b === void 0 ? void 0 : _b.smoothMediaSegment) !== undefined
        ? segment.privateInfos.smoothMediaSegment.time
        : Math.round(segment.time * initTimescale);
    if (trunDuration !== undefined &&
        Math.abs(trunDuration - segmentDuration) <= maxDecodeTimeDelta) {
        chunkInfos = { time: segment.time, duration: trunDuration / initTimescale };
    }
    else {
        chunkInfos = { time: segment.time, duration: segment.duration };
    }
    return { nextSegments: nextSegments, chunkInfos: chunkInfos, scaledSegmentTime: scaledSegmentTime };
}
