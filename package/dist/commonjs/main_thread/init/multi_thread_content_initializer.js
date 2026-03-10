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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
var eme_1 = require("../../compat/eme");
var may_media_element_fail_on_undecipherable_data_1 = require("../../compat/may_media_element_fail_on_undecipherable_data");
var should_reload_media_source_on_decipherability_update_1 = require("../../compat/should_reload_media_source_on_decipherability_update");
var errors_1 = require("../../errors");
var features_1 = require("../../features");
var log_1 = require("../../log");
var manifest_1 = require("../../manifest");
var main_media_source_interface_1 = require("../../mse/main_media_source_interface");
var array_find_1 = require("../../utils/array_find");
var assert_1 = require("../../utils/assert");
var id_generator_1 = require("../../utils/id_generator");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var object_assign_1 = require("../../utils/object_assign");
var reference_1 = require("../../utils/reference");
var request_1 = require("../../utils/request");
var task_canceller_1 = require("../../utils/task_canceller");
var decrypt_1 = require("../decrypt");
var send_message_1 = require("./send_message");
var types_1 = require("./types");
var create_core_playback_observer_1 = require("./utils/create_core_playback_observer");
var create_media_source_1 = require("./utils/create_media_source");
var get_initial_time_1 = require("./utils/get_initial_time");
var get_loaded_reference_1 = require("./utils/get_loaded_reference");
var initial_seek_and_play_1 = require("./utils/initial_seek_and_play");
var rebuffering_controller_1 = require("./utils/rebuffering_controller");
var stream_events_emitter_1 = require("./utils/stream_events_emitter/stream_events_emitter");
var throw_on_media_error_1 = require("./utils/throw_on_media_error");
var update_manifest_codec_support_1 = require("./utils/update_manifest_codec_support");
var generateContentId = (0, id_generator_1.default)();
/**
 * @class MultiThreadContentInitializer
 */
