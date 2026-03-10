import getEmeApiImplementation from "../../compat/eme";
import mayMediaElementFailOnUndecipherableData from "../../compat/may_media_element_fail_on_undecipherable_data";
import shouldReloadMediaSourceOnDecipherabilityUpdate from "../../compat/should_reload_media_source_on_decipherability_update";
import { EncryptedMediaError, MediaError, NetworkError, OtherError, SourceBufferError, } from "../../errors";
import features from "../../features";
import log from "../../log";
import { replicateUpdatesOnManifestMetadata, updateDecipherabilityFromKeyIds, updateDecipherabilityFromProtectionData, } from "../../manifest";
import MainMediaSourceInterface from "../../mse/main_media_source_interface";
import arrayFind from "../../utils/array_find";
import assert, { assertUnreachable } from "../../utils/assert";
import idGenerator from "../../utils/id_generator";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import objectAssign from "../../utils/object_assign";
import SharedReference from "../../utils/reference";
import { RequestError } from "../../utils/request";
import TaskCanceller, { CancellationError } from "../../utils/task_canceller";
import { ContentDecryptorState, getKeySystemConfiguration } from "../decrypt";
import sendMessage from "./send_message";
import { ContentInitializer } from "./types";
import createCorePlaybackObserver from "./utils/create_core_playback_observer";
import { resetMediaElement, disableRemotePlaybackOnManagedMediaSource, } from "./utils/create_media_source";
import getInitialTime from "./utils/get_initial_time";
import getLoadedReference from "./utils/get_loaded_reference";
import performInitialSeekAndPlay from "./utils/initial_seek_and_play";
import RebufferingController from "./utils/rebuffering_controller";
import StreamEventsEmitter from "./utils/stream_events_emitter/stream_events_emitter";
import listenToMediaError from "./utils/throw_on_media_error";
import { updateManifestCodecSupport } from "./utils/update_manifest_codec_support";
const generateContentId = idGenerator();
/**
 * @class MultiThreadContentInitializer
 */
