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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
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
/**
 * This file is used to abstract the notion of text, audio and video tracks
 * switching for an easier API management.
 */
var config_1 = require("../../config");
var errors_1 = require("../../errors");
var log_1 = require("../../log");
var manifest_1 = require("../../manifest");
var array_find_1 = require("../../utils/array_find");
var assert_1 = require("../../utils/assert");
var event_emitter_1 = require("../../utils/event_emitter");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var object_assign_1 = require("../../utils/object_assign");
var reference_1 = require("../../utils/reference");
var track_dispatcher_1 = require("./track_dispatcher");
/**
 * Class helping with the management of the audio, video and text tracks and
 * qualities.
 *
 * The `TracksStore` allows to choose a track and qualities for different types
 * of media through a simpler API.
 *
 * @class TracksStore
 */
var TracksStore = /** @class */ (function (_super) {
    __extends(TracksStore, _super);
    function TracksStore(args) {
        var _a;
        var _this = _super.call(this) || this;
        _this._storedPeriodInfo = [];
        _this._isDisposed = false;
        _this._cachedPeriodInfo = new WeakMap();
        _this._isTrickModeTrackEnabled = args.preferTrickModeTracks;
        _this._defaultAudioTrackSwitchingMode =
            (_a = args.defaultAudioTrackSwitchingMode) !== null && _a !== void 0 ? _a : config_1.default.getCurrent().DEFAULT_AUDIO_TRACK_SWITCHING_MODE;
        _this.onTracksNotPlayableForType = args.onTracksNotPlayableForType;
        return _this;
    }
    /**
     * Return Array of Period information, to allow an outside application to
     * modify the track of any Period.
     * @returns {Array.<Object>}
     */
    TracksStore.prototype.getAvailablePeriods = function () {
        return this._storedPeriodInfo.reduce(function (acc, p) {
            if (p.isPeriodAdvertised) {
                acc.push(toExposedPeriod(p.period));
            }
            return acc;
        }, []);
    };
    /**
     * Callack that needs to be called as codec support is either first known or
     * updated on the Manifest.
     */
    TracksStore.prototype.onManifestCodecSupportUpdate = function () {
        this._selectInitialTrackIfNeeded();
    };
    /**
     * Check that a period has a supported track for the given track type.
     * Trigger an error with `MANIFEST_INCOMPATIBLE_CODECS_ERROR` if no codecs are
     * supported and `onTracksNotPlayableForType[ttype]` is "error".
     *
     * @param period - The period to check
     * @param ttype - The track type.
     */
    TracksStore.prototype.checkPeriodHasSupportedTrack = function (period, ttype) {
        var _a, _b;
        var adaptationsForType = period.adaptations[ttype];
        var audioVideoAdaptations = __spreadArray(__spreadArray([], __read(((_a = period.adaptations.audio) !== null && _a !== void 0 ? _a : [])), false), __read(((_b = period.adaptations.video) !== null && _b !== void 0 ? _b : [])), false);
        var periodHasAdaptationForType = adaptationsForType !== undefined && adaptationsForType.length > 0;
        if (!periodHasAdaptationForType) {
            // The content does not have audio/video media, e.g. it's an audio only content.
            // there is no track of this type to select.
            return;
        }
        var isTypeUnsupported = adaptationsForType.every(function (adapt) { return adapt.supportStatus.hasSupportedCodec === false; });
        var isAudioAndVideoUnsupported = audioVideoAdaptations.every(function (adapt) { return adapt.supportStatus.hasSupportedCodec === false; });
        if (isTypeUnsupported) {
            var err = new errors_1.MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR", "No supported " + ttype + " adaptations", { tracks: undefined });
            if (isAudioAndVideoUnsupported) {
                // Both video and audio are unsupported or the content is audio/video only.
                // The content cannot be played without this media type as there is no other media type.
                this.trigger("error", err);
                // The previous event trigger could have had side-effects, so we
                // re-check if we're still mostly in the same state
                if (this._isDisposed) {
                    return; // Someone disposed the `TracksStore` on the previous side-effect
                }
                this.dispose();
                return;
            }
            else if (this.onTracksNotPlayableForType[ttype] === "continue") {
                // audio or video is not playable, but let's continue the playback without audio
                // or without video because of the option was set to "continue".
                this.trigger("warning", err);
            }
            else {
                this.trigger("error", err);
                // The previous event trigger could have had side-effects, so we
                // re-check if we're still mostly in the same state
                if (this._isDisposed) {
                    return; // Someone disposed the `TracksStore` on the previous side-effect
                }
                this.dispose();
                return;
            }
        }
    };
    /**
     * Update the list of Periods handled by the TracksStore and make a
     * track choice decision for each of them.
     * @param {Object} manifest - The new Manifest object
     */
    TracksStore.prototype.onManifestUpdate = function (manifest) {
        var e_1, _a, _b, e_2, _c;
        var _this = this;
        var _d, _e, _f;
        var periods = manifest.periods;
        // We assume that they are always sorted chronologically
        // In dev mode, perform a runtime check that this is the case
        if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
            for (var i = 1; i < periods.length; i++) {
                (0, assert_1.default)(periods[i - 1].start <= periods[i].start);
            }
        }
        /** Periods which have just been added. */
        var addedPeriods = [];
        var _loop_1 = function (period) {
            ["audio", "video"].forEach(function (ttype) {
                _this.checkPeriodHasSupportedTrack(period, ttype);
            });
            if (this_1._isDisposed) {
                return { value: void 0 };
            }
        };
        var this_1 = this;
        try {
            for (var periods_1 = __values(periods), periods_1_1 = periods_1.next(); !periods_1_1.done; periods_1_1 = periods_1.next()) {
                var period = periods_1_1.value;
                var state_1 = _loop_1(period);
                if (typeof state_1 === "object")
                    return state_1.value;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (periods_1_1 && !periods_1_1.done && (_a = periods_1.return)) _a.call(periods_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var newPListIdx = 0;
        for (var i = 0; i < this._storedPeriodInfo.length; i++) {
            var oldPeriod = this._storedPeriodInfo[i].period;
            var newPeriod = periods[newPListIdx];
            if (newPeriod === undefined) {
                // We reached the end of the new Periods, remove remaining old Periods
                for (var j = this._storedPeriodInfo.length - 1; j >= i; j--) {
                    this._storedPeriodInfo[j].inManifest = false;
                    if (isPeriodItemRemovable(this._storedPeriodInfo[j])) {
                        this._removePeriodObject(j);
                    }
                }
            }
            else if (oldPeriod === newPeriod) {
                newPListIdx++;
                this.resetSelectedTrackIfNotAvailableAnymore(this._storedPeriodInfo[i], newPeriod, "video");
                this.resetSelectedTrackIfNotAvailableAnymore(this._storedPeriodInfo[i], newPeriod, "audio");
                this.resetSelectedTrackIfNotAvailableAnymore(this._storedPeriodInfo[i], newPeriod, "text");
                // (If not, what do?)
            }
            else if (oldPeriod.start <= newPeriod.start) {
                // This old Period does not exist anymore.
                this._storedPeriodInfo[i].inManifest = false;
                if (isPeriodItemRemovable(this._storedPeriodInfo[i])) {
                    this._removePeriodObject(i);
                    i--;
                }
            }
            else {
                var newPeriodInfo = generatePeriodInfo(newPeriod, true);
                // oldPeriod.start > newPeriod.start: insert newPeriod before
                this._storedPeriodInfo.splice(i, 0, newPeriodInfo);
                addedPeriods.push(newPeriodInfo);
                newPListIdx++;
                // Note: we don't increment `i` on purpose here, as we want to check the
                // same oldPeriod at the next loop iteration
            }
        }
        if (newPListIdx < periods.length) {
            // Add further new Period
            var periodsToAdd = periods
                .slice(newPListIdx)
                .map(function (p) { return generatePeriodInfo(p, true); });
            (_b = this._storedPeriodInfo).push.apply(_b, __spreadArray([], __read(periodsToAdd), false));
            addedPeriods.push.apply(addedPeriods, __spreadArray([], __read(periodsToAdd), false));
        }
        try {
            for (var _g = __values(this._storedPeriodInfo), _h = _g.next(); !_h.done; _h = _g.next()) {
                var storedPeriodInfo = _h.value;
                (_d = storedPeriodInfo.audio.dispatcher) === null || _d === void 0 ? void 0 : _d.refresh();
                (_e = storedPeriodInfo.video.dispatcher) === null || _e === void 0 ? void 0 : _e.refresh();
                (_f = storedPeriodInfo.text.dispatcher) === null || _f === void 0 ? void 0 : _f.refresh();
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_h && !_h.done && (_c = _g.return)) _c.call(_g);
            }
            finally { if (e_2) throw e_2.error; }
        }
    };
    TracksStore.prototype.onDecipherabilityUpdates = function () {
        var e_3, _a;
        var _b, _c, _d;
        try {
            for (var _e = __values(this._storedPeriodInfo), _f = _e.next(); !_f.done; _f = _e.next()) {
                var storedPeriodInfo = _f.value;
                (_b = storedPeriodInfo.audio.dispatcher) === null || _b === void 0 ? void 0 : _b.refresh();
                (_c = storedPeriodInfo.video.dispatcher) === null || _c === void 0 ? void 0 : _c.refresh();
                (_d = storedPeriodInfo.text.dispatcher) === null || _d === void 0 ? void 0 : _d.refresh();
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
            }
            finally { if (e_3) throw e_3.error; }
        }
    };
    /**
     * Reset the stored settings if the track is not available anymore in
     * the new manifest.
     * @param periodInfo
     * @param newPeriod
     * @param type
     * @returns
     */
    TracksStore.prototype.resetSelectedTrackIfNotAvailableAnymore = function (periodInfo, newPeriod, type) {
        var _a;
        var wantedTrack = periodInfo[type].storedSettings;
        if ((0, is_null_or_undefined_1.default)(wantedTrack)) {
            return;
        }
        var supportedAdaptations = (0, manifest_1.getSupportedAdaptations)(newPeriod, type);
        var stillHere = supportedAdaptations.some(function (a) { return a.id === wantedTrack.adaptation.id; });
        if (stillHere) {
            // The track still exists, it don't need to be resetted.
            return;
        }
        log_1.default.warn("Track", "Chosen ".concat(type, " Adaptation not available anymore"));
        if (type === "video") {
            periodInfo.video.storedSettings = this.getDefaultStoredSettingsForAdaptation(supportedAdaptations, "video");
        }
        else if (type === "audio") {
            periodInfo.audio.storedSettings = this.getDefaultStoredSettingsForAdaptation(supportedAdaptations, "audio");
        }
        else if (type === "text") {
            periodInfo.text.storedSettings = this.getDefaultStoredSettingsForAdaptation(supportedAdaptations, "text");
        }
        this.trigger("trackUpdate", {
            period: toExposedPeriod(newPeriod),
            trackType: type,
            reason: "missing",
        });
        // The previous event trigger could have had side-effects, so we
        // re-check if we're still mostly in the same state
        if (this._isDisposed) {
            return; // The current TracksStore is disposed, we can abort
        }
        var periodItem = getPeriodItem(this._storedPeriodInfo, periodInfo.period.id);
        if (periodItem !== undefined &&
            periodItem.isPeriodAdvertised &&
            periodItem[type].storedSettings === null) {
            (_a = periodItem[type].dispatcher) === null || _a === void 0 ? void 0 : _a.updateTrack(null);
        }
    };
    TracksStore.prototype.getDefaultStoredSettingsForAdaptation = function (supportedAdaptations, type) {
        var DEFAULT_VIDEO_TRACK_SWITCHING_MODE = config_1.default.getCurrent().DEFAULT_VIDEO_TRACK_SWITCHING_MODE;
        if (type === "text") {
            return null;
        }
        if (supportedAdaptations.length === 0) {
            return null;
        }
        switch (type) {
            case "text":
                return null;
            case "video": {
                var adaptationBase = supportedAdaptations[0];
                var adaptation = getRightVideoTrack(adaptationBase, this._isTrickModeTrackEnabled);
                var lockedRepresentations = new reference_1.default(null);
                return {
                    adaptationBase: adaptationBase,
                    adaptation: adaptation,
                    switchingMode: DEFAULT_VIDEO_TRACK_SWITCHING_MODE,
                    lockedRepresentations: lockedRepresentations,
                };
            }
            case "audio": {
                return {
                    adaptation: supportedAdaptations[0],
                    switchingMode: this._defaultAudioTrackSwitchingMode,
                    lockedRepresentations: new reference_1.default(null),
                };
            }
            default: {
                (0, assert_1.assertUnreachable)(type);
            }
        }
    };
    /**
     * Add shared reference to choose Adaptation for new "audio", "video" or
     * "text" Period.
     *
     * Note that such reference has to be removed through `removeTrackReference`
     * so ressources can be freed.
     * @param {string} bufferType - The concerned buffer type
     * @param {Period} period - The concerned Period.
     * @param {Object} adaptationRef - A reference through which
     * the choice will be given.
     */
    TracksStore.prototype.addTrackReference = function (bufferType, period, adaptationRef) {
        var e_4, _a;
        var _this = this;
        log_1.default.debug("Track", "Adding Track Reference", { bufferType: bufferType, periodId: period.id });
        var periodObj = getPeriodItem(this._storedPeriodInfo, period.id);
        if (periodObj === undefined) {
            // The Period has not yet been added.
            periodObj = generatePeriodInfo(period, false);
            var found = false;
            for (var i = 0; i < this._storedPeriodInfo.length; i++) {
                if (this._storedPeriodInfo[i].period.start > period.start) {
                    this._storedPeriodInfo.splice(i, 0, periodObj);
                    found = true;
                }
            }
            if (!found) {
                this._storedPeriodInfo.push(periodObj);
            }
        }
        if (periodObj[bufferType].dispatcher !== null) {
            log_1.default.error("Track", "Subject already added for type and Period", {
                bufferType: bufferType,
                periodId: period.id,
            });
            periodObj[bufferType].dispatcher.dispose();
        }
        var dispatcher = new track_dispatcher_1.default(adaptationRef);
        periodObj[bufferType].dispatcher = dispatcher;
        dispatcher.addEventListener("noPlayableRepresentation", function () {
            _this.handleMissingOrUnplayableTrack(period, bufferType, false);
        });
        dispatcher.addEventListener("noPlayableLockedRepresentation", function () {
            // TODO check that it doesn't already lead to segment loading or MediaSource
            // reloading
            if (periodObj === undefined) {
                return;
            }
            _this.unlockVideoRepresentations(periodObj);
            _this.trigger("brokenRepresentationsLock", {
                period: { id: period.id, start: period.start, end: period.end },
                trackType: bufferType,
            });
        });
        this._selectInitialTrackIfNeeded();
        // Ensure `newAvailablePeriods` is sent
        if (this._shouldAdvertisePeriod(periodObj)) {
            periodObj.isPeriodAdvertised = true;
            this.trigger("newAvailablePeriods", [
                {
                    id: period.id,
                    start: period.start,
                    end: period.end,
                },
            ]);
            if (this._isDisposed) {
                return;
            }
        }
        // Ensure the initial track is set for each type now)
        var trackTypes = ["audio", "video", "text"];
        try {
            for (var trackTypes_1 = __values(trackTypes), trackTypes_1_1 = trackTypes_1.next(); !trackTypes_1_1.done; trackTypes_1_1 = trackTypes_1.next()) {
                var ttype = trackTypes_1_1.value;
                var trackObj = periodObj[ttype];
                if (periodObj.isPeriodAdvertised &&
                    trackObj.dispatcher !== null &&
                    !trackObj.dispatcher.hasSetTrack() &&
                    trackObj.storedSettings !== undefined) {
                    trackObj.dispatcher.updateTrack(trackObj.storedSettings);
                }
                if (this._isDisposed) {
                    return;
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (trackTypes_1_1 && !trackTypes_1_1.done && (_a = trackTypes_1.return)) _a.call(trackTypes_1);
            }
            finally { if (e_4) throw e_4.error; }
        }
    };
    /**
     * Throws an error if neither audio nor video tracks are selected for the given period.
     *
     * This indicates that the application or user has not selected any tracks for playback,
     * which is considered an invalid state.
     *
     * @param {object} period - The period to check for selected tracks.
     * @returns {void}
     * @throws {erorr} If no audio or video tracks are set for the period.
     */
    TracksStore.prototype.throwIfTracksAreNotSetForPeriod = function (period) {
        var periodItem = getPeriodItem(this._storedPeriodInfo, period.id);
        if (periodItem !== undefined) {
            var hasNoTrackAtAll = ["audio", "video"].every(function (ttype) { return periodItem[ttype].storedSettings === null; });
            if (hasNoTrackAtAll) {
                var err = new errors_1.MediaError("NO_AUDIO_VIDEO_TRACKS", "No audio and no video tracks are set.");
                this.trigger("error", err);
                this.dispose();
            }
        }
    };
    /**
     * Handles the case when no playable representations are available, or when no initial track has been set,
     * for a given period and track type (e.g., `'video'` or `'audio'`).
     *
     * It attempts to fall back to another available track.
     *
     * If no fallback tracks are available, the function may either:
     * - Throw an error
     * - Continue playback by disabling the affected media type (audio/video)
     *
     * The behavior depends on how the `onVideoTracksNotPlayable` and `onAudioTracksNotPlayable` options are configured.
     *
     * @param {Object} period - The period object containing the adaptations.
     * @param {string} trackType - The type of media track (e.g., `'video'` or `'audio'`) that became unplayable.
     *@param {boolean} isInitialSelection - Indicates if this occurs during initial track selection.
     * @returns {void}
     */
    TracksStore.prototype.handleMissingOrUnplayableTrack = function (period, trackType, isInitialSelection) {
        var _a, _b, _c, _d;
        var _e = getFallbackTrack(period, trackType), fallbackTrack = _e.fallbackTrack, noSourceMedia = _e.noSourceMedia;
        var typeInfo = (_a = getPeriodItem(this._storedPeriodInfo, period.id)) === null || _a === void 0 ? void 0 : _a[trackType];
        if (typeInfo === undefined) {
            log_1.default.warn("Track", "Could not find period", { periodId: period.id });
            return;
        }
        var initialStoredSettings = typeInfo.storedSettings;
        var hasStoredSettingsChanged = function () {
            return typeInfo.storedSettings !== initialStoredSettings;
        };
        if (fallbackTrack !== null) {
            var switchingMode = void 0;
            if (trackType === "audio") {
                switchingMode = this._defaultAudioTrackSwitchingMode;
            }
            else if (trackType === "text") {
                switchingMode = "direct";
            }
            else {
                switchingMode = "reload";
            }
            var storedSettings = {
                adaptation: fallbackTrack,
                switchingMode: switchingMode,
                lockedRepresentations: new reference_1.default(null),
            };
            typeInfo.storedSettings = storedSettings;
            if (!isInitialSelection) {
                // "trackUpdate" events are not sent for the initial track.
                // See documentation: #Player_Events.md, section ###trackUpdate
                this.trigger("trackUpdate", {
                    period: toExposedPeriod(period),
                    trackType: trackType,
                    reason: "no-playable-representation",
                });
            }
            // The previous event trigger could have had side-effects, so we
            // re-check if we're still mostly in the same state
            if (this._isDisposed) {
                return; // Someone disposed the `TracksStore` on the previous side-effect
            }
            // Check again that no track change occurred in the meantime
            if (typeInfo.storedSettings === storedSettings) {
                (_b = typeInfo.dispatcher) === null || _b === void 0 ? void 0 : _b.updateTrack(storedSettings);
            }
        }
        else if (fallbackTrack === null && !noSourceMedia) {
            this.trigger("noPlayableTrack", {
                trackType: trackType,
                period: { id: period.id, start: period.start, end: period.end },
            });
            // The previous event trigger could have had side-effects, so we
            // re-check if we're still mostly in the same state
            if (this._isDisposed) {
                return; // Someone disposed the `TracksStore` on the previous side-effect
            }
            var fallbackBehavior = this.onTracksNotPlayableForType[trackType];
            if (hasStoredSettingsChanged()) {
                // The previous "noPlayableTrack" event might have caused changes,
                // so we re-check to see if the selected track has been updated.
                // If it has, we exit early because the API consumer likely adjusted the settings,
                // and throwing an error now would be out of sync with their changes.
            }
            else if (fallbackBehavior === "continue") {
                log_1.default.warn("Track", "No playable ".concat(trackType, ", continuing without ").concat(trackType));
                typeInfo.storedSettings = null;
                if (!isInitialSelection) {
                    // "trackUpdate" events are not sent for the initial track.
                    // See documentation: #Player_Events.md, section ###trackUpdate
                    this.trigger("trackUpdate", {
                        period: toExposedPeriod(period),
                        trackType: trackType,
                        reason: "no-playable-representation",
                    });
                }
                if (typeInfo.storedSettings !== null || this._isDisposed) {
                    // The previous "trackUpdate" event might have caused changes,
                    // so we re-check to see if the selected track has been updated.
                    // If it has, we exit early because the API consumer likely adjusted the settings,
                    // and throwing an error now would be out of sync with their changes.
                }
                else {
                    (_c = typeInfo.dispatcher) === null || _c === void 0 ? void 0 : _c.updateTrack(null);
                }
            }
            else if (fallbackBehavior === "error") {
                var noRepErr = new errors_1.MediaError("NO_PLAYABLE_REPRESENTATION", "No ".concat(trackType, " Representation can be played"), { tracks: undefined });
                this.trigger("error", noRepErr);
            }
        }
        else if (fallbackTrack === null && noSourceMedia) {
            log_1.default.debug("Track", "The period does not have adaptation for ".concat(trackType, " there is no track to choose"));
            typeInfo.storedSettings = null;
            if (!isInitialSelection) {
                // "trackUpdate" events are not sent for the initial track.
                // See documentation: #Player_Events.md, section ###trackUpdate
                this.trigger("trackUpdate", {
                    period: toExposedPeriod(period),
                    trackType: trackType,
                    reason: "no-playable-representation",
                });
            }
            if (typeInfo.storedSettings !== null || this._isDisposed) {
                // The previous "trackUpdate" event might have caused changes,
                // so we re-check to see if the selected track has been updated.
                // If it has, we exit early because the API consumer likely adjusted the settings,
                // and throwing an error now would be out of sync with their changes.
            }
            else {
                (_d = typeInfo.dispatcher) === null || _d === void 0 ? void 0 : _d.updateTrack(null);
            }
        }
        // The previous event trigger could have had side-effects, so we
        // re-check if we're still mostly in the same state
        if (this._isDisposed) {
            return; // Someone disposed the `TracksStore` on the previous side-effect
        }
        if (trackType !== "text") {
            // Allow missing text tracks; only enforce for audio/video
            this.throwIfTracksAreNotSetForPeriod(period);
        }
    };
    /**
     * Remove shared reference to choose an "audio", "video" or "text" Adaptation
     * for a Period.
     * @param {string} bufferType - The concerned buffer type
     * @param {string} periodId - The concerned Period's `id`.
     */
    TracksStore.prototype.removeTrackReference = function (bufferType, periodId) {
        log_1.default.debug("Track", "Removing Track Reference", { bufferType: bufferType, periodId: periodId });
        var periodIndex;
        for (var i = 0; i < this._storedPeriodInfo.length; i++) {
            var periodI = this._storedPeriodInfo[i];
            if (periodI.period.id === periodId) {
                periodIndex = i;
                break;
            }
        }
        if (periodIndex === undefined) {
            log_1.default.warn("Track", "type not found for period", { bufferType: bufferType, periodId: periodId });
            return;
        }
        var periodObj = this._storedPeriodInfo[periodIndex];
        var choiceItem = periodObj[bufferType];
        if ((choiceItem === null || choiceItem === void 0 ? void 0 : choiceItem.dispatcher) === null) {
            log_1.default.warn("Track", "TrackDispatcher already removed for type and Period", {
                bufferType: bufferType,
                periodId: periodId,
            });
            return;
        }
        choiceItem.dispatcher.dispose();
        choiceItem.dispatcher = null;
        if (isPeriodItemRemovable(periodObj)) {
            this._removePeriodObject(periodIndex);
        }
    };
    /**
     * Allows to recuperate a "Period Object" - used in get/set methods of the
     * `TracksStore` - by giving the Period itself.
     *
     * This method should be preferred when possible over `getPeriodObjectFromId`
     * because it is able to fallback on an internal cache in case the
     * corresponding Period is not stored anymore.
     * This for example could happen when a Period has been removed from the
     * Manifest yet may still be needed (e.g. because its linked segments might
     * still live in the buffers).
     *
     * Note however that this cache-retrieval logic is based on a Map whose key
     * is the Period's JavaScript reference. As such, the cache won't be used if
     * `Period` corresponds to a copy of the original `Period` object.
     *
     * @param {Object} period
     * @returns {Object}
     */
    TracksStore.prototype.getPeriodObjectFromPeriod = function (period) {
        var periodObj = getPeriodItem(this._storedPeriodInfo, period.id);
        if (periodObj === undefined && period !== undefined) {
            return this._cachedPeriodInfo.get(period);
        }
        return periodObj;
    };
    /**
     * Allows to recuperate a "Period Object" - used in get/set methods of the
     * `TracksStore` - by giving the Period's id.
     *
     * Note that unlike `getPeriodObjectFromPeriod` this method is only going to look
     * into currently stored Period and as such old Periods not in the Manifest
     * anymore might not be retrievable.
     * If you want to retrieve Period objects linked to such Period, you might
     * prefer to use `getPeriodObjectFromPeriod` (which necessitates the original
     * Period object).
     *
     * @param {string} periodId - The concerned Period's id
     * @returns {Object}
     */
    TracksStore.prototype.getPeriodObjectFromId = function (periodId) {
        return getPeriodItem(this._storedPeriodInfo, periodId);
    };
    TracksStore.prototype.disableVideoTrickModeTracks = function () {
        if (!this._isTrickModeTrackEnabled) {
            return;
        }
        this._isTrickModeTrackEnabled = false;
        this._resetVideoTrackChoices("trickmode-disabled");
    };
    TracksStore.prototype.enableVideoTrickModeTracks = function () {
        if (this._isTrickModeTrackEnabled) {
            return;
        }
        this._isTrickModeTrackEnabled = true;
        this._resetVideoTrackChoices("trickmode-enabled");
    };
    /**
     * Reset the TracksStore's Period objects:
     *   - All Period which are not in the manifest currently will be removed.
     *   - All References used to communicate the wanted track will be removed.
     *
     * You might want to call this API when restarting playback.
     */
    TracksStore.prototype.resetPeriodObjects = function () {
        var _a, _b, _c;
        log_1.default.debug("Track", "Resetting Period Objects");
        for (var i = this._storedPeriodInfo.length - 1; i >= 0; i--) {
            var storedObj = this._storedPeriodInfo[i];
            (_a = storedObj.audio.dispatcher) === null || _a === void 0 ? void 0 : _a.dispose();
            storedObj.audio.dispatcher = null;
            (_b = storedObj.video.dispatcher) === null || _b === void 0 ? void 0 : _b.dispose();
            storedObj.video.dispatcher = null;
            (_c = storedObj.text.dispatcher) === null || _c === void 0 ? void 0 : _c.dispose();
            storedObj.text.dispatcher = null;
            if (!storedObj.inManifest) {
                this._removePeriodObject(i);
            }
        }
    };
    /**
     * @returns {boolean}
     */
    TracksStore.prototype.isTrickModeEnabled = function () {
        return this._isTrickModeTrackEnabled;
    };
    /**
     * Set audio track based on the ID of its Adaptation for a given added Period.
     * @param {Object} params
     * @param {Object} params.periodRef - The concerned Period's object.
     * @param {string} params.trackId - adaptation id of the wanted track.
     * @param {string} params.switchingMode - Behavior when replacing the track by
     * another.
     * @param {Object|null} params.lockedRepresentations - Audio Representations
     * that should be locked after switching to that track.
     * `null` if no Audio Representation should be locked.
     * @param {number} params.relativeResumingPosition
     */
    TracksStore.prototype.setAudioTrack = function (payload) {
        var periodRef = payload.periodRef, trackId = payload.trackId, switchingMode = payload.switchingMode, lockedRepresentations = payload.lockedRepresentations, relativeResumingPosition = payload.relativeResumingPosition;
        return this._setAudioOrTextTrack({
            bufferType: "audio",
            periodRef: periodRef,
            trackId: trackId,
            switchingMode: switchingMode !== null && switchingMode !== void 0 ? switchingMode : this._defaultAudioTrackSwitchingMode,
            lockedRepresentations: lockedRepresentations,
            relativeResumingPosition: relativeResumingPosition,
        });
    };
    /**
     * Set text track based on the ID of its Adaptation for a given added Period.
     * @param {Object} periodObj - The concerned Period's object.
     * @param {string} wantedId - adaptation id of the wanted track.
     */
    TracksStore.prototype.setTextTrack = function (periodObj, wantedId) {
        return this._setAudioOrTextTrack({
            bufferType: "text",
            periodRef: periodObj,
            trackId: wantedId,
            switchingMode: "direct",
            lockedRepresentations: null,
            relativeResumingPosition: undefined,
        });
    };
    /**
     * Set audio track based on the ID of its Adaptation for a given added Period.
     * @param {Object} params
     * @param {string} params.bufferType
     * @param {Object} params.periodRef - The concerned Period's object.
     * @param {string} params.trackId - adaptation id of the wanted track.
     * @param {string} params.switchingMode - Behavior when replacing the track by
     * another.
     * @param {Array.<string>|null} params.lockedRepresentations - Audio
     * Representations that should be locked after switchingMode to that track.
     * `null` if no Audio Representation should be locked.
     * @param {number|undefined} params.relativeResumingPosition
     */
    TracksStore.prototype._setAudioOrTextTrack = function (_a) {
        var _b, _c;
        var bufferType = _a.bufferType, periodRef = _a.periodRef, trackId = _a.trackId, switchingMode = _a.switchingMode, lockedRepresentations = _a.lockedRepresentations, relativeResumingPosition = _a.relativeResumingPosition;
        if (!periodRef.isPeriodAdvertised) {
            throw new Error("Wanted Period not yet advertised.");
        }
        var period = periodRef.period;
        var wantedAdaptation = (0, array_find_1.default)((_b = period.adaptations[bufferType]) !== null && _b !== void 0 ? _b : [], function (_a) {
            var id = _a.id, supportStatus = _a.supportStatus;
            return supportStatus.hasSupportedCodec !== false &&
                supportStatus.isDecipherable !== false &&
                id === trackId;
        });
        if (wantedAdaptation === undefined) {
            throw new Error("Wanted ".concat(bufferType, " track not found."));
        }
        var typeInfo = periodRef[bufferType];
        var lockedRepresentationsRef;
        if (lockedRepresentations === null) {
            lockedRepresentationsRef = new reference_1.default(null);
        }
        else {
            var representationsToLock = this._getRepresentationsToLock(wantedAdaptation, lockedRepresentations);
            var repSwitchingMode = bufferType === "audio"
                ? this._defaultAudioTrackSwitchingMode
                : "direct";
            lockedRepresentationsRef = new reference_1.default({
                representationIds: representationsToLock,
                switchingMode: repSwitchingMode,
            });
        }
        var storedSettings = {
            adaptation: wantedAdaptation,
            switchingMode: switchingMode,
            lockedRepresentations: lockedRepresentationsRef,
            relativeResumingPosition: relativeResumingPosition,
        };
        typeInfo.storedSettings = storedSettings;
        this.trigger("trackUpdate", {
            period: toExposedPeriod(period),
            trackType: bufferType,
            reason: "manual",
        });
        // The previous event trigger could have had side-effects, so we
        // re-check if we're still mostly in the same state
        if (this._isDisposed) {
            return; // Someone disposed the `TracksStore` on the previous side-effect
        }
        var newPeriodItem = getPeriodItem(this._storedPeriodInfo, period.id);
        if (newPeriodItem !== undefined &&
            newPeriodItem[bufferType].storedSettings === storedSettings) {
            (_c = newPeriodItem[bufferType].dispatcher) === null || _c === void 0 ? void 0 : _c.updateTrack(storedSettings);
        }
    };
    /**
     * Set video track based on the ID of its Adaptation for a given added Period.
     * @param {Object} params
     * @param {Object} params.periodRef - The concerned Period's object.
     * @param {string} params.trackId - adaptation id of the wanted track.
     * @param {string} params.switchingMode - Behavior when replacing the track by
     * another.
     * @param {Array.<string>|null} params.lockedRepresentations - Video
     * Representations that should be locked after switching to that track.
     * `null` if no Video Representation should be locked.
     * @param {number|undefined} params.relativeResumingPosition
     */
    TracksStore.prototype.setVideoTrack = function (payload) {
        var _a, _b;
        var periodRef = payload.periodRef, trackId = payload.trackId, switchingMode = payload.switchingMode, lockedRepresentations = payload.lockedRepresentations, relativeResumingPosition = payload.relativeResumingPosition;
        if (!periodRef.isPeriodAdvertised) {
            throw new Error("Wanted Period not yet advertised.");
        }
        var period = periodRef.period;
        var wantedAdaptation = (0, array_find_1.default)((_a = period.adaptations.video) !== null && _a !== void 0 ? _a : [], function (_a) {
            var id = _a.id, supportStatus = _a.supportStatus;
            return supportStatus.isDecipherable !== false &&
                supportStatus.hasSupportedCodec !== false &&
                id === trackId;
        });
        if (wantedAdaptation === undefined) {
            throw new Error("Wanted video track not found.");
        }
        var DEFAULT_VIDEO_TRACK_SWITCHING_MODE = config_1.default.getCurrent().DEFAULT_VIDEO_TRACK_SWITCHING_MODE;
        var typeInfo = periodRef.video;
        var newAdaptation = getRightVideoTrack(wantedAdaptation, this._isTrickModeTrackEnabled);
        var lockedRepresentationsRef;
        if (lockedRepresentations === null) {
            lockedRepresentationsRef = new reference_1.default(null);
        }
        else {
            var representationsToLock = this._getRepresentationsToLock(wantedAdaptation, lockedRepresentations);
            var repSwitchingMode = DEFAULT_VIDEO_TRACK_SWITCHING_MODE;
            lockedRepresentationsRef = new reference_1.default({
                representationIds: representationsToLock,
                switchingMode: repSwitchingMode,
            });
        }
        var storedSettings = {
            adaptationBase: wantedAdaptation,
            switchingMode: switchingMode !== null && switchingMode !== void 0 ? switchingMode : DEFAULT_VIDEO_TRACK_SWITCHING_MODE,
            adaptation: newAdaptation,
            relativeResumingPosition: relativeResumingPosition,
            lockedRepresentations: lockedRepresentationsRef,
        };
        typeInfo.storedSettings = storedSettings;
        this.trigger("trackUpdate", {
            period: toExposedPeriod(period),
            trackType: "video",
            reason: "manual",
        });
        // The previous event trigger could have had side-effects, so we
        // re-check if we're still mostly in the same state
        if (this._isDisposed) {
            return; // Someone disposed the `TracksStore` on the previous side-effect
        }
        var newPeriodItem = getPeriodItem(this._storedPeriodInfo, period.id);
        if (newPeriodItem !== undefined &&
            newPeriodItem.video.storedSettings === storedSettings) {
            (_b = newPeriodItem.video.dispatcher) === null || _b === void 0 ? void 0 : _b.updateTrack(storedSettings);
        }
    };
    /**
     * Disable the current text track for a given period.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @param {string} bufferType - The type of track to disable.
     * @throws Error - Throws if the period given has not been added
     */
    TracksStore.prototype.disableTrack = function (periodObj, bufferType) {
        var _a, _b;
        if (!periodObj.isPeriodAdvertised) {
            throw new Error("Wanted Period not yet advertised.");
        }
        var trackInfo = periodObj[bufferType];
        if (trackInfo.storedSettings === null) {
            return;
        }
        if (bufferType !== "text") {
            // Potentially unneeded, but let's be clean
            (_a = periodObj[bufferType].storedSettings) === null || _a === void 0 ? void 0 : _a.lockedRepresentations.finish();
        }
        trackInfo.storedSettings = null;
        this.trigger("trackUpdate", {
            period: toExposedPeriod(periodObj.period),
            trackType: bufferType,
            reason: "manual",
        });
        // The previous event trigger could have had side-effects, so we
        // re-check if we're still mostly in the same state
        if (this._isDisposed) {
            return; // Someone disposed the `TracksStore` on the previous side-effect
        }
        var newPeriodItem = getPeriodItem(this._storedPeriodInfo, periodObj.period.id);
        if (newPeriodItem !== undefined &&
            newPeriodItem[bufferType].storedSettings === null) {
            (_b = newPeriodItem[bufferType].dispatcher) === null || _b === void 0 ? void 0 : _b.updateTrack(null);
        }
        if (newPeriodItem !== undefined) {
            var hasNoTrackAtAll = ["audio", "video"].every(function (ttype) { return newPeriodItem[ttype].storedSettings === null; });
            if (hasNoTrackAtAll) {
                var err = new errors_1.MediaError("NO_AUDIO_VIDEO_TRACKS", "No audio and no video tracks are set.");
                this.trigger("error", err);
                this.dispose();
                return;
            }
        }
    };
    /**
     * Returns an object describing the chosen audio track for the given audio
     * Period.
     *
     * Returns `null` is the the current audio track is disabled or not
     * set yet.a pas bcp de marge de manoeuvre j'ai l'impression
     *
     * Returns `undefined` if the given Period's id is not currently found in the
     * `TracksStore`. The cause being most probably that the corresponding
     * Period is not available anymore.
     * If you're in that case and if still have the corresponding JavaScript
     * reference to the wanted Period, you can call `getOldAudioTrack` with it. It
     * will try retrieving the choice it made from its cache.
     * @param {Object} periodObj - The concerned Period's object
     * @returns {Object|null|undefined} - The audio track chosen for this Period.
     * `null` if audio tracks were disabled and `undefined` if the Period is not
     * known.
     */
    TracksStore.prototype.getChosenAudioTrack = function (periodObj, filterPlayableRepresentations) {
        return (0, is_null_or_undefined_1.default)(periodObj.audio.storedSettings)
            ? null
            : (0, manifest_1.toAudioTrack)(periodObj.audio.storedSettings.adaptation, filterPlayableRepresentations);
    };
    /**
     * Returns an object describing the chosen text track for the given text
     * Period.
     *
     * Returns null is the the current text track is disabled or not
     * set yet.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @returns {Object|null} - The text track chosen for this Period
     */
    TracksStore.prototype.getChosenTextTrack = function (periodObj) {
        return (0, is_null_or_undefined_1.default)(periodObj.text.storedSettings)
            ? null
            : (0, manifest_1.toTextTrack)(periodObj.text.storedSettings.adaptation);
    };
    /**
     * Returns an object describing the chosen video track for the given video
     * Period.
     *
     * Returns null is the the current video track is disabled or not
     * set yet.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @returns {Object|null} - The video track chosen for this Period
     */
    TracksStore.prototype.getChosenVideoTrack = function (periodObj, filterPlayableRepresentations) {
        if ((0, is_null_or_undefined_1.default)(periodObj.video.storedSettings)) {
            return null;
        }
        return (0, manifest_1.toVideoTrack)(periodObj.video.storedSettings.adaptation, filterPlayableRepresentations);
    };
    /**
     * Returns all available audio tracks for a given Period, as an array of
     * objects.
     *
     * Returns `undefined` if the given Period's id is not known.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @param {boolean} filterPlayableRepresentations - If `true`, only
     * representations considered to be "playable" will be included in the
     * returned response.
     * If `false`, the response should contain all linked representations.
     * @returns {Array.<Object>}
     */
    TracksStore.prototype.getAvailableAudioTracks = function (periodObj, filterPlayableRepresentations) {
        var storedSettings = periodObj.audio.storedSettings;
        var currentId = !(0, is_null_or_undefined_1.default)(storedSettings)
            ? storedSettings.adaptation.id
            : null;
        var adaptations = (0, manifest_1.getSupportedAdaptations)(periodObj.period, "audio");
        return adaptations.map(function (adaptation) {
            var active = currentId === null ? false : currentId === adaptation.id;
            return (0, object_assign_1.default)((0, manifest_1.toAudioTrack)(adaptation, filterPlayableRepresentations), {
                active: active,
            });
        });
    };
    /**
     * Returns all available text tracks for a given Period, as an array of
     * objects.
     *
     * Returns `undefined` if the given Period's id is not known.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @returns {Array.<Object>}
     */
    TracksStore.prototype.getAvailableTextTracks = function (periodObj) {
        var storedSettings = periodObj.text.storedSettings;
        var currentId = !(0, is_null_or_undefined_1.default)(storedSettings)
            ? storedSettings.adaptation.id
            : null;
        var adaptations = (0, manifest_1.getSupportedAdaptations)(periodObj.period, "text");
        return adaptations.map(function (adaptation) {
            var active = currentId === null ? false : currentId === adaptation.id;
            return (0, object_assign_1.default)((0, manifest_1.toTextTrack)(adaptation), { active: active });
        });
    };
    /**
     * Returns all available video tracks for a given Period, as an array of
     * objects.
     *
     * Returns `undefined` if the given Period's id is not known.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @param {boolean} filterPlayableRepresentations - If `true`, only
     * representations considered to be "playable" will be included in the
     * returned response.
     * If `false`, the response should contain all linked representations.
     * @returns {Array.<Object>}
     */
    TracksStore.prototype.getAvailableVideoTracks = function (periodObj, filterPlayableRepresentations) {
        var storedSettings = periodObj.video.storedSettings;
        var currentId = (0, is_null_or_undefined_1.default)(storedSettings)
            ? undefined
            : storedSettings.adaptation.id;
        var adaptations = (0, manifest_1.getSupportedAdaptations)(periodObj.period, "video");
        return adaptations.map(function (adaptation) {
            var active = currentId === null ? false : currentId === adaptation.id;
            var track = (0, manifest_1.toVideoTrack)(adaptation, filterPlayableRepresentations);
            var trickModeTracks = track.trickModeTracks !== undefined
                ? track.trickModeTracks.map(function (trickModeAdaptation) {
                    var isActive = currentId === null ? false : currentId === trickModeAdaptation.id;
                    return (0, object_assign_1.default)(trickModeAdaptation, { active: isActive });
                })
                : [];
            var availableTrack = (0, object_assign_1.default)(track, { active: active });
            if (trickModeTracks !== undefined) {
                availableTrack.trickModeTracks = trickModeTracks;
            }
            return availableTrack;
        });
    };
    TracksStore.prototype.getLockedAudioRepresentations = function (periodObj) {
        var storedSettings = periodObj.audio.storedSettings;
        if ((0, is_null_or_undefined_1.default)(storedSettings)) {
            return null;
        }
        var lastLockedSettings = storedSettings.lockedRepresentations.getValue();
        return lastLockedSettings === null ? null : lastLockedSettings.representationIds;
    };
    TracksStore.prototype.getLockedVideoRepresentations = function (periodObj) {
        var storedSettings = periodObj.video.storedSettings;
        if ((0, is_null_or_undefined_1.default)(storedSettings)) {
            return null;
        }
        var lastLockedSettings = storedSettings.lockedRepresentations.getValue();
        return lastLockedSettings === null ? null : lastLockedSettings.representationIds;
    };
    TracksStore.prototype.lockAudioRepresentations = function (periodObj, lockSettings) {
        var _a;
        var storedSettings = periodObj.audio.storedSettings;
        if ((0, is_null_or_undefined_1.default)(storedSettings)) {
            return;
        }
        var DEFAULT_AUDIO_REPRESENTATIONS_SWITCHING_MODE = config_1.default.getCurrent().DEFAULT_AUDIO_REPRESENTATIONS_SWITCHING_MODE;
        var filtered = this._getRepresentationsToLock(storedSettings.adaptation, lockSettings.representations);
        var switchingMode = (_a = lockSettings.switchingMode) !== null && _a !== void 0 ? _a : DEFAULT_AUDIO_REPRESENTATIONS_SWITCHING_MODE;
        storedSettings.lockedRepresentations.setValue({
            representationIds: filtered,
            switchingMode: switchingMode,
        });
    };
    TracksStore.prototype.lockVideoRepresentations = function (periodObj, lockSettings) {
        var _a;
        var storedSettings = periodObj.video.storedSettings;
        if ((0, is_null_or_undefined_1.default)(storedSettings)) {
            return;
        }
        var DEFAULT_VIDEO_REPRESENTATIONS_SWITCHING_MODE = config_1.default.getCurrent().DEFAULT_VIDEO_REPRESENTATIONS_SWITCHING_MODE;
        var filtered = this._getRepresentationsToLock(storedSettings.adaptation, lockSettings.representations);
        var switchingMode = (_a = lockSettings.switchingMode) !== null && _a !== void 0 ? _a : DEFAULT_VIDEO_REPRESENTATIONS_SWITCHING_MODE;
        storedSettings.lockedRepresentations.setValue({
            representationIds: filtered,
            switchingMode: switchingMode,
        });
    };
    TracksStore.prototype.unlockAudioRepresentations = function (periodObj) {
        var storedSettings = periodObj.audio.storedSettings;
        if ((0, is_null_or_undefined_1.default)(storedSettings) ||
            storedSettings.lockedRepresentations.getValue() === null) {
            return;
        }
        storedSettings.lockedRepresentations.setValue(null);
    };
    TracksStore.prototype.unlockVideoRepresentations = function (periodObj) {
        var storedSettings = periodObj.video.storedSettings;
        if ((0, is_null_or_undefined_1.default)(storedSettings) ||
            storedSettings.lockedRepresentations.getValue() === null) {
            return;
        }
        storedSettings.lockedRepresentations.setValue(null);
    };
    TracksStore.prototype.dispose = function () {
        this._isDisposed = true;
        while (true) {
            var lastPeriod = this._storedPeriodInfo.pop();
            if (lastPeriod === undefined) {
                return;
            }
            lastPeriod.isRemoved = true;
        }
    };
    TracksStore.prototype._resetVideoTrackChoices = function (reason) {
        var _a;
        for (var i = 0; i < this._storedPeriodInfo.length; i++) {
            var periodObj = this._storedPeriodInfo[i];
            if (!(0, is_null_or_undefined_1.default)(periodObj.video.storedSettings)) {
                var chosenBaseTrack = periodObj.video.storedSettings.adaptationBase;
                if (chosenBaseTrack !== null) {
                    var chosenTrack = getRightVideoTrack(chosenBaseTrack, this._isTrickModeTrackEnabled);
                    periodObj.video.storedSettings.adaptationBase = chosenBaseTrack;
                    periodObj.video.storedSettings.adaptation = chosenTrack;
                }
            }
        }
        // Clone the current Period list to not be influenced if Periods are removed
        // or added while the loop is running.
        var sliced = this._storedPeriodInfo.slice();
        for (var i = 0; i < sliced.length; i++) {
            var period = sliced[i].period;
            var videoItem = sliced[i].video;
            var storedSettings = videoItem.storedSettings;
            if (storedSettings !== undefined) {
                this.trigger("trackUpdate", {
                    period: toExposedPeriod(period),
                    trackType: "video",
                    reason: reason,
                });
                // The previous event trigger could have had side-effects, so we
                // re-check if we're still mostly in the same state
                if (this._isDisposed) {
                    return; // Someone disposed the `TracksStore` on the previous side-effect
                }
                var newPeriodItem = getPeriodItem(this._storedPeriodInfo, period.id);
                if (newPeriodItem !== undefined &&
                    newPeriodItem.isPeriodAdvertised &&
                    newPeriodItem.video.storedSettings === storedSettings) {
                    (_a = newPeriodItem.video.dispatcher) === null || _a === void 0 ? void 0 : _a.updateTrack(storedSettings);
                }
            }
        }
    };
    TracksStore.prototype._removePeriodObject = function (index) {
        (0, assert_1.default)(index < this._storedPeriodInfo.length);
        var oldPeriodItem = this._storedPeriodInfo[index];
        this._storedPeriodInfo[index].isRemoved = true;
        this._storedPeriodInfo.splice(index, 1);
        this._cachedPeriodInfo.set(oldPeriodItem.period, oldPeriodItem);
    };
    TracksStore.prototype._getRepresentationsToLock = function (adaptation, representationIds) {
        var filtered = representationIds.reduce(function (acc, repId) {
            var foundRep = (0, array_find_1.default)(adaptation.representations, function (r) {
                return r.id === repId;
            });
            if (foundRep === undefined) {
                log_1.default.warn("Track", "Wanted locked Representation not found.");
            }
            else {
                acc.push(foundRep.id);
            }
            return acc;
        }, []);
        if (filtered.length === 0) {
            throw new Error("Cannot lock Representations: " + "None of the given Representation id are found");
        }
        return filtered;
    };
    /**
     * Check or re-check all Periods for which both an initial track can be chosen
     * and for which the `newAvailablePeriods` event can be triggered.
     */
    TracksStore.prototype._selectInitialTrackIfNeeded = function () {
        var e_5, _a, e_6, _b, e_7, _c;
        var _d, _e, _f, _g;
        var DEFAULT_VIDEO_TRACK_SWITCHING_MODE = config_1.default.getCurrent().DEFAULT_VIDEO_TRACK_SWITCHING_MODE;
        var periodsToAdvertise = [];
        var toDispatchTrack = [];
        var _loop_2 = function (trackStorePeriod) {
            var period = trackStorePeriod.period;
            if (trackStorePeriod.audio.storedSettings !== undefined &&
                trackStorePeriod.video.storedSettings !== undefined &&
                trackStorePeriod.text.storedSettings !== undefined) {
                return "continue";
            }
            var adaptations = __spreadArray(__spreadArray([], __read(((_d = period.adaptations.audio) !== null && _d !== void 0 ? _d : [])), false), __read(((_e = period.adaptations.video) !== null && _e !== void 0 ? _e : [])), false);
            var hasCodecWithUndefinedSupport = adaptations.every(function (a) { return a.supportStatus.hasCodecWithUndefinedSupport; });
            if (adaptations.length > 0 && hasCodecWithUndefinedSupport) {
                return "continue";
            }
            var audioAdaptation = (0, manifest_1.getSupportedAdaptations)(period, "audio")[0];
            if (audioAdaptation === undefined) {
                trackStorePeriod.audio.storedSettings = null;
                this_2.handleMissingOrUnplayableTrack(period, "audio", true);
                if (this_2._isDisposed) {
                    return { value: void 0 };
                }
            }
            else {
                trackStorePeriod.audio.storedSettings = {
                    adaptation: audioAdaptation,
                    switchingMode: this_2._defaultAudioTrackSwitchingMode,
                    lockedRepresentations: new reference_1.default(null),
                };
            }
            var baseVideoAdaptation = (0, manifest_1.getSupportedAdaptations)(period, "video")[0];
            if (baseVideoAdaptation === undefined) {
                trackStorePeriod.video.storedSettings = null;
                this_2.handleMissingOrUnplayableTrack(period, "video", true);
                if (this_2._isDisposed) {
                    return { value: void 0 };
                }
            }
            else {
                var videoAdaptation = getRightVideoTrack(baseVideoAdaptation, this_2._isTrickModeTrackEnabled);
                trackStorePeriod.video.storedSettings = {
                    adaptation: videoAdaptation,
                    adaptationBase: baseVideoAdaptation,
                    switchingMode: DEFAULT_VIDEO_TRACK_SWITCHING_MODE,
                    lockedRepresentations: new reference_1.default(null),
                };
            }
            var textAdaptation = null;
            var forcedSubtitles = ((_f = period.adaptations.text) !== null && _f !== void 0 ? _f : []).filter(function (ad) { return ad.isForcedSubtitles === true; });
            if (forcedSubtitles.length > 0) {
                if (audioAdaptation !== null && audioAdaptation !== undefined) {
                    var sameLanguage = (0, array_find_1.default)(forcedSubtitles, function (f) { return f.normalizedLanguage === audioAdaptation.normalizedLanguage; });
                    if (sameLanguage !== undefined) {
                        textAdaptation = sameLanguage;
                    }
                }
                if (textAdaptation === null) {
                    textAdaptation =
                        (_g = (0, array_find_1.default)(forcedSubtitles, function (f) { return f.normalizedLanguage === undefined; })) !== null && _g !== void 0 ? _g : null;
                }
            }
            trackStorePeriod.text.storedSettings =
                textAdaptation === null
                    ? null
                    : {
                        adaptation: textAdaptation,
                        switchingMode: "direct",
                        lockedRepresentations: new reference_1.default(null),
                    };
            toDispatchTrack.push(trackStorePeriod);
            if (this_2._shouldAdvertisePeriod(trackStorePeriod)) {
                trackStorePeriod.isPeriodAdvertised = true;
                periodsToAdvertise.push({ id: period.id, start: period.start, end: period.end });
            }
        };
        var this_2 = this;
        try {
            for (var _h = __values(this._storedPeriodInfo), _j = _h.next(); !_j.done; _j = _h.next()) {
                var trackStorePeriod = _j.value;
                var state_2 = _loop_2(trackStorePeriod);
                if (typeof state_2 === "object")
                    return state_2.value;
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_j && !_j.done && (_a = _h.return)) _a.call(_h);
            }
            finally { if (e_5) throw e_5.error; }
        }
        if (periodsToAdvertise.length > 0) {
            this.trigger("newAvailablePeriods", periodsToAdvertise);
            if (this._isDisposed) {
                return;
            }
        }
        try {
            for (var toDispatchTrack_1 = __values(toDispatchTrack), toDispatchTrack_1_1 = toDispatchTrack_1.next(); !toDispatchTrack_1_1.done; toDispatchTrack_1_1 = toDispatchTrack_1.next()) {
                var trackStorePeriod = toDispatchTrack_1_1.value;
                if (!trackStorePeriod.isPeriodAdvertised) {
                    continue;
                }
                var bufferTypes = ["audio", "video", "text"];
                try {
                    for (var bufferTypes_1 = (e_7 = void 0, __values(bufferTypes)), bufferTypes_1_1 = bufferTypes_1.next(); !bufferTypes_1_1.done; bufferTypes_1_1 = bufferTypes_1.next()) {
                        var bufferType = bufferTypes_1_1.value;
                        var trackInfo = trackStorePeriod[bufferType];
                        if (trackInfo.dispatcher !== null &&
                            trackInfo.storedSettings !== undefined &&
                            !trackInfo.dispatcher.hasSetTrack()) {
                            trackInfo.dispatcher.updateTrack(trackInfo.storedSettings);
                            if (this._isDisposed) {
                                return;
                            }
                        }
                    }
                }
                catch (e_7_1) { e_7 = { error: e_7_1 }; }
                finally {
                    try {
                        if (bufferTypes_1_1 && !bufferTypes_1_1.done && (_c = bufferTypes_1.return)) _c.call(bufferTypes_1);
                    }
                    finally { if (e_7) throw e_7.error; }
                }
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (toDispatchTrack_1_1 && !toDispatchTrack_1_1.done && (_b = toDispatchTrack_1.return)) _b.call(toDispatchTrack_1);
            }
            finally { if (e_6) throw e_6.error; }
        }
    };
    /**
     * Returns `true` once a Period can be advertised through a `newAvailablePeriods`
     * event, after which track can begin to be set and updated.
     * @param {Object} periodObj
     * @returns {boolean}
     */
    TracksStore.prototype._shouldAdvertisePeriod = function (periodObj) {
        return (!periodObj.isPeriodAdvertised &&
            periodObj.text.dispatcher !== null &&
            periodObj.video.dispatcher !== null &&
            periodObj.audio.dispatcher !== null);
    };
    return TracksStore;
}(event_emitter_1.default));
exports.default = TracksStore;
/**
 * Returns element in the given `periods` Array that corresponds to the
 * `period` given.
 * Returns `undefined` if that `period` is not found.
 * @param {Object} periods
 * @param {string} periodId
 * @returns {Object|undefined}
 */
function getPeriodItem(periods, periodId) {
    for (var i = 0; i < periods.length; i++) {
        var periodI = periods[i];
        if (periodI.period.id === periodId) {
            return periodI;
        }
    }
}
/**
 * A `ITSPeriodObject` should only be removed once all References linked to it
 * do not exist anymore, to keep the possibility of making track choices.
 * @param {Object} periodObj
 * @returns {boolean}
 */
function isPeriodItemRemovable(periodObj) {
    var _a, _b, _c;
    return (!periodObj.inManifest &&
        ((_a = periodObj.text) === null || _a === void 0 ? void 0 : _a.dispatcher) === null &&
        ((_b = periodObj.audio) === null || _b === void 0 ? void 0 : _b.dispatcher) === null &&
        ((_c = periodObj.video) === null || _c === void 0 ? void 0 : _c.dispatcher) === null);
}
function getRightVideoTrack(adaptation, isTrickModeEnabled) {
    var _a;
    if (isTrickModeEnabled && ((_a = adaptation.trickModeTracks) === null || _a === void 0 ? void 0 : _a[0]) !== undefined) {
        return adaptation.trickModeTracks[0];
    }
    return adaptation;
}
/**
 * Generate an `ITSPeriodObject` object for the given Period, selecting the
 * default track for each type.
 * @param {Object} period
 * @param {boolean} inManifest
 * @returns {object}
 */
function generatePeriodInfo(period, inManifest) {
    return {
        period: period,
        inManifest: inManifest,
        isPeriodAdvertised: false,
        isRemoved: false,
        audio: { storedSettings: undefined, dispatcher: null },
        video: { storedSettings: undefined, dispatcher: null },
        text: { storedSettings: undefined, dispatcher: null },
    };
}
function toExposedPeriod(p) {
    return { start: p.start, end: p.end, id: p.id };
}
/**
 * Retrieves a fallback track for the given period and track type.
 *
 * This function is used when the current track becomes unavailable,
 * and a fallback track must be selected based on the period and media type.
 *
 * @param {Object} period - The period object that contains information about the available tracks.
 * @param {string} trackType - The type of media track to fallback to (e.g., "audio", "video", "text").
 * @returns {object|null} A fallback track matching the type, or `null` if none is available.
 */
function getFallbackTrack(period, trackType) {
    var periodHasAdaptationForType = period.adaptations[trackType] !== undefined &&
        period.adaptations[trackType].length > 0;
    if (!periodHasAdaptationForType) {
        return {
            fallbackTrack: null,
            noSourceMedia: true,
        };
    }
    var firstPlayableAdaptation = findFirstPlayableAdaptation(period, trackType);
    return {
        fallbackTrack: firstPlayableAdaptation !== null && firstPlayableAdaptation !== void 0 ? firstPlayableAdaptation : null,
        noSourceMedia: false,
    };
}
function findFirstPlayableAdaptation(period, type) {
    var _a;
    var firstPlayableAdaptation = (0, array_find_1.default)((_a = period.adaptations[type]) !== null && _a !== void 0 ? _a : [], function (adaptation) {
        if (adaptation.supportStatus.hasSupportedCodec === false ||
            adaptation.supportStatus.isDecipherable === false) {
            return false;
        }
        var playableRepresentations = adaptation.representations.filter(function (r) { return (0, manifest_1.isRepresentationPlayable)(r) === true; });
        return playableRepresentations.length > 0;
    });
    return firstPlayableAdaptation;
}
