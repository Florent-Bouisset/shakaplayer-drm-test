"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = generateReadOnlyObserver;
/**
 * Create `IReadOnlyPlaybackObserver` from a source `IReadOnlyPlaybackObserver`
 * and a mapping function.
 * @param {Object} src
 * @param {Function} transform
 * @returns {Object}
 */
function generateReadOnlyObserver(src, transform, cancellationSignal) {
    var mappedRef = transform(src.getReference(), cancellationSignal);
    return {
        getCurrentTime: function () {
            return src.getCurrentTime();
        },
        getReadyState: function () {
            return src.getReadyState();
        },
        getPlaybackRate: function () {
            return src.getPlaybackRate();
        },
        getIsPaused: function () {
            return src.getIsPaused();
        },
        getReference: function () {
            return mappedRef;
        },
        listen: function (cb, params) {
            if (cancellationSignal.isCancelled() || params.clearSignal.isCancelled()) {
                return;
            }
            mappedRef.onUpdate(cb, {
                clearSignal: params.clearSignal,
                emitCurrentValue: params.includeLastObservation,
            });
        },
        deriveReadOnlyObserver: function (newTransformFn) {
            return generateReadOnlyObserver(this, newTransformFn, cancellationSignal);
        },
    };
}
