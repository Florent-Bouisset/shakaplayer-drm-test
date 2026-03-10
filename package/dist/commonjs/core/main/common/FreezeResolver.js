"use strict";
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
var experimental_1 = require("../../../experimental");
var log_1 = require("../../../log");
var monotonic_timestamp_1 = require("../../../utils/monotonic_timestamp");
/**
 * "Freezing" is a complex situation indicating that playback is not advancing
 * despite no valid reason for it not to.
 *
 * Technically, there's multiple scenarios in which the RxPlayer will consider
 * the stream as "freezing" and try to fix it.
 * One of those scenarios is when there's a
 * `HTMLMediaElement.prototype.readyState` set to `1` (which is how the browser
 * tells us that it doesn't have any data to play), despite the fact that
 * there's actually data in the buffer.
 *
 * The `MINIMUM_BUFFER_GAP_AT_READY_STATE_1_BEFORE_FREEZING` is the minimum
 * buffer size in seconds after which we will suspect a "freezing" scenario if
 * the `readyState` is still at `1`.
 */
var MINIMUM_BUFFER_GAP_AT_READY_STATE_1_BEFORE_FREEZING = 6;
/**
 * The amount of milliseconds since a freeze was detected from which we consider
 * that the freeze should be worked around: either by flushing buffers,
 * reloading, or any other kind of strategies.
 *
 * Before that delay, will continue to wait to see if the browser succeeds to
 * un-freeze by itself.
 */
var FREEZING_FOR_TOO_LONG_DELAY = 4000;
/**
 * To avoid handling freezes (e.g. "reloading" or "seeking") in a loop when
 * things go wrong, we have a security delay in milliseconds, this
 * `MINIMUM_TIME_BETWEEN_FREEZE_HANDLING` constant, which we'll await between
 * un-freezing attempts.
 */
var MINIMUM_TIME_BETWEEN_FREEZE_HANDLING = 6000;
/**
 * We maintain here a short-term history of what segments have been played
 * recently, to then implement heuristics detecting if a freeze was due to a
 * particular quality or track.
 *
 * To avoid growing that history indefinitely in size, we only save data
 * corresponding to the last `MAXIMUM_SEGMENT_HISTORY_RETENTION_TIME`
 * milliseconds from now.
 */
var MAXIMUM_SEGMENT_HISTORY_RETENTION_TIME = 60000;
/**
 * Sometimes playback is stuck for no known reason, despite having data in
 * buffers.
 *
 * This can be due to relatively valid cause: performance being slow on the
 * device making the content slow to start up, decryption keys not being
 * obtained / usable yet etc.
 *
 * Yet in many cases, this is abnormal and may lead to being stuck at the same
 * position and video frame indefinitely.
 *
 * For those situations, we have a series of tricks and heuristic, which are
 * implemented by the `FreezeResolver`.
 *
 * @class FreezeResolver
 */
