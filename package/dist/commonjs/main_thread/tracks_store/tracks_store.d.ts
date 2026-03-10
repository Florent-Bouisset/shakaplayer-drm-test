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
import type { IAdaptationChoice, IRepresentationsChoice } from "../../core/types";
import type { IAdaptationMetadata, IManifestMetadata, IPeriodMetadata } from "../../manifest";
import type { IAudioRepresentationsSwitchingMode, IAudioTrack, IAudioTrackSwitchingMode, ITrackUpdateEventPayload, IAvailableAudioTrack, IAvailableTextTrack, IAvailableVideoTrack, IBrokenRepresentationsLockContext, IPeriod, ITextTrack, IVideoRepresentationsSwitchingMode, IVideoTrack, IVideoTrackSwitchingMode, IPlayerError, INoPlayableTrackEventPayload } from "../../public_types";
import EventEmitter from "../../utils/event_emitter";
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
export default class TracksStore extends EventEmitter<ITracksStoreEvents> {
    /**
     * Store track selection information, per Period.
     * Sorted by Period's start time ascending
     */
    private _storedPeriodInfo;
    /**
     * If `true`, the current `TracksStore` instance has been disposed. It
     * shouldn't perform side-effects anymore.
     */
    private _isDisposed;
    /**
     * Period information that was before in `_storedPeriodInfo` but has since
     * been removed is added to the `_cachedPeriodInfo` cache as a weak reference.
     *
     * This allows to still retrieve old track information for Periods which are
     * for example not in the Manifest anymore as long as the same Period's
     * reference is still kept.
     */
    private _cachedPeriodInfo;
    /** Tells if trick mode has been enabled by the RxPlayer user */
    private _isTrickModeTrackEnabled;
    /**
     * In absence of another setting, this is the default "switching mode" for the
     * audio track.
     * See type documentation.
     */
    private _defaultAudioTrackSwitchingMode;
    /** Specifies the behavior when audio or video tracks are not playable. */
    private onTracksNotPlayableForType;
    constructor(args: {
        preferTrickModeTracks: boolean;
        defaultAudioTrackSwitchingMode: IAudioTrackSwitchingMode | undefined;
        onTracksNotPlayableForType: {
            audio: "error" | "continue";
            video: "error" | "continue";
            text: "error" | "continue";
        };
    });
    /**
     * Return Array of Period information, to allow an outside application to
     * modify the track of any Period.
     * @returns {Array.<Object>}
     */
    getAvailablePeriods(): IPeriod[];
    /**
     * Callack that needs to be called as codec support is either first known or
     * updated on the Manifest.
     */
    onManifestCodecSupportUpdate(): void;
    /**
     * Check that a period has a supported track for the given track type.
     * Trigger an error with `MANIFEST_INCOMPATIBLE_CODECS_ERROR` if no codecs are
     * supported and `onTracksNotPlayableForType[ttype]` is "error".
     *
     * @param period - The period to check
     * @param ttype - The track type.
     */
    private checkPeriodHasSupportedTrack;
    /**
     * Update the list of Periods handled by the TracksStore and make a
     * track choice decision for each of them.
     * @param {Object} manifest - The new Manifest object
     */
    onManifestUpdate(manifest: IManifestMetadata): void;
    onDecipherabilityUpdates(): void;
    /**
     * Reset the stored settings if the track is not available anymore in
     * the new manifest.
     * @param periodInfo
     * @param newPeriod
     * @param type
     * @returns
     */
    private resetSelectedTrackIfNotAvailableAnymore;
    private getDefaultStoredSettingsForAdaptation;
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
    addTrackReference(bufferType: "audio" | "text" | "video", period: IPeriodMetadata, adaptationRef: SharedReference<IAdaptationChoice | null | undefined>): void;
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
    private throwIfTracksAreNotSetForPeriod;
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
    private handleMissingOrUnplayableTrack;
    /**
     * Remove shared reference to choose an "audio", "video" or "text" Adaptation
     * for a Period.
     * @param {string} bufferType - The concerned buffer type
     * @param {string} periodId - The concerned Period's `id`.
     */
    removeTrackReference(bufferType: "audio" | "text" | "video", periodId: string): void;
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
    getPeriodObjectFromPeriod(period: IPeriodMetadata): ITSPeriodObject | undefined;
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
    getPeriodObjectFromId(periodId: string): ITSPeriodObject | undefined;
    disableVideoTrickModeTracks(): void;
    enableVideoTrickModeTracks(): void;
    /**
     * Reset the TracksStore's Period objects:
     *   - All Period which are not in the manifest currently will be removed.
     *   - All References used to communicate the wanted track will be removed.
     *
     * You might want to call this API when restarting playback.
     */
    resetPeriodObjects(): void;
    /**
     * @returns {boolean}
     */
    isTrickModeEnabled(): boolean;
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
    setAudioTrack(payload: {
        periodRef: ITSPeriodObject;
        trackId: string;
        switchingMode: IAudioTrackSwitchingMode | undefined;
        lockedRepresentations: string[] | null;
        relativeResumingPosition: number | undefined;
    }): void;
    /**
     * Set text track based on the ID of its Adaptation for a given added Period.
     * @param {Object} periodObj - The concerned Period's object.
     * @param {string} wantedId - adaptation id of the wanted track.
     */
    setTextTrack(periodObj: ITSPeriodObject, wantedId: string): void;
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
    private _setAudioOrTextTrack;
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
    setVideoTrack(payload: {
        periodRef: ITSPeriodObject;
        trackId: string;
        switchingMode: IVideoTrackSwitchingMode | undefined;
        lockedRepresentations: string[] | null;
        relativeResumingPosition: number | undefined;
    }): void;
    /**
     * Disable the current text track for a given period.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @param {string} bufferType - The type of track to disable.
     * @throws Error - Throws if the period given has not been added
     */
    disableTrack(periodObj: ITSPeriodObject, bufferType: "audio" | "video" | "text"): void;
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
    getChosenAudioTrack(periodObj: ITSPeriodObject, filterPlayableRepresentations: boolean): IAudioTrack | null;
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
    getChosenTextTrack(periodObj: ITSPeriodObject): ITextTrack | null;
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
    getChosenVideoTrack(periodObj: ITSPeriodObject, filterPlayableRepresentations: boolean): IVideoTrack | null;
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
    getAvailableAudioTracks(periodObj: ITSPeriodObject, filterPlayableRepresentations: boolean): IAvailableAudioTrack[] | undefined;
    /**
     * Returns all available text tracks for a given Period, as an array of
     * objects.
     *
     * Returns `undefined` if the given Period's id is not known.
     *
     * @param {Object} periodObj - The concerned Period's object
     * @returns {Array.<Object>}
     */
    getAvailableTextTracks(periodObj: ITSPeriodObject): IAvailableTextTrack[] | undefined;
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
    getAvailableVideoTracks(periodObj: ITSPeriodObject, filterPlayableRepresentations: boolean): IAvailableVideoTrack[] | undefined;
    getLockedAudioRepresentations(periodObj: ITSPeriodObject): string[] | null;
    getLockedVideoRepresentations(periodObj: ITSPeriodObject): string[] | null;
    lockAudioRepresentations(periodObj: ITSPeriodObject, lockSettings: IAudioRepresentationsLockSettings): void;
    lockVideoRepresentations(periodObj: ITSPeriodObject, lockSettings: IVideoRepresentationsLockSettings): void;
    unlockAudioRepresentations(periodObj: ITSPeriodObject): void;
    unlockVideoRepresentations(periodObj: ITSPeriodObject): void;
    dispose(): void;
    private _resetVideoTrackChoices;
    private _removePeriodObject;
    private _getRepresentationsToLock;
    /**
     * Check or re-check all Periods for which both an initial track can be chosen
     * and for which the `newAvailablePeriods` event can be triggered.
     */
    private _selectInitialTrackIfNeeded;
    /**
     * Returns `true` once a Period can be advertised through a `newAvailablePeriods`
     * event, after which track can begin to be set and updated.
     * @param {Object} periodObj
     * @returns {boolean}
     */
    private _shouldAdvertisePeriod;
}
/** Every information stored for a single Period. */
export interface ITSPeriodObject {
    /** The Period in question. */
    period: IPeriodMetadata;
    /**
     * If `true`, this Period was present at the last `updatePeriodList` call,
     * meaning it's probably still in the Manifest.
     *
     * If `false`, this Period was not. In that case it is probably just here
     * because some audio/video/text buffer still contains data of the given type.
     */
    inManifest: boolean;
    /**
     * Set to `true` once a `newAvailablePeriods` event has been sent for this
     * particular Period.
     *
     * Once this event has been sent, we can begin to select a audio, video and
     * text track for that Period (but **NOT** before).
     */
    isPeriodAdvertised: boolean;
    /**
     * Information on the selected audio track and Representations for this Period.
     */
    audio: IAudioPeriodInfo;
    /**
     * Information on the selected text track and Representations for this Period.
     */
    text: ITextPeriodInfo;
    /**
     * Information on the selected video track and Representations for this Period.
     */
    video: IVideoPeriodInfo;
    /**
     * If `true`, this object was since cleaned-up.
     */
    isRemoved: boolean;
}
/**
 * Internal representation of audio track preferences for a given `Period` of
 * the Manifest.
 */
