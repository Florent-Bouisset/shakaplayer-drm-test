"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.DummyMediaElement = void 0;
var event_listeners_1 = require("../../../compat/event_listeners");
var event_emitter_1 = require("../../../utils/event_emitter");
var monotonic_timestamp_1 = require("../../../utils/monotonic_timestamp");
var noop_1 = require("../../../utils/noop");
var ranges_1 = require("../../../utils/ranges");
var task_canceller_1 = require("../../../utils/task_canceller");
var eme_1 = require("./eme");
var mse_1 = require("./mse");
var utils_1 = require("./utils");
/**
 * Minimum amount of buffer remaining in front of the currently-played position
 * in seconds from which content playback happens. If we're below that value,
 * the `DummyMediaElement` will start rebuffering itself.
 */
var MINIMUM_BUFFER_SIZE_FOR_PLAYBACK = 0.1;
/**
 * The maximum interval in milliseonds at which we re-check the current playback
 * conditions (the `currentTime`, the `readyState` if we're waiting for data
 * etc.)
 * Note that this logic also happens on specific events: new media is added,
 * removed, methods are called...
 */
var TICK_INTERVAL = 40;
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
var DummyMediaElement = /** @class */ (function (_super) {
    __extends(DummyMediaElement, _super);
    function DummyMediaElement(opts) {
        if (opts === void 0) { opts = {}; }
        var _a, _b;
        var _this = _super.call(this) || this;
        _this.buffered = new utils_1.default();
        _this.childNodes = [];
        _this.ended = false;
        _this.error = null;
        _this.isDummy = true;
        _this.mediaKeys = null;
        _this.nodeName = (_a = opts.nodeName) !== null && _a !== void 0 ? _a : "VIDEO";
        _this.paused = true;
        _this.preload = "auto";
        _this.readyState = 0;
        _this.seekable = new utils_1.default();
        _this.seeking = false;
        _this.textTracks = [];
        _this._allowedToPlay = opts.allowedToPlay !== false;
        _this._attachedMediaSource = null;
        _this._autoplay = false;
        _this._canAutoPlay = true;
        _this._currentContentCanceller = null;
        _this._duration = NaN;
        _this._eventScheduler = new utils_1.EventScheduler();
        _this._isFreezing = null;
        _this._lastPosition = {
            position: 0,
            timestamp: (0, monotonic_timestamp_1.default)(),
        };
        _this._muted = false;
        _this._pendingPlayPromises = [];
        _this._playbackRate = 1;
        _this._src = "";
        _this._volume = 1;
        _this._wasLoadedDataSentForCurrentContent = false;
        _this._wasPlayPerformedOnCurrentContent = false;
        _this.onencrypted = null;
        _this.oncanplay = null;
        _this.oncanplaythrough = null;
        _this.onended = null;
        _this.onerror = null;
        _this.onloadeddata = null;
        _this.onloadedmetadata = null;
        _this.onpause = null;
        _this.onplay = null;
        _this.onplaying = null;
        _this.onratechange = null;
        _this.onseeked = null;
        _this.onseeking = null;
        _this.onstalled = null;
        _this.ontimeupdate = null;
        _this.onenterpictureinpicture = null;
        _this.onleavepictureinpicture = null;
        _this.onvolumechange = null;
        _this.onwaiting = null;
        var setMediaKeys = function (mediaElement, mediaKeys) {
            return new Promise(function (resolve) {
                mediaElement.mediaKeys = mediaKeys;
                if (mediaElement === _this && mediaKeys instanceof eme_1.DummyMediaKeys) {
                    mediaKeys.onDummySessionKeyUpdates = function () {
                        _this._tick();
                    };
                }
                resolve(undefined);
                _this._tick();
            });
        };
        _this.FORCED_MEDIA_SOURCE = mse_1.DummyMediaSource;
        _this.FORCED_EME_API = {
            requestMediaKeySystemAccess: (0, eme_1.createRequestMediaKeySystemAccess)((_b = opts.drmOptions) === null || _b === void 0 ? void 0 : _b.requestMediaKeySystemAccessConfig),
            onEncrypted: (0, event_listeners_1.createCompatibleEventListener)(["encrypted"]),
            setMediaKeys: setMediaKeys,
            implementation: "standard",
        };
        return _this;
    }
    Object.defineProperty(DummyMediaElement.prototype, "duration", {
        /**
         * `HTMLMediaElement.duration` property getter.
         */
        get: function () {
            // TODO liveSeekableRange etc.
            return this._duration;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DummyMediaElement.prototype, "volume", {
        /**
         * `HTMLMediaElement.volume` property getter.
         */
        get: function () {
            return this._volume;
        },
        /**
         * `HTMLMediaElement.volume` property setter.
         */
        set: function (newVolume) {
            this._volume = newVolume;
            this._eventScheduler.schedule(this, "volumechange", null).catch(noop_1.default);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DummyMediaElement.prototype, "muted", {
        /**
         * `HTMLMediaElement.muted` property getter.
         */
        get: function () {
            return this._muted;
        },
        /**
         * `HTMLMediaElement.muted` property setter.
         */
        set: function (newMuted) {
            this._muted = newMuted;
            this._eventScheduler.schedule(this, "volumechange", null).catch(noop_1.default);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DummyMediaElement.prototype, "autoplay", {
        /**
         * `HTMLMediaElement.autoplay` property getter.
         */
        get: function () {
            return this._autoplay;
        },
        /**
         * `HTMLMediaElement.autoplay` property setter.
         *
         * A paused content may play if paused while autoplay is set to `true` and
         * if the current content was never played until now.
         * @param {boolean} val - New `autoplay` value.
         */
        set: function (val) {
            this._autoplay = val;
            if (this._currentContentCanceller !== null &&
                this.readyState >= 4 &&
                !this._wasPlayPerformedOnCurrentContent) {
                this._tick();
                this.paused = false;
                this._wasPlayPerformedOnCurrentContent = true;
                this._eventScheduler
                    .schedule(this, "play", this._currentContentCanceller.signal)
                    .catch(noop_1.default);
                this._notifyAboutPlaying();
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DummyMediaElement.prototype, "src", {
        /**
         * `HTMLMediaElement.src` property getter.
         */
        get: function () {
            return this._src;
        },
        /**
         * `HTMLMediaElement.src` property setter.
         *
         * For now, we assume that on a `DummyMediaElement` it is only useful to play
         * "directfile" contents which we don't support for now.
         * @param {string} val - The new URL
         */
        set: function (val) {
            var _this = this;
            var _a;
            this._src = val;
            this.srcObject = null;
            (_a = this._currentContentCanceller) === null || _a === void 0 ? void 0 : _a.cancel();
            var canceller = new task_canceller_1.default();
            this._currentContentCanceller = canceller;
            setTimeout(function () {
                var _a;
                while (_this._pendingPlayPromises.length > 0) {
                    var error = new Error("A new source was set");
                    error.name = "AbortError";
                    (_a = _this._pendingPlayPromises.shift()) === null || _a === void 0 ? void 0 : _a.reject(error);
                }
                var err = createMediaError("Failed to open media", 4);
                _this.error = err;
                _this._eventScheduler.schedule(_this, "error", canceller.signal).catch(noop_1.default);
            });
        },
        enumerable: false,
        configurable: true
    });
    /**
     * An `HTMLMediaElement`'s `addTextTrack` method.
     * Here I did not want to implement that complexity for now as we don't really
     * need it at the time I'm writing this. So it just throws.
     */
    DummyMediaElement.prototype.addTextTrack = function () {
        throw new Error("Not implemented yet");
    };
    Object.defineProperty(DummyMediaElement.prototype, "srcObject", {
        get: function () {
            return this._attachedMediaSource;
        },
        /**
         * `HTMLMediaElement.srcObject` property setter,
         *
         * Right now, that the main way to attach a `DummyMediaSource` to a
         * `DummyMediaElement`.
         * @param {Object|null} val - The `DummyMediaSource` wanted or `null` to stop
         * playback.
         */
        set: function (val) {
            // media element load algorithm
            var _this = this;
            var _a, _b;
            (_a = this._currentContentCanceller) === null || _a === void 0 ? void 0 : _a.cancel();
            this._wasLoadedDataSentForCurrentContent = false;
            this._wasPlayPerformedOnCurrentContent = false;
            this.buffered = new utils_1.default();
            this.seekable = new utils_1.default();
            this._duration = NaN;
            this.error = null;
            this._canAutoPlay = true;
            this.seeking = false;
            this.readyState = 0;
            this.paused = true;
            this._isFreezing = null;
            this._lastPosition = {
                position: 0,
                timestamp: (0, monotonic_timestamp_1.default)(),
            };
            this.ended = false;
            this.playbackRate = 1;
            while (this._pendingPlayPromises.length > 0) {
                var error = new Error("A new source was set");
                error.name = "AbortError";
                (_b = this._pendingPlayPromises.shift()) === null || _b === void 0 ? void 0 : _b.reject(error);
            }
            var prev = this._attachedMediaSource;
            prev === null || prev === void 0 ? void 0 : prev.destroy();
            if (val !== null) {
                if (!(val instanceof mse_1.DummyMediaSource) && val !== null) {
                    this._attachedMediaSource = null;
                    throw new Error("A DummyMediaElement can only be linked to a DummyMediaSource");
                }
                this._attachedMediaSource = val;
                this._currentContentCanceller = new task_canceller_1.default();
                var intervalId_1 = setInterval(function () {
                    _this._tick();
                }, TICK_INTERVAL);
                this._currentContentCanceller.signal.register(function () {
                    clearInterval(intervalId_1);
                });
                this._attachCurrentMediaSource();
            }
            else {
                this._attachedMediaSource = null;
            }
        },
        enumerable: false,
        configurable: true
    });
    /**
     * EME's `HTMLMediaElement.setMediaKeys` method.
     * Here we go through the `FORCED_EME_API` property instead, so that method
     * just throws.
     */
    DummyMediaElement.prototype.setMediaKeys = function (_mk) {
        return Promise.reject("EME not implemented on dummy media element.");
    };
    Object.defineProperty(DummyMediaElement.prototype, "currentTime", {
        /**
         * `HTMLMediaElement.currentTime` property getter.
         */
        get: function () {
            return this._tick();
        },
        /**
         * `HTMLMediaElement.currentTime` property setter.
         */
        set: function (val) {
            this._tick();
            var prevPosition = this._lastPosition.position;
            var canceller = this._currentContentCanceller;
            if (canceller === null || this.readyState === 0) {
                return;
            }
            var seekingPos = val;
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
            var currentBestOffset = null;
            for (var i = 0; i < this.seekable.length; i++) {
                if (seekingPos >= this.seekable.start(i) && seekingPos <= this.seekable.end(i)) {
                    currentBestOffset = 0;
                    break;
                }
                else {
                    var distance = void 0;
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
                        var prevCandidatePosition = currentBestOffset + seekingPos;
                        var newCandidatePosition = distance + seekingPos;
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
            this._lastPosition.timestamp = (0, monotonic_timestamp_1.default)();
            this.seeking = true;
            this._eventScheduler.schedule(this, "seeking", canceller.signal).catch(noop_1.default);
            this._tick();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DummyMediaElement.prototype, "playbackRate", {
        /**
         * HTMLMediaElement.playbackRate property getter.
         */
        get: function () {
            return this._playbackRate;
        },
        /**
         * HTMLMediaElement.playbackRate property setter.
         */
        set: function (val) {
            this._tick();
            this._playbackRate = val;
            this._eventScheduler.schedule(this, "ratechange", null).catch(noop_1.default);
        },
        enumerable: false,
        configurable: true
    });
    /**
     * HTMLMediaElement.pause() method.
     */
    DummyMediaElement.prototype.play = function () {
        var _this = this;
        var _a;
        if (!this._allowedToPlay) {
            var error = new Error("Dummy media element cannot play");
            error.name = "NotAllowedError";
            return Promise.reject(error);
        }
        if (((_a = this.error) === null || _a === void 0 ? void 0 : _a.code) === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
            var error = new Error("`play` call on not supported content");
            error.name = "NotSupportedError";
            return Promise.reject(error);
        }
        var promise = new Promise(function (res, rej) {
            _this._pendingPlayPromises.push({ resolve: res, reject: rej });
        });
        if (this.ended && this.playbackRate >= 0) {
            this.ended = false;
            this._lastPosition.position =
                this.seekable.length > 0 ? this.seekable.start(0) : this._lastPosition.position;
            this._lastPosition.timestamp = (0, monotonic_timestamp_1.default)();
        }
        if (this._currentContentCanceller !== null && this.paused) {
            this._tick();
            this.paused = false;
            this._wasPlayPerformedOnCurrentContent = true;
            // run the time marches on steps
            this._eventScheduler
                .schedule(this, "play", this._currentContentCanceller.signal)
                .catch(noop_1.default);
            if (this.readyState <= 2) {
                this._eventScheduler
                    .schedule(this, "waiting", this._currentContentCanceller.signal)
                    .catch(noop_1.default);
            }
            else {
                this._notifyAboutPlaying();
            }
        }
        else if (this._currentContentCanceller !== null && this.readyState >= 3) {
            // take pending play promises and queue a media element task given the
            // media element to resolve pending play promises with the result.
            while (this._pendingPlayPromises.length > 0) {
                var playPromise = this._pendingPlayPromises.shift();
                playPromise === null || playPromise === void 0 ? void 0 : playPromise.resolve();
            }
        }
        this._canAutoPlay = false;
        return promise;
    };
    /**
     * HTMLMediaElement.pause() method.
     */
    DummyMediaElement.prototype.pause = function () {
        this._internalPauseSteps();
    };
    /**
     * An `Element`'s `removeAttribute` method.
     * Here I did not want to implement that complexity for now as we don't really
     * need it at the time I'm writing this beside removing the `"src"` attribute.
     * So I just allow to do that
     * @param {string} attr
     */
    DummyMediaElement.prototype.removeAttribute = function (attr) {
        if (attr === "src") {
            this.src = "";
        }
        else {
            throw new Error('Removing the attribute + "' +
                String(attr) +
                '" is not yet supported on a `DummyMediaElement`.');
        }
        return;
    };
    /**
     * A `Node`'s `hasChildNodes` method.
     * Here I did not want to implement that complexity for now as we don't really
     * need it at the time I'm writing this. So it just returns false.
     * @returns {boolean}
     */
    DummyMediaElement.prototype.hasChildNodes = function () {
        return false;
    };
    /**
     * A `Node`'s `appendChild` method.
     * Here I did not want to implement that complexity for now as we don't really
     * need it at the time I'm writing this. So it just throws.
     * @param {Node} _child
     */
    DummyMediaElement.prototype.appendChild = function (_child) {
        throw new Error("Unimplemented");
    };
    /**
     * A `Node`'s `removeChild` method.
     * Here I did not want to implement that complexity for now as we don't really
     * need it at the time I'm writing this. So it just throws.
     * @param {*} x
     */
    DummyMediaElement.prototype.removeChild = function (x) {
        if (x === null) {
            throw new TypeError("Asked to remove null child");
        }
        var notFoundErr = new Error("DummyMediaElement has no child");
        notFoundErr.name = "NotFoundError";
        throw notFoundErr;
    };
    /**
     * An added method to force a "freezing" occurence: playback will stall, even
     * if there's decodable and decipherable data in the buffer.
     *
     * Playback will stop freezing once you call the `stopFreezing` method.
     * @param {boolean} resolvesOnSeek - If `true` the freeze occurence will
     * disappear once a seek is performed.
     */
    DummyMediaElement.prototype.startFreezing = function (resolvesOnSeek) {
        this._tick();
        this._isFreezing = {
            resolvesOnSeek: resolvesOnSeek,
        };
    };
    /**
     * Stop "freezing" occurence started with the `startFreezing` method.
     */
    DummyMediaElement.prototype.stopFreezing = function () {
        this._tick();
        this._isFreezing = null;
    };
    /**
     * Method to call once playback reaches the end of the content.
     * Will send the right events and performs the right steps at that point.
     */
    DummyMediaElement.prototype._onPlayingEndOfContent = function () {
        var _a, _b;
        if (((_a = this._attachedMediaSource) === null || _a === void 0 ? void 0 : _a.readyState) !== "ended") {
            return;
        }
        if (this.ended) {
            return;
        }
        // TODO: loop attribute?
        var canceller = this._currentContentCanceller;
        if (this.playbackRate < 0 || canceller === null) {
            return;
        }
        this._eventScheduler.schedule(this, "timeupdate", canceller.signal).catch(noop_1.default);
        if (!this.paused) {
            this.paused = true;
            this._eventScheduler.schedule(this, "pause", canceller.signal).catch(noop_1.default);
        }
        while (this._pendingPlayPromises.length > 0) {
            var error = new Error("The content has ended");
            error.name = "AbortError";
            (_b = this._pendingPlayPromises.shift()) === null || _b === void 0 ? void 0 : _b.reject(error);
        }
        this.ended = true;
        this._eventScheduler.schedule(this, "ended", canceller.signal).catch(noop_1.default);
    };
    /**
     * Method corresponding to the WHATWG's "is eligible for autoplay" logic.
     * @returns {boolean}
     */
    DummyMediaElement.prototype._isEligibleForAutoplay = function () {
        return this._canAutoPlay && this.paused && this.autoplay;
    };
    /**
     * Performs steps on the `_attachedMediaSource` that have to happen on it when
     * it is attached to the `HTMLMediaElement`.
     */
    DummyMediaElement.prototype._attachCurrentMediaSource = function () {
        var _this = this;
        var dummyMs = this._attachedMediaSource;
        if (dummyMs === null) {
            return;
        }
        dummyMs.updateCallbacks({
            hasMediaElementErrored: function () {
                return _this.error !== null;
            },
            onBufferedUpdate: function () {
                _this._tick();
            },
            updateMediaElementDuration: function (duration) {
                // TODO check
                _this._duration = duration;
                if (_this._lastPosition.position > _this._duration) {
                    _this._lastPosition.position = _this._duration;
                    _this._lastPosition.timestamp = (0, monotonic_timestamp_1.default)();
                }
            },
        });
        dummyMs.readyState = "open";
        dummyMs.eventScheduler.schedule(dummyMs, "sourceopen", null).catch(noop_1.default);
    };
    /**
     * Performs the WHATWG "notify about playing" steps.
     */
    DummyMediaElement.prototype._notifyAboutPlaying = function () {
        var _a;
        this._eventScheduler
            .schedule(this, "playing", (_a = this._currentContentCanceller) === null || _a === void 0 ? void 0 : _a.signal)
            .catch(noop_1.default);
        while (this._pendingPlayPromises.length > 0) {
            var playPromise = this._pendingPlayPromises.shift();
            playPromise === null || playPromise === void 0 ? void 0 : playPromise.resolve();
        }
    };
    /**
     * Performs the WHATWG "internal pause steps".
     */
    DummyMediaElement.prototype._internalPauseSteps = function () {
        var _a, _b, _c;
        // "Set the media element's can autoplay flag to false."
        this._canAutoPlay = false;
        if (!this.paused) {
            this._tick();
            this.paused = true; // "Change the value of paused to true."
            this._eventScheduler
                .schedule(this, "timeupdate", (_a = this._currentContentCanceller) === null || _a === void 0 ? void 0 : _a.signal)
                .catch(noop_1.default);
            this._eventScheduler
                .schedule(this, "pause", (_b = this._currentContentCanceller) === null || _b === void 0 ? void 0 : _b.signal)
                .catch(noop_1.default);
            while (this._pendingPlayPromises.length > 0) {
                var error = new Error("The content was paused");
                error.name = "AbortError";
                (_c = this._pendingPlayPromises.shift()) === null || _c === void 0 ? void 0 : _c.reject(error);
            }
        }
    };
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
    DummyMediaElement.prototype._tick = function () {
        this._updateBufferedRanges();
        var bufferInfo = this._getCurrentBufferHealth();
        if (this._attachedMediaSource !== null &&
            this._lastPosition.position >= this._attachedMediaSource.duration) {
            this._lastPosition.position = this._attachedMediaSource.duration;
            this._lastPosition.timestamp = (0, monotonic_timestamp_1.default)();
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
            this._lastPosition.timestamp = (0, monotonic_timestamp_1.default)();
            return this._lastPosition.position;
        }
        var playbackSpeed = bufferInfo.isMissingKey ||
            bufferInfo.isMissingMetadata ||
            this._isFreezing !== null ||
            this.paused ||
            this.ended ||
            this.readyState < 3 ||
            this.playbackRate <= 0
            ? 0
            : this.playbackRate;
        var now = (0, monotonic_timestamp_1.default)();
        var elapsedTime = now - this._lastPosition.timestamp;
        var newPosition = this._lastPosition.position + (elapsedTime * playbackSpeed) / 1000;
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
    };
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
    DummyMediaElement.prototype._updateReadyState = function (_a) {
        var _this = this;
        var isMissingMetadata = _a.isMissingMetadata, isMissingKey = _a.isMissingKey;
        var canceller = this._currentContentCanceller;
        if (this.readyState === 0) {
            if (canceller === null || isMissingMetadata) {
                return;
            }
            this.readyState = 1;
            this.seekable.insert(0, Infinity, null);
            this._eventScheduler.schedule(this, "loadedmetadata", canceller.signal).catch(noop_1.default);
        }
        var currentRange = this.buffered.getRangeFor(this._lastPosition.position);
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
            var loadedDataProm = this._wasLoadedDataSentForCurrentContent
                ? Promise.resolve()
                : this._eventScheduler.schedule(this, "loadeddata", canceller.signal);
            this._wasLoadedDataSentForCurrentContent = true;
            loadedDataProm
                .then(function () {
                return _this._eventScheduler.schedule(_this, "canplay", canceller.signal);
            })
                .then(function () {
                _this.readyState = 4;
                if (!_this.paused) {
                    _this._notifyAboutPlaying();
                }
                else if (_this._isEligibleForAutoplay()) {
                    _this._tick();
                    _this.paused = false;
                    _this._wasPlayPerformedOnCurrentContent = true;
                    _this._eventScheduler.schedule(_this, "play", canceller.signal).catch(noop_1.default);
                    _this._notifyAboutPlaying();
                }
                if (_this.seeking) {
                    _this.seeking = false;
                    _this._eventScheduler
                        .schedule(_this, "timeupdate", canceller.signal)
                        .catch(noop_1.default);
                    _this._eventScheduler.schedule(_this, "seeked", canceller.signal).catch(noop_1.default);
                }
                return _this._eventScheduler.schedule(_this, "canplaythrough", canceller.signal);
            })
                .catch(noop_1.default);
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
                        .then(function () { return _this._eventScheduler.schedule(_this, "waiting", canceller.signal); })
                        .catch(noop_1.default);
                }
            }
            if (this.seeking) {
                this.seeking = false;
                if (canceller !== null) {
                    this._eventScheduler.schedule(this, "timeupdate", canceller.signal).catch(noop_1.default);
                    this._eventScheduler.schedule(this, "seeked", canceller.signal).catch(noop_1.default);
                }
            }
        }
    };
    /**
     * Update `buffered` HTML5 property based on what MSE sourceBuffers have
     * themselves buffered.
     */
    DummyMediaElement.prototype._updateBufferedRanges = function () {
        var e_1, _a;
        var _this = this;
        var _b;
        if (this._attachedMediaSource === null) {
            this.buffered.remove(0, Infinity);
            return;
        }
        var allBuffered = (_b = this._attachedMediaSource.sourceBuffers.reduce(function (acc, sb) {
            var e_2, _a;
            var _b;
            if (acc === null) {
                return (0, ranges_1.convertToRanges)(sb.buffered);
            }
            if (((_b = _this._attachedMediaSource) === null || _b === void 0 ? void 0 : _b.readyState) === "ended") {
                var newRanges = (0, ranges_1.convertToRanges)(sb.buffered);
                try {
                    for (var newRanges_1 = __values(newRanges), newRanges_1_1 = newRanges_1.next(); !newRanges_1_1.done; newRanges_1_1 = newRanges_1.next()) {
                        var newRange = newRanges_1_1.value;
                        (0, ranges_1.insertInto)(acc, newRange);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (newRanges_1_1 && !newRanges_1_1.done && (_a = newRanges_1.return)) _a.call(newRanges_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                return acc;
            }
            return (0, ranges_1.keepRangeIntersection)(acc, (0, ranges_1.convertToRanges)(sb.buffered));
        }, null)) !== null && _b !== void 0 ? _b : [];
        this.buffered = new utils_1.default();
        try {
            for (var allBuffered_1 = __values(allBuffered), allBuffered_1_1 = allBuffered_1.next(); !allBuffered_1_1.done; allBuffered_1_1 = allBuffered_1.next()) {
                var newRange = allBuffered_1_1.value;
                this.buffered.insert(newRange.start, newRange.end, null);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (allBuffered_1_1 && !allBuffered_1_1.done && (_a = allBuffered_1.return)) _a.call(allBuffered_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (this.buffered.length > 0) {
            var bufferEnd = this.buffered.end(this.buffered.length - 1);
            if (bufferEnd > this.duration) {
                this._duration = bufferEnd;
            }
        }
    };
    /**
     * Get key information on the media buffers linked to this media element.
     * @returns {Object}
     */
    DummyMediaElement.prototype._getCurrentBufferHealth = function () {
        var _this = this;
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
        var isMissingMetadata = this._attachedMediaSource.sourceBuffers.some(function (sb) {
            return !sb.hasMetadata;
        });
        var isMissingKey = this._attachedMediaSource.sourceBuffers.some(function (sb) {
            var metadata = sb.buffered.getMetadataFor(_this._lastPosition.position);
            if (metadata === null || metadata.keyIds === null) {
                return false;
            }
            if (_this.mediaKeys === null) {
                return true;
            }
            var dummySessions = _this.mediaKeys.dummySessions;
            return metadata.keyIds.some(function (k) {
                return !dummySessions.some(function (s) {
                    var e_3, _a;
                    var keyMap = s.keyStatuses.getInnerMap();
                    try {
                        for (var _b = __values(keyMap.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var key = _c.value;
                            if (key === k) {
                                var val = keyMap.get(key);
                                return (val === null || val === void 0 ? void 0 : val.status) === "usable";
                            }
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                    return false;
                });
            });
        });
        return {
            range: (_a = this.buffered.getRangeFor(this._lastPosition.position)) !== null && _a !== void 0 ? _a : null,
            isMissingMetadata: isMissingMetadata,
            isMissingKey: isMissingKey,
        };
    };
    return DummyMediaElement;
}(event_emitter_1.default));
exports.DummyMediaElement = DummyMediaElement;
/**
 * Create Object respecting the HTMLs `MediaError` interface with the given code
 * and error message.
 * @param {string} msg
 * @param {number} code
 * @returns {Object}
 */
function createMediaError(msg, code) {
    var err = new Error(msg);
    err.name = "MediaError";
    err.code = code;
    err.MEDIA_ERR_ABORTED = 1;
    err.MEDIA_ERR_NETWORK = 2;
    err.MEDIA_ERR_DECODE = 3;
    err.MEDIA_ERR_SRC_NOT_SUPPORTED = 4;
    return err;
}
