import { extractInitSegment, findCompleteBox, getDurationFromTrun, getMDHDTimescale, getTrackFragmentDecodeTime, extractCompleteChunks, } from "../../../parsers/containers/isobmff";
import { getKeyIdFromInitSegment } from "../../../parsers/containers/isobmff/utils";
import arrayIncludes from "../../../utils/array_includes";
import EventEmitter from "../../../utils/event_emitter";
import noop from "../../../utils/noop";
import startsWith from "../../../utils/starts_with";
import { bytesToHex } from "../../../utils/string_parsing";
import TaskCanceller from "../../../utils/task_canceller";
import TimeRangesWithMetadata, { EventScheduler } from "./utils";
/**
 * Re-implementation of the MSE `MediaSource` Object.
 * @class DummyMediaSource
 */
export class DummyMediaSource extends EventEmitter {
    constructor() {
        super();
        this.isDummy = true;
        this.sourceBuffers = createDummySourceBufferList();
        this.activeSourceBuffers = createDummySourceBufferList();
        this.readyState = "closed";
        this.handle = this;
        this.onsourceopen = null;
        this.onsourceended = null;
        this.onsourceclose = null;
        this.destroyed = false;
        this._callbacks = {
            hasMediaElementErrored: () => false,
            onBufferedUpdate: noop,
            updateMediaElementDuration: noop,
        };
        this._duration = NaN;
        this.liveSeekableRange = new TimeRangesWithMetadata();
        this.eventScheduler = new EventScheduler();
    }
    static isTypeSupported(mimeType) {
        return startsWith(mimeType, "audio/mp4") || startsWith(mimeType, "video/mp4");
    }
    get duration() {
        if (this.readyState === "closed") {
            return NaN;
        }
        return this._duration;
    }
    set duration(givenDuration) {
        const duration = Number(givenDuration);
        if (isNaN(duration) || duration < 0) {
            throw new TypeError("Invalid duration");
        }
        if (this.readyState !== "open") {
            const err = new Error("`duration` updated on a non-open DummyMediaSource");
            err.name = "InvalidStateError";
            throw err;
        }
        if (this.sourceBuffers.some((s) => s.updating)) {
            const err = new Error("`duration` updated on an updating DummyMediaSource");
            err.name = "InvalidStateError";
            throw err;
        }
        if (duration === this.duration) {
            return;
        }
        const highestBuffered = this.sourceBuffers.reduce((acc, sb) => {
            if (sb.buffered.length === 0) {
                return acc;
            }
            return Math.max(sb.buffered.end(sb.buffered.length - 1), acc);
        }, 0);
        if (duration < highestBuffered) {
            const err = new Error("`duration` update lower than latest buffered coded frame");
            err.name = "InvalidStateError";
            throw err;
        }
        this._duration = duration;
        this._callbacks.updateMediaElementDuration(duration);
    }
    addSourceBuffer(givenType) {
        const type = String(givenType);
        if (type === "") {
            throw new TypeError("`addSourceBuffer` error: empty string");
        }
        if (this.readyState !== "open") {
            const err = new Error("`addSourceBuffer` called on a non-open DummyMediaSource");
            err.name = "InvalidStateError";
            throw err;
        }
        const sb = new DummySourceBuffer({
            hasMediaElementErrored: () => {
                return this._callbacks.hasMediaElementErrored();
            },
            getMediaSourceDuration: () => {
                return this.duration;
            },
            getMediaSourceReadyState: () => {
                return this.readyState;
            },
            openMediaSource: () => {
                this.readyState = "open";
                this.eventScheduler.schedule(this, "sourceopen", null).catch(noop);
            },
            onBufferedUpdate: () => {
                this._callbacks.onBufferedUpdate();
            },
        });
        this.sourceBuffers.push(sb);
        this.sourceBuffers._onAddSourceBuffer();
        this.activeSourceBuffers.push(sb);
        this.activeSourceBuffers._onAddSourceBuffer();
        return sb;
    }
    removeSourceBuffer(sb) {
        if (!arrayIncludes(this.sourceBuffers, sb)) {
            const err = new Error("`removeSourceBuffer` called on an unknown SourceBuffer");
            err.name = "NotFoundError";
            throw err;
        }
        if (sb.updating) {
            sb.updating = false;
            if (sb instanceof DummySourceBuffer) {
                if (sb.currentAppendCanceller !== null) {
                    sb.currentAppendCanceller.cancel();
                    sb.currentAppendCanceller = null;
                    sb.eventScheduler
                        .schedule(sb, "abort", null)
                        .then(() => sb.eventScheduler.schedule(sb, "updateend", null))
                        .catch(noop);
                }
                sb.canceller.cancel();
                sb.removed = true;
            }
        }
        if (sb instanceof DummySourceBuffer) {
            const indexOfActive = this.activeSourceBuffers.indexOf(sb);
            if (indexOfActive >= 0) {
                this.activeSourceBuffers.splice(indexOfActive, 1);
                this.activeSourceBuffers._onRemoveSourceBuffer();
            }
            const index = this.sourceBuffers.indexOf(sb);
            if (index >= 0) {
                this.sourceBuffers.splice(index, 1);
                this.sourceBuffers._onRemoveSourceBuffer();
            }
        }
    }
    destroy() {
        this.readyState = "closed";
        this._duration = NaN;
        this.activeSourceBuffers.forEach((sb) => this.removeSourceBuffer(sb));
        this.sourceBuffers.forEach((sb) => this.removeSourceBuffer(sb));
        this.destroyed = true;
        this.eventScheduler.schedule(this, "sourceclose", null).catch(noop);
    }
    endOfStream() {
        if (this.readyState !== "open") {
            const err = new Error("`endOfStream` called on a non-open DummyMediaSource");
            err.name = "InvalidStateError";
            throw err;
        }
        if (this.sourceBuffers.some((s) => s.updating)) {
            const err = new Error("`endOfStream` called on an updating DummyMediaSource");
            err.name = "InvalidStateError";
            throw err;
        }
        const end = this.sourceBuffers.reduce((acc, sb) => {
            if (sb.buffered.length === 0) {
                return acc;
            }
            const lastPos = sb.buffered.end(sb.buffered.length - 1);
            return Math.max(lastPos, acc);
        }, 0);
        this.duration = end;
        this.readyState = "ended";
        this.eventScheduler.schedule(this, "sourceended", null).catch(noop);
    }
    updateCallbacks(cb) {
        this._callbacks = cb;
    }
    setLiveSeekableRange(start, end) {
        if (this.readyState !== "open") {
            const err = new Error("`setLiveSeekableRange` called on a non-open DummyMediaSource");
            err.name = "InvalidStateError";
            throw err;
        }
        if (start < 0 || start > end) {
            const err = new Error("Invalid arguments given to `setLiveSeekableRange`");
            err.name = "InvalidStateError";
            throw err;
        }
        this.liveSeekableRange = new TimeRangesWithMetadata();
        this.liveSeekableRange.insert(start, end, null);
    }
    clearLiveSeekableRange() {
        if (this.readyState !== "open") {
            const err = new Error("`setLiveSeekableRange` called on a non-open DummyMediaSource");
            err.name = "InvalidStateError";
            throw err;
        }
        this.liveSeekableRange = new TimeRangesWithMetadata();
    }
}
/**
 * Re-implementation of the MSE `SourceBuffer` Object.
 * @class DummySourceBuffer
 */