interface IAudioPeriodInfo {
    /**
     * Information on the last audio track settings wanted by the user.
     * `null` if no audio track is wanted.
     * `undefined` if not set yet.
     */
    storedSettings: IAudioStoredSettings | null | undefined;
    /**
     * Tracks are internally emitted through RxJS's `Subject`s.
     * A `TrackDispatcher` allows to facilitate and centralize the management of
     * that Subject so that the right wanted track and qualities are emitted
     * through it.
     *
     * `null` if no `Subject` has been linked for this `Period` and buffer type
     * for now.
     */
    dispatcher: TrackDispatcher | null;
}
interface IAudioStoredSettings {
    /** Contains the last `Adaptation` wanted by the user. */
    adaptation: IAdaptationMetadata;
    /** "Switching mode" in which the track switch should happen. */
    switchingMode: IAudioTrackSwitchingMode;
    /**
     * Contains the last locked `Representation`s for this `Adaptation` wanted
     * by the user.
     * `null` if no Representation is locked.
     */
    lockedRepresentations: SharedReference<IRepresentationsChoice | null>;
}
/**
 * Internal representation of text track preferences for a given `Period` of
 * the Manifest.
 */
export interface ITextPeriodInfo {
    /**
     * Information on the last text track settings wanted.
     * `null` if no text track is wanted.
     * `undefined` if not set yet.
     */
    storedSettings: {
        /** Contains the last `Adaptation` wanted by the user. */
        adaptation: IAdaptationMetadata;
        /** "Switching mode" in which the track switch should happen. */
        switchingMode: "direct";
        /**
         * Contains the last locked `Representation`s for this `Adaptation` wanted
         * by the user.
         * `null` if no Representation is locked.
         */
        lockedRepresentations: SharedReference<IRepresentationsChoice | null>;
    } | null | undefined;
    /**
     * Tracks are internally emitted through RxJS's `Subject`s.
     * A `TrackDispatcher` allows to facilitate and centralize the management of
     * that Subject so that the right wanted track and qualities are emitted
     * through it.
     *
     * `null` if no `Subject` has been linked for this `Period` and buffer type
     * for now.
     */
    dispatcher: TrackDispatcher | null;
}
/**
 * Internal representation of video track preferences for a given `Period` of
 * the Manifest.
 */
