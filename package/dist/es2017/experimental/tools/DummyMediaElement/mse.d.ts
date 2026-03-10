import type { IMediaSource, IMediaSourceEventMap, ISourceBuffer, ISourceBufferEventMap, ISourceBufferList } from "../../../compat/browser_compatibility_types";
import EventEmitter from "../../../utils/event_emitter";
import TaskCanceller from "../../../utils/task_canceller";
import TimeRangesWithMetadata, { EventScheduler } from "./utils";
/**
 * Re-implementation of the MSE `MediaSource` Object.
 * @class DummyMediaSource
 */
export declare class DummyMediaSource extends EventEmitter<IMediaSourceEventMap> implements IMediaSource {
    readonly isDummy: true;
    handle: DummyMediaSource;
    sourceBuffers: IDummySourceBufferList;
    activeSourceBuffers: IDummySourceBufferList;
    readyState: "closed" | "open" | "ended";
    destroyed: boolean;
    private _duration;
    liveSeekableRange: TimeRangesWithMetadata<null>;
    onsourceopen: ((evt: Event) => void) | null;
    onsourceended: ((evt: Event) => void) | null;
    onsourceclose: ((evt: Event) => void) | null;
    eventScheduler: EventScheduler;
    private _callbacks;
    constructor();
    static isTypeSupported(mimeType: string): boolean;
    get duration(): number;
    set duration(givenDuration: number);
    addSourceBuffer(givenType: string): ISourceBuffer;
    removeSourceBuffer(sb: ISourceBuffer): void;
    destroy(): void;
    endOfStream(): void;
    updateCallbacks(cb: IDummyMediaSourceCallbacks): void;
    setLiveSeekableRange(start: number, end: number): void;
    clearLiveSeekableRange(): void;
}
interface IDummySourceBufferInternalCallbacks {
    hasMediaElementErrored: () => boolean;
    getMediaSourceDuration: () => number;
    getMediaSourceReadyState: () => "open" | "ended" | "closed";
    openMediaSource: () => void;
    onBufferedUpdate: () => void;
}
/**
 * Re-implementation of the MSE `SourceBuffer` Object.
 * @class DummySourceBuffer
 */
