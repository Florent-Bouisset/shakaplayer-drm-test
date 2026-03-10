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
/**
 * This file is used to abstract the notion of text, audio and video tracks
 * switching for an easier API management.
 */
import config from "../../config";
import { MediaError } from "../../errors";
import log from "../../log";
import { getSupportedAdaptations, isRepresentationPlayable, toAudioTrack, toTextTrack, toVideoTrack, } from "../../manifest";
import arrayFind from "../../utils/array_find";
import assert, { assertUnreachable } from "../../utils/assert";
import EventEmitter from "../../utils/event_emitter";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import objectAssign from "../../utils/object_assign";
import SharedReference from "../../utils/reference";
import TrackDispatcher from "./track_dispatcher";
/**
 * Class helping with the management of the audio, video and text tracks and
 * qualities.
 *
 * The `TracksStore` allows to choose a track and qualities for different types
 * of media through a simpler API.
 *
 * @class TracksStore
 */
export default class TracksStore extends EventEmitter {
    constructor(args) {
        var _a;
        super();
        this._storedPeriodInfo = [];
        this._isDisposed = false;
        this._cachedPeriodInfo = new WeakMap();
        this._isTrickModeTrackEnabled = args.preferTrickModeTracks;
        this._defaultAudioTrackSwitchingMode =
            (_a = args.defaultAudioTrackSwitchingMode) !== null && _a !== void 0 ? _a : config.getCurrent().DEFAULT_AUDIO_TRACK_SWITCHING_MODE;
        this.onTracksNotPlayableForType = args.onTracksNotPlayableForType;
    }
    /**
     * Return Array of Period information, to allow an outside application to
     * modify the track of any Period.
     * @returns {Array.<Object>}
     */
    getAvailablePeriods() {
        return this._storedPeriodInfo.reduce((acc, p) => {
            if (p.isPeriodAdvertised) {
                acc.push(toExposedPeriod(p.period));
            }
            return acc;
        }, []);
    }
    /**
     * Callack that needs to be called as codec support is either first known or
     * updated on the Manifest.
     */
    onManifestCodecSupportUpdate() {
        this._selectInitialTrackIfNeeded();
    }
    /**
     * Check that a period has a supported track for the given track type.
     * Trigger an error with `MANIFEST_INCOMPATIBLE_CODECS_ERROR` if no codecs are
     * supported and `onTracksNotPlayableForType[ttype]` is "error".
     *
     * @param period - The period to check
     * @param ttype - The track type.
     */
    checkPeriodHasSupportedTrack(period, ttype) {
        var _a, _b;
        const adaptationsForType = period.adaptations[ttype];
        const audioVideoAdaptations = [
            ...((_a = period.adaptations.audio) !== null && _a !== void 0 ? _a : []),
            ...((_b = period.adaptations.video) !== null && _b !== void 0 ? _b : []),
        ];
        const periodHasAdaptationForType = adaptationsForType !== undefined && adaptationsForType.length > 0;
        if (!periodHasAdaptationForType) {
            // The content does not have audio/video media, e.g. it's an audio only content.
            // there is no track of this type to select.
            return;
        }
        const isTypeUnsupported = adaptationsForType.every((adapt) => adapt.supportStatus.hasSupportedCodec === false);
        const isAudioAndVideoUnsupported = audioVideoAdaptations.every((adapt) => adapt.supportStatus.hasSupportedCodec === false);
        if (isTypeUnsupported) {
            const err = new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR", "No supported " + ttype + " adaptations", { tracks: undefined });
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
    }
    /**
     * Update the list of Periods handled by the TracksStore and make a
     * track choice decision for each of them.
     * @param {Object} manifest - The new Manifest object
     */
    onManifestUpdate(manifest) {
        var _a, _b, _c;
        const { periods } = manifest;
        // We assume that they are always sorted chronologically
        // In dev mode, perform a runtime check that this is the case
        if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
            for (let i = 1; i < periods.length; i++) {
                assert(periods[i - 1].start <= periods[i].start);
            }
        }
        /** Periods which have just been added. */
        const addedPeriods = [];
        for (const period of periods) {
            ["audio", "video"].forEach((ttype) => {
                this.checkPeriodHasSupportedTrack(period, ttype);
            });
            if (this._isDisposed) {
                return;
            }
        }
        let newPListIdx = 0;
        for (let i = 0; i < this._storedPeriodInfo.length; i++) {
            const oldPeriod = this._storedPeriodInfo[i].period;
            const newPeriod = periods[newPListIdx];
            if (newPeriod === undefined) {
                // We reached the end of the new Periods, remove remaining old Periods
                for (let j = this._storedPeriodInfo.length - 1; j >= i; j--) {
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
                const newPeriodInfo = generatePeriodInfo(newPeriod, true);
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
            const periodsToAdd = periods
                .slice(newPListIdx)
                .map((p) => generatePeriodInfo(p, true));
            this._storedPeriodInfo.push(...periodsToAdd);
            addedPeriods.push(...periodsToAdd);
        }
        for (const storedPeriodInfo of this._storedPeriodInfo) {
            (_a = storedPeriodInfo.audio.dispatcher) === null || _a === void 0 ? void 0 : _a.refresh();
            (_b = storedPeriodInfo.video.dispatcher) === null || _b === void 0 ? void 0 : _b.refresh();
            (_c = storedPeriodInfo.text.dispatcher) === null || _c === void 0 ? void 0 : _c.refresh();
        }
    }
    onDecipherabilityUpdates() {
        var _a, _b, _c;
        for (const storedPeriodInfo of this._storedPeriodInfo) {
            (_a = storedPeriodInfo.audio.dispatcher) === null || _a === void 0 ? void 0 : _a.refresh();
            (_b = storedPeriodInfo.video.dispatcher) === null || _b === void 0 ? void 0 : _b.refresh();
            (_c = storedPeriodInfo.text.dispatcher) === null || _c === void 0 ? void 0 : _c.refresh();
        }
    }
    /**
     * Reset the stored settings if the track is not available anymore in
     * the new manifest.
     * @param periodInfo
     * @param newPeriod
     * @param type
     * @returns
     */
    resetSelectedTrackIfNotAvailableAnymore(periodInfo, newPeriod, type) {
        var _a;
        const wantedTrack = periodInfo[type].storedSettings;
        if (isNullOrUndefined(wantedTrack)) {
            return;
        }
        const supportedAdaptations = getSupportedAdaptations(newPeriod, type);
        const stillHere = supportedAdaptations.some((a) => a.id === wantedTrack.adaptation.id);
        if (stillHere) {
            // The track still exists, it don't need to be resetted.
            return;
        }
        log.warn(`Track`, `Chosen ${type} Adaptation not available anymore`);
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
        const periodItem = getPeriodItem(this._storedPeriodInfo, periodInfo.period.id);
        if (periodItem !== undefined &&
            periodItem.isPeriodAdvertised &&
            periodItem[type].storedSettings === null) {
            (_a = periodItem[type].dispatcher) === null || _a === void 0 ? void 0 : _a.updateTrack(null);
        }
    }
    getDefaultStoredSettingsForAdaptation(supportedAdaptations, type) {
        const { DEFAULT_VIDEO_TRACK_SWITCHING_MODE } = config.getCurrent();
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
                const adaptationBase = supportedAdaptations[0];
                const adaptation = getRightVideoTrack(adaptationBase, this._isTrickModeTrackEnabled);
                const lockedRepresentations = new SharedReference(null);
                return {
                    adaptationBase,
                    adaptation,
                    switchingMode: DEFAULT_VIDEO_TRACK_SWITCHING_MODE,
                    lockedRepresentations,
                };
            }
            case "audio": {
                return {
                    adaptation: supportedAdaptations[0],
                    switchingMode: this._defaultAudioTrackSwitchingMode,
                    lockedRepresentations: new SharedReference(null),
                };
            }
            default: {
                assertUnreachable(type);
            }
        }
    }
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
    addTrackReference(bufferType, period, adaptationRef) {
        log.debug("Track", "Adding Track Reference", { bufferType, periodId: period.id });
        let periodObj = getPeriodItem(this._storedPeriodInfo, period.id);
        if (periodObj === undefined) {
            // The Period has not yet been added.
            periodObj = generatePeriodInfo(period, false);
            let found = false;
            for (let i = 0; i < this._storedPeriodInfo.length; i++) {
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
            log.error(`Track`, `Subject already added for type and Period`, {
                bufferType,
                periodId: period.id,
            });
            periodObj[bufferType].dispatcher.dispose();
        }
        const dispatcher = new TrackDispatcher(adaptationRef);
        periodObj[bufferType].dispatcher = dispatcher;
        dispatcher.addEventListener("noPlayableRepresentation", () => {
            this.handleMissingOrUnplayableTrack(period, bufferType, false);
        });
        dispatcher.addEventListener("noPlayableLockedRepresentation", () => {
            // TODO check that it doesn't already lead to segment loading or MediaSource
            // reloading
            if (periodObj === undefined) {
                return;
            }
            this.unlockVideoRepresentations(periodObj);
            this.trigger("brokenRepresentationsLock", {
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
        const trackTypes = ["audio", "video", "text"];
        for (const ttype of trackTypes) {
            const trackObj = periodObj[ttype];
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
    throwIfTracksAreNotSetForPeriod(period) {
        const periodItem = getPeriodItem(this._storedPeriodInfo, period.id);
        if (periodItem !== undefined) {
            const hasNoTrackAtAll = ["audio", "video"].every((ttype) => periodItem[ttype].storedSettings === null);
            if (hasNoTrackAtAll) {
                const err = new MediaError("NO_AUDIO_VIDEO_TRACKS", "No audio and no video tracks are set.");
                this.trigger("error", err);
                this.dispose();
            }
        }
    }
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
    handleMissingOrUnplayableTrack(period, trackType, isInitialSelection) {
        var _a, _b, _c, _d;
        const { fallbackTrack, noSourceMedia } = getFallbackTrack(period, trackType);
        const typeInfo = (_a = getPeriodItem(this._storedPeriodInfo, period.id)) === null || _a === void 0 ? void 0 : _a[trackType];
        if (typeInfo === undefined) {
            log.warn("Track", "Could not find period", { periodId: period.id });
            return;
        }
        const initialStoredSettings = typeInfo.storedSettings;
        const hasStoredSettingsChanged = () => {
            return typeInfo.storedSettings !== initialStoredSettings;
        };
        if (fallbackTrack !== null) {
            let switchingMode;
            if (trackType === "audio") {
                switchingMode = this._defaultAudioTrackSwitchingMode;
            }
            else if (trackType === "text") {
                switchingMode = "direct";
            }
            else {
                switchingMode = "reload";
            }
            const storedSettings = {
                adaptation: fallbackTrack,
                switchingMode,
                lockedRepresentations: new SharedReference(null),
            };
            typeInfo.storedSettings = storedSettings;
            if (!isInitialSelection) {
                // "trackUpdate" events are not sent for the initial track.
                // See documentation: #Player_Events.md, section ###trackUpdate
                this.trigger("trackUpdate", {
                    period: toExposedPeriod(period),
                    trackType,
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
                trackType,
                period: { id: period.id, start: period.start, end: period.end },
            });
            // The previous event trigger could have had side-effects, so we
            // re-check if we're still mostly in the same state
            if (this._isDisposed) {
                return; // Someone disposed the `TracksStore` on the previous side-effect
            }
            const fallbackBehavior = this.onTracksNotPlayableForType[trackType];
            if (hasStoredSettingsChanged()) {
                // The previous "noPlayableTrack" event might have caused changes,
                // so we re-check to see if the selected track has been updated.
                // If it has, we exit early because the API consumer likely adjusted the settings,
                // and throwing an error now would be out of sync with their changes.
            }
            else if (fallbackBehavior === "continue") {
                log.warn("Track", `No playable ${trackType}, continuing without ${trackType}`);
                typeInfo.storedSettings = null;
                if (!isInitialSelection) {
                    // "trackUpdate" events are not sent for the initial track.
                    // See documentation: #Player_Events.md, section ###trackUpdate
                    this.trigger("trackUpdate", {
                        period: toExposedPeriod(period),
                        trackType,
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
                const noRepErr = new MediaError("NO_PLAYABLE_REPRESENTATION", `No ${trackType} Representation can be played`, { tracks: undefined });
                this.trigger("error", noRepErr);
            }
        }
        else if (fallbackTrack === null && noSourceMedia) {
            log.debug(`Track`, `The period does not have adaptation for ${trackType} there is no track to choose`);
            typeInfo.storedSettings = null;
            if (!isInitialSelection) {
                // "trackUpdate" events are not sent for the initial track.
                // See documentation: #Player_Events.md, section ###trackUpdate
                this.trigger("trackUpdate", {
                    period: toExposedPeriod(period),
                    trackType,
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
    }
    /**
     * Remove shared reference to choose an "audio", "video" or "text" Adaptation
     * for a Period.
     * @param {string} bufferType - The concerned buffer type
     * @param {string} periodId - The concerned Period's `id`.
     */
    removeTrackReference(bufferType, periodId) {
        log.debug("Track", "Removing Track Reference", { bufferType, periodId });
        let periodIndex;
        for (let i = 0; i < this._storedPeriodInfo.length; i++) {
            const periodI = this._storedPeriodInfo[i];
            if (periodI.period.id === periodId) {
                periodIndex = i;
                break;
            }
        }
        if (periodIndex === undefined) {
            log.warn(`Track`, `type not found for period`, { bufferType, periodId });
            return;
        }
        const periodObj = this._storedPeriodInfo[periodIndex];
        const choiceItem = periodObj[bufferType];
        if ((choiceItem === null || choiceItem === void 0 ? void 0 : choiceItem.dispatcher) === null) {
            log.warn(`Track`, `TrackDispatcher already removed for type and Period`, {
                bufferType,
                periodId,
            });
            return;
        }
        choiceItem.dispatcher.dispose();
        choiceItem.dispatcher = null;
        if (isPeriodItemRemovable(periodObj)) {
            this._removePeriodObject(periodIndex);
        }
    }
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
    getPeriodObjectFromPeriod(period) {
        const periodObj = getPeriodItem(this._storedPeriodInfo, period.id);
        if (periodObj === undefined && period !== undefined) {
            return this._cachedPeriodInfo.get(period);
        }
        return periodObj;
    }
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
    getPeriodObjectFromId(periodId) {
        return getPeriodItem(this._storedPeriodInfo, periodId);
    }
    disableVideoTrickModeTracks() {
        if (!this._isTrickModeTrackEnabled) {
            return;
        }
        this._isTrickModeTrackEnabled = false;
        this._resetVideoTrackChoices("trickmode-disabled");
    }
    enableVideoTrickModeTracks() {
        if (this._isTrickModeTrackEnabled) {
            return;
        }
        this._isTrickModeTrackEnabled = true;
        this._resetVideoTrackChoices("trickmode-enabled");
    }
    /**
     * Reset the TracksStore's Period objects:
     *   - All Period which are not in the manifest currently will be removed.
     *   - All References used to communicate the wanted track will be removed.
     *
     * You might want to call this API when restarting playback.
     */
    resetPeriodObjects() {
        var _a, _b, _c;
        log.debug("Track", "Resetting Period Objects");
        for (let i = this._storedPeriodInfo.length - 1; i >= 0; i--) {
            const storedObj = this._storedPeriodInfo[i];
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
    }
    /**
     * @returns {boolean}
     */
    isTrickModeEnabled() {
        return this._isTrickModeTrackEnabled;
    }
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
    setAudioTrack(payload) {
        const { periodRef, trackId, switchingMode, lockedRepresentations, relativeResumingPosition, } = payload;
        return this._setAudioOrTextTrack({
            bufferType: "audio",
            periodRef,
            trackId,
            switchingMode: switchingMode !== null && switchingMode !== void 0 ? switchingMode : this._defaultAudioTrackSwitchingMode,
            lockedRepresentations,
            relativeResumingPosition,
        });
    }
    /**
     * Set text track based on the ID of its Adaptation for a given added Period.
     * @param {Object} periodObj - The concerned Period's object.
     * @param {string} wantedId - adaptation id of the wanted track.
     */
    setTextTrack(periodObj, wantedId) {
        return this._setAudioOrTextTrack({
            bufferType: "text",
            periodRef: periodObj,
            trackId: wantedId,
            switchingMode: "direct",
            lockedRepresentations: null,
            relativeResumingPosition: undefined,
        });
    }
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
    _setAudioOrTextTrack({ bufferType, periodRef, trackId, switchingMode, lockedRepresentations, relativeResumingPosition, }) {
        var _a, _b;
        if (!periodRef.isPeriodAdvertised) {
            throw new Error("Wanted Period not yet advertised.");
        }
        const period = periodRef.period;
        const wantedAdaptation = arrayFind((_a = period.adaptations[bufferType]) !== null && _a !== void 0 ? _a : [], ({ id, supportStatus }) => supportStatus.hasSupportedCodec !== false &&
            supportStatus.isDecipherable !== false &&
            id === trackId);
        if (wantedAdaptation === undefined) {
            throw new Error(`Wanted ${bufferType} track not found.`);
        }
        const typeInfo = periodRef[bufferType];
        let lockedRepresentationsRef;
        if (lockedRepresentations === null) {
            lockedRepresentationsRef = new SharedReference(null);
        }
        else {
            const representationsToLock = this._getRepresentationsToLock(wantedAdaptation, lockedRepresentations);
            const repSwitchingMode = bufferType === "audio"
                ? this._defaultAudioTrackSwitchingMode
                : "direct";
            lockedRepresentationsRef = new SharedReference({
                representationIds: representationsToLock,
                switchingMode: repSwitchingMode,
            });
        }
        const storedSettings = {
            adaptation: wantedAdaptation,
            switchingMode,
            lockedRepresentations: lockedRepresentationsRef,
            relativeResumingPosition,
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
        const newPeriodItem = getPeriodItem(this._storedPeriodInfo, period.id);
        if (newPeriodItem !== undefined &&
            newPeriodItem[bufferType].storedSettings === storedSettings) {
            (_b = newPeriodItem[bufferType].dispatcher) === null || _b === void 0 ? void 0 : _b.updateTrack(storedSettings);
        }
    }
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
    setVideoTrack(payload) {
        var _a, _b;
        const { periodRef, trackId, switchingMode, lockedRepresentations, relativeResumingPosition, } = payload;
        if (!periodRef.isPeriodAdvertised) {
            throw new Error("Wanted Period not yet advertised.");
        }
        const period = periodRef.period;
        const wantedAdaptation = arrayFind((_a = period.adaptations.video) !== null && _a !== void 0 ? _a : [], ({ id, supportStatus }) => supportStatus.isDecipherable !== false &&
            supportStatus.hasSupportedCodec !== false &&
            id === trackId);
        if (wantedAdaptation === undefined) {
            throw new Error("Wanted video track not found.");
        }
        const { DEFAULT_VIDEO_TRACK_SWITCHING_MODE } = config.getCurrent();
        const typeInfo = periodRef.video;
        const newAdaptation = getRightVideoTrack(wantedAdaptation, this._isTrickModeTrackEnabled);
        let lockedRepresentationsRef;
        if (lockedRepresentations === null) {
            lockedRepresentationsRef = new SharedReference(null);
        }
        else {
            const representationsToLock = this._getRepresentationsToLock(wantedAdaptation, lockedRepresentations);
            const repSwitchingMode = DEFAULT_VIDEO_TRACK_SWITCHING_MODE;
            lockedRepresentationsRef = new SharedReference({
                representationIds: representationsToLock,
                switchingMode: repSwitchingMode,
            });
        }
        const storedSettings = {
            adaptationBase: wantedAdaptation,
            switchingMode: switchingMode !== null && switchingMode !== void 0 ? switchingMode : DEFAULT_VIDEO_TRACK_SWITCHING_MODE,
            adaptation: newAdaptation,
            relativeResumingPosition,
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
        const newPeriodItem = getPeriodItem(this._storedPeriodInfo, period.id);
        if (newPeriodItem !== undefined &&
            newPeriodItem.video.storedSettings === storedSettings) {
            (_b = newPeriodItem.video.dispatcher) === null || _b === void 0 ? void 0 : _b.updateTrack(storedSettings);
        }
    }
    /**
     * Disable the current text track for a given period.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @param {string} bufferType - The type of track to disable.
     * @throws Error - Throws if the period given has not been added
     */
    disableTrack(periodObj, bufferType) {
        var _a, _b;
        if (!periodObj.isPeriodAdvertised) {
            throw new Error("Wanted Period not yet advertised.");
        }
        const trackInfo = periodObj[bufferType];
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
        const newPeriodItem = getPeriodItem(this._storedPeriodInfo, periodObj.period.id);
        if (newPeriodItem !== undefined &&
            newPeriodItem[bufferType].storedSettings === null) {
            (_b = newPeriodItem[bufferType].dispatcher) === null || _b === void 0 ? void 0 : _b.updateTrack(null);
        }
        if (newPeriodItem !== undefined) {
            const hasNoTrackAtAll = ["audio", "video"].every((ttype) => newPeriodItem[ttype].storedSettings === null);
            if (hasNoTrackAtAll) {
                const err = new MediaError("NO_AUDIO_VIDEO_TRACKS", "No audio and no video tracks are set.");
                this.trigger("error", err);
                this.dispose();
                return;
            }
        }
    }
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
    getChosenAudioTrack(periodObj, filterPlayableRepresentations) {
        return isNullOrUndefined(periodObj.audio.storedSettings)
            ? null
            : toAudioTrack(periodObj.audio.storedSettings.adaptation, filterPlayableRepresentations);
    }
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
    getChosenTextTrack(periodObj) {
        return isNullOrUndefined(periodObj.text.storedSettings)
            ? null
            : toTextTrack(periodObj.text.storedSettings.adaptation);
    }
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
    getChosenVideoTrack(periodObj, filterPlayableRepresentations) {
        if (isNullOrUndefined(periodObj.video.storedSettings)) {
            return null;
        }
        return toVideoTrack(periodObj.video.storedSettings.adaptation, filterPlayableRepresentations);
    }
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
    getAvailableAudioTracks(periodObj, filterPlayableRepresentations) {
        const storedSettings = periodObj.audio.storedSettings;
        const currentId = !isNullOrUndefined(storedSettings)
            ? storedSettings.adaptation.id
            : null;
        const adaptations = getSupportedAdaptations(periodObj.period, "audio");
        return adaptations.map((adaptation) => {
            const active = currentId === null ? false : currentId === adaptation.id;
            return objectAssign(toAudioTrack(adaptation, filterPlayableRepresentations), {
                active,
            });
        });
    }
    /**
     * Returns all available text tracks for a given Period, as an array of
     * objects.
     *
     * Returns `undefined` if the given Period's id is not known.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @returns {Array.<Object>}
     */
    getAvailableTextTracks(periodObj) {
        const storedSettings = periodObj.text.storedSettings;
        const currentId = !isNullOrUndefined(storedSettings)
            ? storedSettings.adaptation.id
            : null;
        const adaptations = getSupportedAdaptations(periodObj.period, "text");
        return adaptations.map((adaptation) => {
            const active = currentId === null ? false : currentId === adaptation.id;
            return objectAssign(toTextTrack(adaptation), { active });
        });
    }
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
    getAvailableVideoTracks(periodObj, filterPlayableRepresentations) {
        const storedSettings = periodObj.video.storedSettings;
        const currentId = isNullOrUndefined(storedSettings)
            ? undefined
            : storedSettings.adaptation.id;
        const adaptations = getSupportedAdaptations(periodObj.period, "video");
        return adaptations.map((adaptation) => {
            const active = currentId === null ? false : currentId === adaptation.id;
            const track = toVideoTrack(adaptation, filterPlayableRepresentations);
            const trickModeTracks = track.trickModeTracks !== undefined
                ? track.trickModeTracks.map((trickModeAdaptation) => {
                    const isActive = currentId === null ? false : currentId === trickModeAdaptation.id;
                    return objectAssign(trickModeAdaptation, { active: isActive });
                })
                : [];
            const availableTrack = objectAssign(track, { active });
            if (trickModeTracks !== undefined) {
                availableTrack.trickModeTracks = trickModeTracks;
            }
            return availableTrack;
        });
    }
    getLockedAudioRepresentations(periodObj) {
        const { storedSettings } = periodObj.audio;
        if (isNullOrUndefined(storedSettings)) {
            return null;
        }
        const lastLockedSettings = storedSettings.lockedRepresentations.getValue();
        return lastLockedSettings === null ? null : lastLockedSettings.representationIds;
    }
    getLockedVideoRepresentations(periodObj) {
        const { storedSettings } = periodObj.video;
        if (isNullOrUndefined(storedSettings)) {
            return null;
        }
        const lastLockedSettings = storedSettings.lockedRepresentations.getValue();
        return lastLockedSettings === null ? null : lastLockedSettings.representationIds;
    }
    lockAudioRepresentations(periodObj, lockSettings) {
        var _a;
        const { storedSettings } = periodObj.audio;
        if (isNullOrUndefined(storedSettings)) {
            return;
        }
        const { DEFAULT_AUDIO_REPRESENTATIONS_SWITCHING_MODE } = config.getCurrent();
        const filtered = this._getRepresentationsToLock(storedSettings.adaptation, lockSettings.representations);
        const switchingMode = (_a = lockSettings.switchingMode) !== null && _a !== void 0 ? _a : DEFAULT_AUDIO_REPRESENTATIONS_SWITCHING_MODE;
        storedSettings.lockedRepresentations.setValue({
            representationIds: filtered,
            switchingMode,
        });
    }
    lockVideoRepresentations(periodObj, lockSettings) {
        var _a;
        const { storedSettings } = periodObj.video;
        if (isNullOrUndefined(storedSettings)) {
            return;
        }
        const { DEFAULT_VIDEO_REPRESENTATIONS_SWITCHING_MODE } = config.getCurrent();
        const filtered = this._getRepresentationsToLock(storedSettings.adaptation, lockSettings.representations);
        const switchingMode = (_a = lockSettings.switchingMode) !== null && _a !== void 0 ? _a : DEFAULT_VIDEO_REPRESENTATIONS_SWITCHING_MODE;
        storedSettings.lockedRepresentations.setValue({
            representationIds: filtered,
            switchingMode,
        });
    }
    unlockAudioRepresentations(periodObj) {
        const { storedSettings } = periodObj.audio;
        if (isNullOrUndefined(storedSettings) ||
            storedSettings.lockedRepresentations.getValue() === null) {
            return;
        }
        storedSettings.lockedRepresentations.setValue(null);
    }
    unlockVideoRepresentations(periodObj) {
        const { storedSettings } = periodObj.video;
        if (isNullOrUndefined(storedSettings) ||
            storedSettings.lockedRepresentations.getValue() === null) {
            return;
        }
        storedSettings.lockedRepresentations.setValue(null);
    }
    dispose() {
        this._isDisposed = true;
        while (true) {
            const lastPeriod = this._storedPeriodInfo.pop();
            if (lastPeriod === undefined) {
                return;
            }
            lastPeriod.isRemoved = true;
        }
    }
    _resetVideoTrackChoices(reason) {
        var _a;
        for (let i = 0; i < this._storedPeriodInfo.length; i++) {
            const periodObj = this._storedPeriodInfo[i];
            if (!isNullOrUndefined(periodObj.video.storedSettings)) {
                const chosenBaseTrack = periodObj.video.storedSettings.adaptationBase;
                if (chosenBaseTrack !== null) {
                    const chosenTrack = getRightVideoTrack(chosenBaseTrack, this._isTrickModeTrackEnabled);
                    periodObj.video.storedSettings.adaptationBase = chosenBaseTrack;
                    periodObj.video.storedSettings.adaptation = chosenTrack;
                }
            }
        }
        // Clone the current Period list to not be influenced if Periods are removed
        // or added while the loop is running.
        const sliced = this._storedPeriodInfo.slice();
        for (let i = 0; i < sliced.length; i++) {
            const period = sliced[i].period;
            const videoItem = sliced[i].video;
            const storedSettings = videoItem.storedSettings;
            if (storedSettings !== undefined) {
                this.trigger("trackUpdate", {
                    period: toExposedPeriod(period),
                    trackType: "video",
                    reason,
                });
                // The previous event trigger could have had side-effects, so we
                // re-check if we're still mostly in the same state
                if (this._isDisposed) {
                    return; // Someone disposed the `TracksStore` on the previous side-effect
                }
                const newPeriodItem = getPeriodItem(this._storedPeriodInfo, period.id);
                if (newPeriodItem !== undefined &&
                    newPeriodItem.isPeriodAdvertised &&
                    newPeriodItem.video.storedSettings === storedSettings) {
                    (_a = newPeriodItem.video.dispatcher) === null || _a === void 0 ? void 0 : _a.updateTrack(storedSettings);
                }
            }
        }
    }
    _removePeriodObject(index) {
        assert(index < this._storedPeriodInfo.length);
        const oldPeriodItem = this._storedPeriodInfo[index];
        this._storedPeriodInfo[index].isRemoved = true;
        this._storedPeriodInfo.splice(index, 1);
        this._cachedPeriodInfo.set(oldPeriodItem.period, oldPeriodItem);
    }
    _getRepresentationsToLock(adaptation, representationIds) {
        const filtered = representationIds.reduce((acc, repId) => {
            const foundRep = arrayFind(adaptation.representations, (r) => {
                return r.id === repId;
            });
            if (foundRep === undefined) {
                log.warn("Track", "Wanted locked Representation not found.");
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
    }
    /**
     * Check or re-check all Periods for which both an initial track can be chosen
     * and for which the `newAvailablePeriods` event can be triggered.
     */
    _selectInitialTrackIfNeeded() {
        var _a, _b, _c, _d;
        const { DEFAULT_VIDEO_TRACK_SWITCHING_MODE } = config.getCurrent();
        const periodsToAdvertise = [];
        const toDispatchTrack = [];
        for (const trackStorePeriod of this._storedPeriodInfo) {
            const { period } = trackStorePeriod;
            if (trackStorePeriod.audio.storedSettings !== undefined &&
                trackStorePeriod.video.storedSettings !== undefined &&
                trackStorePeriod.text.storedSettings !== undefined) {
                // already processed, continue
                continue;
            }
            const adaptations = [
                ...((_a = period.adaptations.audio) !== null && _a !== void 0 ? _a : []),
                ...((_b = period.adaptations.video) !== null && _b !== void 0 ? _b : []),
            ];
            const hasCodecWithUndefinedSupport = adaptations.every((a) => a.supportStatus.hasCodecWithUndefinedSupport);
            if (adaptations.length > 0 && hasCodecWithUndefinedSupport) {
                // Not all codecs for that Period are known yet.
                // Await until this is the case.
                continue;
            }
            const audioAdaptation = getSupportedAdaptations(period, "audio")[0];
            if (audioAdaptation === undefined) {
                trackStorePeriod.audio.storedSettings = null;
                this.handleMissingOrUnplayableTrack(period, "audio", true);
                if (this._isDisposed) {
                    return;
                }
            }
            else {
                trackStorePeriod.audio.storedSettings = {
                    adaptation: audioAdaptation,
                    switchingMode: this._defaultAudioTrackSwitchingMode,
                    lockedRepresentations: new SharedReference(null),
                };
            }
            const baseVideoAdaptation = getSupportedAdaptations(period, "video")[0];
            if (baseVideoAdaptation === undefined) {
                trackStorePeriod.video.storedSettings = null;
                this.handleMissingOrUnplayableTrack(period, "video", true);
                if (this._isDisposed) {
                    return;
                }
            }
            else {
                const videoAdaptation = getRightVideoTrack(baseVideoAdaptation, this._isTrickModeTrackEnabled);
                trackStorePeriod.video.storedSettings = {
                    adaptation: videoAdaptation,
                    adaptationBase: baseVideoAdaptation,
                    switchingMode: DEFAULT_VIDEO_TRACK_SWITCHING_MODE,
                    lockedRepresentations: new SharedReference(null),
                };
            }
            let textAdaptation = null;
            const forcedSubtitles = ((_c = period.adaptations.text) !== null && _c !== void 0 ? _c : []).filter((ad) => ad.isForcedSubtitles === true);
            if (forcedSubtitles.length > 0) {
                if (audioAdaptation !== null && audioAdaptation !== undefined) {
                    const sameLanguage = arrayFind(forcedSubtitles, (f) => f.normalizedLanguage === audioAdaptation.normalizedLanguage);
                    if (sameLanguage !== undefined) {
                        textAdaptation = sameLanguage;
                    }
                }
                if (textAdaptation === null) {
                    textAdaptation =
                        (_d = arrayFind(forcedSubtitles, (f) => f.normalizedLanguage === undefined)) !== null && _d !== void 0 ? _d : null;
                }
            }
            trackStorePeriod.text.storedSettings =
                textAdaptation === null
                    ? null
                    : {
                        adaptation: textAdaptation,
                        switchingMode: "direct",
                        lockedRepresentations: new SharedReference(null),
                    };
            toDispatchTrack.push(trackStorePeriod);
            if (this._shouldAdvertisePeriod(trackStorePeriod)) {
                trackStorePeriod.isPeriodAdvertised = true;
                periodsToAdvertise.push({ id: period.id, start: period.start, end: period.end });
            }
        }
        if (periodsToAdvertise.length > 0) {
            this.trigger("newAvailablePeriods", periodsToAdvertise);
            if (this._isDisposed) {
                return;
            }
        }
        for (const trackStorePeriod of toDispatchTrack) {
            if (!trackStorePeriod.isPeriodAdvertised) {
                continue;
            }
            const bufferTypes = ["audio", "video", "text"];
            for (const bufferType of bufferTypes) {
                const trackInfo = trackStorePeriod[bufferType];
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
    }
    /**
     * Returns `true` once a Period can be advertised through a `newAvailablePeriods`
     * event, after which track can begin to be set and updated.
     * @param {Object} periodObj
     * @returns {boolean}
     */
    _shouldAdvertisePeriod(periodObj) {
        return (!periodObj.isPeriodAdvertised &&
            periodObj.text.dispatcher !== null &&
            periodObj.video.dispatcher !== null &&
            periodObj.audio.dispatcher !== null);
    }
}
/**
 * Returns element in the given `periods` Array that corresponds to the
 * `period` given.
 * Returns `undefined` if that `period` is not found.
 * @param {Object} periods
 * @param {string} periodId
 * @returns {Object|undefined}
 */
function getPeriodItem(periods, periodId) {
    for (let i = 0; i < periods.length; i++) {
        const periodI = periods[i];
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
        period,
        inManifest,
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
    const periodHasAdaptationForType = period.adaptations[trackType] !== undefined &&
        period.adaptations[trackType].length > 0;
    if (!periodHasAdaptationForType) {
        return {
            fallbackTrack: null,
            noSourceMedia: true,
        };
    }
    const firstPlayableAdaptation = findFirstPlayableAdaptation(period, trackType);
    return {
        fallbackTrack: firstPlayableAdaptation !== null && firstPlayableAdaptation !== void 0 ? firstPlayableAdaptation : null,
        noSourceMedia: false,
    };
}
function findFirstPlayableAdaptation(period, type) {
    var _a;
    const firstPlayableAdaptation = arrayFind((_a = period.adaptations[type]) !== null && _a !== void 0 ? _a : [], (adaptation) => {
        if (adaptation.supportStatus.hasSupportedCodec === false ||
            adaptation.supportStatus.isDecipherable === false) {
            return false;
        }
        const playableRepresentations = adaptation.representations.filter((r) => isRepresentationPlayable(r) === true);
        return playableRepresentations.length > 0;
    });
    return firstPlayableAdaptation;
}
