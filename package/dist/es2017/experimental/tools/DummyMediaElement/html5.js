import { createCompatibleEventListener } from "../../../compat/event_listeners";
import EventEmitter from "../../../utils/event_emitter";
import getMonotonicTimeStamp from "../../../utils/monotonic_timestamp";
import noop from "../../../utils/noop";
import { convertToRanges, insertInto, keepRangeIntersection, } from "../../../utils/ranges";
import TaskCanceller from "../../../utils/task_canceller";
import { DummyMediaKeys, createRequestMediaKeySystemAccess } from "./eme";
import { DummyMediaSource } from "./mse";
import TimeRangesWithMetadata, { EventScheduler } from "./utils";
/**
 * Minimum amount of buffer remaining in front of the currently-played position
 * in seconds from which content playback happens. If we're below that value,
 * the `DummyMediaElement` will start rebuffering itself.
 */
const MINIMUM_BUFFER_SIZE_FOR_PLAYBACK = 0.1;
/**
 * The maximum interval in milliseonds at which we re-check the current playback
 * conditions (the `currentTime`, the `readyState` if we're waiting for data
 * etc.)
 * Note that this logic also happens on specific events: new media is added,
 * removed, methods are called...
 */
const TICK_INTERVAL = 40;
/**
 * `HTMLMediaElement` implementation that should be compatible to the
 * `RxPlayer`.
 *
 * This class will act as if it is a regular `HTMLMediaElement` playing media
 * provided through the linked MSE API mocks.
 * Properties will try to mimick what an actual `HTMLMediaElement` would return
 * but the content won't actually be decoded nor deciphered.
 * @class DummyMediaElement
 */
