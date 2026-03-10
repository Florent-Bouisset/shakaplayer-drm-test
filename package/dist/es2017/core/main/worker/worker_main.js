import config from "../../../config";
import { MediaError, OtherError } from "../../../errors";
import features from "../../../features";
import log from "../../../log";
import Manifest, { Adaptation, Period, Representation } from "../../../manifest/classes";
import DashJsParser from "../../../parsers/manifest/dash/js-parser";
import DashWasmParser from "../../../parsers/manifest/dash/wasm-parser";
import { ObservationPosition } from "../../../playback_observer";
import WorkerPlaybackObserver from "../../../playback_observer/worker_playback_observer";
import createDashPipelines from "../../../transports/dash";
import arrayFind from "../../../utils/array_find";
import assert, { assertUnreachable } from "../../../utils/assert";
import globalScope from "../../../utils/global_scope";
import { scaleTimestamp } from "../../../utils/monotonic_timestamp";
import objectAssign from "../../../utils/object_assign";
import SharedReference from "../../../utils/reference";
import TaskCanceller from "../../../utils/task_canceller";
import StreamOrchestrator from "../../stream";
import createContentTimeBoundariesObserver from "../common/create_content_time_boundaries_observer";
import getBufferedDataPerMediaBuffer from "../common/get_buffered_data_per_media_buffer";
import getThumbnailData from "../common/get_thumbnail_data";
import synchronizeSegmentSinksOnObservation from "../common/synchronize_sinks_on_observation";
import ContentPreparer from "./content_preparer";
import { limitVideoResolution, maxBufferAhead, maxBufferBehind, maxVideoBufferSize, throttleVideoBitrate, wantedBufferAhead, } from "./globals";
import sendMessage, { formatErrorForSender } from "./send_message";
export default function initializeWorkerMain() {
    /**
     * `true` once the worker has been initialized.
     * Allow to enforce the fact that it is only initialized once.
     */
    let isInitialized = false;
    /**
     * Abstraction allowing to prepare contents (fetching its manifest as
     * well as creating and reloading its MediaSource) for playback.
     *
     * Creating a default one which may change on initialization.
     */
    let contentPreparer = new ContentPreparer({ hasVideo: true });
    /**
     * Object allowing to control the lifecycle of the current content (stop/reload etc.).
     * `null` if there's no content loaded currently.
     */
    let currentContentHandle = null;
    // Initialize Manually a `DashWasmParser` and add the feature.
    // TODO allow worker-side feature-switching? Not sure how
    const dashWasmParser = new DashWasmParser();
    features.dashParsers.wasm = dashWasmParser;
    features.dashParsers.js = DashJsParser;
    features.transports.dash = createDashPipelines;
    /**
     * When set, emit playback observation made on the main thread.
     */
    let playbackObservationRef = null;
    globalScope.onmessageerror = (_msg) => {
        log.error("Core", "Error when receiving message from main thread.");
    };
    onmessage = function (e) {
        var _a, _b;
        log.debug("Core", "received message", { name: e.data.type });
        const msg = e.data;
        switch (msg.type) {
            case "init" /* MainThreadMessageType.Init */:
                assert(!isInitialized);
                isInitialized = true;
                scaleTimestamp(msg.value);
                updateLoggerLevel(msg.value.logLevel, msg.value.logFormat, msg.value.sendBackLogs);
                if (msg.value.dashWasmUrl !== undefined && dashWasmParser.isCompatible()) {
                    dashWasmParser.initialize({ wasmUrl: msg.value.dashWasmUrl }).catch((err) => {
                        const error = err instanceof Error ? err.toString() : "Unknown Error";
                        log.error("Core", "Could not initialize DASH_WASM parser", error);
                    });
                }
                if (!msg.value.hasVideo) {
                    contentPreparer.disposeCurrentContent();
                    contentPreparer = new ContentPreparer({ hasVideo: msg.value.hasVideo });
                }
                sendMessage({ type: "init-success" /* WorkerMessageType.InitSuccess */, value: null });
                break;
            case "log-level-update" /* MainThreadMessageType.LogLevelUpdate */:
                updateLoggerLevel(msg.value.logLevel, msg.value.logFormat, msg.value.sendBackLogs);
                break;
            case "prepare" /* MainThreadMessageType.PrepareContent */:
                prepareNewContent(contentPreparer, msg.value);
                break;
            case "start" /* MainThreadMessageType.StartPreparedContent */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (msg.contentId !== (preparedContent === null || preparedContent === void 0 ? void 0 : preparedContent.contentId)) {
                    return;
                }
                currentContentHandle === null || currentContentHandle === void 0 ? void 0 : currentContentHandle.stop();
                playbackObservationRef === null || playbackObservationRef === void 0 ? void 0 : playbackObservationRef.finish();
                const currentContentObservationRef = new SharedReference(objectAssign(msg.value.initialObservation, {
                    position: new ObservationPosition(...msg.value.initialObservation.position),
                }));
                playbackObservationRef = currentContentObservationRef;
                currentContentHandle = loadPreparedContent(msg.value, contentPreparer, currentContentObservationRef);
                break;
            }
            case "observation" /* MainThreadMessageType.PlaybackObservation */: {
                const currentContent = contentPreparer.getCurrentContent();
                if (msg.contentId !== (currentContent === null || currentContent === void 0 ? void 0 : currentContent.contentId)) {
                    return;
                }
                const observation = msg.value;
                const { buffered } = observation;
                const newBuffered = getBufferedDataPerMediaBuffer(currentContent.mediaSource, null);
                if (newBuffered.audio !== null) {
                    buffered.audio = newBuffered.audio;
                }
                if (newBuffered.video !== null) {
                    buffered.video = newBuffered.video;
                }
                playbackObservationRef === null || playbackObservationRef === void 0 ? void 0 : playbackObservationRef.setValue(objectAssign(observation, {
                    position: new ObservationPosition(...msg.value.position),
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
                    const preparedContent = contentPreparer.getCurrentContent();
                    if (msg.mediaSourceId !== (preparedContent === null || preparedContent === void 0 ? void 0 : preparedContent.mediaSource.id)) {
                        return;
                    }
                    currentContentHandle === null || currentContentHandle === void 0 ? void 0 : currentContentHandle.signalMediaSourceReload();
                }
                break;
            case "sb-success" /* MainThreadMessageType.SourceBufferSuccess */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (msg.mediaSourceId !== (preparedContent === null || preparedContent === void 0 ? void 0 : preparedContent.mediaSource.id)) {
                    return;
                }
                const { sourceBuffers } = preparedContent.mediaSource;
                const sourceBuffer = arrayFind(sourceBuffers, (s) => s.type === msg.sourceBufferType);
                if (sourceBuffer === undefined) {
                    log.info("Core", "Success for an unknown SourceBuffer", {
                        sourceBufferType: msg.sourceBufferType,
                    });
                    return;
                }
                if (sourceBuffer.onOperationSuccess === undefined) {
                    log.warn("Core", "A SourceBufferInterface with MSE performed a cross-thread operation", { sourceBufferType: msg.sourceBufferType });
                    return;
                }
                sourceBuffer.onOperationSuccess(msg.operationId, msg.value.buffered);
                break;
            }
            case "sb-error" /* MainThreadMessageType.SourceBufferError */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (msg.mediaSourceId !== (preparedContent === null || preparedContent === void 0 ? void 0 : preparedContent.mediaSource.id)) {
                    return;
                }
                const { sourceBuffers } = preparedContent.mediaSource;
                const sourceBuffer = arrayFind(sourceBuffers, (s) => s.type === msg.sourceBufferType);
                if (sourceBuffer === undefined) {
                    log.info("Core", "Error for an unknown SourceBuffer", {
                        sourceBufferType: msg.sourceBufferType,
                    });
                    return;
                }
                if (sourceBuffer.onOperationFailure === undefined) {
                    log.warn("Core", "A SourceBufferInterface with MSE performed a cross-thread operation", {
                        sourceBufferType: msg.sourceBufferType,
                    });
                    return;
                }
                sourceBuffer.onOperationFailure(msg.operationId, msg.value);
                break;
            }
            case "media-source-ready-state-change" /* MainThreadMessageType.MediaSourceReadyStateChange */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (msg.mediaSourceId !== (preparedContent === null || preparedContent === void 0 ? void 0 : preparedContent.mediaSource.id)) {
                    return;
                }
                if (preparedContent.mediaSource.onMediaSourceReadyStateChanged === undefined) {
                    log.warn("Core", "A MediaSourceInterface with MSE performed a cross-thread operation");
                    return;
                }
                preparedContent.mediaSource.onMediaSourceReadyStateChanged(msg.value);
                break;
            }
            case "decipherability-update" /* MainThreadMessageType.DecipherabilityStatusUpdate */: {
                if (msg.contentId !== ((_b = contentPreparer.getCurrentContent()) === null || _b === void 0 ? void 0 : _b.contentId)) {
                    return;
                }
                const currentContent = contentPreparer.getCurrentContent();
                if (currentContent === null || currentContent.manifest === null) {
                    return;
                }
                const updates = msg.value;
                currentContent.manifest.updateRepresentationsDeciperability((content) => {
                    for (const update of updates) {
                        if (content.representation.uniqueId === update.representationUniqueId) {
                            return update.decipherable;
                        }
                    }
                    return content.representation.decipherable;
                });
                break;
            }
            case "codec-support-update" /* MainThreadMessageType.CodecSupportUpdate */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.manifest === null) {
                    return;
                }
                const newEvaluatedCodecs = msg.value;
                try {
                    const warning = preparedContent.manifest.updateCodecSupport(newEvaluatedCodecs);
                    if (warning !== null) {
                        sendMessage({
                            type: "warning" /* WorkerMessageType.Warning */,
                            contentId: preparedContent.contentId,
                            value: formatErrorForSender(warning),
                        });
                    }
                }
                catch (err) {
                    sendMessage({
                        type: "error" /* WorkerMessageType.Error */,
                        contentId: preparedContent.contentId,
                        value: formatErrorForSender(err),
                    });
                }
                break;
            }
            case "urls-update" /* MainThreadMessageType.ContentUrlsUpdate */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                preparedContent.manifestFetcher.updateContentUrls(msg.value.urls, msg.value.refreshNow);
                break;
            }
            case "track-update" /* MainThreadMessageType.TrackUpdate */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                preparedContent.trackChoiceSetter.setTrack(msg.value.periodId, msg.value.bufferType, msg.value.choice);
                break;
            }
            case "rep-update" /* MainThreadMessageType.RepresentationUpdate */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                preparedContent.trackChoiceSetter.updateRepresentations(msg.value.periodId, msg.value.adaptationId, msg.value.bufferType, msg.value.choice);
                break;
            }
            case "add-text-success" /* MainThreadMessageType.PushTextDataSuccess */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                if (preparedContent.workerTextSender === null) {
                    log.error("Core", "Added text track but text track aren't enabled");
                    return;
                }
                preparedContent.workerTextSender.onPushedTrackSuccess(msg.value.ranges);
                break;
            }
            case "push-text-error" /* MainThreadMessageType.PushTextDataError */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                if (preparedContent.workerTextSender === null) {
                    log.error("Core", "Added text track but text track aren't enabled");
                    return;
                }
                preparedContent.workerTextSender.onPushedTrackError(new Error(msg.value.message));
                break;
            }
            case "remove-text-success" /* MainThreadMessageType.RemoveTextDataSuccess */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                if (preparedContent.workerTextSender === null) {
                    log.error("Core", "Removed text track but text track aren't enabled");
                    return;
                }
                preparedContent.workerTextSender.onRemoveSuccess(msg.value.ranges);
                break;
            }
            case "remove-text-error" /* MainThreadMessageType.RemoveTextDataError */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                if (preparedContent.workerTextSender === null) {
                    log.error("Core", "Removed text track but text track aren't enabled");
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
                config.update(msg.value);
                break;
            }
            default:
                assertUnreachable(msg);
        }
    };
}
function prepareNewContent(contentPreparer, contentInitData) {
    contentPreparer.initializeNewContent(contentInitData).then((manifest) => {
        sendMessage({
            type: "manifest-ready" /* WorkerMessageType.ManifestReady */,
            contentId: contentInitData.contentId,
            value: { manifest },
        });
    }, (err) => {
        sendMessage({
            type: "error" /* WorkerMessageType.Error */,
            contentId: contentInitData.contentId,
            value: formatErrorForSender(err),
        });
    });
}
function updateGlobalReference(msg) {
    switch (msg.value.name) {
        case "wantedBufferAhead":
            wantedBufferAhead.setValueIfChanged(msg.value.newVal);
            break;
        case "maxVideoBufferSize":
            maxVideoBufferSize.setValueIfChanged(msg.value.newVal);
            break;
        case "maxBufferBehind":
            maxBufferBehind.setValueIfChanged(msg.value.newVal);
            break;
        case "maxBufferAhead":
            maxBufferAhead.setValueIfChanged(msg.value.newVal);
            break;
        case "limitVideoResolution":
            limitVideoResolution.setValueIfChanged(msg.value.newVal);
            break;
        case "throttleVideoBitrate":
            throttleVideoBitrate.setValueIfChanged(msg.value.newVal);
            break;
        default:
            assertUnreachable(msg.value);
    }
}
function loadPreparedContent(val, contentPreparer, playbackObservationRef) {
    log.debug("Core", "Loading pepared content.");
    const contentCanceller = new TaskCanceller();
    let currentLoadCanceller = null;
    startLoadingAt(val.initialTime);
    return {
        signalMediaSourceReload: () => {
            return onMediaSourceReload();
        },
        stop: () => {
            contentCanceller.cancel();
        },
    };
    function startLoadingAt(startTime) {
        var _a;
        currentLoadCanceller === null || currentLoadCanceller === void 0 ? void 0 : currentLoadCanceller.cancel();
        currentLoadCanceller = new TaskCanceller();
        currentLoadCanceller.linkToSignal(contentCanceller.signal);
        /**
         * Stores last discontinuity update sent to the worker for each Period and type
         * combinations, at least until the corresponding `PeriodStreamCleared`
         * message.
         *
         * This is an optimization to avoid sending too much discontinuity messages to
         * the main thread when it is not needed because nothing changed.
         */
        const lastSentDiscontinuitiesStore = new Map();
        const preparedContent = contentPreparer.getCurrentContent();
        if (preparedContent === null || preparedContent.manifest === null) {
            const error = new OtherError("NONE", "Loading content when none is prepared");
            sendMessage({
                type: "error" /* WorkerMessageType.Error */,
                contentId: undefined,
                value: formatErrorForSender(error),
            });
            throw error;
        }
        const { contentId, cmcdDataBuilder, enableRepresentationAvoidance, manifest, mediaSource, representationEstimator, segmentSinksStore, segmentQueueCreator, } = preparedContent;
        const { drmSystemId, enableFastSwitching, onCodecSwitch } = val;
        playbackObservationRef.onUpdate((observation) => {
            synchronizeSegmentSinksOnObservation(observation, segmentSinksStore);
            const freezeResolution = preparedContent.freezeResolver.onNewObservation(observation);
            if (freezeResolution !== null) {
                handleFreezeResolution(freezeResolution, {
                    contentId,
                    manifest,
                    handleMediaSourceReload: performMediaSourceReload,
                    enableRepresentationAvoidance,
                });
            }
        }, { clearSignal: currentLoadCanceller.signal });
        const initialPeriod = (_a = manifest.getPeriodForTime(startTime)) !== null && _a !== void 0 ? _a : manifest.getNextPeriod(startTime);
        if (initialPeriod === undefined) {
            const error = new MediaError("MEDIA_STARTING_TIME_NOT_FOUND", "Wanted starting time not found in the Manifest.");
            sendMessage({
                type: "error" /* WorkerMessageType.Error */,
                contentId,
                value: formatErrorForSender(error),
            });
            throw error;
        }
        const playbackObserver = new WorkerPlaybackObserver(playbackObservationRef, contentId, sendMessage, currentLoadCanceller.signal);
        cmcdDataBuilder === null || cmcdDataBuilder === void 0 ? void 0 : cmcdDataBuilder.startMonitoringPlayback(playbackObserver);
        currentLoadCanceller.signal.register(() => {
            cmcdDataBuilder === null || cmcdDataBuilder === void 0 ? void 0 : cmcdDataBuilder.stopMonitoringPlayback();
        });
        const contentTimeBoundariesObserver = createContentTimeBoundariesObserver(manifest, mediaSource, playbackObserver, segmentSinksStore, {
            onWarning: (err) => sendMessage({
                type: "warning" /* WorkerMessageType.Warning */,
                contentId,
                value: formatErrorForSender(err),
            }),
            onPeriodChanged: (period) => {
                sendMessage({
                    type: "active-period-changed" /* WorkerMessageType.ActivePeriodChanged */,
                    contentId,
                    value: { periodId: period.id },
                });
            },
        }, currentLoadCanceller.signal);
        StreamOrchestrator({ initialPeriod, manifest }, playbackObserver, representationEstimator, segmentSinksStore, segmentQueueCreator, {
            wantedBufferAhead,
            maxVideoBufferSize,
            maxBufferAhead,
            maxBufferBehind,
            drmSystemId,
            enableFastSwitching,
            onCodecSwitch,
        }, handleStreamOrchestratorCallbacks(), currentLoadCanceller.signal);
        /**
         * Returns Object handling the callbacks from a `StreamOrchestrator`, which
         * are basically how it communicates about events.
         * @returns {Object}
         */
        function handleStreamOrchestratorCallbacks() {
            return {
                needsBufferFlush(payload) {
                    sendMessage({
                        type: "needs-buffer-flush" /* WorkerMessageType.NeedsBufferFlush */,
                        contentId,
                        value: payload,
                    });
                },
                streamStatusUpdate(value) {
                    sendDiscontinuityUpdateIfNeeded(value);
                    // If the status for the last Period indicates that segments are all loaded
                    // or on the contrary that the loading resumed, announce it to the
                    // ContentTimeBoundariesObserver.
                    if (manifest.isLastPeriodKnown &&
                        value.period.id === manifest.periods[manifest.periods.length - 1].id) {
                        const hasFinishedLoadingLastPeriod = value.hasFinishedLoading || value.isEmptyStream;
                        if (hasFinishedLoadingLastPeriod) {
                            contentTimeBoundariesObserver.onLastSegmentFinishedLoading(value.bufferType);
                        }
                        else {
                            contentTimeBoundariesObserver.onLastSegmentLoadingResume(value.bufferType);
                        }
                    }
                },
                needsManifestRefresh() {
                    contentPreparer.scheduleManifestRefresh({
                        enablePartialRefresh: true,
                        canUseUnsafeMode: true,
                    });
                },
                manifestMightBeOufOfSync() {
                    const { OUT_OF_SYNC_MANIFEST_REFRESH_DELAY } = config.getCurrent();
                    contentPreparer.scheduleManifestRefresh({
                        enablePartialRefresh: false,
                        canUseUnsafeMode: false,
                        delay: OUT_OF_SYNC_MANIFEST_REFRESH_DELAY,
                    });
                },
                lockedStream(payload) {
                    sendMessage({
                        type: "locked-stream" /* WorkerMessageType.LockedStream */,
                        contentId,
                        value: {
                            periodId: payload.period.id,
                            bufferType: payload.bufferType,
                        },
                    });
                },
                adaptationChange(value) {
                    var _a, _b;
                    contentTimeBoundariesObserver.onAdaptationChange(value.type, value.period, value.adaptation);
                    if (currentLoadCanceller === null ||
                        currentLoadCanceller.signal.isCancelled()) {
                        return;
                    }
                    sendMessage({
                        type: "adaptation-changed" /* WorkerMessageType.AdaptationChanged */,
                        contentId,
                        value: {
                            adaptationId: (_b = (_a = value.adaptation) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null,
                            periodId: value.period.id,
                            type: value.type,
                        },
                    });
                },
                representationChange(value) {
                    var _a, _b;
                    contentTimeBoundariesObserver.onRepresentationChange(value.type, value.period);
                    if (currentLoadCanceller === null ||
                        currentLoadCanceller.signal.isCancelled()) {
                        return;
                    }
                    sendMessage({
                        type: "representation-changed" /* WorkerMessageType.RepresentationChanged */,
                        contentId,
                        value: {
                            adaptationId: value.adaptation.id,
                            representationId: (_b = (_a = value.representation) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null,
                            periodId: value.period.id,
                            type: value.type,
                        },
                    });
                },
                inbandEvent(value) {
                    sendMessage({
                        type: "inband-event" /* WorkerMessageType.InbandEvent */,
                        contentId,
                        value,
                    });
                },
                warning(value) {
                    sendMessage({
                        type: "warning" /* WorkerMessageType.Warning */,
                        contentId,
                        value: formatErrorForSender(value),
                    });
                },
                periodStreamReady(value) {
                    if (preparedContent === null) {
                        return;
                    }
                    preparedContent.trackChoiceSetter.addTrackSetter(value.period.id, value.type, value.adaptationRef);
                    sendMessage({
                        type: "period-stream-ready" /* WorkerMessageType.PeriodStreamReady */,
                        contentId,
                        value: { periodId: value.period.id, bufferType: value.type },
                    });
                },
                periodStreamCleared(value) {
                    if (preparedContent === null) {
                        return;
                    }
                    const periodDiscontinuitiesStore = lastSentDiscontinuitiesStore.get(value.period);
                    if (periodDiscontinuitiesStore !== undefined) {
                        periodDiscontinuitiesStore.delete(value.type);
                        if (periodDiscontinuitiesStore.size === 0) {
                            lastSentDiscontinuitiesStore.delete(value.period);
                        }
                    }
                    contentTimeBoundariesObserver.onPeriodCleared(value.type, value.period);
                    preparedContent.trackChoiceSetter.removeTrackSetter(value.period.id, value.type);
                    sendMessage({
                        type: "period-stream-cleared" /* WorkerMessageType.PeriodStreamCleared */,
                        contentId,
                        value: { periodId: value.period.id, bufferType: value.type },
                    });
                },
                bitrateEstimateChange(payload) {
                    var _a;
                    if (preparedContent !== null) {
                        (_a = preparedContent.cmcdDataBuilder) === null || _a === void 0 ? void 0 : _a.updateThroughput(payload.type, payload.bitrate);
                    }
                    // TODO for low-latency contents it is __VERY__ frequent.
                    // Considering this is only for an unimportant undocumented API, we may
                    // throttle such messages. (e.g. max one per 2 seconds for each type?).
                    sendMessage({
                        type: "bitrate-estimate-change" /* WorkerMessageType.BitrateEstimateChange */,
                        contentId,
                        value: {
                            bitrate: payload.bitrate,
                            bufferType: payload.type,
                        },
                    });
                },
                needsMediaSourceReload(payload) {
                    performMediaSourceReload(payload);
                },
                needsDecipherabilityFlush() {
                    sendMessage({
                        type: "needs-decipherability-flush" /* WorkerMessageType.NeedsDecipherabilityFlush */,
                        contentId,
                        value: null,
                    });
                },
                encryptionDataEncountered(values) {
                    for (const value of values) {
                        const originalContent = value.content;
                        const content = Object.assign({}, originalContent);
                        if (content.manifest instanceof Manifest) {
                            content.manifest = content.manifest.getMetadataSnapshot();
                        }
                        if (content.period instanceof Period) {
                            content.period = content.period.getMetadataSnapshot();
                        }
                        if (content.adaptation instanceof Adaptation) {
                            content.adaptation = content.adaptation.getMetadataSnapshot();
                        }
                        if (content.representation instanceof Representation) {
                            content.representation = content.representation.getMetadataSnapshot();
                        }
                        sendMessage({
                            type: "encryption-data-encountered" /* WorkerMessageType.EncryptionDataEncountered */,
                            contentId,
                            value: {
                                keyIds: value.keyIds,
                                values: value.values,
                                content,
                                type: value.type,
                            },
                        });
                    }
                },
                error(error) {
                    sendMessage({
                        type: "error" /* WorkerMessageType.Error */,
                        contentId,
                        value: formatErrorForSender(error),
                    });
                },
            };
        }
        function sendDiscontinuityUpdateIfNeeded(value) {
            const { imminentDiscontinuity } = value;
            let periodMap = lastSentDiscontinuitiesStore.get(value.period);
            const sentObjInfo = periodMap === null || periodMap === void 0 ? void 0 : periodMap.get(value.bufferType);
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
            const msgObj = {
                periodId: value.period.id,
                bufferType: value.bufferType,
                discontinuity: value.imminentDiscontinuity,
                position: value.position,
            };
            periodMap.set(value.bufferType, msgObj);
            sendMessage({
                type: "discontinuity-update" /* WorkerMessageType.DiscontinuityUpdate */,
                contentId,
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
        const mediaSourceId = (_a = contentPreparer.getCurrentContent()) === null || _a === void 0 ? void 0 : _a.mediaSource.id;
        if (mediaSourceId === undefined) {
            log.warn("Core", "Cannot reload MediaSource: no MediaSource currently.");
            return;
        }
        log.debug("Core", "Reloading MediaSource", {
            timeOffset: payload.timeOffset,
            minimumPosition: payload.minimumPosition,
            maximumPosition: payload.maximumPosition,
        });
        sendMessage({
            type: "reloading-media-source" /* WorkerMessageType.ReloadingMediaSource */,
            mediaSourceId,
            value: payload,
        }, []);
        onMediaSourceReload();
    }
    function onMediaSourceReload() {
        var _a;
        // TODO more precize one day?
        const lastObservation = playbackObservationRef.getValue();
        const newInitialTime = lastObservation.position.getWanted();
        if (currentLoadCanceller !== null) {
            currentLoadCanceller.cancel();
            currentLoadCanceller = null;
        }
        const contentId = (_a = contentPreparer.getCurrentContent()) === null || _a === void 0 ? void 0 : _a.contentId;
        contentPreparer.reloadMediaSource().then(() => {
            log.info("Core", "MediaSource Reloaded, loading content again", {
                newInitialTime,
            });
            startLoadingAt(newInitialTime);
        }, (err) => {
            if (TaskCanceller.isCancellationError(err)) {
                log.info("Core", "A reloading operation was cancelled");
                return;
            }
            sendMessage({
                type: "error" /* WorkerMessageType.Error */,
                contentId,
                value: formatErrorForSender(err),
            });
        });
    }
}
function updateLoggerLevel(logLevel, logFormat, sendBackLogs) {
    if (!sendBackLogs) {
        log.setLevel(logLevel, logFormat);
    }
    else {
        // Here we force the log format to "standard" as the full formatting will be
        // performed on main thread.
        log.setLevel(logLevel, "standard", (levelStr, namespace, logs) => {
            const sentLogs = logs.map((e) => {
                if (e instanceof Error) {
                    return formatErrorForSender(e);
                }
                return e;
            });
            // Not relying on `sendMessage` as it also logs
            postMessage({
                type: "log" /* WorkerMessageType.LogMessage */,
                value: {
                    namespace,
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
    const currentContent = contentPreparer.getCurrentContent();
    if (currentContent === null) {
        return;
    }
    const segmentSinksMetrics = currentContent.segmentSinksStore.getSegmentSinksMetrics();
    sendMessage({
        type: "segment-sink-store-update" /* WorkerMessageType.SegmentSinkStoreUpdate */,
        contentId: currentContent.contentId,
        value: { segmentSinkMetrics: segmentSinksMetrics, requestId },
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
function handleFreezeResolution(freezeResolution, { contentId, manifest, handleMediaSourceReload, enableRepresentationAvoidance, }) {
    switch (freezeResolution.type) {
        case "reload": {
            log.info("Core", "Planning reload due to freeze");
            handleMediaSourceReload({
                timeOffset: 0,
                minimumPosition: 0,
                maximumPosition: Infinity,
            });
            break;
        }
        case "flush": {
            log.info("Core", "Flushing buffer due to freeze");
            sendMessage({
                type: "needs-buffer-flush" /* WorkerMessageType.NeedsBufferFlush */,
                contentId,
                value: {
                    relativeResumingPosition: freezeResolution.value.relativeSeek,
                    relativePosHasBeenDefaulted: false,
                },
            });
            break;
        }
        case "avoid-representations": {
            log.info("Core", "Planning Representation avoidance due to freeze");
            const content = freezeResolution.value;
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
            assertUnreachable(freezeResolution);
    }
}
/**
 * Handles thumbnail requests and send back the result to the main thread.
 * @param {ContentPreparer} contentPreparer
 * @returns {void}
 */
function sendThumbnailData(contentPreparer, msg) {
    const preparedContent = contentPreparer.getCurrentContent();
    const respondWithError = (err) => {
        sendMessage({
            type: "thumbnail-response" /* WorkerMessageType.ThumbnailDataResponse */,
            contentId: msg.contentId,
            value: {
                status: "error",
                requestId: msg.value.requestId,
                error: formatErrorForSender(err),
            },
        });
    };
    if (preparedContent === null ||
        preparedContent.manifest === null ||
        preparedContent.contentId !== msg.contentId) {
        return respondWithError(new Error("Content changed"));
    }
    getThumbnailData(preparedContent.fetchThumbnailData, preparedContent.manifest, msg.value.periodId, msg.value.thumbnailTrackId, msg.value.time).then((result) => {
        sendMessage({
            type: "thumbnail-response" /* WorkerMessageType.ThumbnailDataResponse */,
            contentId: msg.contentId,
            value: {
                status: "success",
                requestId: msg.value.requestId,
                data: result,
            },
        }, [result.data]);
    }, (err) => {
        return respondWithError(err);
    });
}