export interface IVideoPeriodInfo {
    /**
     * Information on the `id` of the last video track settings wanted.
     * `null` if no video track is wanted.
     * `undefined` if not set yet.
     */
    storedSettings: IVideoStoredSettings | null | undefined;
    /**
     * Tracks are internally emitted through RxJS's `Subject`s.
     * A `TrackDispatcher` allows to facilitate and centralize the management of
     * that Subject so that the right wanted track and qualities are emitted
     * through it.
     *
     * `null` if no `Subject` has been linked for this `Period` and buffer type
     * for now.
     */
    dispatcher: TrackDispatcher | null;
}
interface IVideoStoredSettings {
    /**
     * The wanted Adaptation itself (may be different from `adaptationBase` when
     * a trickmode track is chosen, in which case `adaptationBase` is the
     * Adaptation the trickmode track is linked to and `adaptation` is the
     * trickmode track).
     */
    adaptation: IAdaptationMetadata;
    /** "Switching mode" in which the track switch should happen. */
    switchingMode: IVideoTrackSwitchingMode;
    /**
     * The "base" Adaptation for `storedSettings` (if a trickmode track was
     * chosen, this is the Adaptation the trickmode track is linked to, and not
     * the trickmode track itself).
     */
    adaptationBase: IAdaptationMetadata;
    /**
     * Contains the last locked `Representation`s for this `Adaptation` wanted
     * by the user.
     * `null` if no Representation is locked.
     */
    lockedRepresentations: SharedReference<IRepresentationsChoice | null>;
}
/** Events emitted by the TracksStore. */
interface ITracksStoreEvents {
    newAvailablePeriods: IPeriod[];
    brokenRepresentationsLock: IBrokenRepresentationsLockContext;
    trackUpdate: ITrackUpdateEventPayload;
    error: unknown;
    warning: IPlayerError;
    noPlayableTrack: INoPlayableTrackEventPayload;
}
export interface IAudioRepresentationsLockSettings {
    representations: string[];
    switchingMode?: IAudioRepresentationsSwitchingMode | undefined;
}
export interface IVideoRepresentationsLockSettings {
    representations: string[];
    switchingMode?: IVideoRepresentationsSwitchingMode | undefined;
}
export {};
//# sourceMappingURL=tracks_store.d.ts.map