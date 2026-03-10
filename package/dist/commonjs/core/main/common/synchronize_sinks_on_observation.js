"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = synchronizeSegmentSinksOnObservation;
/**
 * Synchronize SegmentSinks with what has been buffered.
 * @param {Object} observation - The just-received playback observation,
 * including what has been buffered on lower-level buffers
 * @param {Object} segmentSinksStore - Interface allowing to interact
 * with `SegmentSink`s, so their inventory can be updated accordingly.
 */
function synchronizeSegmentSinksOnObservation(observation, segmentSinksStore) {
    // Synchronize SegmentSinks with what has been buffered.
    ["video", "audio", "text"].forEach(function (tType) {
        var _a;
        var segmentSinkStatus = segmentSinksStore.getStatus(tType);
        if (segmentSinkStatus.type === "initialized") {
            segmentSinkStatus.value.synchronizeInventory((_a = observation.buffered[tType]) !== null && _a !== void 0 ? _a : []);
        }
    });
}