var FreezeResolver = /** @class */ (function () {
    function FreezeResolver(segmentSinksStore) {
        this._segmentSinksStore = segmentSinksStore;
        this._decipherabilityFreezeStartingTimestamp = null;
        this._ignoreFreezeUntil = null;
        this._lastFlushAttempt = null;
        this._lastSegmentInfo = {
            audio: [],
            video: [],
        };
    }
    /**
     * Check that playback is not freezing, and if it is, return a solution that
     * should be attempted to unfreeze it.
     *
     * Returns `null` either when there's no freeze happening or if there's one
     * but there's nothing we should do about it yet.
     *
     * Refer to the returned type's definition for more information.
     *
     * @param {Object} observation - The last playback observation produced, it
     * has to be recent (just triggered for example).
     * @returns {Object|null}
     */
    FreezeResolver.prototype.onNewObservation = function (observation) {
        var _a, _b;
        var now = (0, monotonic_timestamp_1.default)();
        this._addPositionToHistory(observation, now);
        if (this._ignoreFreezeUntil !== null && now < this._ignoreFreezeUntil) {
            return null;
        }
        this._ignoreFreezeUntil = null;
        var _c = experimental_1.config.getCurrent(), UNFREEZING_SEEK_DELAY = _c.UNFREEZING_SEEK_DELAY, UNFREEZING_DELTA_POSITION = _c.UNFREEZING_DELTA_POSITION, FREEZING_FLUSH_FAILURE_DELAY = _c.FREEZING_FLUSH_FAILURE_DELAY;
        var readyState = observation.readyState, rebuffering = observation.rebuffering, freezing = observation.freezing, fullyLoaded = observation.fullyLoaded;
        var freezingPosition = observation.position.getPolled();
        var bufferGap = normalizeBufferGap(observation.bufferGap);
        /** If set to `true`, we consider playback "frozen" */
        var isFrozen = freezing !== null ||
            // When rebuffering or loading the content, `freezing` might be not
            // set as we're actively pausing playback.
            // Yet, rebuffering occurences can also be abnormal, such as when enough
            // buffer is constructed but with a low readyState (those are generally
            // decryption issues).
            (readyState === 1 &&
                (bufferGap >= MINIMUM_BUFFER_GAP_AT_READY_STATE_1_BEFORE_FREEZING ||
                    fullyLoaded));
        if (!isFrozen) {
            this._decipherabilityFreezeStartingTimestamp = null;
            return null;
        }
        var freezingTs = (_b = (_a = freezing === null || freezing === void 0 ? void 0 : freezing.timestamp) !== null && _a !== void 0 ? _a : rebuffering === null || rebuffering === void 0 ? void 0 : rebuffering.timestamp) !== null && _b !== void 0 ? _b : null;
        log_1.default.info("Freeze", "Freeze detected", {
            freezeStart: freezingTs,
            timeFrozen: now - (freezingTs !== null && freezingTs !== void 0 ? freezingTs : now),
        });
        /**
         * If `true`, we recently tried to "flush" to unstuck playback but playback
         * is still stuck
         */
        var recentFlushAttemptFailed = this._lastFlushAttempt !== null &&
            now - this._lastFlushAttempt.timestamp < FREEZING_FLUSH_FAILURE_DELAY.MAXIMUM &&
            now - this._lastFlushAttempt.timestamp >= FREEZING_FLUSH_FAILURE_DELAY.MINIMUM &&
            Math.abs(freezingPosition - this._lastFlushAttempt.position) <
                FREEZING_FLUSH_FAILURE_DELAY.POSITION_DELTA;
        if (recentFlushAttemptFailed) {
            var secondUnfreezeStrat = this._getStrategyIfFlushingFails(freezingPosition);
            this._decipherabilityFreezeStartingTimestamp = null;
            this._ignoreFreezeUntil = now + MINIMUM_TIME_BETWEEN_FREEZE_HANDLING;
            return secondUnfreezeStrat;
        }
        var decipherabilityFreezeStrat = this._checkForDecipherabilityRelatedFreeze(observation, now);
        if (decipherabilityFreezeStrat !== null) {
            return decipherabilityFreezeStrat;
        }
        if (freezingTs !== null && now - freezingTs > UNFREEZING_SEEK_DELAY) {
            this._lastFlushAttempt = {
                timestamp: now,
                position: freezingPosition + UNFREEZING_DELTA_POSITION,
            };
            log_1.default.debug("Freeze", "Trying to flush to un-freeze");
            this._decipherabilityFreezeStartingTimestamp = null;
            this._ignoreFreezeUntil = now + MINIMUM_TIME_BETWEEN_FREEZE_HANDLING;
            return {
                type: "flush",
                value: { relativeSeek: UNFREEZING_DELTA_POSITION },
            };
        }
        return null;
    };
    /**
     * Performs decipherability-related checks if it makes sense.
     *
     * If decipherability-related checks have been performed **AND** an
     * un-freezing strategy has been selected by this method, then return
     * an object describing this wanted unfreezing strategy.
     *
     * If this method decides to take no action for now, it returns `null`.
     * @param {Object} observation - playback observation that has just been
     * performed.
     * @param {number} now - Monotonically-raising timestamp for the current
     * time.
     * @returns {Object|null}
     */
    FreezeResolver.prototype._checkForDecipherabilityRelatedFreeze = function (observation, now) {
        var readyState = observation.readyState, rebuffering = observation.rebuffering, freezing = observation.freezing, fullyLoaded = observation.fullyLoaded;
        var bufferGap = normalizeBufferGap(observation.bufferGap);
        var rebufferingForTooLong = rebuffering !== null && now - rebuffering.timestamp > FREEZING_FOR_TOO_LONG_DELAY;
        var _a = haveBuffersUndecipherableData(this._segmentSinksStore), hasUndecipherableData = _a.hasUndecipherableData, hasEncryptedData = _a.hasEncryptedData;
        if (hasUndecipherableData === true) {
            log_1.default.warn("Freeze", "we have undecipherable segments left in the buffer, reloading");
            this._decipherabilityFreezeStartingTimestamp = null;
            this._ignoreFreezeUntil = now + MINIMUM_TIME_BETWEEN_FREEZE_HANDLING;
            return { type: "reload", value: null };
        }
        var frozenForTooLong = freezing !== null && now - freezing.timestamp > FREEZING_FOR_TOO_LONG_DELAY;
        var hasDecipherabilityFreezePotential = (rebufferingForTooLong || frozenForTooLong) &&
            (bufferGap >= MINIMUM_BUFFER_GAP_AT_READY_STATE_1_BEFORE_FREEZING || fullyLoaded) &&
            readyState <= 1;
        if (!hasDecipherabilityFreezePotential) {
            this._decipherabilityFreezeStartingTimestamp = null;
        }
        else if (this._decipherabilityFreezeStartingTimestamp === null) {
            log_1.default.debug("Freeze", "Start of a potential decipherability freeze detected");
            this._decipherabilityFreezeStartingTimestamp = now;
        }
        var shouldHandleDecipherabilityFreeze = this._decipherabilityFreezeStartingTimestamp !== null &&
            (0, monotonic_timestamp_1.default)() - this._decipherabilityFreezeStartingTimestamp >
                FREEZING_FOR_TOO_LONG_DELAY;
        if (shouldHandleDecipherabilityFreeze &&
            hasEncryptedData &&
            hasUndecipherableData === false) {
            log_1.default.warn("Freeze", "we are frozen despite only having decipherable " +
                "segments left in the buffer, reloading");
            this._decipherabilityFreezeStartingTimestamp = null;
            this._ignoreFreezeUntil = now + MINIMUM_TIME_BETWEEN_FREEZE_HANDLING;
            return { type: "reload", value: null };
        }
        return null;
    };
    /**
     * This method should only be called if a "flush" strategy has recently be
     * taken to try to unfreeze playback yet playback is still frozen.
     *
     * It considers the current played content and returns a more-involved
     * unfreezing strategy (most often reload-related) to try to unfree playback.
     * @param {number} freezingPosition - The playback position at which we're
     * currently frozen.
     * @returns {Object}
     */
    FreezeResolver.prototype._getStrategyIfFlushingFails = function (freezingPosition) {
        var e_1, _a;
        log_1.default.warn("Freeze", "A recent flush seemed to have no effect on freeze, checking for transitions");
        /** Contains Representation we might want to avoid after the following algorithm */
        var toAvoid = [];
        try {
            for (var _b = __values(["audio", "video"]), _c = _b.next(); !_c.done; _c = _b.next()) {
                var ttype = _c.value;
                var segmentList = this._lastSegmentInfo[ttype];
                if (segmentList.length === 0) {
                    // There's no buffered segment for that type, go to next type
                    continue;
                }
                /** Played history information on the current segment we're stuck on. */
                var currentSegmentEntry = segmentList[segmentList.length - 1];
                if (currentSegmentEntry.segment === null) {
                    // No segment currently played for that given type, go to next type
                    continue;
                }
                /** Metadata on the segment currently being played. */
                var currentSegment = currentSegmentEntry.segment;
                /**
                 * Set to the first previous segment which is linked to a different
                 * Representation.
                 */
                var previousRepresentationEntry = void 0;
                // Now find `previousRepresentationEntry` and `currentSegmentEntry`.
                for (var i = segmentList.length - 2; i >= 0; i--) {
                    var segment = segmentList[i];
                    if (segment.segment === null) {
                        // Before the current segment, there was no segment being played
                        previousRepresentationEntry = segment;
                        break;
                    }
                    else if (segment.segment.infos.representation.uniqueId !==
                        currentSegment.infos.representation.uniqueId &&
                        currentSegmentEntry.timestamp - segment.timestamp < 5000) {
                        // Before the current segment, there was a segment of a different
                        // Representation being played
                        previousRepresentationEntry = segment;
                        break;
                    }
                    else if (segment.segment.start === currentSegment.start &&
                        // Ignore history entry concerning the same segment more than 3
                        // seconds of playback behind - we don't want to compare things
                        // that happended too long ago.
                        freezingPosition - segment.position < 3000) {
                        // We're still playing the last segment at that point, update it.
                        //
                        // (We may be playing, or be freezing, on the current segment for some
                        // time, this allows to consider a more precize timestamp at which we
                        // switched segments).
                        currentSegmentEntry = segment;
                    }
                }
                if (previousRepresentationEntry === undefined ||
                    previousRepresentationEntry.segment === null) {
                    log_1.default.debug("Freeze", "Freeze when beginning to play a content, try avoiding this quality");
                    toAvoid.push({
                        adaptation: currentSegment.infos.adaptation,
                        period: currentSegment.infos.period,
                        representation: currentSegment.infos.representation,
                    });
                }
                else if (currentSegment.infos.period.id !==
                    previousRepresentationEntry.segment.infos.period.id) {
                    log_1.default.debug("Freeze", "Freeze when switching Period, reloading");
                    return { type: "reload", value: null };
                }
                else if (currentSegment.infos.representation.uniqueId !==
                    previousRepresentationEntry.segment.infos.representation.uniqueId) {
                    log_1.default.warn("Freeze", "Freeze when switching Representation, avoiding", {
                        bitrate: currentSegment.infos.representation.bitrate,
                    });
                    toAvoid.push({
                        adaptation: currentSegment.infos.adaptation,
                        period: currentSegment.infos.period,
                        representation: currentSegment.infos.representation,
                    });
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (toAvoid.length > 0) {
            return { type: "avoid-representations", value: toAvoid };
        }
        else {
            log_1.default.debug("Freeze", "Reloading because flush doesn't work");
            return { type: "reload", value: null };
        }
    };
    /**
     * Add entry to `this._lastSegmentInfo` for the position that is currently
     * played according to the given `observation`.
     *
     * @param {Object} observation
     * @param {number} currentTimestamp
     */
    FreezeResolver.prototype._addPositionToHistory = function (observation, currentTimestamp) {
        var e_2, _a, e_3, _b;
        var _c, _d;
        var position = observation.position.getPolled();
        try {
            for (var _e = __values(["audio", "video"]), _f = _e.next(); !_f.done; _f = _e.next()) {
                var ttype = _f.value;
                var status_1 = this._segmentSinksStore.getStatus(ttype);
                if (status_1.type === "initialized") {
                    try {
                        for (var _g = (e_3 = void 0, __values(status_1.value.getLastKnownInventory())), _h = _g.next(); !_h.done; _h = _g.next()) {
                            var segment = _h.value;
                            if (((_c = segment.bufferedStart) !== null && _c !== void 0 ? _c : segment.start) <= position &&
                                ((_d = segment.bufferedEnd) !== null && _d !== void 0 ? _d : segment.end) > position) {
                                this._lastSegmentInfo[ttype].push({
                                    segment: segment,
                                    position: position,
                                    timestamp: currentTimestamp,
                                });
                            }
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                }
                else {
                    this._lastSegmentInfo[ttype].push({
                        segment: null,
                        position: position,
                        timestamp: currentTimestamp,
                    });
                }
                if (this._lastSegmentInfo[ttype].length > 100) {
                    var toRemove = this._lastSegmentInfo[ttype].length - 100;
                    this._lastSegmentInfo[ttype].splice(0, toRemove);
                }
                var removalTs = currentTimestamp - MAXIMUM_SEGMENT_HISTORY_RETENTION_TIME;
                var i = void 0;
                for (i = 0; i < this._lastSegmentInfo[ttype].length; i++) {
                    if (this._lastSegmentInfo[ttype][i].timestamp > removalTs) {
                        break;
                    }
                }
                if (i > 0) {
                    this._lastSegmentInfo[ttype].splice(0, i);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
            }
            finally { if (e_2) throw e_2.error; }
        }
    };
    return FreezeResolver;
}());
exports.default = FreezeResolver;
/**
 * Check the audio and video buffers for decipherability information.
 * @param {SegmentSinksStore} segmentSinksStore - Interface to obtain the
 * current segment sinks.
 * @returns {Object} - Returns check result. See type information for more
 * details.
 */
function haveBuffersUndecipherableData(segmentSinksStore) {
    var e_4, _a, e_5, _b;
    var hasOnlyDecipherableSegments = true;
    var isClear = true;
    try {
        for (var _c = __values(["audio", "video"]), _d = _c.next(); !_d.done; _d = _c.next()) {
            var ttype = _d.value;
            var status_2 = segmentSinksStore.getStatus(ttype);
            if (status_2.type === "initialized") {
                try {
                    for (var _e = (e_5 = void 0, __values(status_2.value.getLastKnownInventory())), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var segment = _f.value;
                        var representation = segment.infos.representation;
                        if (representation.decipherable === false) {
                            return { hasUndecipherableData: true, hasEncryptedData: true };
                        }
                        else if (representation.contentProtections !== undefined) {
                            isClear = false;
                            if (representation.decipherable !== true) {
                                hasOnlyDecipherableSegments = false;
                            }
                        }
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
            }
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_4) throw e_4.error; }
    }
    return {
        hasEncryptedData: !isClear,
        hasUndecipherableData: hasOnlyDecipherableSegments ? false : undefined,
    };
}
/**
 * Constructs a `bufferGap` value that is more usable than what the
 * `PlaybackObserver` returns:
 *   - it cannot be `undefined`
 *   - its weird `Infinity` value is translated to the more explicit `0`.
 * @param {number|undefined} bufferGap
 * @returns {number}
 */
function normalizeBufferGap(bufferGap) {
    return bufferGap !== undefined && isFinite(bufferGap) ? bufferGap : 0;
}
