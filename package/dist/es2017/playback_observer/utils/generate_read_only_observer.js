/**
 * Create `IReadOnlyPlaybackObserver` from a source `IReadOnlyPlaybackObserver`
 * and a mapping function.
 * @param {Object} src
 * @param {Function} transform
 * @returns {Object}
 */
export default function generateReadOnlyObserver(src, transform, cancellationSignal) {
    const mappedRef = transform(src.getReference(), cancellationSignal);
    return {
        getCurrentTime() {
            return src.getCurrentTime();
        },
        getReadyState() {
            return src.getReadyState();
        },
        getPlaybackRate() {
            return src.getPlaybackRate();
        },
        getIsPaused() {
            return src.getIsPaused();
        },
        getReference() {
            return mappedRef;
        },
        listen(cb, params) {
            if (cancellationSignal.isCancelled() || params.clearSignal.isCancelled()) {
                return;
            }
            mappedRef.onUpdate(cb, {
                clearSignal: params.clearSignal,
                emitCurrentValue: params.includeLastObservation,
            });
        },
        deriveReadOnlyObserver(newTransformFn) {
            return generateReadOnlyObserver(this, newTransformFn, cancellationSignal);
        },
    };
}