export declare class DummySourceBuffer extends EventEmitter<ISourceBufferEventMap> implements ISourceBuffer {
    /** Correspond to `SourceBuffer.prototype.updating` from MSE */
    updating: boolean;
    /**
     * Set to `true` once this `DummySourceBuffer` is removed from the parent
     * MediaSource.
     */
    removed: boolean;
    /**
     * When it emits, cancel all operations and scheduled events from this
     * `DummySourceBuffer`.
     */
    canceller: TaskCanceller;
    /**
     * When it emits, abort specifically the current `appendBuffer` operation.
     */
    currentAppendCanceller: TaskCanceller | null;
    /**
     * Allows to emit SourceBuffer events, simulating the browser's event loop.
     */
    eventScheduler: EventScheduler;
    /**
     * To set to `true` to trigger `QuotaExceededError` to next `appendBuffer`
     * calls.
     * To set to `false` to stop doing that.
     */
    BUFFER_FULL: boolean;
    /** Optional listener for the `updatestart` event. */
    onupdatestart: ((evt: Event) => void) | null;
    /** Optional listener for the `update` event. */
    onupdate: ((evt: Event) => void) | null;
    /** Optional listener for the `updateend` event. */
    onupdateend: ((evt: Event) => void) | null;
    /** Optional listener for the `error` event. */
    onerror: ((evt: Event) => void) | null;
    /** Optional listener for the `abort` event. */
    onabort: ((evt: Event) => void) | null;
    /**
     * Set to `true` as soon as a segment with metadata is pushed.
     * Allows to indicate to the HTML5 implementation that it can reach the
     * `HAVE_METADATA` readyState.
     */
    hasMetadata: boolean;
    /**
     * When set to an `Uint8Array`, set to the key id found in the last
     * initialization segment,
     * meaning next pushed media segments are probably encrypted with the
     * corresponding key.
     * When set to `null`, no initialization segment has been pushed or no key id
     * has been found on the last pushed initialization segment.
     */
    private _lastKeyId;
    /**
     * When set to a `number`, set to the timescale found in the last
     * initialization segment that may be re-used for media segments.
     * When set to `null`, no initialization segment has been pushed or no
     * timescale has been found on the last pushed initialization segment.
     */
    private _lastInitTimescale;
    /** Correspond to `SourceBuffer.prototype.timestampOffset` from MSE */
    private _timestampOffset;
    /** Correspond to `SourceBuffer.prototype.buffered` from MSE */
    private _buffered;
    /** Correspond to `SourceBuffer.prototype.appendWindowStart` from MSE */
    private _appendWindowStart;
    /** Correspond to `SourceBuffer.prototype.appendWindowEnd` from MSE */
    private _appendWindowEnd;
    /** Set to `true` if a "remove" operation is currently pending. */
    private _isRemoving;
    /** Callbacks given to a `DummySourceBuffer`. */
    private _callbacks;
    /**
     * @param {Object} callbacks
     */
    constructor(callbacks: IDummySourceBufferInternalCallbacks);
    /**
     * Implements `SourceBuffer.prototype.mode` from MSE.
     */
    set mode(mode: "segments" | "sequence" | "dummy");
    get mode(): "dummy";
    /**
     * Implements `SourceBuffer.prototype.timestampOffset` from MSE.
     */
    set timestampOffset(timestampOffset: number);
    get timestampOffset(): number;
    /**
     * Implements `SourceBuffer.prototype.appendWindowStart` from MSE.
     */
    set appendWindowStart(appendWindowStart: number);
    get appendWindowStart(): number;
    /**
     * Implements `SourceBuffer.prototype.appendWindowEnd` from MSE.
     */
    set appendWindowEnd(appendWindowEnd: number);
    get appendWindowEnd(): number;
    /**
     * Implements `SourceBuffer.prototype.buffered` from MSE.
     */
    get buffered(): TimeRangesWithMetadata<IDummySourceBufferBufferMetadata>;
    /**
     * Implements `SourceBuffer.prototype.appendBuffer` from MSE.
     * @param {BufferSource} data
     */
    appendBuffer(data: BufferSource): void;
    /**
     * Implements `SourceBuffer.prototype.remove` from MSE.
     * @param {number} start
     * @param {number} end
     */
    remove(start: number, end: number): void;
    /**
     * Implements `SourceBuffer.prototype.abort` from MSE.
     */
    abort(): void;
    /**
     * Implements `SourceBuffer.prototype.abort` from MSE.
     * @param {string} givenType
     */
    changeType(givenType: string): void;
    /**
     * Allows to trigger the common steps when updating a `SourceBuffer`'s
     * property.
     * @param {string} propName - The MSE name of the property you want to update.
     * @param {boolean} openMediaSource - If `true`, this property update should
     * lead to the parent `MediaSource` being open.
     */
    private _checkProp;
}
/**
 * Metadata linked to buffer currently present in a `DummySourceBuffer`.
 */
export interface IDummySourceBufferBufferMetadata {
    keyIds: string[] | null;
}
/**
 * Callbacks needed to instantiate a `DummyMediaSource`.
 */
interface IDummyMediaSourceCallbacks {
    /**
     * Returns `true` if the parent `HTMLMediaElement` linked to that
     * `MediaSource` has its `error` property set.
     */
    hasMediaElementErrored: () => boolean;
    /**
     * Callback called any time one of the `DummySourceBuffer` linked to this
     * `DummyMediaSource` updated its `buffered` property.
     */
    onBufferedUpdate: () => void;
    /**
     * When called, allows to update the parent `HTMLMediaElement` object's
     * `duration` property by the communicated number.
     */
    updateMediaElementDuration: (duration: number) => void;
}
/**
 * Defines the type for a `IDummySourceBufferList`, the in-JS re-implementation
 * of the `SourceBufferList` MSE Object.
 */
export type IDummySourceBufferList = ISourceBufferList & DummySourceBuffer[] & {
    /**
     * Callback that MUST be called any time a `DummySourceBuffer` is added to
     * this  `IDummySourceBufferList`.
     */
    _onAddSourceBuffer: () => void;
    /**
     * Callback that MUST be called any time a `DummySourceBuffer` is removed
     * from this  `IDummySourceBufferList`.
     */
    _onRemoveSourceBuffer: () => void;
};
export {};
//# sourceMappingURL=mse.d.ts.map