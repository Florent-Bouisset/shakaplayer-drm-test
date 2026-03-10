"use strict";
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
exports.default = initializeWorkerMain;
var config_1 = require("../../../config");
var errors_1 = require("../../../errors");
var features_1 = require("../../../features");
var log_1 = require("../../../log");
var classes_1 = require("../../../manifest/classes");
var js_parser_1 = require("../../../parsers/manifest/dash/js-parser");
var wasm_parser_1 = require("../../../parsers/manifest/dash/wasm-parser");
var playback_observer_1 = require("../../../playback_observer");
var worker_playback_observer_1 = require("../../../playback_observer/worker_playback_observer");
var dash_1 = require("../../../transports/dash");
var array_find_1 = require("../../../utils/array_find");
var assert_1 = require("../../../utils/assert");
var global_scope_1 = require("../../../utils/global_scope");
var monotonic_timestamp_1 = require("../../../utils/monotonic_timestamp");
var object_assign_1 = require("../../../utils/object_assign");
var reference_1 = require("../../../utils/reference");
var task_canceller_1 = require("../../../utils/task_canceller");
var stream_1 = require("../../stream");
var create_content_time_boundaries_observer_1 = require("../common/create_content_time_boundaries_observer");
var get_buffered_data_per_media_buffer_1 = require("../common/get_buffered_data_per_media_buffer");
var get_thumbnail_data_1 = require("../common/get_thumbnail_data");
var synchronize_sinks_on_observation_1 = require("../common/synchronize_sinks_on_observation");
var content_preparer_1 = require("./content_preparer");
var globals_1 = require("./globals");
var send_message_1 = require("./send_message");
function initializeWorkerMain() {
    /**
     * `true` once the worker has been initialized.
     * Allow to enforce the fact that it is only initialized once.
     */
    var isInitialized = false;
    /**
     * Abstraction allowing to prepare contents (fetching its manifest as
     * well as creating and reloading its MediaSource) for playback.
     *
     * Creating a default one which may change on initialization.
     */
    var contentPreparer = new content_preparer_1.default({ hasVideo: true });
    /**
     * Object allowing to control the lifecycle of the current content (stop/reload etc.).
     * `null` if there's no content loaded currently.
     */
    var currentContentHandle = null;
    // Initialize Manually a `DashWasmParser` and add the feature.
    // TODO allow worker-side feature-switching? Not sure how
    var dashWasmParser = new wasm_parser_1.default();
    features_1.default.dashParsers.wasm = dashWasmParser;
    features_1.default.dashParsers.js = js_parser_1.default;
    features_1.default.transports.dash = dash_1.default;
    /**
     * When set, emit playback observation made on the main thread.
     */
    var playbackObservationRef = null;
    global_scope_1.default.onmessageerror = function (_msg) {
        log_1.default.error("Core", "Error when receiving message from main thread.");
    };
    onmessage = function (e) {
        var _a, _b;
        log_1.default.debug("Core", "received message", { name: e.data.type });
        var msg = e.data;
        switch (msg.type) {
            case "init" /* MainThreadMessageType.Init */:
                (0, assert_1.default)(!isInitialized);
                isInitialized = true;
                (0, monotonic_timestamp_1.scaleTimestamp)(msg.value);
                updateLoggerLevel(msg.value.logLevel, msg.value.logFormat, msg.value.sendBackLogs);
                if (msg.value.dashWasmUrl !== undefined && dashWasmParser.isCompatible()) {
                    dashWasmParser.initialize({ wasmUrl: msg.value.dashWasmUrl }).catch(function (err) {
                        var error = err instanceof Error ? err.toString() : "Unknown Error";
                        log_1.default.error("Core", "Could not initialize DASH_WASM parser", error);
                    });
                }
                if (!msg.value.hasVideo) {
                    contentPreparer.disposeCurrentContent();
                    contentPreparer = new content_preparer_1.default({ hasVideo: msg.value.hasVideo });
                }
                (0, send_message_1.default)({ type: "init-success" /* WorkerMessageType.InitSuccess */, value: null });
                break;
            case "log-level-update" /* MainThreadMessageType.LogLevelUpdate */:
                updateLoggerLevel(msg.value.logLevel, msg.value.logFormat, msg.value.sendBackLogs);
                break;
            case "prepare" /* MainThreadMessageType.PrepareContent */:
                prepareNewContent(contentPreparer, msg.value);
                break;
            case "start" /* MainThreadMessageType.StartPreparedContent */: {
                var preparedContent = contentPreparer.getCurrentContent();
                if (msg.contentId !== (preparedContent === null || preparedContent === void 0 ? void 0 : preparedContent.contentId)) {
                    return;
                }
                currentContentHandle === null || currentContentHandle === void 0 ? void 0 : currentContentHandle.stop();
                playbackObservationRef === null || playbackObservationRef === void 0 ? void 0 : playbackObservationRef.finish();
                var currentContentObservationRef = new reference_1.default((0, object_assign_1.default)(msg.value.initialObservation, {
                    position: new (playback_observer_1.ObservationPosition.bind.apply(playback_observer_1.ObservationPosition, __spreadArray([void 0], __read(msg.value.initialObservation.position), false)))(),
                }));
                playbackObservationRef = currentContentObservationRef;
                currentContentHandle = loadPreparedContent(msg.value, contentPreparer, currentContentObservationRef);
                break;
            }
            case "observation" /* MainThreadMessageType.PlaybackObservation */: {
                var currentContent = contentPreparer.getCurrentContent();
                if (msg.contentId !== (currentContent === null || currentContent === void 0 ? void 0 : currentContent.contentId)) {
                    return;
                }
                var observation = msg.value;
                var buffered = observation.buffered;
                var newBuffered = (0, get_buffered_data_per_media_buffer_1.default)(currentContent.mediaSource, null);
                if (newBuffered.audio !== null) {
                    buffered.audio = newBuffered.audio;
                }
                if (newBuffered.video !== null) {
                    buffered.video = newBuffered.video;
                }
                playbackObservationRef === null || playbackObservationRef === void 0 ? void 0 : playbackObservationRef.setValue((0, object_assign_1.default)(observation, {
                    position: new (playback_observer_1.ObservationPosition.bind.apply(playback_observer_1.ObservationPosition, __spreadArray([void 0], __read(msg.value.position), false)))(),
                }));
                break;
            }
            case "ref-update" /* MainThreadMessageType.ReferenceUpdate */:
                updateGlobalReference(msg);
                break;
            case "stop" /* MainThreadMessageType.StopContent */:
                if (msg.contentId !== ((_a = contentPreparer.getCurrentContent()) === null || _a === void 0 ? void 0 : _a.contentId)) {
                    return;
                }
                contentPreparer.disposeCurrentContent();
                currentContentHandle === null || currentContentHandle === void 0 ? void 0 : currentContentHandle.stop();
                currentContentHandle = null;
                playbackObservationRef === null || playbackObservationRef === void 0 ? void 0 : playbackObservationRef.finish();
                playbackObservationRef = null;
                break;
            case "ms-reload" /* MainThreadMessageType.MediaSourceReload */:
                {
                    var preparedContent = contentPreparer.getCurrentContent();
                    if (msg.mediaSourceId !== (preparedContent === null || preparedContent === void 0 ? void 0 : preparedContent.mediaSource.id)) {
                        return;
                    }
                    currentContentHandle === null || currentContentHandle === void 0 ? void 0 : currentContentHandle.signalMediaSourceReload();
                }
                break;
            case "sb-success" /* MainThreadMessageType.SourceBufferSuccess */: {
                var preparedContent = contentPreparer.getCurrentContent();
                if (msg.mediaSourceId !== (preparedContent === null || preparedContent === void 0 ? void 0 : preparedContent.mediaSource.id)) {
                    return;
                }
                var sourceBuffers = preparedContent.mediaSource.sourceBuffers;
                var sourceBuffer = (0, array_find_1.default)(sourceBuffers, function (s) { return s.type === msg.sourceBufferType; });
                if (sourceBuffer === undefined) {
                    log_1.default.info("Core", "Success for an unknown SourceBuffer", {
                        sourceBufferType: msg.sourceBufferType,
                    });
                    return;
                }
                if (sourceBuffer.onOperationSuccess === undefined) {
                    log_1.default.warn("Core", "A SourceBufferInterface with MSE performed a cross-thread operation", { sourceBufferType: msg.sourceBufferType });
                    return;
                }
                sourceBuffer.onOperationSuccess(msg.operationId, msg.value.buffered);
                break;
            }
            case "sb-error" /* MainThreadMessageType.SourceBufferError */: {
                var preparedContent = contentPreparer.getCurrentContent();
                if (msg.mediaSourceId !== (preparedContent === null || preparedContent === void 0 ? void 0 : preparedContent.mediaSource.id)) {
                    return;
                }
                var sourceBuffers = preparedContent.mediaSource.sourceBuffers;
                var sourceBuffer = (0, array_find_1.default)(sourceBuffers, function (s) { return s.type === msg.sourceBufferType; });
                if (sourceBuffer === undefined) {
                    log_1.default.info("Core", "Error for an unknown SourceBuffer", {
                        sourceBufferType: msg.sourceBufferType,
                    });
                    return;
                }
                if (sourceBuffer.onOperationFailure === undefined) {
                    log_1.default.warn("Core", "A SourceBufferInterface with MSE performed a cross-thread operation", {
                        sourceBufferType: msg.sourceBufferType,
                    });
                    return;
                }
                sourceBuffer.onOperationFailure(msg.operationId, msg.value);
                break;
            }
            case "media-source-ready-state-change" /* MainThreadMessageType.MediaSourceReadyStateChange */: {
                var preparedContent = contentPreparer.getCurrentContent();
                if (msg.mediaSourceId !== (preparedContent === null || preparedContent === void 0 ? void 0 : preparedContent.mediaSource.id)) {
                    return;
                }
                if (preparedContent.mediaSource.onMediaSourceReadyStateChanged === undefined) {
                    log_1.default.warn("Core", "A MediaSourceInterface with MSE performed a cross-thread operation");
                    return;
                }
                preparedContent.mediaSource.onMediaSourceReadyStateChanged(msg.value);
                break;
            }
            case "decipherability-update" /* MainThreadMessageType.DecipherabilityStatusUpdate */: {
                if (msg.contentId !== ((_b = contentPreparer.getCurrentContent()) === null || _b === void 0 ? void 0 : _b.contentId)) {
                    return;
                }
                var currentContent = contentPreparer.getCurrentContent();
                if (currentContent === null || currentContent.manifest === null) {
                    return;
                }
                var updates_1 = msg.value;
                currentContent.manifest.updateRepresentationsDeciperability(function (content) {
                    var e_1, _a;
                    try {
                        for (var updates_2 = __values(updates_1), updates_2_1 = updates_2.next(); !updates_2_1.done; updates_2_1 = updates_2.next()) {
                            var update = updates_2_1.value;
                            if (content.representation.uniqueId === update.representationUniqueId) {
                                return update.decipherable;
                            }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (updates_2_1 && !updates_2_1.done && (_a = updates_2.return)) _a.call(updates_2);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    return content.representation.decipherable;
                });
                break;
            }
            case "codec-support-update" /* MainThreadMessageType.CodecSupportUpdate */: {
                var preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.manifest === null) {
                    return;
                }
                var newEvaluatedCodecs = msg.value;
                try {
                    var warning = preparedContent.manifest.updateCodecSupport(newEvaluatedCodecs);
                    if (warning !== null) {
                        (0, send_message_1.default)({
                            type: "warning" /* WorkerMessageType.Warning */,
                            contentId: preparedContent.contentId,
                            value: (0, send_message_1.formatErrorForSender)(warning),
                        });
                    }
                }
                catch (err) {
                    (0, send_message_1.default)({
                        type: "error" /* WorkerMessageType.Error */,
                        contentId: preparedContent.contentId,
                        value: (0, send_message_1.formatErrorForSender)(err),
                    });
                }
                break;
            }
            case "urls-update" /* MainThreadMessageType.ContentUrlsUpdate */: {
                var preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                preparedContent.manifestFetcher.updateContentUrls(msg.value.urls, msg.value.refreshNow);
                break;
            }
            case "track-update" /* MainThreadMessageType.TrackUpdate */: {
                var preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                preparedContent.trackChoiceSetter.setTrack(msg.value.periodId, msg.value.bufferType, msg.value.choice);
                break;
            }
            case "rep-update" /* MainThreadMessageType.RepresentationUpdate */: {
                var preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                preparedContent.trackChoiceSetter.updateRepresentations(msg.value.periodId, msg.value.adaptationId, msg.value.bufferType, msg.value.choice);
                break;
            }
            case "add-text-success" /* MainThreadMessageType.PushTextDataSuccess */: {
                var preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                if (preparedContent.workerTextSender === null) {
                    log_1.default.error("Core", "Added text track but text track aren't enabled");
                    return;
                }
                preparedContent.workerTextSender.onPushedTrackSuccess(msg.value.ranges);
                break;
            }
            case "push-text-error" /* MainThreadMessageType.PushTextDataError */: {
                var preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                if (preparedContent.workerTextSender === null) {
                    log_1.default.error("Core", "Added text track but text track aren't enabled");
                    return;
                }
                preparedContent.workerTextSender.onPushedTrackError(new Error(msg.value.message));
                break;
            }
            case "remove-text-success" /* MainThreadMessageType.RemoveTextDataSuccess */: {
                var preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                if (preparedContent.workerTextSender === null) {
                    log_1.default.error("Core", "Removed text track but text track aren't enabled");
                    return;
                }
                preparedContent.workerTextSender.onRemoveSuccess(msg.value.ranges);
                break;
            }
            case "remove-text-error" /* MainThreadMessageType.RemoveTextDataError */: {
                var preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                if (preparedContent.workerTextSender === null) {
                    log_1.default.error("Core", "Removed text track but text track aren't enabled");
                    return;
                }
                preparedContent.workerTextSender.onRemoveError(new Error(msg.value.message));
                break;
            }
            case "pull-segment-sink-store-infos" /* MainThreadMessageType.PullSegmentSinkStoreInfos */: {
                sendSegmentSinksStoreInfos(contentPreparer, msg.value.requestId);
                break;
            }
            case "thumbnail-request" /* MainThreadMessageType.ThumbnailDataRequest */: {
                sendThumbnailData(contentPreparer, msg);
                break;
            }
            case "config-update" /* MainThreadMessageType.ConfigUpdate */: {
                config_1.default.update(msg.value);
                break;
            }
            default:
                (0, assert_1.assertUnreachable)(msg);
        }
    };
}
function prepareNewContent(contentPreparer, contentInitData) {
    contentPreparer.initializeNewContent(contentInitData).then(function (manifest) {
        (0, send_message_1.default)({
            type: "manifest-ready" /* WorkerMessageType.ManifestReady */,
            contentId: contentInitData.contentId,
            value: { manifest: manifest },
        });
    }, function (err) {
        (0, send_message_1.default)({
            type: "error" /* WorkerMessageType.Error */,
            contentId: contentInitData.contentId,
            value: (0, send_message_1.formatErrorForSender)(err),
        });
    });
}
function updateGlobalReference(msg) {
    switch (msg.value.name) {
        case "wantedBufferAhead":
            globals_1.wantedBufferAhead.setValueIfChanged(msg.value.newVal);
            break;
        case "maxVideoBufferSize":
            globals_1.maxVideoBufferSize.setValueIfChanged(msg.value.newVal);
            break;
        case "maxBufferBehind":
            globals_1.maxBufferBehind.setValueIfChanged(msg.value.newVal);
            break;
        case "maxBufferAhead":
            globals_1.maxBufferAhead.setValueIfChanged(msg.value.newVal);
            break;
        case "limitVideoResolution":
            globals_1.limitVideoResolution.setValueIfChanged(msg.value.newVal);
            break;
        case "throttleVideoBitrate":
            globals_1.throttleVideoBitrate.setValueIfChanged(msg.value.newVal);
            break;
        default:
            (0, assert_1.assertUnreachable)(msg.value);
    }
}
function loadPreparedContent(val, contentPreparer, playbackObservationRef) {
    log_1.default.debug("Core", "Loading pepared content.");
    var contentCanceller = new task_canceller_1.default();
    var currentLoadCanceller = null;
    startLoadingAt(val.initialTime);
    return {
        signalMediaSourceReload: function () {
            return onMediaSourceReload();
        },
        stop: function () {
            contentCanceller.cancel();
        },
    };
    function startLoadingAt(startTime) {
        var _a;
        currentLoadCanceller === null || currentLoadCanceller === void 0 ? void 0 : currentLoadCanceller.cancel();
        currentLoadCanceller = new task_canceller_1.default();
        currentLoadCanceller.linkToSignal(contentCanceller.signal);
        /**
         * Stores last discontinuity update sent to the worker for each Period and type
         * combinations, at least until the corresponding `PeriodStreamCleared`
         * message.
         *
         * This is an optimization to avoid sending too much discontinuity messages to
         * the main thread when it is not needed because nothing changed.
         */
        var lastSentDiscontinuitiesStore = new Map();
        var preparedContent = contentPreparer.getCurrentContent();
        if (preparedContent === null || preparedContent.manifest === null) {
            var error = new errors_1.OtherError("NONE", "Loading content when none is prepared");
            (0, send_message_1.default)({
                type: "error" /* WorkerMessageType.Error */,
                contentId: undefined,
                value: (0, send_message_1.formatErrorForSender)(error),
            });
            throw error;
        }
        var contentId = preparedContent.contentId, cmcdDataBuilder = preparedContent.cmcdDataBuilder, enableRepresentationAvoidance = preparedContent.enableRepresentationAvoidance, manifest = preparedContent.manifest, mediaSource = preparedContent.mediaSource, representationEstimator = preparedContent.representationEstimator, segmentSinksStore = preparedContent.segmentSinksStore, segmentQueueCreator = preparedContent.segmentQueueCreator;
        var drmSystemId = val.drmSystemId, enableFastSwitching = val.enableFastSwitching, onCodecSwitch = val.onCodecSwitch;
        playbackObservationRef.onUpdate(function (observation) {
            (0, synchronize_sinks_on_observation_1.default)(observation, segmentSinksStore);
            var freezeResolution = preparedContent.freezeResolver.onNewObservation(observation);
            if (freezeResolution !== null) {
                handleFreezeResolution(freezeResolution, {
                    contentId: contentId,
                    manifest: manifest,
                    handleMediaSourceReload: performMediaSourceReload,
                    enableRepresentationAvoidance: enableRepresentationAvoidance,
                });
            }
        }, { clearSignal: currentLoadCanceller.signal });
        var initialPeriod = (_a = manifest.getPeriodForTime(startTime)) !== null && _a !== void 0 ? _a : manifest.getNextPeriod(startTime);
        if (initialPeriod === undefined) {
            var error = new errors_1.MediaError("MEDIA_STARTING_TIME_NOT_FOUND", "Wanted starting time not found in the Manifest.");
            (0, send_message_1.default)({
                type: "error" /* WorkerMessageType.Error */,
                contentId: contentId,
                value: (0, send_message_1.formatErrorForSender)(error),
            });
            throw error;
        }
        var playbackObserver = new worker_playback_observer_1.default(playbackObservationRef, contentId, send_message_1.default, currentLoadCanceller.signal);
        cmcdDataBuilder === null || cmcdDataBuilder === void 0 ? void 0 : cmcdDataBuilder.startMonitoringPlayback(playbackObserver);
        currentLoadCanceller.signal.register(function () {
            cmcdDataBuilder === null || cmcdDataBuilder === void 0 ? void 0 : cmcdDataBuilder.stopMonitoringPlayback();
        });
        var contentTimeBoundariesObserver = (0, create_content_time_boundaries_observer_1.default)(manifest, mediaSource, playbackObserver, segmentSinksStore, {
            onWarning: function (err) {
                return (0, send_message_1.default)({
                    type: "warning" /* WorkerMessageType.Warning */,
                    contentId: contentId,
                    value: (0, send_message_1.formatErrorForSender)(err),
                });
            },
            onPeriodChanged: function (period) {
                (0, send_message_1.default)({
                    type: "active-period-changed" /* WorkerMessageType.ActivePeriodChanged */,
                    contentId: contentId,
                    value: { periodId: period.id },
                });
            },
        }, currentLoadCanceller.signal);
        (0, stream_1.default)({ initialPeriod: initialPeriod, manifest: manifest }, playbackObserver, representationEstimator, segmentSinksStore, segmentQueueCreator, {
            wantedBufferAhead: globals_1.wantedBufferAhead,
            maxVideoBufferSize: globals_1.maxVideoBufferSize,
            maxBufferAhead: globals_1.maxBufferAhead,
            maxBufferBehind: globals_1.maxBufferBehind,
            drmSystemId: drmSystemId,
            enableFastSwitching: enableFastSwitching,
            onCodecSwitch: onCodecSwitch,
        }, handleStreamOrchestratorCallbacks(), currentLoadCanceller.signal);
        /**
         * Returns Object handling the callbacks from a `StreamOrchestrator`, which
         * are basically how it communicates about events.
         * @returns {Object}
         */
        function handleStreamOrchestratorCallbacks() {
            return {
                needsBufferFlush: function (payload) {
                    (0, send_message_1.default)({
                        type: "needs-buffer-flush" /* WorkerMessageType.NeedsBufferFlush */,
                        contentId: contentId,
                        value: payload,
                    });
                },
                streamStatusUpdate: function (value) {
                    sendDiscontinuityUpdateIfNeeded(value);
                    // If the status for the last Period indicates that segments are all loaded
                    // or on the contrary that the loading resumed, announce it to the
                    // ContentTimeBoundariesObserver.
                    if (manifest.isLastPeriodKnown &&
                        value.period.id === manifest.periods[manifest.periods.length - 1].id) {
                        var hasFinishedLoadingLastPeriod = value.hasFinishedLoading || value.isEmptyStream;
                        if (hasFinishedLoadingLastPeriod) {
                            contentTimeBoundariesObserver.onLastSegmentFinishedLoading(value.bufferType);
                        }
                        else {
                            contentTimeBoundariesObserver.onLastSegmentLoadingResume(value.bufferType);
                        }
                    }
                },
                needsManifestRefresh: function () {
                    contentPreparer.scheduleManifestRefresh({
                        enablePartialRefresh: true,
                        canUseUnsafeMode: true,
                    });
                },
                manifestMightBeOufOfSync: function () {
                    var OUT_OF_SYNC_MANIFEST_REFRESH_DELAY = config_1.default.getCurrent().OUT_OF_SYNC_MANIFEST_REFRESH_DELAY;
                    contentPreparer.scheduleManifestRefresh({
                        enablePartialRefresh: false,
                        canUseUnsafeMode: false,
                        delay: OUT_OF_SYNC_MANIFEST_REFRESH_DELAY,
                    });
                },
                lockedStream: function (payload) {
                    (0, send_message_1.default)({
                        type: "locked-stream" /* WorkerMessageType.LockedStream */,
                        contentId: contentId,
                        value: {
                            periodId: payload.period.id,
                            bufferType: payload.bufferType,
                        },
                    });
                },
                adaptationChange: function (value) {
                    var _a, _b;
                    contentTimeBoundariesObserver.onAdaptationChange(value.type, value.period, value.adaptation);
                    if (currentLoadCanceller === null ||
                        currentLoadCanceller.signal.isCancelled()) {
                        return;
                    }
                    (0, send_message_1.default)({
                        type: "adaptation-changed" /* WorkerMessageType.AdaptationChanged */,
                        contentId: contentId,
                        value: {
                            adaptationId: (_b = (_a = value.adaptation) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null,
                            periodId: value.period.id,
                            type: value.type,
                        },
                    });
                },
                representationChange: function (value) {
                    var _a, _b;
                    contentTimeBoundariesObserver.onRepresentationChange(value.type, value.period);
                    if (currentLoadCanceller === null ||
                        currentLoadCanceller.signal.isCancelled()) {
                        return;
                    }
                    (0, send_message_1.default)({
                        type: "representation-changed" /* WorkerMessageType.RepresentationChanged */,
                        contentId: contentId,
                        value: {
                            adaptationId: value.adaptation.id,
                            representationId: (_b = (_a = value.representation) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null,
                            periodId: value.period.id,
                            type: value.type,
                        },
                    });
                },
                inbandEvent: function (value) {
                    (0, send_message_1.default)({
                        type: "inband-event" /* WorkerMessageType.InbandEvent */,
                        contentId: contentId,
                        value: value,
                    });
                },
                warning: function (value) {
                    (0, send_message_1.default)({
                        type: "warning" /* WorkerMessageType.Warning */,
                        contentId: contentId,
                        value: (0, send_message_1.formatErrorForSender)(value),
                    });
                },
                periodStreamReady: function (value) {
                    if (preparedContent === null) {
                        return;
                    }
                    preparedContent.trackChoiceSetter.addTrackSetter(value.period.id, value.type, value.adaptationRef);
                    (0, send_message_1.default)({
                        type: "period-stream-ready" /* WorkerMessageType.PeriodStreamReady */,
                        contentId: contentId,
                        value: { periodId: value.period.id, bufferType: value.type },
                    });
                },
                periodStreamCleared: function (value) {
                    if (preparedContent === null) {
                        return;
                    }
                    var periodDiscontinuitiesStore = lastSentDiscontinuitiesStore.get(value.period);
                    if (periodDiscontinuitiesStore !== undefined) {
                        periodDiscontinuitiesStore.delete(value.type);
                        if (periodDiscontinuitiesStore.size === 0) {
                            lastSentDiscontinuitiesStore.delete(value.period);
                        }
                    }
                    contentTimeBoundariesObserver.onPeriodCleared(value.type, value.period);
                    preparedContent.trackChoiceSetter.removeTrackSetter(value.period.id, value.type);
                    (0, send_message_1.default)({
                        type: "period-stream-cleared" /* WorkerMessageType.PeriodStreamCleared */,
                        contentId: contentId,
                        value: { periodId: value.period.id, bufferType: value.type },
                    });
                },
                bitrateEstimateChange: function (payload) {
                    var _a;
                    if (preparedContent !== null) {
                        (_a = preparedContent.cmcdDataBuilder) === null || _a === void 0 ? void 0 : _a.updateThroughput(payload.type, payload.bitrate);
                    }
                    // TODO for low-latency contents it is __VERY__ frequent.
                    // Considering this is only for an unimportant undocumented API, we may
                    // throttle such messages. (e.g. max one per 2 seconds for each type?).
                    (0, send_message_1.default)({
                        type: "bitrate-estimate-change" /* WorkerMessageType.BitrateEstimateChange */,
                        contentId: contentId,
                        value: {
                            bitrate: payload.bitrate,
                            bufferType: payload.type,
                        },
                    });
                },
                needsMediaSourceReload: function (payload) {
                    performMediaSourceReload(payload);
                },
                needsDecipherabilityFlush: function () {
                    (0, send_message_1.default)({
                        type: "needs-decipherability-flush" /* WorkerMessageType.NeedsDecipherabilityFlush */,
                        contentId: contentId,
                        value: null,
                    });
                },
                encryptionDataEncountered: function (values) {
                    var e_2, _a;
                    try {
                        for (var values_1 = __values(values), values_1_1 = values_1.next(); !values_1_1.done; values_1_1 = values_1.next()) {
                            var value = values_1_1.value;
                            var originalContent = value.content;
                            var content = __assign({}, originalContent);
                            if (content.manifest instanceof classes_1.default) {
                                content.manifest = content.manifest.getMetadataSnapshot();
                            }
                            if (content.period instanceof classes_1.Period) {
                                content.period = content.period.getMetadataSnapshot();
                            }
                            if (content.adaptation instanceof classes_1.Adaptation) {
                                content.adaptation = content.adaptation.getMetadataSnapshot();
                            }
                            if (content.representation instanceof classes_1.Representation) {
                                content.representation = content.representation.getMetadataSnapshot();
                            }
                            (0, send_message_1.default)({
                                type: "encryption-data-encountered" /* WorkerMessageType.EncryptionDataEncountered */,
                                contentId: contentId,
                                value: {
                                    keyIds: value.keyIds,
                                    values: value.values,
                                    content: content,
                                    type: value.type,
                                },
                            });
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (values_1_1 && !values_1_1.done && (_a = values_1.return)) _a.call(values_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                },
                error: function (error) {
                    (0, send_message_1.default)({
                        type: "error" /* WorkerMessageType.Error */,
                        contentId: contentId,
                        value: (0, send_message_1.formatErrorForSender)(error),
                    });
                },
            };
        }
        function sendDiscontinuityUpdateIfNeeded(value) {
            var imminentDiscontinuity = value.imminentDiscontinuity;
            var periodMap = lastSentDiscontinuitiesStore.get(value.period);
            var sentObjInfo = periodMap === null || periodMap === void 0 ? void 0 : periodMap.get(value.bufferType);
            if (sentObjInfo !== undefined) {
                if (sentObjInfo.discontinuity === null) {
                    if (imminentDiscontinuity === null) {
                        return;
                    }
                }
                else if (imminentDiscontinuity !== null &&
                    sentObjInfo.discontinuity.start === imminentDiscontinuity.start &&
                    sentObjInfo.discontinuity.end === imminentDiscontinuity.end) {
                    return;
                }
            }
            if (periodMap === undefined) {
                periodMap = new Map();
                lastSentDiscontinuitiesStore.set(value.period, periodMap);
            }
            var msgObj = {
                periodId: value.period.id,
                bufferType: value.bufferType,
                discontinuity: value.imminentDiscontinuity,
                position: value.position,
            };
            periodMap.set(value.bufferType, msgObj);
            (0, send_message_1.default)({
                type: "discontinuity-update" /* WorkerMessageType.DiscontinuityUpdate */,
                contentId: contentId,
                value: msgObj,
            });
        }
    }
    function performMediaSourceReload(payload) {
        var _a;
        if (currentLoadCanceller !== null) {
            currentLoadCanceller.cancel();
            currentLoadCanceller = null;
        }
        var mediaSourceId = (_a = contentPreparer.getCurrentContent()) === null || _a === void 0 ? void 0 : _a.mediaSource.id;
        if (mediaSourceId === undefined) {
            log_1.default.warn("Core", "Cannot reload MediaSource: no MediaSource currently.");
            return;
        }
        log_1.default.debug("Core", "Reloading MediaSource", {
            timeOffset: payload.timeOffset,
            minimumPosition: payload.minimumPosition,
            maximumPosition: payload.maximumPosition,
        });
        (0, send_message_1.default)({
            type: "reloading-media-source" /* WorkerMessageType.ReloadingMediaSource */,
            mediaSourceId: mediaSourceId,
            value: payload,
        }, []);
        onMediaSourceReload();
    }
    function onMediaSourceReload() {
        var _a;
        // TODO more precize one day?
        var lastObservation = playbackObservationRef.getValue();
        var newInitialTime = lastObservation.position.getWanted();
        if (currentLoadCanceller !== null) {
            currentLoadCanceller.cancel();
            currentLoadCanceller = null;
        }
        var contentId = (_a = contentPreparer.getCurrentContent()) === null || _a === void 0 ? void 0 : _a.contentId;
        contentPreparer.reloadMediaSource().then(function () {
            log_1.default.info("Core", "MediaSource Reloaded, loading content again", {
                newInitialTime: newInitialTime,
            });
            startLoadingAt(newInitialTime);
        }, function (err) {
            if (task_canceller_1.default.isCancellationError(err)) {
                log_1.default.info("Core", "A reloading operation was cancelled");
                return;
            }
            (0, send_message_1.default)({
                type: "error" /* WorkerMessageType.Error */,
                contentId: contentId,
                value: (0, send_message_1.formatErrorForSender)(err),
            });
        });
    }
}
function updateLoggerLevel(logLevel, logFormat, sendBackLogs) {
    if (!sendBackLogs) {
        log_1.default.setLevel(logLevel, logFormat);
    }
    else {
        // Here we force the log format to "standard" as the full formatting will be
        // performed on main thread.
        log_1.default.setLevel(logLevel, "standard", function (levelStr, namespace, logs) {
            var sentLogs = logs.map(function (e) {
                if (e instanceof Error) {
                    return (0, send_message_1.formatErrorForSender)(e);
                }
                return e;
            });
            // Not relying on `sendMessage` as it also logs
            postMessage({
                type: "log" /* WorkerMessageType.LogMessage */,
                value: {
                    namespace: namespace,
                    logLevel: levelStr,
                    logs: sentLogs,
                },
            });
        });
    }
}
/**
 * Send a message `SegmentSinkStoreUpdate` to the main thread with
 * a serialized object that represents the segmentSinksStore state.
 * @param {ContentPreparer} contentPreparer
 * @returns {void}
 */
function sendSegmentSinksStoreInfos(contentPreparer, requestId) {
    var currentContent = contentPreparer.getCurrentContent();
    if (currentContent === null) {
        return;
    }
    var segmentSinksMetrics = currentContent.segmentSinksStore.getSegmentSinksMetrics();
    (0, send_message_1.default)({
        type: "segment-sink-store-update" /* WorkerMessageType.SegmentSinkStoreUpdate */,
        contentId: currentContent.contentId,
        value: { segmentSinkMetrics: segmentSinksMetrics, requestId: requestId },
    });
}
/**
 * Handle accordingly an `IFreezeResolution` object.
 * @param {Object|null} freezeResolution - The `IFreezeResolution` suggested.
 * @param {Object} param - Parameters that might be needed to implement the
 * resolution.
 * @param {string} param.contentId - `contentId` for the current content, used
 * e.g. for message exchanges between threads.
 * @param {Object} param.manifest - The current content's Manifest object.
 * @param {Function} param.handleMediaSourceReload - Function to call if we need
 * to ask for a "MediaSource reload".
 * @param {Boolean} param.enableRepresentationAvoidance - If `true`, this
 * function is authorized to mark `Representation` as "to avoid" if the
 * `IFreezeResolution` object suggest it.
 */
function handleFreezeResolution(freezeResolution, _a) {
    var contentId = _a.contentId, manifest = _a.manifest, handleMediaSourceReload = _a.handleMediaSourceReload, enableRepresentationAvoidance = _a.enableRepresentationAvoidance;
    switch (freezeResolution.type) {
        case "reload": {
            log_1.default.info("Core", "Planning reload due to freeze");
            handleMediaSourceReload({
                timeOffset: 0,
                minimumPosition: 0,
                maximumPosition: Infinity,
            });
            break;
        }
        case "flush": {
            log_1.default.info("Core", "Flushing buffer due to freeze");
            (0, send_message_1.default)({
                type: "needs-buffer-flush" /* WorkerMessageType.NeedsBufferFlush */,
                contentId: contentId,
                value: {
                    relativeResumingPosition: freezeResolution.value.relativeSeek,
                    relativePosHasBeenDefaulted: false,
                },
            });
            break;
        }
        case "avoid-representations": {
            log_1.default.info("Core", "Planning Representation avoidance due to freeze");
            var content = freezeResolution.value;
            if (enableRepresentationAvoidance) {
                manifest.addRepresentationsToAvoid(content);
            }
            handleMediaSourceReload({
                timeOffset: 0,
                minimumPosition: 0,
                maximumPosition: Infinity,
            });
            break;
        }
        default:
            (0, assert_1.assertUnreachable)(freezeResolution);
    }
}
/**
 * Handles thumbnail requests and send back the result to the main thread.
 * @param {ContentPreparer} contentPreparer
 * @returns {void}
 */
function sendThumbnailData(contentPreparer, msg) {
    var preparedContent = contentPreparer.getCurrentContent();
    var respondWithError = function (err) {
        (0, send_message_1.default)({
            type: "thumbnail-response" /* WorkerMessageType.ThumbnailDataResponse */,
            contentId: msg.contentId,
            value: {
                status: "error",
                requestId: msg.value.requestId,
                error: (0, send_message_1.formatErrorForSender)(err),
            },
        });
    };
    if (preparedContent === null ||
        preparedContent.manifest === null ||
        preparedContent.contentId !== msg.contentId) {
        return respondWithError(new Error("Content changed"));
    }
    (0, get_thumbnail_data_1.default)(preparedContent.fetchThumbnailData, preparedContent.manifest, msg.value.periodId, msg.value.thumbnailTrackId, msg.value.time).then(function (result) {
        (0, send_message_1.default)({
            type: "thumbnail-response" /* WorkerMessageType.ThumbnailDataResponse */,
            contentId: msg.contentId,
            value: {
                status: "success",
                requestId: msg.value.requestId,
                data: result,
            },
        }, [result.data]);
    }, function (err) {
        return respondWithError(err);
    });
}