export class DummySourceBuffer extends EventEmitter {
    /**
     * @param {Object} callbacks
     */
    constructor(callbacks) {
        super();
        this.updating = false;
        this.removed = false;
        this.BUFFER_FULL = false;
        this.onupdatestart = null;
        this.onupdate = null;
        this.onupdateend = null;
        this.onerror = null;
        this.onabort = null;
        this.hasMetadata = false;
        this.canceller = new TaskCanceller();
        this.currentAppendCanceller = null;
        this._lastKeyId = null;
        this._callbacks = callbacks;
        this._buffered = new TimeRangesWithMetadata();
        this._appendWindowStart = 0;
        this._appendWindowEnd = Infinity;
        this._timestampOffset = 0;
        this._isRemoving = false;
        this._lastInitTimescale = null;
        this.eventScheduler = new EventScheduler();
    }
    /**
     * Implements `SourceBuffer.prototype.mode` from MSE.
     */
    set mode(mode) {
        this._checkProp("mode", true);
        if (mode === "sequence") {
            throw new Error("Trying to update mode of DummySourceBuffer");
        }
    }
    get mode() {
        return "dummy";
    }
    /**
     * Implements `SourceBuffer.prototype.timestampOffset` from MSE.
     */
    set timestampOffset(timestampOffset) {
        this._checkProp("timestampOffset", true);
        this._timestampOffset = timestampOffset;
    }
    get timestampOffset() {
        return this._timestampOffset;
    }
    /**
     * Implements `SourceBuffer.prototype.appendWindowStart` from MSE.
     */
    set appendWindowStart(appendWindowStart) {
        this._checkProp("appendWindowStart", false);
        if (appendWindowStart < 0 || appendWindowStart >= this._appendWindowEnd) {
            const err = new TypeError("Invalid `appendWindowStart` set");
            throw err;
        }
        this._appendWindowStart = appendWindowStart;
    }
    get appendWindowStart() {
        return this._appendWindowStart;
    }
    /**
     * Implements `SourceBuffer.prototype.appendWindowEnd` from MSE.
     */
    set appendWindowEnd(appendWindowEnd) {
        this._checkProp("appendWindowEnd", false);
        if (isNaN(appendWindowEnd) || appendWindowEnd <= this._appendWindowStart) {
            const err = new TypeError("Invalid `appendWindowStart` set");
            throw err;
        }
        this._appendWindowEnd = appendWindowEnd;
    }
    get appendWindowEnd() {
        return this._appendWindowEnd;
    }
    /**
     * Implements `SourceBuffer.prototype.buffered` from MSE.
     */
    get buffered() {
        if (this.removed) {
            const err = new Error("buffered updated on a removed DummySourceBuffer");
            err.name = "InvalidStateError";
            throw err;
        }
        return this._buffered;
    }
    /**
     * Implements `SourceBuffer.prototype.appendBuffer` from MSE.
     * @param {BufferSource} data
     */
    appendBuffer(data) {
        if (this.removed) {
            const err = new Error("`appendBuffer` called on a removed DummySourceBuffer");
            err.name = "InvalidStateError";
            throw err;
        }
        if (this.updating) {
            const err = new Error("`appendBuffer` called on an updating DummySourceBuffer");
            err.name = "InvalidStateError";
            throw err;
        }
        if (this._callbacks.hasMediaElementErrored()) {
            const err = new Error("`appendBuffer` called on an errored HTMLMediaElement");
            err.name = "InvalidStateError";
            throw err;
        }
        if (this._callbacks.getMediaSourceReadyState() === "ended") {
            this._callbacks.openMediaSource();
        }
        if (this.BUFFER_FULL) {
            const err = new Error("`appendBuffer` called on a full DummySourceBuffer");
            err.name = "QuotaExceededError";
            throw err;
        }
        this.updating = true;
        const canceller = new TaskCanceller();
        canceller.linkToSignal(this.canceller.signal);
        this.currentAppendCanceller = canceller;
        this.eventScheduler
            .schedule(this, "updatestart", canceller.signal)
            .then(() => {
            var _a, _b;
            let u8data;
            if (data instanceof Uint8Array) {
                u8data = data;
            }
            else if (data instanceof ArrayBuffer) {
                u8data = new Uint8Array(data);
            }
            else {
                u8data = new Uint8Array(data.buffer);
            }
            const segmentRanges = [];
            const [initSegment, otherChunks] = extractInitSegment(u8data);
            let keyId = this._lastKeyId;
            if (initSegment !== null) {
                keyId = getKeyIdFromInitSegment(initSegment);
            }
            this._lastKeyId = keyId;
            const completeChunks = otherChunks === null ? [] : ((_a = extractCompleteChunks(otherChunks)[0]) !== null && _a !== void 0 ? _a : []);
            const chunks = initSegment === null ? completeChunks : [initSegment, ...completeChunks];
            for (const chunk of chunks) {
                const moovIndex = findCompleteBox(chunk, 0x6d6f6f76);
                if (moovIndex >= 0) {
                    this._lastInitTimescale = (_b = getMDHDTimescale(chunk)) !== null && _b !== void 0 ? _b : null;
                }
                else {
                    const trackFragmentDecodeTime = getTrackFragmentDecodeTime(chunk);
                    let trunDuration = getDurationFromTrun(chunk);
                    if (trackFragmentDecodeTime !== undefined &&
                        trunDuration !== undefined &&
                        this._lastInitTimescale !== null) {
                        let startTime = this._timestampOffset + trackFragmentDecodeTime / this._lastInitTimescale;
                        trunDuration = trunDuration / this._lastInitTimescale;
                        if (startTime < 0) {
                            if (trunDuration !== undefined) {
                                trunDuration += startTime; // remove from duration what comes before `0`
                            }
                            startTime = 0;
                        }
                        segmentRanges.push({ start: startTime, end: startTime + trunDuration });
                    }
                }
            }
            for (const { start, end } of segmentRanges) {
                this.buffered.insert(start, end, {
                    keyIds: keyId !== null ? [bytesToHex(keyId)] : null,
                });
            }
            this._callbacks.onBufferedUpdate();
            this.updating = false;
            this.hasMetadata = true;
            return this.eventScheduler.schedule(this, "update", canceller.signal);
        })
            .then(() => this.eventScheduler.schedule(this, "updateend", canceller.signal))
            .then(() => {
            this.currentAppendCanceller = null;
        })
            .catch(() => {
            this.currentAppendCanceller = null;
        });
    }
    /**
     * Implements `SourceBuffer.prototype.remove` from MSE.
     * @param {number} start
     * @param {number} end
     */
    remove(start, end) {
        if (this.removed) {
            const err = new Error("`remove` called on a removed DummySourceBuffer");
            err.name = "InvalidStateError";
            throw err;
        }
        if (this.updating) {
            const err = new Error("`remove` called on an updating DummySourceBuffer");
            err.name = "InvalidStateError";
            throw err;
        }
        const duration = this._callbacks.getMediaSourceDuration();
        if (isNaN(duration)) {
            const err = new TypeError("Cannot remove data from DummySourceBuffer: NaN duration");
            throw err;
        }
        if (start < 0 || start > duration) {
            throw new TypeError("Invalid start given to `remove`");
        }
        if (isNaN(end) || start > end) {
            throw new TypeError("Invalid arguments given to `remove`");
        }
        if (this._callbacks.getMediaSourceReadyState() === "ended") {
            this._callbacks.openMediaSource();
        }
        this.updating = true;
        this._isRemoving = true;
        this.eventScheduler
            .schedule(this, "updatestart", this.canceller.signal)
            .then(() => {
            this.buffered.remove(start, end);
            this._callbacks.onBufferedUpdate();
            this.updating = false;
            this._isRemoving = false;
            return this.eventScheduler.schedule(this, "update", this.canceller.signal);
        })
            .then(() => this.eventScheduler.schedule(this, "updateend", this.canceller.signal))
            .catch(noop);
    }
    /**
     * Implements `SourceBuffer.prototype.abort` from MSE.
     */
    abort() {
        var _a;
        if (this.removed) {
            const err = new Error("`abort` called on a removed DummySourceBuffer");
            err.name = "InvalidStateError";
            throw err;
        }
        if (this._isRemoving) {
            const err = new Error("`abort` called as a DummySourceBuffer is removing");
            err.name = "InvalidStateError";
            throw err;
        }
        if (this.updating) {
            (_a = this.currentAppendCanceller) === null || _a === void 0 ? void 0 : _a.cancel();
            this.currentAppendCanceller = null;
            this.updating = false;
            this.eventScheduler
                .schedule(this, "abort", this.canceller.signal)
                .then(() => this.eventScheduler.schedule(this, "updateend", this.canceller.signal))
                .catch(noop);
        }
        this._lastInitTimescale = null;
        this.appendWindowStart = 0;
        this.appendWindowEnd = Infinity;
    }
    /**
     * Implements `SourceBuffer.prototype.abort` from MSE.
     * @param {string} givenType
     */
    changeType(givenType) {
        const type = String(givenType);
        if (type === "") {
            throw new TypeError("`changeType` error: empty string");
        }
        if (this.removed) {
            const err = new Error("`changeType` called on a removed DummySourceBuffer");
            err.name = "InvalidStateError";
            throw err;
        }
        if (this.updating) {
            const err = new Error("`changeType` called on an updating DummySourceBuffer");
            err.name = "InvalidStateError";
            throw err;
        }
        if (this._callbacks.getMediaSourceReadyState() === "ended") {
            this._callbacks.openMediaSource();
        }
    }
    /**
     * Allows to trigger the common steps when updating a `SourceBuffer`'s
     * property.
     * @param {string} propName - The MSE name of the property you want to update.
     * @param {boolean} openMediaSource - If `true`, this property update should
     * lead to the parent `MediaSource` being open.
     */
    _checkProp(propName, openMediaSource) {
        if (this.removed) {
            const err = new Error(`${propName} updated on a removed DummySourceBuffer`);
            err.name = "InvalidStateError";
            throw err;
        }
        if (this.updating) {
            const err = new Error(`${propName} updated on an updating DummySourceBuffer`);
            err.name = "InvalidStateError";
            throw err;
        }
        if (openMediaSource) {
            if (this._callbacks.getMediaSourceReadyState() === "ended") {
                this._callbacks.openMediaSource();
            }
        }
    }
}
/**
 * Allows to create a `IDummySourceBufferList` instance, which is a
 * Re-implementation in-JS of a MSE `SourceBufferList`
 * @returns {Object}
 */
