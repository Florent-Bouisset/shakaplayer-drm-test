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
exports.DummySourceBuffer = exports.DummyMediaSource = void 0;
var isobmff_1 = require("../../../parsers/containers/isobmff");
var utils_1 = require("../../../parsers/containers/isobmff/utils");
var array_includes_1 = require("../../../utils/array_includes");
var event_emitter_1 = require("../../../utils/event_emitter");
var noop_1 = require("../../../utils/noop");
var starts_with_1 = require("../../../utils/starts_with");
var string_parsing_1 = require("../../../utils/string_parsing");
var task_canceller_1 = require("../../../utils/task_canceller");
var utils_2 = require("./utils");
/**
 * Re-implementation of the MSE `MediaSource` Object.
 * @class DummyMediaSource
 */
var DummyMediaSource = /** @class */ (function (_super) {
    __extends(DummyMediaSource, _super);
    function DummyMediaSource() {
        var _this = _super.call(this) || this;
        _this.isDummy = true;
        _this.sourceBuffers = createDummySourceBufferList();
        _this.activeSourceBuffers = createDummySourceBufferList();
        _this.readyState = "closed";
        _this.handle = _this;
        _this.onsourceopen = null;
        _this.onsourceended = null;
        _this.onsourceclose = null;
        _this.destroyed = false;
        _this._callbacks = {
            hasMediaElementErrored: function () { return false; },
            onBufferedUpdate: noop_1.default,
            updateMediaElementDuration: noop_1.default,
        };
        _this._duration = NaN;
        _this.liveSeekableRange = new utils_2.default();
        _this.eventScheduler = new utils_2.EventScheduler();
        return _this;
    }
    DummyMediaSource.isTypeSupported = function (mimeType) {
        return (0, starts_with_1.default)(mimeType, "audio/mp4") || (0, starts_with_1.default)(mimeType, "video/mp4");
    };
    Object.defineProperty(DummyMediaSource.prototype, "duration", {
        get: function () {
            if (this.readyState === "closed") {
                return NaN;
            }
            return this._duration;
        },
        set: function (givenDuration) {
            var duration = Number(givenDuration);
            if (isNaN(duration) || duration < 0) {
                throw new TypeError("Invalid duration");
            }
            if (this.readyState !== "open") {
                var err = new Error("`duration` updated on a non-open DummyMediaSource");
                err.name = "InvalidStateError";
                throw err;
            }
            if (this.sourceBuffers.some(function (s) { return s.updating; })) {
                var err = new Error("`duration` updated on an updating DummyMediaSource");
                err.name = "InvalidStateError";
                throw err;
            }
            if (duration === this.duration) {
                return;
            }
            var highestBuffered = this.sourceBuffers.reduce(function (acc, sb) {
                if (sb.buffered.length === 0) {
                    return acc;
                }
                return Math.max(sb.buffered.end(sb.buffered.length - 1), acc);
            }, 0);
            if (duration < highestBuffered) {
                var err = new Error("`duration` update lower than latest buffered coded frame");
                err.name = "InvalidStateError";
                throw err;
            }
            this._duration = duration;
            this._callbacks.updateMediaElementDuration(duration);
        },
        enumerable: false,
        configurable: true
    });
    DummyMediaSource.prototype.addSourceBuffer = function (givenType) {
        var _this = this;
        var type = String(givenType);
        if (type === "") {
            throw new TypeError("`addSourceBuffer` error: empty string");
        }
        if (this.readyState !== "open") {
            var err = new Error("`addSourceBuffer` called on a non-open DummyMediaSource");
            err.name = "InvalidStateError";
            throw err;
        }
        var sb = new DummySourceBuffer({
            hasMediaElementErrored: function () {
                return _this._callbacks.hasMediaElementErrored();
            },
            getMediaSourceDuration: function () {
                return _this.duration;
            },
            getMediaSourceReadyState: function () {
                return _this.readyState;
            },
            openMediaSource: function () {
                _this.readyState = "open";
                _this.eventScheduler.schedule(_this, "sourceopen", null).catch(noop_1.default);
            },
            onBufferedUpdate: function () {
                _this._callbacks.onBufferedUpdate();
            },
        });
        this.sourceBuffers.push(sb);
        this.sourceBuffers._onAddSourceBuffer();
        this.activeSourceBuffers.push(sb);
        this.activeSourceBuffers._onAddSourceBuffer();
        return sb;
    };
    DummyMediaSource.prototype.removeSourceBuffer = function (sb) {
        if (!(0, array_includes_1.default)(this.sourceBuffers, sb)) {
            var err = new Error("`removeSourceBuffer` called on an unknown SourceBuffer");
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
                        .then(function () { return sb.eventScheduler.schedule(sb, "updateend", null); })
                        .catch(noop_1.default);
                }
                sb.canceller.cancel();
                sb.removed = true;
            }
        }
        if (sb instanceof DummySourceBuffer) {
            var indexOfActive = this.activeSourceBuffers.indexOf(sb);
            if (indexOfActive >= 0) {
                this.activeSourceBuffers.splice(indexOfActive, 1);
                this.activeSourceBuffers._onRemoveSourceBuffer();
            }
            var index = this.sourceBuffers.indexOf(sb);
            if (index >= 0) {
                this.sourceBuffers.splice(index, 1);
                this.sourceBuffers._onRemoveSourceBuffer();
            }
        }
    };
    DummyMediaSource.prototype.destroy = function () {
        var _this = this;
        this.readyState = "closed";
        this._duration = NaN;
        this.activeSourceBuffers.forEach(function (sb) { return _this.removeSourceBuffer(sb); });
        this.sourceBuffers.forEach(function (sb) { return _this.removeSourceBuffer(sb); });
        this.destroyed = true;
        this.eventScheduler.schedule(this, "sourceclose", null).catch(noop_1.default);
    };
    DummyMediaSource.prototype.endOfStream = function () {
        if (this.readyState !== "open") {
            var err = new Error("`endOfStream` called on a non-open DummyMediaSource");
            err.name = "InvalidStateError";
            throw err;
        }
        if (this.sourceBuffers.some(function (s) { return s.updating; })) {
            var err = new Error("`endOfStream` called on an updating DummyMediaSource");
            err.name = "InvalidStateError";
            throw err;
        }
        var end = this.sourceBuffers.reduce(function (acc, sb) {
            if (sb.buffered.length === 0) {
                return acc;
            }
            var lastPos = sb.buffered.end(sb.buffered.length - 1);
            return Math.max(lastPos, acc);
        }, 0);
        this.duration = end;
        this.readyState = "ended";
        this.eventScheduler.schedule(this, "sourceended", null).catch(noop_1.default);
    };
    DummyMediaSource.prototype.updateCallbacks = function (cb) {
        this._callbacks = cb;
    };
    DummyMediaSource.prototype.setLiveSeekableRange = function (start, end) {
        if (this.readyState !== "open") {
            var err = new Error("`setLiveSeekableRange` called on a non-open DummyMediaSource");
            err.name = "InvalidStateError";
            throw err;
        }
        if (start < 0 || start > end) {
            var err = new Error("Invalid arguments given to `setLiveSeekableRange`");
            err.name = "InvalidStateError";
            throw err;
        }
        this.liveSeekableRange = new utils_2.default();
        this.liveSeekableRange.insert(start, end, null);
    };
    DummyMediaSource.prototype.clearLiveSeekableRange = function () {
        if (this.readyState !== "open") {
            var err = new Error("`setLiveSeekableRange` called on a non-open DummyMediaSource");
            err.name = "InvalidStateError";
            throw err;
        }
        this.liveSeekableRange = new utils_2.default();
    };
    return DummyMediaSource;
}(event_emitter_1.default));
exports.DummyMediaSource = DummyMediaSource;
/**
 * Re-implementation of the MSE `SourceBuffer` Object.
 * @class DummySourceBuffer
 */