var MultiThreadContentInitializer = /** @class */ (function (_super) {
    __extends(MultiThreadContentInitializer, _super);
    /**
     * Create a new `MultiThreadContentInitializer`, associated to the given
     * settings.
     * @param {Object} settings
     */
    function MultiThreadContentInitializer(settings) {
        var _this = _super.call(this) || this;
        _this._settings = settings;
        _this._initCanceller = new task_canceller_1.default();
        _this._currentMediaSourceCanceller = new task_canceller_1.default();
        _this._currentMediaSourceCanceller.linkToSignal(_this._initCanceller.signal);
        _this._currentContentInfo = null;
        _this._awaitingRequests = {
            nextRequestId: 0,
            pendingSinkMetrics: new Map(),
            pendingThumbnailFetching: new Map(),
        };
        _this._queuedWorkerMessages = null;
        return _this;
    }
    /**
     * Perform non-destructive preparation steps, to prepare a future content.
     */
    MultiThreadContentInitializer.prototype.prepare = function () {
        var _this = this;
        var _a, _b;
        if (this._currentContentInfo !== null || this._initCanceller.isUsed()) {
            return;
        }
        var contentId = generateContentId();
        var _c = this._settings, adaptiveOptions = _c.adaptiveOptions, transportOptions = _c.transportOptions, useMseInWorker = _c.useMseInWorker, worker = _c.worker;
        var _d = this._settings.bufferOptions, wantedBufferAhead = _d.wantedBufferAhead, maxVideoBufferSize = _d.maxVideoBufferSize, maxBufferAhead = _d.maxBufferAhead, maxBufferBehind = _d.maxBufferBehind;
        var initialVideoBitrate = adaptiveOptions.initialBitrates.video;
        var initialAudioBitrate = adaptiveOptions.initialBitrates.audio;
        this._currentContentInfo = {
            contentId: contentId,
            contentDecryptor: null,
            manifest: null,
            mediaSourceInfo: null,
            rebufferingController: null,
            streamEventsEmitter: null,
            initialTime: undefined,
            autoPlay: undefined,
            initialPlayPerformed: null,
            useMseInWorker: useMseInWorker,
        };
        (0, send_message_1.default)(worker, {
            type: "prepare" /* MainThreadMessageType.PrepareContent */,
            value: {
                contentId: contentId,
                cmcd: this._settings.cmcd,
                enableRepresentationAvoidance: this._settings.enableRepresentationAvoidance,
                url: this._settings.url,
                hasText: this._hasTextBufferFeature(),
                transportOptions: transportOptions,
                initialVideoBitrate: initialVideoBitrate,
                initialAudioBitrate: initialAudioBitrate,
                manifestRetryOptions: __assign(__assign({}, this._settings.manifestRequestSettings), { lowLatencyMode: this._settings.lowLatencyMode }),
                segmentRetryOptions: this._settings.segmentRequestOptions,
                useMseInWorker: useMseInWorker,
            },
        });
        this._initCanceller.signal.register(function () {
            (0, send_message_1.default)(worker, {
                type: "stop" /* MainThreadMessageType.StopContent */,
                contentId: contentId,
                value: null,
            });
        });
        if (this._initCanceller.isUsed()) {
            return;
        }
        this._queuedWorkerMessages = [];
        log_1.default.debug("Init", "addEventListener prepare buffering worker messages");
        var onmessage = function (evt) {
            var msgData = evt.data;
            var type = msgData.type;
            switch (type) {
                case "log" /* WorkerMessageType.LogMessage */: {
                    var formatted = msgData.value.logs.map(function (l) {
                        switch (typeof l) {
                            case "string":
                            case "number":
                            case "boolean":
                            case "undefined":
                                return l;
                            case "object":
                                if (l === null) {
                                    return null;
                                }
                                return formatSentLogObject(l);
                            default:
                                (0, assert_1.assertUnreachable)(l);
                        }
                    });
                    switch (msgData.value.logLevel) {
                        case "NONE":
                            break;
                        case "ERROR":
                            log_1.default.error.apply(log_1.default, __spreadArray([msgData.value.namespace], __read(formatted), false));
                            break;
                        case "WARNING":
                            log_1.default.warn.apply(log_1.default, __spreadArray([msgData.value.namespace], __read(formatted), false));
                            break;
                        case "INFO":
                            log_1.default.info.apply(log_1.default, __spreadArray([msgData.value.namespace], __read(formatted), false));
                            break;
                        case "DEBUG":
                            log_1.default.debug.apply(log_1.default, __spreadArray([msgData.value.namespace], __read(formatted), false));
                            break;
                        default:
                            (0, assert_1.assertUnreachable)(msgData.value.logLevel);
                    }
                    break;
                }
                default:
                    if (_this._queuedWorkerMessages !== null) {
                        _this._queuedWorkerMessages.push(evt);
                    }
                    break;
            }
        };
        this._settings.worker.addEventListener("message", onmessage);
        var onmessageerror = function (_msg) {
            log_1.default.error("Init", "Error when receiving message from worker.");
        };
        this._settings.worker.addEventListener("messageerror", onmessageerror);
        this._initCanceller.signal.register(function () {
            log_1.default.debug("Init", "removeEventListener prepare for worker message");
            _this._settings.worker.removeEventListener("message", onmessage);
            _this._settings.worker.removeEventListener("messageerror", onmessageerror);
        });
        // Also bind all `SharedReference` objects:
        var throttleVideoBitrate = (_a = adaptiveOptions.throttlers.throttleBitrate.video) !== null && _a !== void 0 ? _a : new reference_1.default(Infinity);
        bindNumberReferencesToWorker(worker, this._initCanceller.signal, [wantedBufferAhead, "wantedBufferAhead"], [maxVideoBufferSize, "maxVideoBufferSize"], [maxBufferAhead, "maxBufferAhead"], [maxBufferBehind, "maxBufferBehind"], [throttleVideoBitrate, "throttleVideoBitrate"]);
        var limitVideoResolution = (_b = adaptiveOptions.throttlers.limitResolution.video) !== null && _b !== void 0 ? _b : new reference_1.default({
            height: undefined,
            width: undefined,
            pixelRatio: 1,
        });
        limitVideoResolution.onUpdate(function (newVal) {
            (0, send_message_1.default)(worker, {
                type: "ref-update" /* MainThreadMessageType.ReferenceUpdate */,
                value: { name: "limitVideoResolution", newVal: newVal },
            });
        }, { clearSignal: this._initCanceller.signal, emitCurrentValue: true });
    };
    /**
     * Update URL of the Manifest.
     * @param {Array.<string>|undefined} urls - URLs to reach that Manifest from
     * the most prioritized URL to the least prioritized URL.
     * @param {boolean} refreshNow - If `true` the resource in question (e.g.
     * DASH's MPD) will be refreshed immediately.
     */
    MultiThreadContentInitializer.prototype.updateContentUrls = function (urls, refreshNow) {
        if (this._currentContentInfo === null) {
            return;
        }
        (0, send_message_1.default)(this._settings.worker, {
            type: "urls-update" /* MainThreadMessageType.ContentUrlsUpdate */,
            contentId: this._currentContentInfo.contentId,
            value: { urls: urls, refreshNow: refreshNow },
        });
    };
    /**
     * @param {HTMLMediaElement} mediaElement
     * @param {Object} playbackObserver
     */
    MultiThreadContentInitializer.prototype.start = function (mediaElement, playbackObserver) {
        var e_1, _a;
        var _this = this;
        this.prepare(); // Load Manifest if not already done
        if (this._initCanceller.isUsed()) {
            return;
        }
        var textDisplayer = null;
        if (this._settings.textTrackOptions.textTrackMode === "html" &&
            features_1.default.htmlTextDisplayer !== null) {
            (0, assert_1.default)(this._hasTextBufferFeature());
            textDisplayer = new features_1.default.htmlTextDisplayer(mediaElement, this._settings.textTrackOptions.textTrackElement);
        }
        else if (features_1.default.nativeTextDisplayer !== null) {
            (0, assert_1.default)(this._hasTextBufferFeature());
            textDisplayer = new features_1.default.nativeTextDisplayer(mediaElement);
        }
        else {
            (0, assert_1.default)(!this._hasTextBufferFeature());
        }
        this._initCanceller.signal.register(function () {
            textDisplayer === null || textDisplayer === void 0 ? void 0 : textDisplayer.stop();
        });
        /** Translate errors coming from the media element into RxPlayer errors. */
        (0, throw_on_media_error_1.default)(mediaElement, function (error) { return _this._onFatalError(error); }, this._initCanceller.signal);
        /**
         * Send content protection initialization data.
         * TODO remove and use ContentDecryptor directly when possible.
         */
        var lastContentProtection = new reference_1.default(null);
        var mediaSourceStatus = new reference_1.default(0 /* MediaSourceInitializationStatus.Nothing */);
        var _b = this._initializeContentDecryption(mediaElement, lastContentProtection, mediaSourceStatus, function () { return notifyAndStartMediaSourceReload(0, undefined, undefined); }, this._initCanceller.signal), drmInitializationStatus = _b.statusRef, contentDecryptor = _b.contentDecryptor;
        var contentInfo = this._currentContentInfo;
        if (contentInfo !== null) {
            contentInfo.contentDecryptor = contentDecryptor;
        }
        var playbackStartParams = {
            mediaElement: mediaElement,
            textDisplayer: textDisplayer,
            playbackObserver: playbackObserver,
            drmInitializationStatus: drmInitializationStatus,
            mediaSourceStatus: mediaSourceStatus,
        };
        mediaSourceStatus.onUpdate(function (msInitStatus, stopListeningMSStatus) {
            if (msInitStatus === 2 /* MediaSourceInitializationStatus.Attached */) {
                stopListeningMSStatus();
                _this._startPlaybackIfReady(playbackStartParams);
            }
        }, { clearSignal: this._initCanceller.signal, emitCurrentValue: true });
        drmInitializationStatus.onUpdate(function (initializationStatus, stopListeningDrm) {
            if (initializationStatus.initializationState.type === "initialized") {
                stopListeningDrm();
                _this._startPlaybackIfReady(playbackStartParams);
            }
        }, { emitCurrentValue: true, clearSignal: this._initCanceller.signal });
        /**
         * Reset directly (synchronously) the current `MediaSource` and signal to
         * the core that we did so.
         * @param {number} deltaPosition - Position you want to seek to after
         * reloading, as a delta in seconds from the last polled playing position.
         * @param {number|undefined} minimumPosition - If set, minimum time bound
         * in seconds after `deltaPosition` has been applied.
         * @param {number|undefined} maximumPosition - If set, minimum time bound
         * in seconds after `deltaPosition` has been applied.
         */
        var notifyAndStartMediaSourceReload = function (deltaPosition, minimumPosition, maximumPosition) {
            var reloadingContentInfo = _this._currentContentInfo;
            if (reloadingContentInfo === null) {
                log_1.default.warn("Init", "Asked to reload when no content is loaded.");
                return;
            }
            if (reloadingContentInfo === null ||
                reloadingContentInfo.mediaSourceInfo === null) {
                log_1.default.warn("Init", "Asked to reload when no MediaSource is active.");
                return;
            }
            var mediaSourceId = reloadingContentInfo.mediaSourceInfo.type === "main"
                ? reloadingContentInfo.mediaSourceInfo.mediaSource.id
                : reloadingContentInfo.mediaSourceInfo.mediaSourceId;
            (0, send_message_1.default)(_this._settings.worker, {
                type: "ms-reload" /* MainThreadMessageType.MediaSourceReload */,
                mediaSourceId: mediaSourceId,
                value: null,
            });
            reloadMediaSource(deltaPosition, minimumPosition, maximumPosition);
        };
        /**
         * Reset directly (synchronously) the current `MediaSource`.
         *
         * It is assumed that `core` already knows about this action. If not, call
         * `notifyAndStartMediaSourceReload` instead.
         * @param {number} deltaPosition - Position you want to seek to after
         * reloading, as a delta in seconds from the last polled playing position.
         * @param {number|undefined} minimumPosition - If set, minimum time bound
         * in seconds after `deltaPosition` has been applied.
         * @param {number|undefined} maximumPosition - If set, minimum time bound
         * in seconds after `deltaPosition` has been applied.
         */
        var reloadMediaSource = function (deltaPosition, minimumPosition, maximumPosition) {
            var _a;
            var reloadingContentInfo = _this._currentContentInfo;
            if (reloadingContentInfo === null) {
                log_1.default.warn("Init", "Asked to reload when no content is loaded.");
                return;
            }
            var lastObservation = playbackObserver.getReference().getValue();
            var currentPosition = lastObservation.position.getWanted();
            var isPaused = ((_a = reloadingContentInfo.initialPlayPerformed) === null || _a === void 0 ? void 0 : _a.getValue()) === true ||
                reloadingContentInfo.autoPlay === undefined
                ? lastObservation.paused
                : !reloadingContentInfo.autoPlay;
            var position = currentPosition + deltaPosition;
            if (minimumPosition !== undefined) {
                position = Math.max(minimumPosition, position);
            }
            if (maximumPosition !== undefined) {
                position = Math.min(maximumPosition, position);
            }
            _this._reload(mediaElement, textDisplayer, playbackObserver, mediaSourceStatus, position, !isPaused);
        };
        var onmessage = function (msg) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28;
            var msgData = msg.data;
            switch (msgData.type) {
                case "attach-media-source" /* WorkerMessageType.AttachMediaSource */: {
                    if (((_a = _this._currentContentInfo) === null || _a === void 0 ? void 0 : _a.contentId) !== msgData.contentId) {
                        return;
                    }
                    if (_this._currentContentInfo !== null) {
                        if (((_b = _this._currentContentInfo.mediaSourceInfo) === null || _b === void 0 ? void 0 : _b.type) === "main") {
                            _this._currentContentInfo.mediaSourceInfo.mediaSource.dispose();
                        }
                        _this._currentContentInfo.mediaSourceInfo = {
                            type: "core",
                            mediaSourceId: msgData.mediaSourceId,
                        };
                    }
                    var mediaSourceLink_1 = msgData.value;
                    mediaSourceStatus.onUpdate(function (currStatus, stopListening) {
                        if (currStatus === 1 /* MediaSourceInitializationStatus.AttachNow */) {
                            stopListening();
                            log_1.default.info("media", "Attaching MediaSource URL to the media element");
                            if (mediaSourceLink_1.type === "handle") {
                                mediaElement.srcObject = mediaSourceLink_1.value;
                                _this._currentMediaSourceCanceller.signal.register(function () {
                                    mediaElement.srcObject = null;
                                });
                            }
                            else {
                                mediaElement.src = mediaSourceLink_1.value;
                                _this._currentMediaSourceCanceller.signal.register(function () {
                                    (0, create_media_source_1.resetMediaElement)(mediaElement, mediaSourceLink_1.value);
                                });
                            }
                            (0, create_media_source_1.disableRemotePlaybackOnManagedMediaSource)(mediaElement, _this._currentMediaSourceCanceller.signal);
                            mediaSourceStatus.setValue(2 /* MediaSourceInitializationStatus.Attached */);
                        }
                    }, { emitCurrentValue: true, clearSignal: _this._initCanceller.signal });
                    break;
                }
                case "warning" /* WorkerMessageType.Warning */:
                    if (((_c = _this._currentContentInfo) === null || _c === void 0 ? void 0 : _c.contentId) !== msgData.contentId) {
                        return;
                    }
                    _this.trigger("warning", formatWorkerError(msgData.value));
                    break;
                case "error" /* WorkerMessageType.Error */:
                    if (((_d = _this._currentContentInfo) === null || _d === void 0 ? void 0 : _d.contentId) !== msgData.contentId) {
                        return;
                    }
                    _this._onFatalError(formatWorkerError(msgData.value));
                    break;
                case "create-media-source" /* WorkerMessageType.CreateMediaSource */:
                    _this._onCreateMediaSourceMessage(msgData, mediaElement, mediaSourceStatus, _this._settings.worker);
                    break;
                case "add-source-buffer" /* WorkerMessageType.AddSourceBuffer */:
                    {
                        if (((_f = (_e = _this._currentContentInfo) === null || _e === void 0 ? void 0 : _e.mediaSourceInfo) === null || _f === void 0 ? void 0 : _f.type) !== "main" ||
                            _this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                                msgData.mediaSourceId) {
                            return;
                        }
                        var mediaSource = _this._currentContentInfo.mediaSourceInfo.mediaSource;
                        mediaSource.addSourceBuffer(msgData.value.sourceBufferType, msgData.value.codec);
                    }
                    break;
                case "source-buffer-append" /* WorkerMessageType.SourceBufferAppend */:
                    {
                        if (((_h = (_g = _this._currentContentInfo) === null || _g === void 0 ? void 0 : _g.mediaSourceInfo) === null || _h === void 0 ? void 0 : _h.type) !== "main" ||
                            _this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                                msgData.mediaSourceId) {
                            return;
                        }
                        var mediaSource_1 = _this._currentContentInfo.mediaSourceInfo.mediaSource;
                        var sourceBuffer_1 = (0, array_find_1.default)(mediaSource_1.sourceBuffers, function (s) { return s.type === msgData.sourceBufferType; });
                        if (sourceBuffer_1 === undefined) {
                            return;
                        }
                        sourceBuffer_1
                            .appendBuffer(msgData.value.data, msgData.value.params)
                            .then(function (buffered) {
                            (0, send_message_1.default)(_this._settings.worker, {
                                type: "sb-success" /* MainThreadMessageType.SourceBufferSuccess */,
                                mediaSourceId: mediaSource_1.id,
                                sourceBufferType: sourceBuffer_1.type,
                                operationId: msgData.operationId,
                                value: { buffered: buffered },
                            });
                        })
                            .catch(function (error) {
                            (0, send_message_1.default)(_this._settings.worker, {
                                type: "sb-error" /* MainThreadMessageType.SourceBufferError */,
                                mediaSourceId: mediaSource_1.id,
                                sourceBufferType: sourceBuffer_1.type,
                                operationId: msgData.operationId,
                                value: error instanceof task_canceller_1.CancellationError
                                    ? { errorName: "CancellationError" }
                                    : formatSourceBufferError(error).serialize(),
                            });
                        });
                    }
                    break;
                case "source-buffer-remove" /* WorkerMessageType.SourceBufferRemove */:
                    {
                        if (((_k = (_j = _this._currentContentInfo) === null || _j === void 0 ? void 0 : _j.mediaSourceInfo) === null || _k === void 0 ? void 0 : _k.type) !== "main" ||
                            _this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                                msgData.mediaSourceId) {
                            return;
                        }
                        var mediaSource_2 = _this._currentContentInfo.mediaSourceInfo.mediaSource;
                        var sourceBuffer_2 = (0, array_find_1.default)(mediaSource_2.sourceBuffers, function (s) { return s.type === msgData.sourceBufferType; });
                        if (sourceBuffer_2 === undefined) {
                            return;
                        }
                        sourceBuffer_2
                            .remove(msgData.value.start, msgData.value.end)
                            .then(function (buffered) {
                            (0, send_message_1.default)(_this._settings.worker, {
                                type: "sb-success" /* MainThreadMessageType.SourceBufferSuccess */,
                                mediaSourceId: mediaSource_2.id,
                                sourceBufferType: sourceBuffer_2.type,
                                operationId: msgData.operationId,
                                value: { buffered: buffered },
                            });
                        })
                            .catch(function (error) {
                            (0, send_message_1.default)(_this._settings.worker, {
                                type: "sb-error" /* MainThreadMessageType.SourceBufferError */,
                                mediaSourceId: mediaSource_2.id,
                                sourceBufferType: sourceBuffer_2.type,
                                operationId: msgData.operationId,
                                value: error instanceof task_canceller_1.CancellationError
                                    ? { errorName: "CancellationError" }
                                    : formatSourceBufferError(error).serialize(),
                            });
                        });
                    }
                    break;
                case "abort-source-buffer" /* WorkerMessageType.AbortSourceBuffer */:
                    {
                        if (((_m = (_l = _this._currentContentInfo) === null || _l === void 0 ? void 0 : _l.mediaSourceInfo) === null || _m === void 0 ? void 0 : _m.type) !== "main" ||
                            _this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                                msgData.mediaSourceId) {
                            return;
                        }
                        var mediaSource = _this._currentContentInfo.mediaSourceInfo.mediaSource;
                        var sourceBuffer = (0, array_find_1.default)(mediaSource.sourceBuffers, function (s) { return s.type === msgData.sourceBufferType; });
                        if (sourceBuffer === undefined) {
                            return;
                        }
                        sourceBuffer.abort();
                    }
                    break;
                case "update-media-source-duration" /* WorkerMessageType.UpdateMediaSourceDuration */:
                    {
                        if (((_p = (_o = _this._currentContentInfo) === null || _o === void 0 ? void 0 : _o.mediaSourceInfo) === null || _p === void 0 ? void 0 : _p.type) !== "main" ||
                            _this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                                msgData.mediaSourceId) {
                            return;
                        }
                        var mediaSource = _this._currentContentInfo.mediaSourceInfo.mediaSource;
                        if ((mediaSource === null || mediaSource === void 0 ? void 0 : mediaSource.id) !== msgData.mediaSourceId) {
                            return;
                        }
                        mediaSource.setDuration(msgData.value.duration, msgData.value.isRealEndKnown);
                    }
                    break;
                case "stop-media-source-duration" /* WorkerMessageType.InterruptMediaSourceDurationUpdate */:
                    {
                        if (((_r = (_q = _this._currentContentInfo) === null || _q === void 0 ? void 0 : _q.mediaSourceInfo) === null || _r === void 0 ? void 0 : _r.type) !== "main" ||
                            _this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                                msgData.mediaSourceId) {
                            return;
                        }
                        var mediaSource = _this._currentContentInfo.mediaSourceInfo.mediaSource;
                        if ((mediaSource === null || mediaSource === void 0 ? void 0 : mediaSource.id) !== msgData.mediaSourceId) {
                            return;
                        }
                        mediaSource.interruptDurationSetting();
                    }
                    break;
                case "end-of-stream" /* WorkerMessageType.EndOfStream */:
                    {
                        if (((_t = (_s = _this._currentContentInfo) === null || _s === void 0 ? void 0 : _s.mediaSourceInfo) === null || _t === void 0 ? void 0 : _t.type) !== "main" ||
                            _this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                                msgData.mediaSourceId) {
                            return;
                        }
                        var mediaSource = _this._currentContentInfo.mediaSourceInfo.mediaSource;
                        mediaSource.maintainEndOfStream();
                    }
                    break;
                case "stop-end-of-stream" /* WorkerMessageType.InterruptEndOfStream */:
                    {
                        if (((_v = (_u = _this._currentContentInfo) === null || _u === void 0 ? void 0 : _u.mediaSourceInfo) === null || _v === void 0 ? void 0 : _v.type) !== "main" ||
                            _this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                                msgData.mediaSourceId) {
                            return;
                        }
                        var mediaSource = _this._currentContentInfo.mediaSourceInfo.mediaSource;
                        mediaSource.stopEndOfStream();
                    }
                    break;
                case "dispose-media-source" /* WorkerMessageType.DisposeMediaSource */:
                    {
                        if (((_x = (_w = _this._currentContentInfo) === null || _w === void 0 ? void 0 : _w.mediaSourceInfo) === null || _x === void 0 ? void 0 : _x.type) !== "main" ||
                            _this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                                msgData.mediaSourceId) {
                            return;
                        }
                        var mediaSource = _this._currentContentInfo.mediaSourceInfo.mediaSource;
                        mediaSource.dispose();
                    }
                    break;
                case "needs-buffer-flush" /* WorkerMessageType.NeedsBufferFlush */: {
                    if (((_y = _this._currentContentInfo) === null || _y === void 0 ? void 0 : _y.contentId) !== msgData.contentId) {
                        return;
                    }
                    var lastObservation = playbackObserver.getReference().getValue();
                    var currentTime = lastObservation.position.isAwaitingFuturePosition()
                        ? lastObservation.position.getWanted()
                        : mediaElement.currentTime;
                    var relativeResumingPosition = (_0 = (_z = msgData.value) === null || _z === void 0 ? void 0 : _z.relativeResumingPosition) !== null && _0 !== void 0 ? _0 : 0;
                    var canBeApproximateSeek = Boolean((_1 = msgData.value) === null || _1 === void 0 ? void 0 : _1.relativePosHasBeenDefaulted);
                    var wantedSeekingTime = void 0;
                    if (relativeResumingPosition === 0 && canBeApproximateSeek) {
                        // in case relativeResumingPosition is 0, we still perform
                        // a tiny seek to be sure that the browser will correclty reload the video.
                        wantedSeekingTime = currentTime + 0.001;
                    }
                    else {
                        wantedSeekingTime = currentTime + relativeResumingPosition;
                    }
                    playbackObserver.setCurrentTime(wantedSeekingTime);
                    break;
                }
                case "active-period-changed" /* WorkerMessageType.ActivePeriodChanged */: {
                    if (((_2 = _this._currentContentInfo) === null || _2 === void 0 ? void 0 : _2.contentId) !== msgData.contentId ||
                        _this._currentContentInfo.manifest === null) {
                        return;
                    }
                    var period = (0, array_find_1.default)(_this._currentContentInfo.manifest.periods, function (p) { return p.id === msgData.value.periodId; });
                    if (period !== undefined) {
                        _this.trigger("activePeriodChanged", { period: period });
                    }
                    break;
                }
                case "adaptation-changed" /* WorkerMessageType.AdaptationChanged */: {
                    if (((_3 = _this._currentContentInfo) === null || _3 === void 0 ? void 0 : _3.contentId) !== msgData.contentId ||
                        _this._currentContentInfo.manifest === null) {
                        return;
                    }
                    var period = (0, array_find_1.default)(_this._currentContentInfo.manifest.periods, function (p) { return p.id === msgData.value.periodId; });
                    if (period === undefined) {
                        return;
                    }
                    if (msgData.value.adaptationId === null) {
                        _this.trigger("adaptationChange", {
                            period: period,
                            adaptation: null,
                            type: msgData.value.type,
                        });
                        return;
                    }
                    var adaptations = (_4 = period.adaptations[msgData.value.type]) !== null && _4 !== void 0 ? _4 : [];
                    var adaptation = (0, array_find_1.default)(adaptations, function (a) { return a.id === msgData.value.adaptationId; });
                    if (adaptation !== undefined) {
                        _this.trigger("adaptationChange", {
                            period: period,
                            adaptation: adaptation,
                            type: msgData.value.type,
                        });
                    }
                    break;
                }
                case "representation-changed" /* WorkerMessageType.RepresentationChanged */: {
                    if (((_5 = _this._currentContentInfo) === null || _5 === void 0 ? void 0 : _5.contentId) !== msgData.contentId ||
                        _this._currentContentInfo.manifest === null) {
                        return;
                    }
                    var period = (0, array_find_1.default)(_this._currentContentInfo.manifest.periods, function (p) { return p.id === msgData.value.periodId; });
                    if (period === undefined) {
                        return;
                    }
                    if (msgData.value.representationId === null) {
                        _this.trigger("representationChange", {
                            period: period,
                            type: msgData.value.type,
                            representation: null,
                        });
                        return;
                    }
                    var adaptations = (_6 = period.adaptations[msgData.value.type]) !== null && _6 !== void 0 ? _6 : [];
                    var adaptation = (0, array_find_1.default)(adaptations, function (a) { return a.id === msgData.value.adaptationId; });
                    if (adaptation === undefined) {
                        return;
                    }
                    var representation = (0, array_find_1.default)(adaptation.representations, function (r) { return r.id === msgData.value.representationId; });
                    if (representation !== undefined) {
                        _this.trigger("representationChange", {
                            period: period,
                            type: msgData.value.type,
                            representation: representation,
                        });
                    }
                    break;
                }
                case "encryption-data-encountered" /* WorkerMessageType.EncryptionDataEncountered */:
                    if (((_7 = _this._currentContentInfo) === null || _7 === void 0 ? void 0 : _7.contentId) !== msgData.contentId) {
                        return;
                    }
                    lastContentProtection.setValue(msgData.value);
                    break;
                case "manifest-ready" /* WorkerMessageType.ManifestReady */: {
                    if (((_8 = _this._currentContentInfo) === null || _8 === void 0 ? void 0 : _8.contentId) !== msgData.contentId) {
                        return;
                    }
                    var manifest = msgData.value.manifest;
                    _this._currentContentInfo.manifest = manifest;
                    _this._updateCodecSupport(manifest, mediaElement);
                    _this._startPlaybackIfReady(playbackStartParams);
                    break;
                }
                case "manifest-update" /* WorkerMessageType.ManifestUpdate */: {
                    if (((_9 = _this._currentContentInfo) === null || _9 === void 0 ? void 0 : _9.contentId) !== msgData.contentId) {
                        return;
                    }
                    var manifest = (_10 = _this._currentContentInfo) === null || _10 === void 0 ? void 0 : _10.manifest;
                    if ((0, is_null_or_undefined_1.default)(manifest)) {
                        log_1.default.error("Init", "Manifest update but no Manifest loaded");
                        return;
                    }
                    (0, manifest_1.replicateUpdatesOnManifestMetadata)(manifest, msgData.value.manifest, msgData.value.updates);
                    (_12 = (_11 = _this._currentContentInfo) === null || _11 === void 0 ? void 0 : _11.streamEventsEmitter) === null || _12 === void 0 ? void 0 : _12.onManifestUpdate(manifest);
                    _this._updateCodecSupport(manifest, mediaElement);
                    _this.trigger("manifestUpdate", msgData.value.updates);
                    break;
                }
                case "update-playback-rate" /* WorkerMessageType.UpdatePlaybackRate */:
                    if (((_13 = _this._currentContentInfo) === null || _13 === void 0 ? void 0 : _13.contentId) !== msgData.contentId) {
                        return;
                    }
                    playbackObserver.setPlaybackRate(msgData.value);
                    break;
                case "bitrate-estimate-change" /* WorkerMessageType.BitrateEstimateChange */:
                    if (((_14 = _this._currentContentInfo) === null || _14 === void 0 ? void 0 : _14.contentId) !== msgData.contentId) {
                        return;
                    }
                    _this.trigger("bitrateEstimateChange", {
                        type: msgData.value.bufferType,
                        bitrate: msgData.value.bitrate,
                    });
                    break;
                case "inband-event" /* WorkerMessageType.InbandEvent */:
                    if (((_15 = _this._currentContentInfo) === null || _15 === void 0 ? void 0 : _15.contentId) !== msgData.contentId) {
                        return;
                    }
                    _this.trigger("inbandEvents", msgData.value);
                    break;
                case "locked-stream" /* WorkerMessageType.LockedStream */: {
                    if (((_16 = _this._currentContentInfo) === null || _16 === void 0 ? void 0 : _16.contentId) !== msgData.contentId ||
                        _this._currentContentInfo.manifest === null) {
                        return;
                    }
                    var period = (0, array_find_1.default)(_this._currentContentInfo.manifest.periods, function (p) { return p.id === msgData.value.periodId; });
                    if (period === undefined) {
                        return;
                    }
                    (_17 = _this._currentContentInfo.rebufferingController) === null || _17 === void 0 ? void 0 : _17.onLockedStream(msgData.value.bufferType, period);
                    break;
                }
                case "period-stream-ready" /* WorkerMessageType.PeriodStreamReady */: {
                    if (((_18 = _this._currentContentInfo) === null || _18 === void 0 ? void 0 : _18.contentId) !== msgData.contentId ||
                        _this._currentContentInfo.manifest === null) {
                        return;
                    }
                    var period = (0, array_find_1.default)(_this._currentContentInfo.manifest.periods, function (p) { return p.id === msgData.value.periodId; });
                    if (period === undefined) {
                        return;
                    }
                    var ref_1 = new reference_1.default(undefined);
                    ref_1.onUpdate(function (adapChoice) {
                        if (_this._currentContentInfo === null) {
                            ref_1.finish();
                            return;
                        }
                        if (!(0, is_null_or_undefined_1.default)(adapChoice)) {
                            adapChoice.representations.onUpdate(function (repChoice, stopListening) {
                                if (_this._currentContentInfo === null) {
                                    stopListening();
                                    return;
                                }
                                (0, send_message_1.default)(_this._settings.worker, {
                                    type: "rep-update" /* MainThreadMessageType.RepresentationUpdate */,
                                    contentId: _this._currentContentInfo.contentId,
                                    value: {
                                        periodId: msgData.value.periodId,
                                        adaptationId: adapChoice.adaptationId,
                                        bufferType: msgData.value.bufferType,
                                        choice: repChoice,
                                    },
                                });
                            }, { clearSignal: _this._initCanceller.signal });
                        }
                        (0, send_message_1.default)(_this._settings.worker, {
                            type: "track-update" /* MainThreadMessageType.TrackUpdate */,
                            contentId: _this._currentContentInfo.contentId,
                            value: {
                                periodId: msgData.value.periodId,
                                bufferType: msgData.value.bufferType,
                                choice: (0, is_null_or_undefined_1.default)(adapChoice)
                                    ? adapChoice
                                    : {
                                        adaptationId: adapChoice.adaptationId,
                                        switchingMode: adapChoice.switchingMode,
                                        initialRepresentations: adapChoice.representations.getValue(),
                                        relativeResumingPosition: adapChoice.relativeResumingPosition,
                                    },
                            },
                        });
                    }, { clearSignal: _this._initCanceller.signal });
                    _this.trigger("periodStreamReady", {
                        period: period,
                        type: msgData.value.bufferType,
                        adaptationRef: ref_1,
                    });
                    break;
                }
                case "period-stream-cleared" /* WorkerMessageType.PeriodStreamCleared */: {
                    if (((_19 = _this._currentContentInfo) === null || _19 === void 0 ? void 0 : _19.contentId) !== msgData.contentId ||
                        _this._currentContentInfo.manifest === null) {
                        return;
                    }
                    _this.trigger("periodStreamCleared", {
                        periodId: msgData.value.periodId,
                        type: msgData.value.bufferType,
                    });
                    break;
                }
                case "discontinuity-update" /* WorkerMessageType.DiscontinuityUpdate */: {
                    if (((_20 = _this._currentContentInfo) === null || _20 === void 0 ? void 0 : _20.contentId) !== msgData.contentId ||
                        _this._currentContentInfo.manifest === null) {
                        return;
                    }
                    var period = (0, array_find_1.default)(_this._currentContentInfo.manifest.periods, function (p) { return p.id === msgData.value.periodId; });
                    if (period === undefined) {
                        log_1.default.warn("Init", "Discontinuity's Period not found", {
                            periodId: msgData.value.periodId,
                        });
                        return;
                    }
                    (_21 = _this._currentContentInfo.rebufferingController) === null || _21 === void 0 ? void 0 : _21.updateDiscontinuityInfo({
                        period: period,
                        bufferType: msgData.value.bufferType,
                        discontinuity: msgData.value.discontinuity,
                        position: msgData.value.position,
                    });
                    break;
                }
                case "push-text-data" /* WorkerMessageType.PushTextData */: {
                    if (((_22 = _this._currentContentInfo) === null || _22 === void 0 ? void 0 : _22.contentId) !== msgData.contentId) {
                        return;
                    }
                    if (textDisplayer === null) {
                        log_1.default.warn("text", "Received AddTextData message but no text displayer exists");
                    }
                    else {
                        try {
                            var ranges = textDisplayer.pushTextData(msgData.value);
                            (0, send_message_1.default)(_this._settings.worker, {
                                type: "add-text-success" /* MainThreadMessageType.PushTextDataSuccess */,
                                contentId: msgData.contentId,
                                value: { ranges: ranges },
                            });
                        }
                        catch (err) {
                            var message = err instanceof Error ? err.message : "Unknown error";
                            (0, send_message_1.default)(_this._settings.worker, {
                                type: "push-text-error" /* MainThreadMessageType.PushTextDataError */,
                                contentId: msgData.contentId,
                                value: { message: message },
                            });
                        }
                    }
                    break;
                }
                case "remove-text-data" /* WorkerMessageType.RemoveTextData */: {
                    if (((_23 = _this._currentContentInfo) === null || _23 === void 0 ? void 0 : _23.contentId) !== msgData.contentId) {
                        return;
                    }
                    if (textDisplayer === null) {
                        log_1.default.warn("text", "Received RemoveTextData message but no text displayer exists");
                    }
                    else {
                        try {
                            var ranges = textDisplayer.removeBuffer(msgData.value.start, msgData.value.end);
                            (0, send_message_1.default)(_this._settings.worker, {
                                type: "remove-text-success" /* MainThreadMessageType.RemoveTextDataSuccess */,
                                contentId: msgData.contentId,
                                value: { ranges: ranges },
                            });
                        }
                        catch (err) {
                            var message = err instanceof Error ? err.message : "Unknown error";
                            (0, send_message_1.default)(_this._settings.worker, {
                                type: "remove-text-error" /* MainThreadMessageType.RemoveTextDataError */,
                                contentId: msgData.contentId,
                                value: { message: message },
                            });
                        }
                    }
                    break;
                }
                case "reset-text-displayer" /* WorkerMessageType.ResetTextDisplayer */: {
                    if (((_24 = _this._currentContentInfo) === null || _24 === void 0 ? void 0 : _24.contentId) !== msgData.contentId) {
                        return;
                    }
                    if (textDisplayer === null) {
                        log_1.default.warn("text", "Received ResetTextDisplayer message but no text displayer exists");
                    }
                    else {
                        textDisplayer.reset();
                    }
                    break;
                }
                case "stop-text-displayer" /* WorkerMessageType.StopTextDisplayer */: {
                    if (((_25 = _this._currentContentInfo) === null || _25 === void 0 ? void 0 : _25.contentId) !== msgData.contentId) {
                        return;
                    }
                    if (textDisplayer === null) {
                        log_1.default.warn("text", "Received StopTextDisplayer message but no text displayer exists");
                    }
                    else {
                        textDisplayer.stop();
                    }
                    break;
                }
                case "reloading-media-source" /* WorkerMessageType.ReloadingMediaSource */:
                    {
                        if (_this._currentContentInfo === null ||
                            _this._currentContentInfo.mediaSourceInfo === null) {
                            return;
                        }
                        var mediaSourceId = _this._currentContentInfo.mediaSourceInfo.type === "main"
                            ? _this._currentContentInfo.mediaSourceInfo.mediaSource.id
                            : _this._currentContentInfo.mediaSourceInfo.mediaSourceId;
                        if (mediaSourceId !== msgData.mediaSourceId) {
                            return;
                        }
                        reloadMediaSource(msgData.value.timeOffset, msgData.value.minimumPosition, msgData.value.maximumPosition);
                    }
                    break;
                case "needs-decipherability-flush" /* WorkerMessageType.NeedsDecipherabilityFlush */:
                    {
                        if (((_26 = _this._currentContentInfo) === null || _26 === void 0 ? void 0 : _26.contentId) !== msgData.contentId) {
                            return;
                        }
                        var keySystem = (0, decrypt_1.getKeySystemConfiguration)(mediaElement);
                        if ((0, should_reload_media_source_on_decipherability_update_1.default)(keySystem === null || keySystem === void 0 ? void 0 : keySystem[0])) {
                            notifyAndStartMediaSourceReload(0, undefined, undefined);
                        }
                        else {
                            var lastObservation = playbackObserver.getReference().getValue();
                            var currentPosition = lastObservation.position.getWanted();
                            // simple seek close to the current position
                            // to flush the buffers
                            if (currentPosition + 0.001 < lastObservation.duration) {
                                playbackObserver.setCurrentTime(mediaElement.currentTime + 0.001);
                            }
                            else {
                                playbackObserver.setCurrentTime(currentPosition);
                            }
                        }
                    }
                    break;
                case "segment-sink-store-update" /* WorkerMessageType.SegmentSinkStoreUpdate */: {
                    if (((_27 = _this._currentContentInfo) === null || _27 === void 0 ? void 0 : _27.contentId) !== msgData.contentId) {
                        return;
                    }
                    var sinkObj = _this._awaitingRequests.pendingSinkMetrics.get(msgData.value.requestId);
                    if (sinkObj !== undefined) {
                        sinkObj.resolve(msgData.value.segmentSinkMetrics);
                    }
                    else {
                        log_1.default.error("Init", "Failed to send segment sink store update");
                    }
                    break;
                }
                case "init-success" /* WorkerMessageType.InitSuccess */:
                case "init-error" /* WorkerMessageType.InitError */:
                    // Should already be handled by the API
                    break;
                case "log" /* WorkerMessageType.LogMessage */:
                    // Already handled by prepare's handler
                    break;
                case "thumbnail-response" /* WorkerMessageType.ThumbnailDataResponse */: {
                    if (((_28 = _this._currentContentInfo) === null || _28 === void 0 ? void 0 : _28.contentId) !== msgData.contentId) {
                        return;
                    }
                    var tObj = _this._awaitingRequests.pendingThumbnailFetching.get(msgData.value.requestId);
                    if (tObj !== undefined) {
                        if (msgData.value.status === "error") {
                            tObj.reject(formatWorkerError(msgData.value.error));
                        }
                        else {
                            tObj.resolve(msgData.value.data);
                        }
                    }
                    else {
                        log_1.default.error("Init", "Failed to send segment sink store update");
                    }
                    break;
                }
                default:
                    (0, assert_1.assertUnreachable)(msgData);
            }
        };
        log_1.default.debug("Init", "addEventListener for worker message");
        if (this._queuedWorkerMessages !== null) {
            var bufferedMessages = this._queuedWorkerMessages.slice();
            log_1.default.debug("Init", "Processing buffered messages", {
                ammount: bufferedMessages.length,
            });
            try {
                for (var bufferedMessages_1 = __values(bufferedMessages), bufferedMessages_1_1 = bufferedMessages_1.next(); !bufferedMessages_1_1.done; bufferedMessages_1_1 = bufferedMessages_1.next()) {
                    var message = bufferedMessages_1_1.value;
                    onmessage(message);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (bufferedMessages_1_1 && !bufferedMessages_1_1.done && (_a = bufferedMessages_1.return)) _a.call(bufferedMessages_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            this._queuedWorkerMessages = null;
        }
        this._settings.worker.addEventListener("message", onmessage);
        this._initCanceller.signal.register(function () {
            log_1.default.debug("Init", "removeEventListener for worker message");
            _this._settings.worker.removeEventListener("message", onmessage);
        });
    };
    MultiThreadContentInitializer.prototype.dispose = function () {
        var _a;
        this._initCanceller.cancel();
        if (this._currentContentInfo !== null) {
            if (((_a = this._currentContentInfo.mediaSourceInfo) === null || _a === void 0 ? void 0 : _a.type) === "main") {
                this._currentContentInfo.mediaSourceInfo.mediaSource.dispose();
            }
            this._currentContentInfo = null;
        }
    };
    MultiThreadContentInitializer.prototype._onFatalError = function (err) {
        if (this._initCanceller.isUsed()) {
            return;
        }
        this._initCanceller.cancel();
        this.trigger("error", err);
    };
    MultiThreadContentInitializer.prototype._initializeContentDecryption = function (mediaElement, lastContentProtection, mediaSourceStatus, reloadMediaSource, cancelSignal) {
        var _this = this;
        var _a;
        var keySystems = this._settings.keySystems;
        // TODO private?
        var createEmeDisabledReference = function (errMsg) {
            mediaSourceStatus.setValue(1 /* MediaSourceInitializationStatus.AttachNow */);
            lastContentProtection.onUpdate(function (data, stopListening) {
                if (data === null) {
                    // initial value
                    return;
                }
                stopListening();
                var err = new errors_1.EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR", errMsg, {
                    keyStatuses: undefined,
                    keySystemConfiguration: undefined,
                    keySystem: undefined,
                });
                _this._onFatalError(err);
            }, { clearSignal: cancelSignal });
            var ref = new reference_1.default({
                initializationState: {
                    type: "initialized",
                    value: null,
                },
                contentDecryptor: null,
                drmSystemId: undefined,
            });
            ref.finish(); // We know that no new value will be triggered
            return { statusRef: ref, contentDecryptor: null };
        };
        if (keySystems.length === 0) {
            return createEmeDisabledReference("No `keySystems` option given.");
        }
        else if (features_1.default.decrypt === null) {
            return createEmeDisabledReference("EME feature not activated.");
        }
        var ContentDecryptor = features_1.default.decrypt;
        var emeApi = (_a = mediaElement.FORCED_EME_API) !== null && _a !== void 0 ? _a : (0, eme_1.default)("auto");
        if (emeApi === null) {
            return createEmeDisabledReference("EME API not available on the current page.");
        }
        log_1.default.debug("Init", "Creating ContentDecryptor");
        var contentDecryptor = new ContentDecryptor(emeApi, mediaElement, keySystems);
        var drmStatusRef = new reference_1.default({
            initializationState: { type: "uninitialized", value: null },
            drmSystemId: undefined,
        }, cancelSignal);
        var updateCodecSupportOnStateChange = function (state) {
            var _a;
            if (state > decrypt_1.ContentDecryptorState.Initializing) {
                var manifest = (_a = _this._currentContentInfo) === null || _a === void 0 ? void 0 : _a.manifest;
                if ((0, is_null_or_undefined_1.default)(manifest)) {
                    return;
                }
                _this._updateCodecSupport(manifest, mediaElement);
                contentDecryptor.removeEventListener("stateChange", updateCodecSupportOnStateChange);
            }
        };
        contentDecryptor.addEventListener("stateChange", updateCodecSupportOnStateChange);
        contentDecryptor.addEventListener("keyIdsCompatibilityUpdate", function (updates) {
            if (_this._currentContentInfo === null ||
                _this._currentContentInfo.manifest === null) {
                return;
            }
            var manUpdates = (0, manifest_1.updateDecipherabilityFromKeyIds)(_this._currentContentInfo.manifest, updates);
            if ((0, may_media_element_fail_on_undecipherable_data_1.default)() &&
                manUpdates.some(function (e) { return e.representation.decipherable !== true; })) {
                reloadMediaSource();
            }
            else {
                (0, send_message_1.default)(_this._settings.worker, {
                    type: "decipherability-update" /* MainThreadMessageType.DecipherabilityStatusUpdate */,
                    contentId: _this._currentContentInfo.contentId,
                    value: manUpdates.map(function (s) { return ({
                        representationUniqueId: s.representation.uniqueId,
                        decipherable: s.representation.decipherable,
                    }); }),
                });
            }
            _this.trigger("decipherabilityUpdate", manUpdates);
        });
        contentDecryptor.addEventListener("blackListProtectionData", function (protData) {
            if (_this._currentContentInfo === null ||
                _this._currentContentInfo.manifest === null) {
                return;
            }
            var manUpdates = (0, manifest_1.updateDecipherabilityFromProtectionData)(_this._currentContentInfo.manifest, protData);
            if ((0, may_media_element_fail_on_undecipherable_data_1.default)() &&
                manUpdates.some(function (e) { return e.representation.decipherable !== true; })) {
                reloadMediaSource();
            }
            else {
                (0, send_message_1.default)(_this._settings.worker, {
                    type: "decipherability-update" /* MainThreadMessageType.DecipherabilityStatusUpdate */,
                    contentId: _this._currentContentInfo.contentId,
                    value: manUpdates.map(function (s) { return ({
                        representationUniqueId: s.representation.uniqueId,
                        decipherable: s.representation.decipherable,
                    }); }),
                });
            }
            _this.trigger("decipherabilityUpdate", manUpdates);
        });
        contentDecryptor.addEventListener("stateChange", function (state) {
            if (state === decrypt_1.ContentDecryptorState.WaitingForAttachment) {
                mediaSourceStatus.onUpdate(function (currStatus, stopListening) {
                    if (currStatus === 0 /* MediaSourceInitializationStatus.Nothing */) {
                        mediaSourceStatus.setValue(1 /* MediaSourceInitializationStatus.AttachNow */);
                    }
                    else if (currStatus === 2 /* MediaSourceInitializationStatus.Attached */) {
                        stopListening();
                        if (state === decrypt_1.ContentDecryptorState.WaitingForAttachment) {
                            contentDecryptor.attach();
                        }
                    }
                }, { clearSignal: cancelSignal, emitCurrentValue: true });
            }
            else if (state === decrypt_1.ContentDecryptorState.ReadyForContent) {
                drmStatusRef.setValue({
                    initializationState: { type: "initialized", value: null },
                    drmSystemId: contentDecryptor.systemId,
                });
                contentDecryptor.removeEventListener("stateChange");
            }
        });
        contentDecryptor.addEventListener("error", function (error) {
            _this._onFatalError(error);
        });
        contentDecryptor.addEventListener("warning", function (error) {
            _this.trigger("warning", error);
        });
        lastContentProtection.onUpdate(function (data) {
            if (data === null) {
                return;
            }
            contentDecryptor.onInitializationData(data);
        }, { clearSignal: cancelSignal });
        cancelSignal.register(function () {
            contentDecryptor.dispose();
        });
        return { statusRef: drmStatusRef, contentDecryptor: contentDecryptor };
    };
    /**
     * Retrieves all unknown codecs from the current manifest, checks these unknown codecs
     * to determine if they are supported, updates the manifest with the support
     * status of these codecs, and forwards the list of supported codecs to the web worker.
     * @param manifest
     */
    MultiThreadContentInitializer.prototype._updateCodecSupport = function (manifest, mediaElement) {
        var _a, _b, _c, _d;
        try {
            var updatedCodecs = (0, update_manifest_codec_support_1.updateManifestCodecSupport)(manifest, (_b = (_a = this._currentContentInfo) === null || _a === void 0 ? void 0 : _a.contentDecryptor) !== null && _b !== void 0 ? _b : null, mediaElement, (_d = (_c = this._currentContentInfo) === null || _c === void 0 ? void 0 : _c.useMseInWorker) !== null && _d !== void 0 ? _d : false);
            if (updatedCodecs.length > 0) {
                (0, send_message_1.default)(this._settings.worker, {
                    type: "codec-support-update" /* MainThreadMessageType.CodecSupportUpdate */,
                    value: updatedCodecs,
                });
                // TODO what if one day the worker updates codec support by itself?
                // We wouldn't know...
                this.trigger("codecSupportUpdate", null);
            }
        }
        catch (err) {
            this._onFatalError(err);
        }
    };
    MultiThreadContentInitializer.prototype._hasTextBufferFeature = function () {
        return ((this._settings.textTrackOptions.textTrackMode === "html" &&
            features_1.default.htmlTextDisplayer !== null) ||
            features_1.default.nativeTextDisplayer !== null);
    };
    MultiThreadContentInitializer.prototype._reload = function (mediaElement, textDisplayer, playbackObserver, mediaSourceStatus, position, autoPlay) {
        var _this = this;
        this._currentMediaSourceCanceller.cancel();
        this._currentMediaSourceCanceller = new task_canceller_1.default();
        this._currentMediaSourceCanceller.linkToSignal(this._initCanceller.signal);
        mediaSourceStatus.setValue(1 /* MediaSourceInitializationStatus.AttachNow */);
        this.trigger("reloadingMediaSource", { position: position, autoPlay: autoPlay });
        mediaSourceStatus.onUpdate(function (status, stopListeningMSStatusUpdates) {
            if (status !== 2 /* MediaSourceInitializationStatus.Attached */) {
                return;
            }
            stopListeningMSStatusUpdates();
            var corePlaybackObserver = _this._setUpModulesOnNewMediaSource({
                initialTime: position,
                autoPlay: autoPlay,
                mediaElement: mediaElement,
                textDisplayer: textDisplayer,
                playbackObserver: playbackObserver,
            }, _this._currentMediaSourceCanceller.signal);
            if (!_this._currentMediaSourceCanceller.isUsed() &&
                corePlaybackObserver !== null &&
                _this._currentContentInfo !== null) {
                var contentId_1 = _this._currentContentInfo.contentId;
                corePlaybackObserver.listen(function (obs) {
                    (0, send_message_1.default)(_this._settings.worker, {
                        type: "observation" /* MainThreadMessageType.PlaybackObservation */,
                        contentId: contentId_1,
                        value: (0, object_assign_1.default)(obs, {
                            position: obs.position.serialize(),
                        }),
                    });
                }, {
                    includeLastObservation: true,
                    clearSignal: _this._currentMediaSourceCanceller.signal,
                });
            }
        }, {
            clearSignal: this._currentMediaSourceCanceller.signal,
            emitCurrentValue: true,
        });
    };
    /**
     * Start-up modules and mechanisms (initial seek, auto-play etc.) needed each
     * time a content is loaded AND re-loaded on a `HTMLMediaElement`, when the
     * manifest is known.
     *
     * Note that this does not include reacting to incoming worker messages nor
     * sending them, those actions have to be handled separately.
     *
     * @param {Object} parameters
     * @param {Object} cancelSignal
     * @returns {Object|null} - Playback Observer created for this content. `null`
     * only if playback initialization failed (most likely because it has been
     * cancelled).
     */
    MultiThreadContentInitializer.prototype._setUpModulesOnNewMediaSource = function (parameters, cancelSignal) {
        var _this = this;
        if (cancelSignal.isCancelled()) {
            return null;
        }
        if (this._currentContentInfo === null) {
            log_1.default.error("Init", "Setting up modules without a contentId");
            return null;
        }
        if (this._currentContentInfo.manifest === null) {
            log_1.default.error("Init", "Setting up modules without a loaded Manifest");
            return null;
        }
        var _a = this._currentContentInfo, manifest = _a.manifest, mediaSourceInfo = _a.mediaSourceInfo;
        var speed = this._settings.speed;
        var initialTime = parameters.initialTime, autoPlay = parameters.autoPlay, mediaElement = parameters.mediaElement, textDisplayer = parameters.textDisplayer, playbackObserver = parameters.playbackObserver;
        this._currentContentInfo.initialTime = initialTime;
        this._currentContentInfo.autoPlay = autoPlay;
        var _b = (0, initial_seek_and_play_1.default)({
            mediaElement: mediaElement,
            playbackObserver: playbackObserver,
            startTime: initialTime,
            mustAutoPlay: autoPlay,
            onWarning: function (err) { return _this.trigger("warning", err); },
            isDirectfile: false,
        }, cancelSignal), autoPlayResult = _b.autoPlayResult, initialPlayPerformed = _b.initialPlayPerformed;
        this._currentContentInfo.initialPlayPerformed = initialPlayPerformed;
        var corePlaybackObserver = (0, create_core_playback_observer_1.default)(playbackObserver, {
            autoPlay: autoPlay,
            initialPlayPerformed: initialPlayPerformed,
            manifest: manifest,
            mediaSource: (mediaSourceInfo === null || mediaSourceInfo === void 0 ? void 0 : mediaSourceInfo.type) === "main" ? mediaSourceInfo.mediaSource : null,
            speed: speed,
            textDisplayer: textDisplayer,
        }, cancelSignal);
        if (cancelSignal.isCancelled()) {
            return null;
        }
        /**
         * Class trying to avoid various stalling situations, emitting "stalled"
         * events when it cannot, as well as "unstalled" events when it get out of one.
         */
        var rebufferingController = new rebuffering_controller_1.default(playbackObserver, manifest, speed);
        rebufferingController.addEventListener("stalled", function (evt) {
            return _this.trigger("stalled", evt);
        });
        rebufferingController.addEventListener("unstalled", function () {
            return _this.trigger("unstalled", null);
        });
        rebufferingController.addEventListener("warning", function (err) {
            return _this.trigger("warning", err);
        });
        cancelSignal.register(function () {
            rebufferingController.destroy();
        });
        rebufferingController.start();
        this._currentContentInfo.rebufferingController = rebufferingController;
        var currentContentInfo = this._currentContentInfo;
        initialPlayPerformed.onUpdate(function (isPerformed, stopListening) {
            if (isPerformed) {
                stopListening();
                var streamEventsEmitter_1 = new stream_events_emitter_1.default(manifest, playbackObserver);
                currentContentInfo.streamEventsEmitter = streamEventsEmitter_1;
                streamEventsEmitter_1.addEventListener("event", function (payload) {
                    _this.trigger("streamEvent", payload);
                }, cancelSignal);
                streamEventsEmitter_1.addEventListener("eventSkip", function (payload) {
                    _this.trigger("streamEventSkip", payload);
                }, cancelSignal);
                streamEventsEmitter_1.start();
                cancelSignal.register(function () {
                    streamEventsEmitter_1.stop();
                });
            }
        }, { clearSignal: cancelSignal, emitCurrentValue: true });
        var _getSegmentSinkMetrics = function () { return __awaiter(_this, void 0, void 0, function () {
            var requestId;
            var _this = this;
            return __generator(this, function (_a) {
                this._awaitingRequests.nextRequestId++;
                requestId = this._awaitingRequests.nextRequestId;
                (0, send_message_1.default)(this._settings.worker, {
                    type: "pull-segment-sink-store-infos" /* MainThreadMessageType.PullSegmentSinkStoreInfos */,
                    value: { requestId: requestId },
                });
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var rejectFn = function (err) {
                            cancelSignal.deregister(rejectFn);
                            _this._awaitingRequests.pendingSinkMetrics.delete(requestId);
                            return reject(err);
                        };
                        _this._awaitingRequests.pendingSinkMetrics.set(requestId, {
                            resolve: function (value) {
                                cancelSignal.deregister(rejectFn);
                                _this._awaitingRequests.pendingSinkMetrics.delete(requestId);
                                resolve(value);
                            },
                        });
                        cancelSignal.register(rejectFn);
                    })];
            });
        }); };
        var _getThumbnailsData = function (periodId, thumbnailTrackId, time) { return __awaiter(_this, void 0, void 0, function () {
            var requestId;
            var _this = this;
            return __generator(this, function (_a) {
                if (this._currentContentInfo === null) {
                    return [2 /*return*/, Promise.reject(new Error("Cannot fetch thumbnails: No content loaded."))];
                }
                this._awaitingRequests.nextRequestId++;
                requestId = this._awaitingRequests.nextRequestId;
                (0, send_message_1.default)(this._settings.worker, {
                    type: "thumbnail-request" /* MainThreadMessageType.ThumbnailDataRequest */,
                    contentId: this._currentContentInfo.contentId,
                    value: { requestId: requestId, periodId: periodId, thumbnailTrackId: thumbnailTrackId, time: time },
                });
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var rejectFn = function (err) {
                            cleanUp();
                            reject(err);
                        };
                        var cleanUp = function () {
                            cancelSignal.deregister(rejectFn);
                            _this._awaitingRequests.pendingThumbnailFetching.delete(requestId);
                        };
                        _this._awaitingRequests.pendingThumbnailFetching.set(requestId, {
                            resolve: function (value) {
                                cleanUp();
                                resolve(value);
                            },
                            reject: function (value) {
                                cleanUp();
                                reject(value);
                            },
                        });
                        cancelSignal.register(rejectFn);
                    })];
            });
        }); };
        /**
         * Emit a "loaded" events once the initial play has been performed and the
         * media can begin playback.
         * Also emits warning events if issues arise when doing so.
         */
        autoPlayResult
            .then(function () {
            (0, get_loaded_reference_1.default)(playbackObserver, false, cancelSignal).onUpdate(function (isLoaded, stopListening) {
                if (isLoaded) {
                    stopListening();
                    _this.trigger("loaded", {
                        getSegmentSinkMetrics: _getSegmentSinkMetrics,
                        getThumbnailData: _getThumbnailsData,
                    });
                }
            }, { emitCurrentValue: true, clearSignal: cancelSignal });
        })
            .catch(function (err) {
            if (cancelSignal.isCancelled()) {
                return;
            }
            _this._onFatalError(err);
        });
        return corePlaybackObserver;
    };
    /**
     * Initialize content playback if and only if those conditions are filled:
     *   - The Manifest is fetched and stored in `this._currentContentInfo`.
     *   - `drmInitializationStatus` indicates that DRM matters are initialized.
     *   - `mediaSourceStatus` indicates that the MediaSource is attached to the
     *     `mediaElement`.
     *
     * In other cases, this method will do nothing.
     *
     * To call when any of those conditions might become `true`, to start-up
     * playback.
     *
     * @param {Object} parameters
     * @returns {boolean} - Returns `true` if all conditions where met for
     * playback start.
     */
    MultiThreadContentInitializer.prototype._startPlaybackIfReady = function (parameters) {
        var _this = this;
        if (this._currentContentInfo === null || this._currentContentInfo.manifest === null) {
            return false;
        }
        var drmInitStatus = parameters.drmInitializationStatus.getValue();
        if (drmInitStatus.initializationState.type !== "initialized") {
            return false;
        }
        var msInitStatus = parameters.mediaSourceStatus.getValue();
        if (msInitStatus !== 2 /* MediaSourceInitializationStatus.Attached */) {
            return false;
        }
        var _a = this._currentContentInfo, contentId = _a.contentId, manifest = _a.manifest;
        log_1.default.debug("Init", "Calculating initial time");
        var initialTime = (0, get_initial_time_1.default)(manifest, this._settings.lowLatencyMode, this._settings.startAt);
        log_1.default.debug("Init", "Initial time calculated", { initialTime: initialTime });
        var _b = this._settings.bufferOptions, enableFastSwitching = _b.enableFastSwitching, onCodecSwitch = _b.onCodecSwitch;
        var corePlaybackObserver = this._setUpModulesOnNewMediaSource({
            initialTime: initialTime,
            autoPlay: this._settings.autoPlay,
            mediaElement: parameters.mediaElement,
            textDisplayer: parameters.textDisplayer,
            playbackObserver: parameters.playbackObserver,
        }, this._currentMediaSourceCanceller.signal);
        if (this._currentMediaSourceCanceller.isUsed() || corePlaybackObserver === null) {
            return true;
        }
        var initialObservation = corePlaybackObserver.getReference().getValue();
        var sentInitialObservation = (0, object_assign_1.default)(initialObservation, {
            position: initialObservation.position.serialize(),
        });
        (0, send_message_1.default)(this._settings.worker, {
            type: "start" /* MainThreadMessageType.StartPreparedContent */,
            contentId: contentId,
            value: {
                initialTime: initialTime,
                initialObservation: sentInitialObservation,
                drmSystemId: drmInitStatus.drmSystemId,
                enableFastSwitching: enableFastSwitching,
                onCodecSwitch: onCodecSwitch,
            },
        });
        corePlaybackObserver.listen(function (obs) {
            (0, send_message_1.default)(_this._settings.worker, {
                type: "observation" /* MainThreadMessageType.PlaybackObservation */,
                contentId: contentId,
                value: (0, object_assign_1.default)(obs, { position: obs.position.serialize() }),
            });
        }, {
            includeLastObservation: false,
            clearSignal: this._currentMediaSourceCanceller.signal,
        });
        this.trigger("manifestReady", manifest);
        return true;
    };
    /**
     * Handles Worker messages asking to create a MediaSource.
     * @param {Object} msg - The worker's message received.
     * @param {HTMLMediaElement} mediaElement - HTMLMediaElement on which the
     * content plays.
     * @param {Worker} worker - The WebWorker concerned, messages may be sent back
     * to it.
     */
    MultiThreadContentInitializer.prototype._onCreateMediaSourceMessage = function (msg, mediaElement, mediaSourceStatus, worker) {
        var _this = this;
        var _a;
        if (((_a = this._currentContentInfo) === null || _a === void 0 ? void 0 : _a.contentId) !== msg.contentId) {
            log_1.default.info("Init", "Ignoring MediaSource attachment due to wrong `contentId`");
        }
        else {
            var mediaSourceId_1 = msg.mediaSourceId;
            try {
                mediaSourceStatus.onUpdate(function (currStatus, stopListening) {
                    var _a;
                    if (_this._currentContentInfo === null) {
                        stopListening();
                        return;
                    }
                    if (currStatus === 1 /* MediaSourceInitializationStatus.AttachNow */) {
                        stopListening();
                        var mediaSource_3 = new main_media_source_interface_1.default(mediaSourceId_1);
                        if (((_a = _this._currentContentInfo.mediaSourceInfo) === null || _a === void 0 ? void 0 : _a.type) === "main") {
                            _this._currentContentInfo.mediaSourceInfo.mediaSource.dispose();
                        }
                        _this._currentContentInfo.mediaSourceInfo = {
                            type: "main",
                            mediaSource: mediaSource_3,
                        };
                        mediaSource_3.addEventListener("mediaSourceOpen", function () {
                            (0, send_message_1.default)(worker, {
                                type: "media-source-ready-state-change" /* MainThreadMessageType.MediaSourceReadyStateChange */,
                                mediaSourceId: mediaSourceId_1,
                                value: "open",
                            });
                        });
                        mediaSource_3.addEventListener("mediaSourceEnded", function () {
                            (0, send_message_1.default)(worker, {
                                type: "media-source-ready-state-change" /* MainThreadMessageType.MediaSourceReadyStateChange */,
                                mediaSourceId: mediaSourceId_1,
                                value: "ended",
                            });
                        });
                        mediaSource_3.addEventListener("mediaSourceClose", function () {
                            (0, send_message_1.default)(worker, {
                                type: "media-source-ready-state-change" /* MainThreadMessageType.MediaSourceReadyStateChange */,
                                mediaSourceId: mediaSourceId_1,
                                value: "closed",
                            });
                        });
                        var url_1 = null;
                        if (mediaSource_3.handle.type === "handle") {
                            mediaElement.srcObject = mediaSource_3.handle.value;
                        }
                        else {
                            url_1 = URL.createObjectURL(mediaSource_3.handle.value);
                            mediaElement.src = url_1;
                        }
                        _this._currentMediaSourceCanceller.signal.register(function () {
                            mediaSource_3.dispose();
                            (0, create_media_source_1.resetMediaElement)(mediaElement, url_1);
                        });
                        mediaSourceStatus.setValue(2 /* MediaSourceInitializationStatus.Attached */);
                        (0, create_media_source_1.disableRemotePlaybackOnManagedMediaSource)(mediaElement, _this._currentMediaSourceCanceller.signal);
                    }
                }, {
                    emitCurrentValue: true,
                    clearSignal: this._currentMediaSourceCanceller.signal,
                });
            }
            catch (_err) {
                var error = new errors_1.OtherError("NONE", "Unknown error when creating the MediaSource");
                this._onFatalError(error);
            }
        }
    };
    return MultiThreadContentInitializer;
}(types_1.ContentInitializer));
exports.default = MultiThreadContentInitializer;
function bindNumberReferencesToWorker(worker, cancellationSignal) {
    var e_2, _a;
    var refs = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        refs[_i - 2] = arguments[_i];
    }
    var _loop_1 = function (ref) {
        ref[0].onUpdate(function (newVal) {
            // NOTE: The TypeScript checks have already been made by this function's
            // overload, but the body here is not aware of that.
            (0, send_message_1.default)(worker, {
                type: "ref-update" /* MainThreadMessageType.ReferenceUpdate */,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
                value: { name: ref[1], newVal: newVal },
            });
        }, { clearSignal: cancellationSignal, emitCurrentValue: true });
    };
    try {
        for (var refs_1 = __values(refs), refs_1_1 = refs_1.next(); !refs_1_1.done; refs_1_1 = refs_1.next()) {
            var ref = refs_1_1.value;
            _loop_1(ref);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (refs_1_1 && !refs_1_1.done && (_a = refs_1.return)) _a.call(refs_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
}
function formatWorkerError(sentError) {
    switch (sentError.name) {
        case "NetworkError":
            return new errors_1.NetworkError(sentError.code, new request_1.RequestError(sentError.baseError.url, sentError.baseError.status, sentError.baseError.type));
        case "MediaError":
            // eslint-disable-next-line
            return new errors_1.MediaError(sentError.code, sentError.reason, {
                tracks: sentError.tracks,
            });
        case "EncryptedMediaError":
            // We assume that everything have already been checked Worker-side here
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            return new errors_1.EncryptedMediaError(sentError.code, sentError.reason, {
                keyStatuses: sentError.keyStatuses,
                keySystemConfiguration: sentError.keySystemConfiguration,
                keySystem: sentError.keySystem,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            });
        case "OtherError":
            return new errors_1.OtherError(sentError.code, sentError.reason);
    }
}
function formatSourceBufferError(error) {
    if (error instanceof errors_1.SourceBufferError) {
        return error;
    }
    else if (error instanceof Error) {
        return new errors_1.SourceBufferError(error.name, error.message, error.name === "QuotaExceededError");
    }
    else {
        return new errors_1.SourceBufferError("Error", "Unknown SourceBufferError Error", false);
    }
}
/**
 * The Core might send back logs. In that situation, the message might be
 * formatted slightly differently to be able to cross threads (so a
 * serializable format has to be sent).
 *
 * This function translates that Core format to what's expected by the
 * logger.
 *
 * @param {*} arg
 * @returns {*}
 */
function formatSentLogObject(arg) {
    if (typeof arg !== "object") {
        return arg;
    }
    if ((arg === null || arg === void 0 ? void 0 : arg.isSerializedError) === true) {
        return formatWorkerError(arg);
    }
    return arg;
}
