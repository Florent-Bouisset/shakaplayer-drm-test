import generateReadOnlyObserver from "./utils/generate_read_only_observer";
export default class WorkerPlaybackObserver {
    constructor(src, contentId, sendMessage, cancellationSignal) {
        this._src = src;
        this._contentId = contentId;
        this._messageSender = sendMessage;
        this._cancelSignal = cancellationSignal;
    }
    getCurrentTime() {
        return undefined;
    }
    getReadyState() {
        return undefined;
    }
    getIsPaused() {
        return undefined;
    }
    getReference() {
        return this._src;
    }
    setPlaybackRate(playbackRate) {
        this._messageSender({
            type: "update-playback-rate" /* WorkerMessageType.UpdatePlaybackRate */,
            contentId: this._contentId,
            value: playbackRate,
        });
    }
    getPlaybackRate() {
        return undefined;
    }
    listen(cb, params) {
        if (this._cancelSignal.isCancelled() || params.clearSignal.isCancelled()) {
            return;
        }
        this._src.onUpdate(cb, {
            clearSignal: params.clearSignal,
            emitCurrentValue: params.includeLastObservation,
        });
    }
    deriveReadOnlyObserver(transform) {
        return generateReadOnlyObserver(this, transform, this._cancelSignal);
    }
}