export default class MultiThreadContentInitializer extends ContentInitializer {
    /**
     * Create a new `MultiThreadContentInitializer`, associated to the given
     * settings.
     * @param {Object} settings
     */
    constructor(settings) {
        super();
        this._settings = settings;
        this._initCanceller = new TaskCanceller();
        this._currentMediaSourceCanceller = new TaskCanceller();
        this._currentMediaSourceCanceller.linkToSignal(this._initCanceller.signal);
        this._currentContentInfo = null;
        this._awaitingRequests = {
            nextRequestId: 0,
            pendingSinkMetrics: new Map(),
            pendingThumbnailFetching: new Map(),
        };
        this._queuedWorkerMessages = null;
    }
    /**
     * Perform non-destructive preparation steps, to prepare a future content.
     */
    prepare() {
        var _a, _b;
        if (this._currentContentInfo !== null || this._initCanceller.isUsed()) {
            return;
        }
        const contentId = generateContentId();
        const { adaptiveOptions, transportOptions, useMseInWorker, worker } = this._settings;
        const { wantedBufferAhead, maxVideoBufferSize, maxBufferAhead, maxBufferBehind } = this._settings.bufferOptions;
        const initialVideoBitrate = adaptiveOptions.initialBitrates.video;
        const initialAudioBitrate = adaptiveOptions.initialBitrates.audio;
        this._currentContentInfo = {
            contentId,
            contentDecryptor: null,
            manifest: null,
            mediaSourceInfo: null,
            rebufferingController: null,
            streamEventsEmitter: null,
            initialTime: undefined,
            autoPlay: undefined,
            initialPlayPerformed: null,
            useMseInWorker,
        };
        sendMessage(worker, {
            type: "prepare" /* MainThreadMessageType.PrepareContent */,
            value: {
                contentId,
                cmcd: this._settings.cmcd,
                enableRepresentationAvoidance: this._settings.enableRepresentationAvoidance,
                url: this._settings.url,
                hasText: this._hasTextBufferFeature(),
                transportOptions,
                initialVideoBitrate,
                initialAudioBitrate,
                manifestRetryOptions: Object.assign(Object.assign({}, this._settings.manifestRequestSettings), { lowLatencyMode: this._settings.lowLatencyMode }),
                segmentRetryOptions: this._settings.segmentRequestOptions,
                useMseInWorker,
            },
        });
        this._initCanceller.signal.register(() => {
            sendMessage(worker, {
                type: "stop" /* MainThreadMessageType.StopContent */,
                contentId,
                value: null,
            });
        });
        if (this._initCanceller.isUsed()) {
            return;
        }
        this._queuedWorkerMessages = [];
        log.debug("Init", "addEventListener prepare buffering worker messages");
        const onmessage = (evt) => {
            const msgData = evt.data;
            const type = msgData.type;
            switch (type) {
                case "log" /* WorkerMessageType.LogMessage */: {
                    const formatted = msgData.value.logs.map((l) => {
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
                                assertUnreachable(l);
                        }
                    });
                    switch (msgData.value.logLevel) {
                        case "NONE":
                            break;
                        case "ERROR":
                            log.error(msgData.value.namespace, ...formatted);
                            break;
                        case "WARNING":
                            log.warn(msgData.value.namespace, ...formatted);
                            break;
                        case "INFO":
                            log.info(msgData.value.namespace, ...formatted);
                            break;
                        case "DEBUG":
                            log.debug(msgData.value.namespace, ...formatted);
                            break;
                        default:
                            assertUnreachable(msgData.value.logLevel);
                    }
                    break;
                }
                default:
                    if (this._queuedWorkerMessages !== null) {
                        this._queuedWorkerMessages.push(evt);
                    }
                    break;
            }
        };
        this._settings.worker.addEventListener("message", onmessage);
        const onmessageerror = (_msg) => {
            log.error("Init", "Error when receiving message from worker.");
        };
        this._settings.worker.addEventListener("messageerror", onmessageerror);
        this._initCanceller.signal.register(() => {
            log.debug("Init", "removeEventListener prepare for worker message");
            this._settings.worker.removeEventListener("message", onmessage);
            this._settings.worker.removeEventListener("messageerror", onmessageerror);
        });
        // Also bind all `SharedReference` objects:
        const throttleVideoBitrate = (_a = adaptiveOptions.throttlers.throttleBitrate.video) !== null && _a !== void 0 ? _a : new SharedReference(Infinity);
        bindNumberReferencesToWorker(worker, this._initCanceller.signal, [wantedBufferAhead, "wantedBufferAhead"], [maxVideoBufferSize, "maxVideoBufferSize"], [maxBufferAhead, "maxBufferAhead"], [maxBufferBehind, "maxBufferBehind"], [throttleVideoBitrate, "throttleVideoBitrate"]);
        const limitVideoResolution = (_b = adaptiveOptions.throttlers.limitResolution.video) !== null && _b !== void 0 ? _b : new SharedReference({
            height: undefined,
            width: undefined,
            pixelRatio: 1,
        });
        limitVideoResolution.onUpdate((newVal) => {
            sendMessage(worker, {
                type: "ref-update" /* MainThreadMessageType.ReferenceUpdate */,
                value: { name: "limitVideoResolution", newVal },
            });
        }, { clearSignal: this._initCanceller.signal, emitCurrentValue: true });
    }
    /**
     * Update URL of the Manifest.
     * @param {Array.<string>|undefined} urls - URLs to reach that Manifest from
     * the most prioritized URL to the least prioritized URL.
     * @param {boolean} refreshNow - If `true` the resource in question (e.g.
     * DASH's MPD) will be refreshed immediately.
     */
    updateContentUrls(urls, refreshNow) {
        if (this._currentContentInfo === null) {
            return;
        }
        sendMessage(this._settings.worker, {
            type: "urls-update" /* MainThreadMessageType.ContentUrlsUpdate */,
            contentId: this._currentContentInfo.contentId,
            value: { urls, refreshNow },
        });
    }
    /**
     * @param {HTMLMediaElement} mediaElement
     * @param {Object} playbackObserver
     */
    start(mediaElement, playbackObserver) {
        this.prepare(); // Load Manifest if not already done
        if (this._initCanceller.isUsed()) {
            return;
        }
        let textDisplayer = null;
        if (this._settings.textTrackOptions.textTrackMode === "html" &&
            features.htmlTextDisplayer !== null) {
            assert(this._hasTextBufferFeature());
            textDisplayer = new features.htmlTextDisplayer(mediaElement, this._settings.textTrackOptions.textTrackElement);
        }
        else if (features.nativeTextDisplayer !== null) {
            assert(this._hasTextBufferFeature());
            textDisplayer = new features.nativeTextDisplayer(mediaElement);
        }
        else {
            assert(!this._hasTextBufferFeature());
        }
        this._initCanceller.signal.register(() => {
            textDisplayer === null || textDisplayer === void 0 ? void 0 : textDisplayer.stop();
        });
        /** Translate errors coming from the media element into RxPlayer errors. */
        listenToMediaError(mediaElement, (error) => this._onFatalError(error), this._initCanceller.signal);
        /**
         * Send content protection initialization data.
         * TODO remove and use ContentDecryptor directly when possible.
         */
        const lastContentProtection = new SharedReference(null);
        const mediaSourceStatus = new SharedReference(0 /* MediaSourceInitializationStatus.Nothing */);
        const { statusRef: drmInitializationStatus, contentDecryptor } = this._initializeContentDecryption(mediaElement, lastContentProtection, mediaSourceStatus, () => notifyAndStartMediaSourceReload(0, undefined, undefined), this._initCanceller.signal);
        const contentInfo = this._currentContentInfo;
        if (contentInfo !== null) {
            contentInfo.contentDecryptor = contentDecryptor;
        }
        const playbackStartParams = {
            mediaElement,
            textDisplayer,
            playbackObserver,
            drmInitializationStatus,
            mediaSourceStatus,
        };
        mediaSourceStatus.onUpdate((msInitStatus, stopListeningMSStatus) => {
            if (msInitStatus === 2 /* MediaSourceInitializationStatus.Attached */) {
                stopListeningMSStatus();
                this._startPlaybackIfReady(playbackStartParams);
            }
        }, { clearSignal: this._initCanceller.signal, emitCurrentValue: true });
        drmInitializationStatus.onUpdate((initializationStatus, stopListeningDrm) => {
            if (initializationStatus.initializationState.type === "initialized") {
                stopListeningDrm();
                this._startPlaybackIfReady(playbackStartParams);
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
        const notifyAndStartMediaSourceReload = (deltaPosition, minimumPosition, maximumPosition) => {
            const reloadingContentInfo = this._currentContentInfo;
            if (reloadingContentInfo === null) {
                log.warn("Init", "Asked to reload when no content is loaded.");
                return;
            }
            if (reloadingContentInfo === null ||
                reloadingContentInfo.mediaSourceInfo === null) {
                log.warn("Init", "Asked to reload when no MediaSource is active.");
                return;
            }
            const mediaSourceId = reloadingContentInfo.mediaSourceInfo.type === "main"
                ? reloadingContentInfo.mediaSourceInfo.mediaSource.id
                : reloadingContentInfo.mediaSourceInfo.mediaSourceId;
            sendMessage(this._settings.worker, {
                type: "ms-reload" /* MainThreadMessageType.MediaSourceReload */,
                mediaSourceId,
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
        const reloadMediaSource = (deltaPosition, minimumPosition, maximumPosition) => {
            var _a;
            const reloadingContentInfo = this._currentContentInfo;
            if (reloadingContentInfo === null) {
                log.warn("Init", "Asked to reload when no content is loaded.");
                return;
            }
            const lastObservation = playbackObserver.getReference().getValue();
            const currentPosition = lastObservation.position.getWanted();
            const isPaused = ((_a = reloadingContentInfo.initialPlayPerformed) === null || _a === void 0 ? void 0 : _a.getValue()) === true ||
                reloadingContentInfo.autoPlay === undefined
                ? lastObservation.paused
                : !reloadingContentInfo.autoPlay;
            let position = currentPosition + deltaPosition;
            if (minimumPosition !== undefined) {
                position = Math.max(minimumPosition, position);
            }
            if (maximumPosition !== undefined) {
                position = Math.min(maximumPosition, position);
            }
            this._reload(mediaElement, textDisplayer, playbackObserver, mediaSourceStatus, position, !isPaused);
        };
        const onmessage = (msg) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28;
            const msgData = msg.data;
            switch (msgData.type) {
                case "attach-media-source" /* WorkerMessageType.AttachMediaSource */: {
                    if (((_a = this._currentContentInfo) === null || _a === void 0 ? void 0 : _a.contentId) !== msgData.contentId) {
                        return;
                    }
                    if (this._currentContentInfo !== null) {
                        if (((_b = this._currentContentInfo.mediaSourceInfo) === null || _b === void 0 ? void 0 : _b.type) === "main") {
                            this._currentContentInfo.mediaSourceInfo.mediaSource.dispose();
                        }
                        this._currentContentInfo.mediaSourceInfo = {
                            type: "core",
                            mediaSourceId: msgData.mediaSourceId,
                        };
                    }
                    const mediaSourceLink = msgData.value;
                    mediaSourceStatus.onUpdate((currStatus, stopListening) => {
                        if (currStatus === 1 /* MediaSourceInitializationStatus.AttachNow */) {
                            stopListening();
                            log.info("media", "Attaching MediaSource URL to the media element");
                            if (mediaSourceLink.type === "handle") {
                                mediaElement.srcObject = mediaSourceLink.value;
                                this._currentMediaSourceCanceller.signal.register(() => {
                                    mediaElement.srcObject = null;
                                });
                            }
                            else {
                                mediaElement.src = mediaSourceLink.value;
                                this._currentMediaSourceCanceller.signal.register(() => {
                                    resetMediaElement(mediaElement, mediaSourceLink.value);
                                });
                            }
                            disableRemotePlaybackOnManagedMediaSource(mediaElement, this._currentMediaSourceCanceller.signal);
                            mediaSourceStatus.setValue(2 /* MediaSourceInitializationStatus.Attached */);
                        }
                    }, { emitCurrentValue: true, clearSignal: this._initCanceller.signal });
                    break;
                }
                case "warning" /* WorkerMessageType.Warning */:
                    if (((_c = this._currentContentInfo) === null || _c === void 0 ? void 0 : _c.contentId) !== msgData.contentId) {
                        return;
                    }
                    this.trigger("warning", formatWorkerError(msgData.value));
                    break;
                case "error" /* WorkerMessageType.Error */:
                    if (((_d = this._currentContentInfo) === null || _d === void 0 ? void 0 : _d.contentId) !== msgData.contentId) {
                        return;
                    }
                    this._onFatalError(formatWorkerError(msgData.value));
                    break;
                case "create-media-source" /* WorkerMessageType.CreateMediaSource */:
                    this._onCreateMediaSourceMessage(msgData, mediaElement, mediaSourceStatus, this._settings.worker);
                    break;
                case "add-source-buffer" /* WorkerMessageType.AddSourceBuffer */:
                    {
                        if (((_f = (_e = this._currentContentInfo) === null || _e === void 0 ? void 0 : _e.mediaSourceInfo) === null || _f === void 0 ? void 0 : _f.type) !== "main" ||
                            this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                                msgData.mediaSourceId) {
                            return;
                        }
                        const { mediaSource } = this._currentContentInfo.mediaSourceInfo;
                        mediaSource.addSourceBuffer(msgData.value.sourceBufferType, msgData.value.codec);
                    }
                    break;
                case "source-buffer-append" /* WorkerMessageType.SourceBufferAppend */:
                    {
                        if (((_h = (_g = this._currentContentInfo) === null || _g === void 0 ? void 0 : _g.mediaSourceInfo) === null || _h === void 0 ? void 0 : _h.type) !== "main" ||
                            this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                                msgData.mediaSourceId) {
                            return;
                        }
                        const { mediaSource } = this._currentContentInfo.mediaSourceInfo;
                        const sourceBuffer = arrayFind(mediaSource.sourceBuffers, (s) => s.type === msgData.sourceBufferType);
                        if (sourceBuffer === undefined) {
                            return;
                        }
                        sourceBuffer
                            .appendBuffer(msgData.value.data, msgData.value.params)
                            .then((buffered) => {
                            sendMessage(this._settings.worker, {
                                type: "sb-success" /* MainThreadMessageType.SourceBufferSuccess */,
                                mediaSourceId: mediaSource.id,
                                sourceBufferType: sourceBuffer.type,
                                operationId: msgData.operationId,
                                value: { buffered },
                            });
                        })
                            .catch((error) => {
                            sendMessage(this._settings.worker, {
                                type: "sb-error" /* MainThreadMessageType.SourceBufferError */,
                                mediaSourceId: mediaSource.id,
                                sourceBufferType: sourceBuffer.type,
                                operationId: msgData.operationId,
                                value: error instanceof CancellationError
                                    ? { errorName: "CancellationError" }
                                    : formatSourceBufferError(error).serialize(),
                            });
                        });
                    }
                    break;
                case "source-buffer-remove" /* WorkerMessageType.SourceBufferRemove */:
                    {
                        if (((_k = (_j = this._currentContentInfo) === null || _j === void 0 ? void 0 : _j.mediaSourceInfo) === null || _k === void 0 ? void 0 : _k.type) !== "main" ||
                            this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                                msgData.mediaSourceId) {
                            return;
                        }
                        const { mediaSource } = this._currentContentInfo.mediaSourceInfo;
                        const sourceBuffer = arrayFind(mediaSource.sourceBuffers, (s) => s.type === msgData.sourceBufferType);
                        if (sourceBuffer === undefined) {
                            return;
                        }
                        sourceBuffer
                            .remove(msgData.value.start, msgData.value.end)
                            .then((buffered) => {
                            sendMessage(this._settings.worker, {
                                type: "sb-success" /* MainThreadMessageType.SourceBufferSuccess */,
                                mediaSourceId: mediaSource.id,
                                sourceBufferType: sourceBuffer.type,
                                operationId: msgData.operationId,
                                value: { buffered },
                            });
                        })
                            .catch((error) => {
                            sendMessage(this._settings.worker, {
                                type: "sb-error" /* MainThreadMessageType.SourceBufferError */,
                                mediaSourceId: mediaSource.id,
                                sourceBufferType: sourceBuffer.type,
                                operationId: msgData.operationId,
                                value: error instanceof CancellationError
                                    ? { errorName: "CancellationError" }
                                    : formatSourceBufferError(error).serialize(),
                            });
                        });
                    }
                    break;
                case "abort-source-buffer" /* WorkerMessageType.AbortSourceBuffer */:
                    {
                        if (((_m = (_l = this._currentContentInfo) === null || _l === void 0 ? void 0 : _l.mediaSourceInfo) === null || _m === void 0 ? void 0 : _m.type) !== "main" ||
                            this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                                msgData.mediaSourceId) {
                            return;
                        }
                        const { mediaSource } = this._currentContentInfo.mediaSourceInfo;
                        const sourceBuffer = arrayFind(mediaSource.sourceBuffers, (s) => s.type === msgData.sourceBufferType);
                        if (sourceBuffer === undefined) {
                            return;
                        }
                        sourceBuffer.abort();
                    }
                    break;
                case "update-media-source-duration" /* WorkerMessageType.UpdateMediaSourceDuration */:
                    {
                        if (((_p = (_o = this._currentContentInfo) === null || _o === void 0 ? void 0 : _o.mediaSourceInfo) === null || _p === void 0 ? void 0 : _p.type) !== "main" ||
                            this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                                msgData.mediaSourceId) {
                            return;
                        }
                        const { mediaSource } = this._currentContentInfo.mediaSourceInfo;
                        if ((mediaSource === null || mediaSource === void 0 ? void 0 : mediaSource.id) !== msgData.mediaSourceId) {
                            return;
                        }
                        mediaSource.setDuration(msgData.value.duration, msgData.value.isRealEndKnown);
                    }
                    break;
                case "stop-media-source-duration" /* WorkerMessageType.InterruptMediaSourceDurationUpdate */:
                    {
                        if (((_r = (_q = this._currentContentInfo) === null || _q === void 0 ? void 0 : _q.mediaSourceInfo) === null || _r === void 0 ? void 0 : _r.type) !== "main" ||
                            this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                                msgData.mediaSourceId) {
                            return;
                        }
                        const { mediaSource } = this._currentContentInfo.mediaSourceInfo;
                        if ((mediaSource === null || mediaSource === void 0 ? void 0 : mediaSource.id) !== msgData.mediaSourceId) {
                            return;
                        }
                        mediaSource.interruptDurationSetting();
                    }
                    break;
                case "end-of-stream" /* WorkerMessageType.EndOfStream */:
                    {
                        if (((_t = (_s = this._currentContentInfo) === null || _s === void 0 ? void 0 : _s.mediaSourceInfo) === null || _t === void 0 ? void 0 : _t.type) !== "main" ||
                            this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                                msgData.mediaSourceId) {
                            return;
                        }
                        const { mediaSource } = this._currentContentInfo.mediaSourceInfo;
                        mediaSource.maintainEndOfStream();
                    }
                    break;
                case "stop-end-of-stream" /* WorkerMessageType.InterruptEndOfStream */:
                    {
                        if (((_v = (_u = this._currentContentInfo) === null || _u === void 0 ? void 0 : _u.mediaSourceInfo) === null || _v === void 0 ? void 0 : _v.type) !== "main" ||
                            this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                                msgData.mediaSourceId) {
                            return;
                        }
                        const { mediaSource } = this._currentContentInfo.mediaSourceInfo;
                        mediaSource.stopEndOfStream();
                    }
                    break;
                case "dispose-media-source" /* WorkerMessageType.DisposeMediaSource */:
                    {
                        if (((_x = (_w = this._currentContentInfo) === null || _w === void 0 ? void 0 : _w.mediaSourceInfo) === null || _x === void 0 ? void 0 : _x.type) !== "main" ||
                            this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                                msgData.mediaSourceId) {
                            return;
                        }
                        const { mediaSource } = this._currentContentInfo.mediaSourceInfo;
                        mediaSource.dispose();
                    }
                    break;
                case "needs-buffer-flush" /* WorkerMessageType.NeedsBufferFlush */: {
                    if (((_y = this._currentContentInfo) === null || _y === void 0 ? void 0 : _y.contentId) !== msgData.contentId) {
                        return;
                    }
                    const lastObservation = playbackObserver.getReference().getValue();
                    const currentTime = lastObservation.position.isAwaitingFuturePosition()
                        ? lastObservation.position.getWanted()
                        : mediaElement.currentTime;
                    const relativeResumingPosition = (_0 = (_z = msgData.value) === null || _z === void 0 ? void 0 : _z.relativeResumingPosition) !== null && _0 !== void 0 ? _0 : 0;
                    const canBeApproximateSeek = Boolean((_1 = msgData.value) === null || _1 === void 0 ? void 0 : _1.relativePosHasBeenDefaulted);
                    let wantedSeekingTime;
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
                    if (((_2 = this._currentContentInfo) === null || _2 === void 0 ? void 0 : _2.contentId) !== msgData.contentId ||
                        this._currentContentInfo.manifest === null) {
                        return;
                    }
                    const period = arrayFind(this._currentContentInfo.manifest.periods, (p) => p.id === msgData.value.periodId);
                    if (period !== undefined) {
                        this.trigger("activePeriodChanged", { period });
                    }
                    break;
                }
                case "adaptation-changed" /* WorkerMessageType.AdaptationChanged */: {
                    if (((_3 = this._currentContentInfo) === null || _3 === void 0 ? void 0 : _3.contentId) !== msgData.contentId ||
                        this._currentContentInfo.manifest === null) {
                        return;
                    }
                    const period = arrayFind(this._currentContentInfo.manifest.periods, (p) => p.id === msgData.value.periodId);
                    if (period === undefined) {
                        return;
                    }
                    if (msgData.value.adaptationId === null) {
                        this.trigger("adaptationChange", {
                            period,
                            adaptation: null,
                            type: msgData.value.type,
                        });
                        return;
                    }
                    const adaptations = (_4 = period.adaptations[msgData.value.type]) !== null && _4 !== void 0 ? _4 : [];
                    const adaptation = arrayFind(adaptations, (a) => a.id === msgData.value.adaptationId);
                    if (adaptation !== undefined) {
                        this.trigger("adaptationChange", {
                            period,
                            adaptation,
                            type: msgData.value.type,
                        });
                    }
                    break;
                }
                case "representation-changed" /* WorkerMessageType.RepresentationChanged */: {
                    if (((_5 = this._currentContentInfo) === null || _5 === void 0 ? void 0 : _5.contentId) !== msgData.contentId ||
                        this._currentContentInfo.manifest === null) {
                        return;
                    }
                    const period = arrayFind(this._currentContentInfo.manifest.periods, (p) => p.id === msgData.value.periodId);
                    if (period === undefined) {
                        return;
                    }
                    if (msgData.value.representationId === null) {
                        this.trigger("representationChange", {
                            period,
                            type: msgData.value.type,
                            representation: null,
                        });
                        return;
                    }
                    const adaptations = (_6 = period.adaptations[msgData.value.type]) !== null && _6 !== void 0 ? _6 : [];
                    const adaptation = arrayFind(adaptations, (a) => a.id === msgData.value.adaptationId);
                    if (adaptation === undefined) {
                        return;
                    }
                    const representation = arrayFind(adaptation.representations, (r) => r.id === msgData.value.representationId);
                    if (representation !== undefined) {
                        this.trigger("representationChange", {
                            period,
                            type: msgData.value.type,
                            representation,
                        });
                    }
                    break;
                }
                case "encryption-data-encountered" /* WorkerMessageType.EncryptionDataEncountered */:
                    if (((_7 = this._currentContentInfo) === null || _7 === void 0 ? void 0 : _7.contentId) !== msgData.contentId) {
                        return;
                    }
                    lastContentProtection.setValue(msgData.value);
                    break;
                case "manifest-ready" /* WorkerMessageType.ManifestReady */: {
                    if (((_8 = this._currentContentInfo) === null || _8 === void 0 ? void 0 : _8.contentId) !== msgData.contentId) {
                        return;
                    }
                    const manifest = msgData.value.manifest;
                    this._currentContentInfo.manifest = manifest;
                    this._updateCodecSupport(manifest, mediaElement);
                    this._startPlaybackIfReady(playbackStartParams);
                    break;
                }
                case "manifest-update" /* WorkerMessageType.ManifestUpdate */: {
                    if (((_9 = this._currentContentInfo) === null || _9 === void 0 ? void 0 : _9.contentId) !== msgData.contentId) {
                        return;
                    }
                    const manifest = (_10 = this._currentContentInfo) === null || _10 === void 0 ? void 0 : _10.manifest;
                    if (isNullOrUndefined(manifest)) {
                        log.error("Init", "Manifest update but no Manifest loaded");
                        return;
                    }
                    replicateUpdatesOnManifestMetadata(manifest, msgData.value.manifest, msgData.value.updates);
                    (_12 = (_11 = this._currentContentInfo) === null || _11 === void 0 ? void 0 : _11.streamEventsEmitter) === null || _12 === void 0 ? void 0 : _12.onManifestUpdate(manifest);
                    this._updateCodecSupport(manifest, mediaElement);
                    this.trigger("manifestUpdate", msgData.value.updates);
                    break;
                }
                case "update-playback-rate" /* WorkerMessageType.UpdatePlaybackRate */:
                    if (((_13 = this._currentContentInfo) === null || _13 === void 0 ? void 0 : _13.contentId) !== msgData.contentId) {
                        return;
                    }
                    playbackObserver.setPlaybackRate(msgData.value);
                    break;
                case "bitrate-estimate-change" /* WorkerMessageType.BitrateEstimateChange */:
                    if (((_14 = this._currentContentInfo) === null || _14 === void 0 ? void 0 : _14.contentId) !== msgData.contentId) {
                        return;
                    }
                    this.trigger("bitrateEstimateChange", {
                        type: msgData.value.bufferType,
                        bitrate: msgData.value.bitrate,
                    });
                    break;
                case "inband-event" /* WorkerMessageType.InbandEvent */:
                    if (((_15 = this._currentContentInfo) === null || _15 === void 0 ? void 0 : _15.contentId) !== msgData.contentId) {
                        return;
                    }
                    this.trigger("inbandEvents", msgData.value);
                    break;
                case "locked-stream" /* WorkerMessageType.LockedStream */: {
                    if (((_16 = this._currentContentInfo) === null || _16 === void 0 ? void 0 : _16.contentId) !== msgData.contentId ||
                        this._currentContentInfo.manifest === null) {
                        return;
                    }
                    const period = arrayFind(this._currentContentInfo.manifest.periods, (p) => p.id === msgData.value.periodId);
                    if (period === undefined) {
                        return;
                    }
                    (_17 = this._currentContentInfo.rebufferingController) === null || _17 === void 0 ? void 0 : _17.onLockedStream(msgData.value.bufferType, period);
                    break;
                }
                case "period-stream-ready" /* WorkerMessageType.PeriodStreamReady */: {
                    if (((_18 = this._currentContentInfo) === null || _18 === void 0 ? void 0 : _18.contentId) !== msgData.contentId ||
                        this._currentContentInfo.manifest === null) {
                        return;
                    }
                    const period = arrayFind(this._currentContentInfo.manifest.periods, (p) => p.id === msgData.value.periodId);
                    if (period === undefined) {
                        return;
                    }
                    const ref = new SharedReference(undefined);
                    ref.onUpdate((adapChoice) => {
                        if (this._currentContentInfo === null) {
                            ref.finish();
                            return;
                        }
                        if (!isNullOrUndefined(adapChoice)) {
                            adapChoice.representations.onUpdate((repChoice, stopListening) => {
                                if (this._currentContentInfo === null) {
                                    stopListening();
                                    return;
                                }
                                sendMessage(this._settings.worker, {
                                    type: "rep-update" /* MainThreadMessageType.RepresentationUpdate */,
                                    contentId: this._currentContentInfo.contentId,
                                    value: {
                                        periodId: msgData.value.periodId,
                                        adaptationId: adapChoice.adaptationId,
                                        bufferType: msgData.value.bufferType,
                                        choice: repChoice,
                                    },
                                });
                            }, { clearSignal: this._initCanceller.signal });
                        }
                        sendMessage(this._settings.worker, {
                            type: "track-update" /* MainThreadMessageType.TrackUpdate */,
                            contentId: this._currentContentInfo.contentId,
                            value: {
                                periodId: msgData.value.periodId,
                                bufferType: msgData.value.bufferType,
                                choice: isNullOrUndefined(adapChoice)
                                    ? adapChoice
                                    : {
                                        adaptationId: adapChoice.adaptationId,
                                        switchingMode: adapChoice.switchingMode,
                                        initialRepresentations: adapChoice.representations.getValue(),
                                        relativeResumingPosition: adapChoice.relativeResumingPosition,
                                    },
                            },
                        });
                    }, { clearSignal: this._initCanceller.signal });
                    this.trigger("periodStreamReady", {
                        period,
                        type: msgData.value.bufferType,
                        adaptationRef: ref,
                    });
                    break;
                }
                case "period-stream-cleared" /* WorkerMessageType.PeriodStreamCleared */: {
                    if (((_19 = this._currentContentInfo) === null || _19 === void 0 ? void 0 : _19.contentId) !== msgData.contentId ||
                        this._currentContentInfo.manifest === null) {
                        return;
                    }
                    this.trigger("periodStreamCleared", {
                        periodId: msgData.value.periodId,
                        type: msgData.value.bufferType,
                    });
                    break;
                }
                case "discontinuity-update" /* WorkerMessageType.DiscontinuityUpdate */: {
                    if (((_20 = this._currentContentInfo) === null || _20 === void 0 ? void 0 : _20.contentId) !== msgData.contentId ||
                        this._currentContentInfo.manifest === null) {
                        return;
                    }
                    const period = arrayFind(this._currentContentInfo.manifest.periods, (p) => p.id === msgData.value.periodId);
                    if (period === undefined) {
                        log.warn("Init", "Discontinuity's Period not found", {
                            periodId: msgData.value.periodId,
                        });
                        return;
                    }
                    (_21 = this._currentContentInfo.rebufferingController) === null || _21 === void 0 ? void 0 : _21.updateDiscontinuityInfo({
                        period,
                        bufferType: msgData.value.bufferType,
                        discontinuity: msgData.value.discontinuity,
                        position: msgData.value.position,
                    });
                    break;
                }
                case "push-text-data" /* WorkerMessageType.PushTextData */: {
                    if (((_22 = this._currentContentInfo) === null || _22 === void 0 ? void 0 : _22.contentId) !== msgData.contentId) {
                        return;
                    }
                    if (textDisplayer === null) {
                        log.warn("text", "Received AddTextData message but no text displayer exists");
                    }
                    else {
                        try {
                            const ranges = textDisplayer.pushTextData(msgData.value);
                            sendMessage(this._settings.worker, {
                                type: "add-text-success" /* MainThreadMessageType.PushTextDataSuccess */,
                                contentId: msgData.contentId,
                                value: { ranges },
                            });
                        }
                        catch (err) {
                            const message = err instanceof Error ? err.message : "Unknown error";
                            sendMessage(this._settings.worker, {
                                type: "push-text-error" /* MainThreadMessageType.PushTextDataError */,
                                contentId: msgData.contentId,
                                value: { message },
                            });
                        }
                    }
                    break;
                }
                case "remove-text-data" /* WorkerMessageType.RemoveTextData */: {
                    if (((_23 = this._currentContentInfo) === null || _23 === void 0 ? void 0 : _23.contentId) !== msgData.contentId) {
                        return;
                    }
                    if (textDisplayer === null) {
                        log.warn("text", "Received RemoveTextData message but no text displayer exists");
                    }
                    else {
                        try {
                            const ranges = textDisplayer.removeBuffer(msgData.value.start, msgData.value.end);
                            sendMessage(this._settings.worker, {
                                type: "remove-text-success" /* MainThreadMessageType.RemoveTextDataSuccess */,
                                contentId: msgData.contentId,
                                value: { ranges },
                            });
                        }
                        catch (err) {
                            const message = err instanceof Error ? err.message : "Unknown error";
                            sendMessage(this._settings.worker, {
                                type: "remove-text-error" /* MainThreadMessageType.RemoveTextDataError */,
                                contentId: msgData.contentId,
                                value: { message },
                            });
                        }
                    }
                    break;
                }
                case "reset-text-displayer" /* WorkerMessageType.ResetTextDisplayer */: {
                    if (((_24 = this._currentContentInfo) === null || _24 === void 0 ? void 0 : _24.contentId) !== msgData.contentId) {
                        return;
                    }
                    if (textDisplayer === null) {
                        log.warn("text", "Received ResetTextDisplayer message but no text displayer exists");
                    }
                    else {
                        textDisplayer.reset();
                    }
                    break;
                }
                case "stop-text-displayer" /* WorkerMessageType.StopTextDisplayer */: {
                    if (((_25 = this._currentContentInfo) === null || _25 === void 0 ? void 0 : _25.contentId) !== msgData.contentId) {
                        return;
                    }
                    if (textDisplayer === null) {
                        log.warn("text", "Received StopTextDisplayer message but no text displayer exists");
                    }
                    else {
                        textDisplayer.stop();
                    }
                    break;
                }
                case "reloading-media-source" /* WorkerMessageType.ReloadingMediaSource */:
                    {
                        if (this._currentContentInfo === null ||
                            this._currentContentInfo.mediaSourceInfo === null) {
                            return;
                        }
                        const mediaSourceId = this._currentContentInfo.mediaSourceInfo.type === "main"
                            ? this._currentContentInfo.mediaSourceInfo.mediaSource.id
                            : this._currentContentInfo.mediaSourceInfo.mediaSourceId;
                        if (mediaSourceId !== msgData.mediaSourceId) {
                            return;
                        }
                        reloadMediaSource(msgData.value.timeOffset, msgData.value.minimumPosition, msgData.value.maximumPosition);
                    }
                    break;
                case "needs-decipherability-flush" /* WorkerMessageType.NeedsDecipherabilityFlush */:
                    {
                        if (((_26 = this._currentContentInfo) === null || _26 === void 0 ? void 0 : _26.contentId) !== msgData.contentId) {
                            return;
                        }
                        const keySystem = getKeySystemConfiguration(mediaElement);
                        if (shouldReloadMediaSourceOnDecipherabilityUpdate(keySystem === null || keySystem === void 0 ? void 0 : keySystem[0])) {
                            notifyAndStartMediaSourceReload(0, undefined, undefined);
                        }
                        else {
                            const lastObservation = playbackObserver.getReference().getValue();
                            const currentPosition = lastObservation.position.getWanted();
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
                    if (((_27 = this._currentContentInfo) === null || _27 === void 0 ? void 0 : _27.contentId) !== msgData.contentId) {
                        return;
                    }
                    const sinkObj = this._awaitingRequests.pendingSinkMetrics.get(msgData.value.requestId);
                    if (sinkObj !== undefined) {
                        sinkObj.resolve(msgData.value.segmentSinkMetrics);
                    }
                    else {
                        log.error("Init", "Failed to send segment sink store update");
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
                    if (((_28 = this._currentContentInfo) === null || _28 === void 0 ? void 0 : _28.contentId) !== msgData.contentId) {
                        return;
                    }
                    const tObj = this._awaitingRequests.pendingThumbnailFetching.get(msgData.value.requestId);
                    if (tObj !== undefined) {
                        if (msgData.value.status === "error") {
                            tObj.reject(formatWorkerError(msgData.value.error));
                        }
                        else {
                            tObj.resolve(msgData.value.data);
                        }
                    }
                    else {
                        log.error("Init", "Failed to send segment sink store update");
                    }
                    break;
                }
                default:
                    assertUnreachable(msgData);
            }
        };
        log.debug("Init", "addEventListener for worker message");
        if (this._queuedWorkerMessages !== null) {
            const bufferedMessages = this._queuedWorkerMessages.slice();
            log.debug("Init", "Processing buffered messages", {
                ammount: bufferedMessages.length,
            });
            for (const message of bufferedMessages) {
                onmessage(message);
            }
            this._queuedWorkerMessages = null;
        }
        this._settings.worker.addEventListener("message", onmessage);
        this._initCanceller.signal.register(() => {
            log.debug("Init", "removeEventListener for worker message");
            this._settings.worker.removeEventListener("message", onmessage);
        });
    }
    dispose() {
        var _a;
        this._initCanceller.cancel();
        if (this._currentContentInfo !== null) {
            if (((_a = this._currentContentInfo.mediaSourceInfo) === null || _a === void 0 ? void 0 : _a.type) === "main") {
                this._currentContentInfo.mediaSourceInfo.mediaSource.dispose();
            }
            this._currentContentInfo = null;
        }
    }
    _onFatalError(err) {
        if (this._initCanceller.isUsed()) {
            return;
        }
        this._initCanceller.cancel();
        this.trigger("error", err);
    }
    _initializeContentDecryption(mediaElement, lastContentProtection, mediaSourceStatus, reloadMediaSource, cancelSignal) {
        var _a;
        const { keySystems } = this._settings;
        // TODO private?
        const createEmeDisabledReference = (errMsg) => {
            mediaSourceStatus.setValue(1 /* MediaSourceInitializationStatus.AttachNow */);
            lastContentProtection.onUpdate((data, stopListening) => {
                if (data === null) {
                    // initial value
                    return;
                }
                stopListening();
                const err = new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR", errMsg, {
                    keyStatuses: undefined,
                    keySystemConfiguration: undefined,
                    keySystem: undefined,
                });
                this._onFatalError(err);
            }, { clearSignal: cancelSignal });
            const ref = new SharedReference({
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
        else if (features.decrypt === null) {
            return createEmeDisabledReference("EME feature not activated.");
        }
        const ContentDecryptor = features.decrypt;
        const emeApi = (_a = mediaElement.FORCED_EME_API) !== null && _a !== void 0 ? _a : getEmeApiImplementation("auto");
        if (emeApi === null) {
            return createEmeDisabledReference("EME API not available on the current page.");
        }
        log.debug("Init", "Creating ContentDecryptor");
        const contentDecryptor = new ContentDecryptor(emeApi, mediaElement, keySystems);
        const drmStatusRef = new SharedReference({
            initializationState: { type: "uninitialized", value: null },
            drmSystemId: undefined,
        }, cancelSignal);
        const updateCodecSupportOnStateChange = (state) => {
            var _a;
            if (state > ContentDecryptorState.Initializing) {
                const manifest = (_a = this._currentContentInfo) === null || _a === void 0 ? void 0 : _a.manifest;
                if (isNullOrUndefined(manifest)) {
                    return;
                }
                this._updateCodecSupport(manifest, mediaElement);
                contentDecryptor.removeEventListener("stateChange", updateCodecSupportOnStateChange);
            }
        };
        contentDecryptor.addEventListener("stateChange", updateCodecSupportOnStateChange);
        contentDecryptor.addEventListener("keyIdsCompatibilityUpdate", (updates) => {
            if (this._currentContentInfo === null ||
                this._currentContentInfo.manifest === null) {
                return;
            }
            const manUpdates = updateDecipherabilityFromKeyIds(this._currentContentInfo.manifest, updates);
            if (mayMediaElementFailOnUndecipherableData() &&
                manUpdates.some((e) => e.representation.decipherable !== true)) {
                reloadMediaSource();
            }
            else {
                sendMessage(this._settings.worker, {
                    type: "decipherability-update" /* MainThreadMessageType.DecipherabilityStatusUpdate */,
                    contentId: this._currentContentInfo.contentId,
                    value: manUpdates.map((s) => ({
                        representationUniqueId: s.representation.uniqueId,
                        decipherable: s.representation.decipherable,
                    })),
                });
            }
            this.trigger("decipherabilityUpdate", manUpdates);
        });
        contentDecryptor.addEventListener("blackListProtectionData", (protData) => {
            if (this._currentContentInfo === null ||
                this._currentContentInfo.manifest === null) {
                return;
            }
            const manUpdates = updateDecipherabilityFromProtectionData(this._currentContentInfo.manifest, protData);
            if (mayMediaElementFailOnUndecipherableData() &&
                manUpdates.some((e) => e.representation.decipherable !== true)) {
                reloadMediaSource();
            }
            else {
                sendMessage(this._settings.worker, {
                    type: "decipherability-update" /* MainThreadMessageType.DecipherabilityStatusUpdate */,
                    contentId: this._currentContentInfo.contentId,
                    value: manUpdates.map((s) => ({
                        representationUniqueId: s.representation.uniqueId,
                        decipherable: s.representation.decipherable,
                    })),
                });
            }
            this.trigger("decipherabilityUpdate", manUpdates);
        });
        contentDecryptor.addEventListener("stateChange", (state) => {
            if (state === ContentDecryptorState.WaitingForAttachment) {
                mediaSourceStatus.onUpdate((currStatus, stopListening) => {
                    if (currStatus === 0 /* MediaSourceInitializationStatus.Nothing */) {
                        mediaSourceStatus.setValue(1 /* MediaSourceInitializationStatus.AttachNow */);
                    }
                    else if (currStatus === 2 /* MediaSourceInitializationStatus.Attached */) {
                        stopListening();
                        if (state === ContentDecryptorState.WaitingForAttachment) {
                            contentDecryptor.attach();
                        }
                    }
                }, { clearSignal: cancelSignal, emitCurrentValue: true });
            }
            else if (state === ContentDecryptorState.ReadyForContent) {
                drmStatusRef.setValue({
                    initializationState: { type: "initialized", value: null },
                    drmSystemId: contentDecryptor.systemId,
                });
                contentDecryptor.removeEventListener("stateChange");
            }
        });
        contentDecryptor.addEventListener("error", (error) => {
            this._onFatalError(error);
        });
        contentDecryptor.addEventListener("warning", (error) => {
            this.trigger("warning", error);
        });
        lastContentProtection.onUpdate((data) => {
            if (data === null) {
                return;
            }
            contentDecryptor.onInitializationData(data);
        }, { clearSignal: cancelSignal });
        cancelSignal.register(() => {
            contentDecryptor.dispose();
        });
        return { statusRef: drmStatusRef, contentDecryptor };
    }
    /**
     * Retrieves all unknown codecs from the current manifest, checks these unknown codecs
     * to determine if they are supported, updates the manifest with the support
     * status of these codecs, and forwards the list of supported codecs to the web worker.
     * @param manifest
     */
    _updateCodecSupport(manifest, mediaElement) {
        var _a, _b, _c, _d;
        try {
            const updatedCodecs = updateManifestCodecSupport(manifest, (_b = (_a = this._currentContentInfo) === null || _a === void 0 ? void 0 : _a.contentDecryptor) !== null && _b !== void 0 ? _b : null, mediaElement, (_d = (_c = this._currentContentInfo) === null || _c === void 0 ? void 0 : _c.useMseInWorker) !== null && _d !== void 0 ? _d : false);
            if (updatedCodecs.length > 0) {
                sendMessage(this._settings.worker, {
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
    }
    _hasTextBufferFeature() {
        return ((this._settings.textTrackOptions.textTrackMode === "html" &&
            features.htmlTextDisplayer !== null) ||
            features.nativeTextDisplayer !== null);
    }
    _reload(mediaElement, textDisplayer, playbackObserver, mediaSourceStatus, position, autoPlay) {
        this._currentMediaSourceCanceller.cancel();
        this._currentMediaSourceCanceller = new TaskCanceller();
        this._currentMediaSourceCanceller.linkToSignal(this._initCanceller.signal);
        mediaSourceStatus.setValue(1 /* MediaSourceInitializationStatus.AttachNow */);
        this.trigger("reloadingMediaSource", { position, autoPlay });
        mediaSourceStatus.onUpdate((status, stopListeningMSStatusUpdates) => {
            if (status !== 2 /* MediaSourceInitializationStatus.Attached */) {
                return;
            }
            stopListeningMSStatusUpdates();
            const corePlaybackObserver = this._setUpModulesOnNewMediaSource({
                initialTime: position,
                autoPlay,
                mediaElement,
                textDisplayer,
                playbackObserver,
            }, this._currentMediaSourceCanceller.signal);
            if (!this._currentMediaSourceCanceller.isUsed() &&
                corePlaybackObserver !== null &&
                this._currentContentInfo !== null) {
                const contentId = this._currentContentInfo.contentId;
                corePlaybackObserver.listen((obs) => {
                    sendMessage(this._settings.worker, {
                        type: "observation" /* MainThreadMessageType.PlaybackObservation */,
                        contentId,
                        value: objectAssign(obs, {
                            position: obs.position.serialize(),
                        }),
                    });
                }, {
                    includeLastObservation: true,
                    clearSignal: this._currentMediaSourceCanceller.signal,
                });
            }
        }, {
            clearSignal: this._currentMediaSourceCanceller.signal,
            emitCurrentValue: true,
        });
    }
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
    _setUpModulesOnNewMediaSource(parameters, cancelSignal) {
        if (cancelSignal.isCancelled()) {
            return null;
        }
        if (this._currentContentInfo === null) {
            log.error("Init", "Setting up modules without a contentId");
            return null;
        }
        if (this._currentContentInfo.manifest === null) {
            log.error("Init", "Setting up modules without a loaded Manifest");
            return null;
        }
        const { manifest, mediaSourceInfo } = this._currentContentInfo;
        const { speed } = this._settings;
        const { initialTime, autoPlay, mediaElement, textDisplayer, playbackObserver } = parameters;
        this._currentContentInfo.initialTime = initialTime;
        this._currentContentInfo.autoPlay = autoPlay;
        const { autoPlayResult, initialPlayPerformed } = performInitialSeekAndPlay({
            mediaElement,
            playbackObserver,
            startTime: initialTime,
            mustAutoPlay: autoPlay,
            onWarning: (err) => this.trigger("warning", err),
            isDirectfile: false,
        }, cancelSignal);
        this._currentContentInfo.initialPlayPerformed = initialPlayPerformed;
        const corePlaybackObserver = createCorePlaybackObserver(playbackObserver, {
            autoPlay,
            initialPlayPerformed,
            manifest,
            mediaSource: (mediaSourceInfo === null || mediaSourceInfo === void 0 ? void 0 : mediaSourceInfo.type) === "main" ? mediaSourceInfo.mediaSource : null,
            speed,
            textDisplayer,
        }, cancelSignal);
        if (cancelSignal.isCancelled()) {
            return null;
        }
        /**
         * Class trying to avoid various stalling situations, emitting "stalled"
         * events when it cannot, as well as "unstalled" events when it get out of one.
         */
        const rebufferingController = new RebufferingController(playbackObserver, manifest, speed);
        rebufferingController.addEventListener("stalled", (evt) => this.trigger("stalled", evt));
        rebufferingController.addEventListener("unstalled", () => this.trigger("unstalled", null));
        rebufferingController.addEventListener("warning", (err) => this.trigger("warning", err));
        cancelSignal.register(() => {
            rebufferingController.destroy();
        });
        rebufferingController.start();
        this._currentContentInfo.rebufferingController = rebufferingController;
        const currentContentInfo = this._currentContentInfo;
        initialPlayPerformed.onUpdate((isPerformed, stopListening) => {
            if (isPerformed) {
                stopListening();
                const streamEventsEmitter = new StreamEventsEmitter(manifest, playbackObserver);
                currentContentInfo.streamEventsEmitter = streamEventsEmitter;
                streamEventsEmitter.addEventListener("event", (payload) => {
                    this.trigger("streamEvent", payload);
                }, cancelSignal);
                streamEventsEmitter.addEventListener("eventSkip", (payload) => {
                    this.trigger("streamEventSkip", payload);
                }, cancelSignal);
                streamEventsEmitter.start();
                cancelSignal.register(() => {
                    streamEventsEmitter.stop();
                });
            }
        }, { clearSignal: cancelSignal, emitCurrentValue: true });
        const _getSegmentSinkMetrics = async () => {
            this._awaitingRequests.nextRequestId++;
            const requestId = this._awaitingRequests.nextRequestId;
            sendMessage(this._settings.worker, {
                type: "pull-segment-sink-store-infos" /* MainThreadMessageType.PullSegmentSinkStoreInfos */,
                value: { requestId },
            });
            return new Promise((resolve, reject) => {
                const rejectFn = (err) => {
                    cancelSignal.deregister(rejectFn);
                    this._awaitingRequests.pendingSinkMetrics.delete(requestId);
                    return reject(err);
                };
                this._awaitingRequests.pendingSinkMetrics.set(requestId, {
                    resolve: (value) => {
                        cancelSignal.deregister(rejectFn);
                        this._awaitingRequests.pendingSinkMetrics.delete(requestId);
                        resolve(value);
                    },
                });
                cancelSignal.register(rejectFn);
            });
        };
        const _getThumbnailsData = async (periodId, thumbnailTrackId, time) => {
            if (this._currentContentInfo === null) {
                return Promise.reject(new Error("Cannot fetch thumbnails: No content loaded."));
            }
            this._awaitingRequests.nextRequestId++;
            const requestId = this._awaitingRequests.nextRequestId;
            sendMessage(this._settings.worker, {
                type: "thumbnail-request" /* MainThreadMessageType.ThumbnailDataRequest */,
                contentId: this._currentContentInfo.contentId,
                value: { requestId, periodId, thumbnailTrackId, time },
            });
            return new Promise((resolve, reject) => {
                const rejectFn = (err) => {
                    cleanUp();
                    reject(err);
                };
                const cleanUp = () => {
                    cancelSignal.deregister(rejectFn);
                    this._awaitingRequests.pendingThumbnailFetching.delete(requestId);
                };
                this._awaitingRequests.pendingThumbnailFetching.set(requestId, {
                    resolve: (value) => {
                        cleanUp();
                        resolve(value);
                    },
                    reject: (value) => {
                        cleanUp();
                        reject(value);
                    },
                });
                cancelSignal.register(rejectFn);
            });
        };
        /**
         * Emit a "loaded" events once the initial play has been performed and the
         * media can begin playback.
         * Also emits warning events if issues arise when doing so.
         */
        autoPlayResult
            .then(() => {
            getLoadedReference(playbackObserver, false, cancelSignal).onUpdate((isLoaded, stopListening) => {
                if (isLoaded) {
                    stopListening();
                    this.trigger("loaded", {
                        getSegmentSinkMetrics: _getSegmentSinkMetrics,
                        getThumbnailData: _getThumbnailsData,
                    });
                }
            }, { emitCurrentValue: true, clearSignal: cancelSignal });
        })
            .catch((err) => {
            if (cancelSignal.isCancelled()) {
                return;
            }
            this._onFatalError(err);
        });
        return corePlaybackObserver;
    }
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
    _startPlaybackIfReady(parameters) {
        if (this._currentContentInfo === null || this._currentContentInfo.manifest === null) {
            return false;
        }
        const drmInitStatus = parameters.drmInitializationStatus.getValue();
        if (drmInitStatus.initializationState.type !== "initialized") {
            return false;
        }
        const msInitStatus = parameters.mediaSourceStatus.getValue();
        if (msInitStatus !== 2 /* MediaSourceInitializationStatus.Attached */) {
            return false;
        }
        const { contentId, manifest } = this._currentContentInfo;
        log.debug("Init", "Calculating initial time");
        const initialTime = getInitialTime(manifest, this._settings.lowLatencyMode, this._settings.startAt);
        log.debug("Init", "Initial time calculated", { initialTime });
        const { enableFastSwitching, onCodecSwitch } = this._settings.bufferOptions;
        const corePlaybackObserver = this._setUpModulesOnNewMediaSource({
            initialTime,
            autoPlay: this._settings.autoPlay,
            mediaElement: parameters.mediaElement,
            textDisplayer: parameters.textDisplayer,
            playbackObserver: parameters.playbackObserver,
        }, this._currentMediaSourceCanceller.signal);
        if (this._currentMediaSourceCanceller.isUsed() || corePlaybackObserver === null) {
            return true;
        }
        const initialObservation = corePlaybackObserver.getReference().getValue();
        const sentInitialObservation = objectAssign(initialObservation, {
            position: initialObservation.position.serialize(),
        });
        sendMessage(this._settings.worker, {
            type: "start" /* MainThreadMessageType.StartPreparedContent */,
            contentId,
            value: {
                initialTime,
                initialObservation: sentInitialObservation,
                drmSystemId: drmInitStatus.drmSystemId,
                enableFastSwitching,
                onCodecSwitch,
            },
        });
        corePlaybackObserver.listen((obs) => {
            sendMessage(this._settings.worker, {
                type: "observation" /* MainThreadMessageType.PlaybackObservation */,
                contentId,
                value: objectAssign(obs, { position: obs.position.serialize() }),
            });
        }, {
            includeLastObservation: false,
            clearSignal: this._currentMediaSourceCanceller.signal,
        });
        this.trigger("manifestReady", manifest);
        return true;
    }
    /**
     * Handles Worker messages asking to create a MediaSource.
     * @param {Object} msg - The worker's message received.
     * @param {HTMLMediaElement} mediaElement - HTMLMediaElement on which the
     * content plays.
     * @param {Worker} worker - The WebWorker concerned, messages may be sent back
     * to it.
     */
    _onCreateMediaSourceMessage(msg, mediaElement, mediaSourceStatus, worker) {
        var _a;
        if (((_a = this._currentContentInfo) === null || _a === void 0 ? void 0 : _a.contentId) !== msg.contentId) {
            log.info("Init", "Ignoring MediaSource attachment due to wrong `contentId`");
        }
        else {
            const { mediaSourceId } = msg;
            try {
                mediaSourceStatus.onUpdate((currStatus, stopListening) => {
                    var _a;
                    if (this._currentContentInfo === null) {
                        stopListening();
                        return;
                    }
                    if (currStatus === 1 /* MediaSourceInitializationStatus.AttachNow */) {
                        stopListening();
                        const mediaSource = new MainMediaSourceInterface(mediaSourceId);
                        if (((_a = this._currentContentInfo.mediaSourceInfo) === null || _a === void 0 ? void 0 : _a.type) === "main") {
                            this._currentContentInfo.mediaSourceInfo.mediaSource.dispose();
                        }
                        this._currentContentInfo.mediaSourceInfo = {
                            type: "main",
                            mediaSource,
                        };
                        mediaSource.addEventListener("mediaSourceOpen", () => {
                            sendMessage(worker, {
                                type: "media-source-ready-state-change" /* MainThreadMessageType.MediaSourceReadyStateChange */,
                                mediaSourceId,
                                value: "open",
                            });
                        });
                        mediaSource.addEventListener("mediaSourceEnded", () => {
                            sendMessage(worker, {
                                type: "media-source-ready-state-change" /* MainThreadMessageType.MediaSourceReadyStateChange */,
                                mediaSourceId,
                                value: "ended",
                            });
                        });
                        mediaSource.addEventListener("mediaSourceClose", () => {
                            sendMessage(worker, {
                                type: "media-source-ready-state-change" /* MainThreadMessageType.MediaSourceReadyStateChange */,
                                mediaSourceId,
                                value: "closed",
                            });
                        });
                        let url = null;
                        if (mediaSource.handle.type === "handle") {
                            mediaElement.srcObject = mediaSource.handle.value;
                        }
                        else {
                            url = URL.createObjectURL(mediaSource.handle.value);
                            mediaElement.src = url;
                        }
                        this._currentMediaSourceCanceller.signal.register(() => {
                            mediaSource.dispose();
                            resetMediaElement(mediaElement, url);
                        });
                        mediaSourceStatus.setValue(2 /* MediaSourceInitializationStatus.Attached */);
                        disableRemotePlaybackOnManagedMediaSource(mediaElement, this._currentMediaSourceCanceller.signal);
                    }
                }, {
                    emitCurrentValue: true,
                    clearSignal: this._currentMediaSourceCanceller.signal,
                });
            }
            catch (_err) {
                const error = new OtherError("NONE", "Unknown error when creating the MediaSource");
                this._onFatalError(error);
            }
        }
    }
}
function bindNumberReferencesToWorker(worker, cancellationSignal, ...refs) {
    for (const ref of refs) {
        ref[0].onUpdate((newVal) => {
            // NOTE: The TypeScript checks have already been made by this function's
            // overload, but the body here is not aware of that.
            sendMessage(worker, {
                type: "ref-update" /* MainThreadMessageType.ReferenceUpdate */,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
                value: { name: ref[1], newVal: newVal },
            });
        }, { clearSignal: cancellationSignal, emitCurrentValue: true });
    }
}
function formatWorkerError(sentError) {
    switch (sentError.name) {
        case "NetworkError":
            return new NetworkError(sentError.code, new RequestError(sentError.baseError.url, sentError.baseError.status, sentError.baseError.type));
        case "MediaError":
            // eslint-disable-next-line
            return new MediaError(sentError.code, sentError.reason, {
                tracks: sentError.tracks,
            });
        case "EncryptedMediaError":
            // We assume that everything have already been checked Worker-side here
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            return new EncryptedMediaError(sentError.code, sentError.reason, {
                keyStatuses: sentError.keyStatuses,
                keySystemConfiguration: sentError.keySystemConfiguration,
                keySystem: sentError.keySystem,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            });
        case "OtherError":
            return new OtherError(sentError.code, sentError.reason);
    }
}
function formatSourceBufferError(error) {
    if (error instanceof SourceBufferError) {
        return error;
    }
    else if (error instanceof Error) {
        return new SourceBufferError(error.name, error.message, error.name === "QuotaExceededError");
    }
    else {
        return new SourceBufferError("Error", "Unknown SourceBufferError Error", false);
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