function createDummySourceBufferList() {
    const list = [];
    const eventEmitter = new EventEmitter();
    list.onaddsourcebuffer = null;
    list.onremovesourcebuffer = null;
    list.addEventListener = eventEmitter.addEventListener.bind(eventEmitter);
    list.removeEventListener = eventEmitter.removeEventListener.bind(eventEmitter);
    list._onAddSourceBuffer = function addSourceBuffer() {
        const evt = new Event("addsourcebuffer");
        setTimeout(() => {
            if (typeof this.onaddsourcebuffer === "function") {
                try {
                    this.onaddsourcebuffer(evt);
                }
                catch (_) {
                    // we don't care
                }
            }
        }, 0);
        setTimeout(() => {
            /* eslint-disable-next-line */
            eventEmitter.trigger("addsourcebuffer", evt);
        }, 0);
    };
    list._onRemoveSourceBuffer = function removeSourceBuffer() {
        const evt = new Event("removesourcebuffer");
        setTimeout(() => {
            if (typeof this.onremovesourcebuffer === "function") {
                try {
                    this.onremovesourcebuffer(evt);
                }
                catch (_) {
                    // we don't care
                }
            }
        }, 0);
        setTimeout(() => {
            /* eslint-disable-next-line */
            eventEmitter.trigger("removesourcebuffer", evt);
        }, 0);
    };
    return list;
}
// NOTE: The following commented code would allow to define a format to save
// performed operations on `DummySourceBuffer` objects.
// This idea has been abandonned for now.
// export interface IStoredMediaSourceInfo {
//   sourceBuffers: IStoredSourceBufferInfo[];
// }
// export const enum SourceBufferOperation {
//   Append = 0,
//   Remove,
// }
//
// export interface ISourceBufferAppendOperation {
//   type: SourceBufferOperation.Append;
//   segment: BufferSource;
//   timestampOffset: number;
//   appendWindowStart: number;
//   appendWindowEnd: number;
//   mimeType: string;
// }
// export interface ISourceBufferRemoveOperation {
//   type: SourceBufferOperation.Remove;
//   start: number;
//   end: number;
// }
// export type ISourceBufferOperation =
//   | ISourceBufferRemoveOperation
//   | ISourceBufferAppendOperation;
// export interface IStoredSourceBufferInfo {
//   type: string;
//   operations: ISourceBufferOperation[];
// }