var DummySourceBuffer = /** @class */ (function (_super) {
    __extends(DummySourceBuffer, _super);
    /**
     * @param {Object} callbacks
     */
    function DummySourceBuffer(callbacks) {
        var _this = _super.call(this) || this;
        _this.updating = false;
        _this.removed = false;
        _this.BUFFER_FULL = false;
        _this.onupdatestart = null;
        _this.onupdate = null;
        _this.onupdateend = null;
        _this.onerror = null;
        _this.onabort = null;
        _this.hasMetadata = false;
        _this.canceller = new task_canceller_1.default();
        _this.currentAppendCanceller = null;
        _this._lastKeyId = null;
        _this._callbacks = callbacks;
        _this._buffered = new utils_2.default();
        _this._appendWindowStart = 0;
        _this._appendWindowEnd = Infinity;
        _this._timestampOffset = 0;
        _this._isRemoving = false;
        _this._lastInitTimescale = null;
        _this.eventScheduler = new utils_2.EventScheduler();
        return _this;
    }
    Object.defineProperty(DummySourceBuffer.prototype, "mode", {
        get: function () {
            return "dummy";
        },
        /**
         * Implements `SourceBuffer.prototype.mode` from MSE.
         */
        set: function (mode) {
            this._checkProp("mode", true);
            if (mode === "sequence") {
                throw new Error("Trying to update mode of DummySourceBuffer");
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DummySourceBuffer.prototype, "timestampOffset", {
        get: function () {
            return this._timestampOffset;
        },
        /**
         * Implements `SourceBuffer.prototype.timestampOffset` from MSE.
         */
        set: function (timestampOffset) {
            this._checkProp("timestampOffset", true);
            this._timestampOffset = timestampOffset;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DummySourceBuffer.prototype, "appendWindowStart", {
        get: function () {
            return this._appendWindowStart;
        },
        /**
         * Implements `SourceBuffer.prototype.appendWindowStart` from MSE.
         */
        set: function (appendWindowStart) {
            this._checkProp("appendWindowStart", false);
            if (appendWindowStart < 0 || appendWindowStart >= this._appendWindowEnd) {
                var err = new TypeError("Invalid `appendWindowStart` set");
                throw err;
            }
            this._appendWindowStart = appendWindowStart;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DummySourceBuffer.prototype, "appendWindowEnd", {
        get: function () {
            return this._appendWindowEnd;
        },
        /**
         * Implements `SourceBuffer.prototype.appendWindowEnd` from MSE.
         */
        set: function (appendWindowEnd) {
            this._checkProp("appendWindowEnd", false);
            if (isNaN(appendWindowEnd) || appendWindowEnd <= this._appendWindowStart) {
                var err = new TypeError("Invalid `appendWindowStart` set");
                throw err;
            }
            this._appendWindowEnd = appendWindowEnd;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DummySourceBuffer.prototype, "buffered", {
        /**
         * Implements `SourceBuffer.prototype.buffered` from MSE.
         */
        get: function () {
            if (this.removed) {
                var err = new Error("buffered updated on a removed DummySourceBuffer");
                err.name = "InvalidStateError";
                throw err;
            }
            return this._buffered;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Implements `SourceBuffer.prototype.appendBuffer` from MSE.
     * @param {BufferSource} data
     */
    DummySourceBuffer.prototype.appendBuffer = function (data) {
        var _this = this;
        if (this.removed) {
            var err = new Error("`appendBuffer` called on a removed DummySourceBuffer");
            err.name = "InvalidStateError";
            throw err;
        }
        if (this.updating) {
            var err = new Error("`appendBuffer` called on an updating DummySourceBuffer");
            err.name = "InvalidStateError";
            throw err;
        }
        if (this._callbacks.hasMediaElementErrored()) {
            var err = new Error("`appendBuffer` called on an errored HTMLMediaElement");
            err.name = "InvalidStateError";
            throw err;
        }
        if (this._callbacks.getMediaSourceReadyState() === "ended") {
            this._callbacks.openMediaSource();
        }
        if (this.BUFFER_FULL) {
            var err = new Error("`appendBuffer` called on a full DummySourceBuffer");
            err.name = "QuotaExceededError";
            throw err;
        }
        this.updating = true;
        var canceller = new task_canceller_1.default();
        canceller.linkToSignal(this.canceller.signal);
        this.currentAppendCanceller = canceller;
        this.eventScheduler
            .schedule(this, "updatestart", canceller.signal)
            .then(function () {
            var e_1, _a, e_2, _b;
            var _c, _d;
            var u8data;
            if (data instanceof Uint8Array) {
                u8data = data;
            }
            else if (data instanceof ArrayBuffer) {
                u8data = new Uint8Array(data);
            }
            else {
                u8data = new Uint8Array(data.buffer);
            }
            var segmentRanges = [];
            var _e = __read((0, isobmff_1.extractInitSegment)(u8data), 2), initSegment = _e[0], otherChunks = _e[1];
            var keyId = _this._lastKeyId;
            if (initSegment !== null) {
                keyId = (0, utils_1.getKeyIdFromInitSegment)(initSegment);
            }
            _this._lastKeyId = keyId;
            var completeChunks = otherChunks === null ? [] : ((_c = (0, isobmff_1.extractCompleteChunks)(otherChunks)[0]) !== null && _c !== void 0 ? _c : []);
            var chunks = initSegment === null ? completeChunks : __spreadArray([initSegment], __read(completeChunks), false);
            try {
                for (var chunks_1 = __values(chunks), chunks_1_1 = chunks_1.next(); !chunks_1_1.done; chunks_1_1 = chunks_1.next()) {
                    var chunk = chunks_1_1.value;
                    var moovIndex = (0, isobmff_1.findCompleteBox)(chunk, 0x6d6f6f76);
                    if (moovIndex >= 0) {
                        _this._lastInitTimescale = (_d = (0, isobmff_1.getMDHDTimescale)(chunk)) !== null && _d !== void 0 ? _d : null;
                    }
                    else {
                        var trackFragmentDecodeTime = (0, isobmff_1.getTrackFragmentDecodeTime)(chunk);
                        var trunDuration = (0, isobmff_1.getDurationFromTrun)(chunk);
                        if (trackFragmentDecodeTime !== undefined &&
                            trunDuration !== undefined &&
                            _this._lastInitTimescale !== null) {
                            var startTime = _this._timestampOffset + trackFragmentDecodeTime / _this._lastInitTimescale;
                            trunDuration = trunDuration / _this._lastInitTimescale;
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
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (chunks_1_1 && !chunks_1_1.done && (_a = chunks_1.return)) _a.call(chunks_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            try {
                for (var segmentRanges_1 = __values(segmentRanges), segmentRanges_1_1 = segmentRanges_1.next(); !segmentRanges_1_1.done; segmentRanges_1_1 = segmentRanges_1.next()) {
                    var _f = segmentRanges_1_1.value, start = _f.start, end = _f.end;
                    _this.buffered.insert(start, end, {
                        keyIds: keyId !== null ? [(0, string_parsing_1.bytesToHex)(keyId)] : null,
                    });
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (segmentRanges_1_1 && !segmentRanges_1_1.done && (_b = segmentRanges_1.return)) _b.call(segmentRanges_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            _this._callbacks.onBufferedUpdate();
            _this.updating = false;
            _this.hasMetadata = true;
            return _this.eventScheduler.schedule(_this, "update", canceller.signal);
        })
            .then(function () { return _this.eventScheduler.schedule(_this, "updateend", canceller.signal); })
            .then(function () {
            _this.currentAppendCanceller = null;
        })
            .catch(function () {
            _this.currentAppendCanceller = null;
        });
    };
    /**
     * Implements `SourceBuffer.prototype.remove` from MSE.
     * @param {number} start
     * @param {number} end
     */
    DummySourceBuffer.prototype.remove = function (start, end) {
        var _this = this;
        if (this.removed) {
            var err = new Error("`remove` called on a removed DummySourceBuffer");
            err.name = "InvalidStateError";
            throw err;
        }
        if (this.updating) {
            var err = new Error("`remove` called on an updating DummySourceBuffer");
            err.name = "InvalidStateError";
            throw err;
        }
        var duration = this._callbacks.getMediaSourceDuration();
        if (isNaN(duration)) {
            var err = new TypeError("Cannot remove data from DummySourceBuffer: NaN duration");
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
            .then(function () {
            _this.buffered.remove(start, end);
            _this._callbacks.onBufferedUpdate();
            _this.updating = false;
            _this._isRemoving = false;
            return _this.eventScheduler.schedule(_this, "update", _this.canceller.signal);
        })
            .then(function () { return _this.eventScheduler.schedule(_this, "updateend", _this.canceller.signal); })
            .catch(noop_1.default);
    };
    /**
     * Implements `SourceBuffer.prototype.abort` from MSE.
     */
    DummySourceBuffer.prototype.abort = function () {
        var _this = this;
        var _a;
        if (this.removed) {
            var err = new Error("`abort` called on a removed DummySourceBuffer");
            err.name = "InvalidStateError";
            throw err;
        }
        if (this._isRemoving) {
            var err = new Error("`abort` called as a DummySourceBuffer is removing");
            err.name = "InvalidStateError";
            throw err;
        }
        if (this.updating) {
            (_a = this.currentAppendCanceller) === null || _a === void 0 ? void 0 : _a.cancel();
            this.currentAppendCanceller = null;
            this.updating = false;
            this.eventScheduler
                .schedule(this, "abort", this.canceller.signal)
                .then(function () {
                return _this.eventScheduler.schedule(_this, "updateend", _this.canceller.signal);
            })
                .catch(noop_1.default);
        }
        this._lastInitTimescale = null;
        this.appendWindowStart = 0;
        this.appendWindowEnd = Infinity;
    };
    /**
     * Implements `SourceBuffer.prototype.abort` from MSE.
     * @param {string} givenType
     */
    DummySourceBuffer.prototype.changeType = function (givenType) {
        var type = String(givenType);
        if (type === "") {
            throw new TypeError("`changeType` error: empty string");
        }
        if (this.removed) {
            var err = new Error("`changeType` called on a removed DummySourceBuffer");
            err.name = "InvalidStateError";
            throw err;
        }
        if (this.updating) {
            var err = new Error("`changeType` called on an updating DummySourceBuffer");
            err.name = "InvalidStateError";
            throw err;
        }
        if (this._callbacks.getMediaSourceReadyState() === "ended") {
            this._callbacks.openMediaSource();
        }
    };
    /**
     * Allows to trigger the common steps when updating a `SourceBuffer`'s
     * property.
     * @param {string} propName - The MSE name of the property you want to update.
     * @param {boolean} openMediaSource - If `true`, this property update should
     * lead to the parent `MediaSource` being open.
     */
    DummySourceBuffer.prototype._checkProp = function (propName, openMediaSource) {
        if (this.removed) {
            var err = new Error("".concat(propName, " updated on a removed DummySourceBuffer"));
            err.name = "InvalidStateError";
            throw err;
        }
        if (this.updating) {
            var err = new Error("".concat(propName, " updated on an updating DummySourceBuffer"));
            err.name = "InvalidStateError";
            throw err;
        }
        if (openMediaSource) {
            if (this._callbacks.getMediaSourceReadyState() === "ended") {
                this._callbacks.openMediaSource();
            }
        }
    };
    return DummySourceBuffer;
}(event_emitter_1.default));
exports.DummySourceBuffer = DummySourceBuffer;
/**
 * Allows to create a `IDummySourceBufferList` instance, which is a
 * Re-implementation in-JS of a MSE `SourceBufferList`
 * @returns {Object}
 */
function createDummySourceBufferList() {
    var list = [];
    var eventEmitter = new event_emitter_1.default();
    list.onaddsourcebuffer = null;
    list.onremovesourcebuffer = null;
    list.addEventListener = eventEmitter.addEventListener.bind(eventEmitter);
    list.removeEventListener = eventEmitter.removeEventListener.bind(eventEmitter);
    list._onAddSourceBuffer = function addSourceBuffer() {
        var _this = this;
        var evt = new Event("addsourcebuffer");
        setTimeout(function () {
            if (typeof _this.onaddsourcebuffer === "function") {
                try {
                    _this.onaddsourcebuffer(evt);
                }
                catch (_) {
                    // we don't care
                }
            }
        }, 0);
        setTimeout(function () {
            /* eslint-disable-next-line */
            eventEmitter.trigger("addsourcebuffer", evt);
        }, 0);
    };
    list._onRemoveSourceBuffer = function removeSourceBuffer() {
        var _this = this;
        var evt = new Event("removesourcebuffer");
        setTimeout(function () {
            if (typeof _this.onremovesourcebuffer === "function") {
                try {
                    _this.onremovesourcebuffer(evt);
                }
                catch (_) {
                    // we don't care
                }
            }
        }, 0);
        setTimeout(function () {
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
