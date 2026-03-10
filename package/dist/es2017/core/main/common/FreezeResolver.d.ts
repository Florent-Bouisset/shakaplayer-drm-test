import type { IAdaptation, IPeriod, IRepresentation } from "../../../manifest";
import type { IFreezingStatus, IRebufferingStatus, ObservationPosition } from "../../../playback_observer";
import type SegmentSinksStore from "../../segment_sinks";
/**
 * Set when there is a freeze which seems to be specifically linked to a,
 * or multiple, content's `Representation` despite no attribute of it
 * indicating so (i.e. it is decodable and decipherable).
 * In that case, the recommendation is to avoid playing those
 * `Representation` at all.
 */
export interface IRepresentationAvoidanceFreezeResolution {
    type: "avoid-representations";
    /** The `Representation` to avoid. */
    value: Array<{
        adaptation: IAdaptation;
        period: IPeriod;
        representation: IRepresentation;
    }>;
}
/**
 * Set when there is a freeze which seem to be fixable by just
 * "flushing" the buffer, e.g. generally by just seeking to another,
 * close, position.
 */
export interface IFlushFreezeResolution {
    type: "flush";
    value: {
        /**
         * The relative position, when compared to the current playback
         * position, we should be playing at after the flush.
         */
        relativeSeek: number;
    };
}
/**
 * Set when there is a freeze which seem to be fixable by "reloading"
 * the content: meaning re-creating a `MediaSource` and its associated
 * buffers.
 *
 * This can for example be when the RxPlayer is playing undecipherable
 * or undecodable Representation (e.g. because of some race condition),
 * or when an unexplainable freeze might not be fixed by just a flush.
 */
export interface IReloadFreezeResolution {
    type: "reload";
    value: null;
}
/** Describe a strategy that can be taken to un-freeze playback. */
export type IFreezeResolution = IRepresentationAvoidanceFreezeResolution | IFlushFreezeResolution | IReloadFreezeResolution;
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
export default class FreezeResolver {
    /** Contain information about segments contained in media buffers. */
    private _segmentSinksStore;
    /** Contains a short-term history of what content has been played recently. */
    private _lastSegmentInfo;
    /**
     * Monotonically-raising timestamp before which we will just ignore freezing
     * situations.
     *
     * To avoid flushing/reloading in a loop, we ignore for some time playback
     * measure before retrying to unstuck playback.
     */
    private _ignoreFreezeUntil;
    /**
     * Information on the last attempt to un-freeze playback by "flushing" buffers.
     *
     * `null` if we never attempted to flush buffers.
     */
    private _lastFlushAttempt;
    /**
     * If set to something else than `null`, this is the timestamp at the time the
     * `FreezeResolver` started to consider its decipherability-linked un-freezing
     * logic.
     *
     * This is used as a time of reference: after enough time was spent from that
     * timestamp, the `FreezeResolver` will attempt supplementary unfreezing
     * strategies.
     *
     * When the `FreezeResolver` is not considering those decipherability-related
     * strategies for now, it is set to `null`.
     */
    private _decipherabilityFreezeStartingTimestamp;
    constructor(segmentSinksStore: SegmentSinksStore);
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
    onNewObservation(observation: IFreezeResolverObservation): IFreezeResolution | null;
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
    private _checkForDecipherabilityRelatedFreeze;
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
    private _getStrategyIfFlushingFails;
    /**
     * Add entry to `this._lastSegmentInfo` for the position that is currently
     * played according to the given `observation`.
     *
     * @param {Object} observation
     * @param {number} currentTimestamp
     */
    private _addPositionToHistory;
}
/** Playback observation needed by the `FreezeResolver`. */
export interface IFreezeResolverObservation {
    /** Current `readyState` value on the media element. */
    readyState: number;
    /**
     * Set if the player is short on audio and/or video media data and is a such,
     * rebuffering.
     * `null` if not.
     */
    rebuffering: IRebufferingStatus | null;
    /**
     * Set if the player is frozen, that is, stuck in place for unknown reason.
     * Note that this reason can be a valid one, such as a necessary license not
     * being obtained yet.
     *
     * `null` if the player is not frozen.
     */
    freezing: IFreezingStatus | null;
    /**
     * Gap between `currentTime` and the next position with un-buffered data.
     * `Infinity` if we don't have buffered data right now.
     * `undefined` if we cannot determine the buffer gap.
     */
    bufferGap: number | undefined;
    position: ObservationPosition;
    /** If `true` the content is loaded until its maximum position. */
    fullyLoaded: boolean;
}
//# sourceMappingURL=FreezeResolver.d.ts.map