export class DummyMediaElement extends EventEmitter {
    constructor(opts = {}) {
        var _a, _b;
        super();
        this.buffered = new TimeRangesWithMetadata();
        this.childNodes = [];
        this.ended = false;
        this.error = null;
        this.isDummy = true;
        this.mediaKeys = null;
        this.nodeName = (_a = opts.nodeName) !== null && _a !== void 0 ? _a : "VIDEO";
        this.paused = true;
        this.preload = "auto";
        this.readyState = 0;
        this.seekable = new TimeRangesWithMetadata();
        this.seeking = false;
        this.textTracks = [];
        this._allowedToPlay = opts.allowedToPlay !== false;
        this._attachedMediaSource = null;
        this._autoplay = false;
        this._canAutoPlay = true;
        this._currentContentCanceller = null;
        this._duration = NaN;
        this._eventScheduler = new EventScheduler();
        this._isFreezing = null;
        this._lastPosition = {
            position: 0,
            timestamp: getMonotonicTimeStamp(),
        };
        this._muted = false;
        this._pendingPlayPromises = [];
        this._playbackRate = 1;
        this._src = "";
        this._volume = 1;
        this._wasLoadedDataSentForCurrentContent = false;
        this._wasPlayPerformedOnCurrentContent = false;
        this.onencrypted = null;
        this.oncanplay = null;
        this.oncanplaythrough = null;
        this.onended = null;
        this.onerror = null;
        this.onloadeddata = null;
        this.onloadedmetadata = null;
        this.onpause = null;
        this.onplay = null;
        this.onplaying = null;
        this.onratechange = null;
        this.onseeked = null;
        this.onseeking = null;
        this.onstalled = null;
        this.ontimeupdate = null;
        this.onenterpictureinpicture = null;
        this.onleavepictureinpicture = null;
        this.onvolumechange = null;
        this.onwaiting = null;
        const setMediaKeys = (mediaElement, mediaKeys) => {
            return new Promise((resolve) => {
                mediaElement.mediaKeys = mediaKeys;
                if (mediaElement === this && mediaKeys instanceof DummyMediaKeys) {
                    mediaKeys.onDummySessionKeyUpdates = () => {
                        this._tick();
                    };
                }
                resolve(undefined);
                this._tick();
            });
        };
        this.FORCED_MEDIA_SOURCE = DummyMediaSource;
        this.FORCED_EME_API = {
            requestMediaKeySystemAccess: createRequestMediaKeySystemAccess((_b = opts.drmOptions) === null || _b === void 0 ? void 0 : _b.requestMediaKeySystemAccessConfig),
            onEncrypted: createCompatibleEventListener(["encrypted"]),
            setMediaKeys,
            implementation: "standard",
        };
    }
    /**
     * `HTMLMediaElement.duration` property getter.
     */
    get duration() {
        // TODO liveSeekableRange etc.
        return this._duration;
    }
    /**
     * `HTMLMediaElement.volume` property getter.
     */
    get volume() {
        return this._volume;
    }
    /**
     * `HTMLMediaElement.volume` property setter.
     */
    set volume(newVolume) {
        this._volume = newVolume;
        this._eventScheduler.schedule(this, "volumechange", null).catch(noop);
    }
    /**
     * `HTMLMediaElement.muted` property getter.
     */
    get muted() {
        return this._muted;
    }
    /**
     * `HTMLMediaElement.muted` property setter.
     */
    set muted(newMuted) {
        this._muted = newMuted;
        this._eventScheduler.schedule(this, "volumechange", null).catch(noop);
    }
    /**
     * `HTMLMediaElement.autoplay` property getter.
     */
    get autoplay() {
        return this._autoplay;
    }
    /**
     * `HTMLMediaElement.autoplay` property setter.
     *
     * A paused content may play if paused while autoplay is set to `true` and
     * if the current content was never played until now.
     * @param {boolean} val - New `autoplay` value.
     */
    set autoplay(val) {
        this._autoplay = val;
        if (this._currentContentCanceller !== null &&
            this.readyState >= 4 &&
            !this._wasPlayPerformedOnCurrentContent) {
            this._tick();
            this.paused = false;
            this._wasPlayPerformedOnCurrentContent = true;
            this._eventScheduler
                .schedule(this, "play", this._currentContentCanceller.signal)
                .catch(noop);
            this._notifyAboutPlaying();
        }
    }
    /**
     * `HTMLMediaElement.src` property getter.
     */
    get src() {
        return this._src;
    }
    /**
     * `HTMLMediaElement.src` property setter.
     *
     * For now, we assume that on a `DummyMediaElement` it is only useful to play
     * "directfile" contents which we don't support for now.
     * @param {string} val - The new URL
     */
    set src(val) {
        var _a;
        this._src = val;
        this.srcObject = null;
        (_a = this._currentContentCanceller) === null || _a === void 0 ? void 0 : _a.cancel();
        const canceller = new TaskCanceller();
        this._currentContentCanceller = canceller;
        setTimeout(() => {
            var _a;
            while (this._pendingPlayPromises.length > 0) {
                const error = new Error("A new source was set");
                error.name = "AbortError";
                (_a = this._pendingPlayPromises.shift()) === null || _a === void 0 ? void 0 : _a.reject(error);
            }
            const err = createMediaError("Failed to open media", 4);
            this.error = err;
            this._eventScheduler.schedule(this, "error", canceller.signal).catch(noop);
        });
    }
    /**
     * An `HTMLMediaElement`'s `addTextTrack` method.
     * Here I did not want to implement that complexity for now as we don't really
     * need it at the time I'm writing this. So it just throws.
     */
    addTextTrack() {
        throw new Error("Not implemented yet");
    }
    /**
     * `HTMLMediaElement.srcObject` property setter,
     *
     * Right now, that the main way to attach a `DummyMediaSource` to a
     * `DummyMediaElement`.
     * @param {Object|null} val - The `DummyMediaSource` wanted or `null` to stop
     * playback.
     */
    set srcObject(val) {
        // media element load algorithm
        var _a, _b;
        (_a = this._currentContentCanceller) === null || _a === void 0 ? void 0 : _a.cancel();
        this._wasLoadedDataSentForCurrentContent = false;
        this._wasPlayPerformedOnCurrentContent = false;
        this.buffered = new TimeRangesWithMetadata();
        this.seekable = new TimeRangesWithMetadata();
        this._duration = NaN;
        this.error = null;
        this._canAutoPlay = true;
        this.seeking = false;
        this.readyState = 0;
        this.paused = true;
        this._isFreezing = null;
        this._lastPosition = {
            position: 0,
            timestamp: getMonotonicTimeStamp(),
        };
        this.ended = false;
        this.playbackRate = 1;
        while (this._pendingPlayPromises.length > 0) {
            const error = new Error("A new source was set");
            error.name = "AbortError";
            (_b = this._pendingPlayPromises.shift()) === null || _b === void 0 ? void 0 : _b.reject(error);
        }
        const prev = this._attachedMediaSource;
        prev === null || prev === void 0 ? void 0 : prev.destroy();
        if (val !== null) {
            if (!(val instanceof DummyMediaSource) && val !== null) {
                this._attachedMediaSource = null;
                throw new Error("A DummyMediaElement can only be linked to a DummyMediaSource");
            }
            this._attachedMediaSource = val;
            this._currentContentCanceller = new TaskCanceller();
            const intervalId = setInterval(() => {
                this._tick();
            }, TICK_INTERVAL);
            this._currentContentCanceller.signal.register(() => {
                clearInterval(intervalId);
            });
            this._attachCurrentMediaSource();
        }
        else {
            this._attachedMediaSource = null;
        }
    }
    get srcObject() {
        return this._attachedMediaSource;
    }
    /**
     * EME's `HTMLMediaElement.setMediaKeys` method.
     * Here we go through the `FORCED_EME_API` property instead, so that method
     * just throws.
     */
    setMediaKeys(_mk) {
        return Promise.reject("EME not implemented on dummy media element.");
    }
    /**
     * `HTMLMediaElement.currentTime` property getter.
     */
    get currentTime() {
        return this._tick();
    }
    /**
     * `HTMLMediaElement.currentTime` property setter.
     */
    set currentTime(val) {
        this._tick();
        const prevPosition = this._lastPosition.position;
        const canceller = this._currentContentCanceller;
        if (canceller === null || this.readyState === 0) {
            return;
        }
        let seekingPos = val;
        this.seeking = true;
        if (this._isFreezing !== null && this._isFreezing.resolvesOnSeek) {
            this._isFreezing = null;
        }
        if (seekingPos > this._duration) {
            seekingPos = this._duration;
        }
        // From the WHATWG spec:
        // If the playback position is not in one of the ranges given in the
        // seekable attribute, then let it be the position in one of the ranges
        // given in the seekable attribute that is the nearest to the new playback
        // position.
        /**
         * Offset to add to `seekingPos` so it is contianed in a seekable range.
         * `null` if no seekable range is found for now.
         */
        let currentBestOffset = null;
        for (let i = 0; i < this.seekable.length; i++) {
            if (seekingPos >= this.seekable.start(i) && seekingPos <= this.seekable.end(i)) {
                currentBestOffset = 0;
                break;
            }
            else {
                let distance;
                if (seekingPos < this.seekable.start(i)) {
                    distance = this.seekable.start(i) - seekingPos;
                }
                else {
                    distance = this.seekable.end(i) - seekingPos;
                }
                if (currentBestOffset === null) {
                    currentBestOffset = distance;
                }
                else if (Math.abs(distance) < Math.abs(currentBestOffset)) {
                    currentBestOffset = distance;
                }
                else {
                    // From the WHATWG spec:
                    // If two positions both satisfy that constraint (i.e. the new playback
                    // position is exactly in the middle between two ranges in the seekable
                    // attribute) then use the position that is closest to the current
                    // playback position.
                    const prevCandidatePosition = currentBestOffset + seekingPos;
                    const newCandidatePosition = distance + seekingPos;
                    if (Math.abs(prevPosition - newCandidatePosition) <
                        Math.abs(prevPosition - prevCandidatePosition)) {
                        currentBestOffset = distance;
                    }
                }
            }
        }
        if (currentBestOffset === null) {
            this.seeking = false;
            return;
        }
        if (currentBestOffset !== 0) {
            seekingPos += currentBestOffset;
        }
        this._lastPosition.position = val;
        this._lastPosition.timestamp = getMonotonicTimeStamp();
        this.seeking = true;
        this._eventScheduler.schedule(this, "seeking", canceller.signal).catch(noop);
        this._tick();
    }
    /**
     * HTMLMediaElement.playbackRate property setter.
     */
    set playbackRate(val) {
        this._tick();
        this._playbackRate = val;
        this._eventScheduler.schedule(this, "ratechange", null).catch(noop);
    }
    /**
     * HTMLMediaElement.playbackRate property getter.
     */
    get playbackRate() {
        return this._playbackRate;
    }
    /**
     * HTMLMediaElement.pause() method.
     */
    play() {
        var _a;
        if (!this._allowedToPlay) {
            const error = new Error("Dummy media element cannot play");
            error.name = "NotAllowedError";
            return Promise.reject(error);
        }
        if (((_a = this.error) === null || _a === void 0 ? void 0 : _a.code) === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
            const error = new Error("`play` call on not supported content");
            error.name = "NotSupportedError";
            return Promise.reject(error);
        }
        const promise = new Promise((res, rej) => {
            this._pendingPlayPromises.push({ resolve: res, reject: rej });
        });
        if (this.ended && this.playbackRate >= 0) {
            this.ended = false;
            this._lastPosition.position =
                this.seekable.length > 0 ? this.seekable.start(0) : this._lastPosition.position;
            this._lastPosition.timestamp = getMonotonicTimeStamp();
        }
        if (this._currentContentCanceller !== null && this.paused) {
            this._tick();
            this.paused = false;
            this._wasPlayPerformedOnCurrentContent = true;
            // run the time marches on steps
            this._eventScheduler
                .schedule(this, "play", this._currentContentCanceller.signal)
                .catch(noop);
            if (this.readyState <= 2) {
                this._eventScheduler
                    .schedule(this, "waiting", this._currentContentCanceller.signal)
                    .catch(noop);
            }
            else {
                this._notifyAboutPlaying();
            }
        }
        else if (this._currentContentCanceller !== null && this.readyState >= 3) {
            // take pending play promises and queue a media element task given the
            // media element to resolve pending play promises with the result.
            while (this._pendingPlayPromises.length > 0) {
                const playPromise = this._pendingPlayPromises.shift();
                playPromise === null || playPromise === void 0 ? void 0 : playPromise.resolve();
            }
        }
        this._canAutoPlay = false;
        return promise;
    }
    /**
     * HTMLMediaElement.pause() method.
     */
    pause() {
        this._internalPauseSteps();
    }
    /**
     * An `Element`'s `removeAttribute` method.
     * Here I did not want to implement that complexity for now as we don't really
     * need it at the time I'm writing this beside removing the `"src"` attribute.
     * So I just allow to do that
     * @param {string} attr
     */
    removeAttribute(attr) {
        if (attr === "src") {
            this.src = "";
        }
        else {
            throw new Error('Removing the attribute + "' +
                String(attr) +
                '" is not yet supported on a `DummyMediaElement`.');
        }
        return;
    }
    /**
     * A `Node`'s `hasChildNodes` method.
     * Here I did not want to implement that complexity for now as we don't really
     * need it at the time I'm writing this. So it just returns false.
     * @returns {boolean}
     */
    hasChildNodes() {
        return false;
    }
    /**
     * A `Node`'s `appendChild` method.
     * Here I did not want to implement that complexity for now as we don't really
     * need it at the time I'm writing this. So it just throws.
     * @param {Node} _child
     */
    appendChild(_child) {
        throw new Error("Unimplemented");
    }
    /**
     * A `Node`'s `removeChild` method.
     * Here I did not want to implement that complexity for now as we don't really
     * need it at the time I'm writing this. So it just throws.
     * @param {*} x
     */
    removeChild(x) {
        if (x === null) {
            throw new TypeError("Asked to remove null child");
        }
        const notFoundErr = new Error("DummyMediaElement has no child");
        notFoundErr.name = "NotFoundError";
        throw notFoundErr;
    }
    /**
     * An added method to force a "freezing" occurence: playback will stall, even
     * if there's decodable and decipherable data in the buffer.
     *
     * Playback will stop freezing once you call the `stopFreezing` method.
     * @param {boolean} resolvesOnSeek - If `true` the freeze occurence will
     * disappear once a seek is performed.
     */
    startFreezing(resolvesOnSeek) {
        this._tick();
        this._isFreezing = {
            resolvesOnSeek,
        };
    }
    /**
     * Stop "freezing" occurence started with the `startFreezing` method.
     */
    stopFreezing() {
        this._tick();
        this._isFreezing = null;
    }
    /**
     * Method to call once playback reaches the end of the content.
     * Will send the right events and performs the right steps at that point.
     */
    _onPlayingEndOfContent() {
        var _a, _b;
        if (((_a = this._attachedMediaSource) === null || _a === void 0 ? void 0 : _a.readyState) !== "ended") {
            return;
        }
        if (this.ended) {
            return;
        }
        // TODO: loop attribute?
        const canceller = this._currentContentCanceller;
        if (this.playbackRate < 0 || canceller === null) {
            return;
        }
        this._eventScheduler.schedule(this, "timeupdate", canceller.signal).catch(noop);
        if (!this.paused) {
            this.paused = true;
            this._eventScheduler.schedule(this, "pause", canceller.signal).catch(noop);
        }
        while (this._pendingPlayPromises.length > 0) {
            const error = new Error("The content has ended");
            error.name = "AbortError";
            (_b = this._pendingPlayPromises.shift()) === null || _b === void 0 ? void 0 : _b.reject(error);
        }
        this.ended = true;
        this._eventScheduler.schedule(this, "ended", canceller.signal).catch(noop);
    }
    /**
     * Method corresponding to the WHATWG's "is eligible for autoplay" logic.
     * @returns {boolean}
     */
    _isEligibleForAutoplay() {
        return this._canAutoPlay && this.paused && this.autoplay;
    }
    /**
     * Performs steps on the `_attachedMediaSource` that have to happen on it when
     * it is attached to the `HTMLMediaElement`.
     */
    _attachCurrentMediaSource() {
        const dummyMs = this._attachedMediaSource;
        if (dummyMs === null) {
            return;
        }
        dummyMs.updateCallbacks({
            hasMediaElementErrored: () => {
                return this.error !== null;
            },
            onBufferedUpdate: () => {
                this._tick();
            },
            updateMediaElementDuration: (duration) => {
                // TODO check
                this._duration = duration;
                if (this._lastPosition.position > this._duration) {
                    this._lastPosition.position = this._duration;
                    this._lastPosition.timestamp = getMonotonicTimeStamp();
                }
            },
        });
        dummyMs.readyState = "open";
        dummyMs.eventScheduler.schedule(dummyMs, "sourceopen", null).catch(noop);
    }
    /**
     * Performs the WHATWG "notify about playing" steps.
     */
    _notifyAboutPlaying() {
        var _a;
        this._eventScheduler
            .schedule(this, "playing", (_a = this._currentContentCanceller) === null || _a === void 0 ? void 0 : _a.signal)
            .catch(noop);
        while (this._pendingPlayPromises.length > 0) {
            const playPromise = this._pendingPlayPromises.shift();
            playPromise === null || playPromise === void 0 ? void 0 : playPromise.resolve();
        }
    }
    /**
     * Performs the WHATWG "internal pause steps".
     */
    _internalPauseSteps() {
        var _a, _b, _c;
        // "Set the media element's can autoplay flag to false."
        this._canAutoPlay = false;
        if (!this.paused) {
            this._tick();
            this.paused = true; // "Change the value of paused to true."
            this._eventScheduler
                .schedule(this, "timeupdate", (_a = this._currentContentCanceller) === null || _a === void 0 ? void 0 : _a.signal)
                .catch(noop);
            this._eventScheduler
                .schedule(this, "pause", (_b = this._currentContentCanceller) === null || _b === void 0 ? void 0 : _b.signal)
                .catch(noop);
            while (this._pendingPlayPromises.length > 0) {
                const error = new Error("The content was paused");
                error.name = "AbortError";
                (_c = this._pendingPlayPromises.shift()) === null || _c === void 0 ? void 0 : _c.reject(error);
            }
        }
    }
    /**
     * Method re-checking the current position to see if we should begin
     * rebuffering, ending the content, changing the `readyState` etc.
     *
     * Should be called at regular intervals and everytime one of the property
     * that has an effect on the playback speed (`paused`, `playbackRate` etc.)
     * will change just before it changes (so the `lastPosition` object is
     * updated accordingly).
     *
     * Returns the new calculated `currentTime` property.
     *
     * @returns {number} - The new `currentTime` property.
     */
    _tick() {
        this._updateBufferedRanges();
        const bufferInfo = this._getCurrentBufferHealth();
        if (this._attachedMediaSource !== null &&
            this._lastPosition.position >= this._attachedMediaSource.duration) {
            this._lastPosition.position = this._attachedMediaSource.duration;
            this._lastPosition.timestamp = getMonotonicTimeStamp();
            this._updateReadyState({
                isMissingMetadata: bufferInfo.isMissingMetadata,
                isMissingKey: bufferInfo.isMissingKey,
            });
            this._onPlayingEndOfContent();
            return this._lastPosition.position;
        }
        if (bufferInfo.range === null) {
            this._updateReadyState({
                isMissingMetadata: bufferInfo.isMissingMetadata,
                isMissingKey: bufferInfo.isMissingKey,
            });
            this._lastPosition.timestamp = getMonotonicTimeStamp();
            return this._lastPosition.position;
        }
        const playbackSpeed = bufferInfo.isMissingKey ||
            bufferInfo.isMissingMetadata ||
            this._isFreezing !== null ||
            this.paused ||
            this.ended ||
            this.readyState < 3 ||
            this.playbackRate <= 0
            ? 0
            : this.playbackRate;
        const now = getMonotonicTimeStamp();
        const elapsedTime = now - this._lastPosition.timestamp;
        let newPosition = this._lastPosition.position + (elapsedTime * playbackSpeed) / 1000;
        if (newPosition > bufferInfo.range.end) {
            newPosition = bufferInfo.range.end;
        }
        this._lastPosition.position = newPosition;
        this._lastPosition.timestamp = now;
        this._updateReadyState({
            isMissingMetadata: bufferInfo.isMissingMetadata,
            isMissingKey: bufferInfo.isMissingKey,
        });
        if (this._attachedMediaSource !== null &&
            this._lastPosition.position >= this._attachedMediaSource.duration) {
            this._onPlayingEndOfContent();
        }
        return this._lastPosition.position;
    }
    /**
     * Check if the current `readyState` property is the right one according to
     * the `DummyMediaElement`'s state.
     * If not update it and send the right events.
     * @param {Object} obj
     * @param {boolean} obj.isMissingMetadata - If `true`, at least one active
     * buffer doesn't have enough metadata for the `HAVE_METADATA` `readyState`
     * yet.
     * @param {boolean} obj.isMissingKey - If `true`, at least one active
     * buffer is missing the decryption key for the media at the current
     * position.
     */
    _updateReadyState({ isMissingMetadata, isMissingKey, }) {
        const canceller = this._currentContentCanceller;
        if (this.readyState === 0) {
            if (canceller === null || isMissingMetadata) {
                return;
            }
            this.readyState = 1;
            this.seekable.insert(0, Infinity, null);
            this._eventScheduler.schedule(this, "loadedmetadata", canceller.signal).catch(noop);
        }
        const currentRange = this.buffered.getRangeFor(this._lastPosition.position);
        if (this.readyState === 1) {
            if (isMissingMetadata) {
                this.readyState = 0;
                return;
            }
            if (currentRange === null ||
                isMissingKey ||
                ((this._attachedMediaSource === null ||
                    currentRange.end < this._attachedMediaSource.duration) &&
                    currentRange.end - this._lastPosition.position <
                        MINIMUM_BUFFER_SIZE_FOR_PLAYBACK)) {
                return;
            }
            if (canceller === null) {
                return;
            }
            this.readyState = 3;
            const loadedDataProm = this._wasLoadedDataSentForCurrentContent
                ? Promise.resolve()
                : this._eventScheduler.schedule(this, "loadeddata", canceller.signal);
            this._wasLoadedDataSentForCurrentContent = true;
            loadedDataProm
                .then(() => {
                return this._eventScheduler.schedule(this, "canplay", canceller.signal);
            })
                .then(() => {
                this.readyState = 4;
                if (!this.paused) {
                    this._notifyAboutPlaying();
                }
                else if (this._isEligibleForAutoplay()) {
                    this._tick();
                    this.paused = false;
                    this._wasPlayPerformedOnCurrentContent = true;
                    this._eventScheduler.schedule(this, "play", canceller.signal).catch(noop);
                    this._notifyAboutPlaying();
                }
                if (this.seeking) {
                    this.seeking = false;
                    this._eventScheduler
                        .schedule(this, "timeupdate", canceller.signal)
                        .catch(noop);
                    this._eventScheduler.schedule(this, "seeked", canceller.signal).catch(noop);
                }
                return this._eventScheduler.schedule(this, "canplaythrough", canceller.signal);
            })
                .catch(noop);
        }
        else if (this.readyState > 1) {
            if (isMissingMetadata) {
                this.readyState = 0;
                return;
            }
            if (currentRange === null ||
                isMissingKey ||
                ((this._attachedMediaSource === null ||
                    this._attachedMediaSource.readyState !== "ended" ||
                    currentRange.end < this._attachedMediaSource.duration) &&
                    currentRange.end - this._lastPosition.position <
                        MINIMUM_BUFFER_SIZE_FOR_PLAYBACK)) {
                if (canceller === null) {
                    return;
                }
                this.readyState = 1;
                if (!this.paused && this.error === null) {
                    this._eventScheduler
                        .schedule(this, "timeupdate", canceller.signal)
                        .then(() => this._eventScheduler.schedule(this, "waiting", canceller.signal))
                        .catch(noop);
                }
            }
            if (this.seeking) {
                this.seeking = false;
                if (canceller !== null) {
                    this._eventScheduler.schedule(this, "timeupdate", canceller.signal).catch(noop);
                    this._eventScheduler.schedule(this, "seeked", canceller.signal).catch(noop);
                }
            }
        }
    }
    /**
     * Update `buffered` HTML5 property based on what MSE sourceBuffers have
     * themselves buffered.
     */
    _updateBufferedRanges() {
        var _a;
        if (this._attachedMediaSource === null) {
            this.buffered.remove(0, Infinity);
            return;
        }
        const allBuffered = (_a = this._attachedMediaSource.sourceBuffers.reduce((acc, sb) => {
            var _a;
            if (acc === null) {
                return convertToRanges(sb.buffered);
            }
            if (((_a = this._attachedMediaSource) === null || _a === void 0 ? void 0 : _a.readyState) === "ended") {
                const newRanges = convertToRanges(sb.buffered);
                for (const newRange of newRanges) {
                    insertInto(acc, newRange);
                }
                return acc;
            }
            return keepRangeIntersection(acc, convertToRanges(sb.buffered));
        }, null)) !== null && _a !== void 0 ? _a : [];
        this.buffered = new TimeRangesWithMetadata();
        for (const newRange of allBuffered) {
            this.buffered.insert(newRange.start, newRange.end, null);
        }
        if (this.buffered.length > 0) {
            const bufferEnd = this.buffered.end(this.buffered.length - 1);
            if (bufferEnd > this.duration) {
                this._duration = bufferEnd;
            }
        }
    }
    /**
     * Get key information on the media buffers linked to this media element.
     * @returns {Object}
     */
    _getCurrentBufferHealth() {
        var _a;
        if (this._attachedMediaSource === null) {
            this.buffered.remove(0, Infinity);
            this.readyState = 0;
            return {
                range: null,
                isMissingMetadata: true,
                isMissingKey: false,
            };
        }
        const isMissingMetadata = this._attachedMediaSource.sourceBuffers.some((sb) => {
            return !sb.hasMetadata;
        });
        const isMissingKey = this._attachedMediaSource.sourceBuffers.some((sb) => {
            const metadata = sb.buffered.getMetadataFor(this._lastPosition.position);
            if (metadata === null || metadata.keyIds === null) {
                return false;
            }
            if (this.mediaKeys === null) {
                return true;
            }
            const { dummySessions } = this.mediaKeys;
            return metadata.keyIds.some((k) => {
                return !dummySessions.some((s) => {
                    const keyMap = s.keyStatuses.getInnerMap();
                    for (const key of keyMap.keys()) {
                        if (key === k) {
                            const val = keyMap.get(key);
                            return (val === null || val === void 0 ? void 0 : val.status) === "usable";
                        }
                    }
                    return false;
                });
            });
        });
        return {
            range: (_a = this.buffered.getRangeFor(this._lastPosition.position)) !== null && _a !== void 0 ? _a : null,
            isMissingMetadata,
            isMissingKey,
        };
    }
}
/**
 * Create Object respecting the HTMLs `MediaError` interface with the given code
 * and error message.
 * @param {string} msg
 * @param {number} code
 * @returns {Object}
 */
function createMediaError(msg, code) {
    const err = new Error(msg);
    err.name = "MediaError";
    err.code = code;
    err.MEDIA_ERR_ABORTED = 1;
    err.MEDIA_ERR_NETWORK = 2;
    err.MEDIA_ERR_DECODE = 3;
    err.MEDIA_ERR_SRC_NOT_SUPPORTED = 4;
    return err;
}
