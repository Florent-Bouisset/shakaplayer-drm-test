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
import log from "../../../log";
import assert from "../../../utils/assert";
import EventEmitter from "../../../utils/event_emitter";
import noop from "../../../utils/noop";
import objectAssign from "../../../utils/object_assign";
import SharedReference from "../../../utils/reference";
import TaskCanceller from "../../../utils/task_canceller";
/**
 * Class scheduling segment downloads as a FIFO queue.
 */
export default class SegmentQueue extends EventEmitter {
    /**
     * Create a new `SegmentQueue`.
     *
     * @param {Object} segmentFetcher - Interface to facilitate the download of
     * segments.
     * @param {Object} isMediaSegmentQueueInterrupted - Reference to a boolean indicating
     * if the media segment queue is interrupted.
     */
    constructor(segmentFetcher, isMediaSegmentQueueInterrupted) {
        super();
        this._segmentFetcher = segmentFetcher;
        this._currentContentInfo = null;
        this.isMediaSegmentQueueInterrupted = isMediaSegmentQueueInterrupted;
    }
    /**
     * Returns the initialization segment currently being requested.
     * Returns `null` if no initialization segment request is pending.
     * @returns {Object | null}
     */
    getRequestedInitSegment() {
        var _a, _b, _c;
        return (_c = (_b = (_a = this._currentContentInfo) === null || _a === void 0 ? void 0 : _a.initSegmentRequest) === null || _b === void 0 ? void 0 : _b.segment) !== null && _c !== void 0 ? _c : null;
    }
    /**
     * Returns the media segment currently being requested.
     * Returns `null` if no media segment request is pending.
     * @returns {Object | null}
     */
    getRequestedMediaSegment() {
        var _a, _b, _c;
        return (_c = (_b = (_a = this._currentContentInfo) === null || _a === void 0 ? void 0 : _a.mediaSegmentRequest) === null || _b === void 0 ? void 0 : _b.segment) !== null && _c !== void 0 ? _c : null;
    }
    /**
     * Return an object allowing to schedule segment requests linked to the given
     * content.
     * The `SegmentQueue` will emit events as it loads and parses initialization
     * and media segments.
     *
     * Calling this method resets all previous queues that were previously started
     * on the same instance.
     *
     * @param {Object} content - The context of the Representation you want to
     * load segments for.
     * @param {boolean} hasInitSegment - Declare that an initialization segment
     * will need to be downloaded.
     *
     * A `SegmentQueue` ALWAYS wait for the initialization segment to be
     * loaded and parsed before parsing a media segment.
     *
     * In cases where no initialization segment exist, this would lead to the
     * `SegmentQueue` waiting indefinitely for it.
     *
     * By setting that value to `false`, you anounce to the `SegmentQueue`
     * that it should not wait for an initialization segment before parsing a
     * media segment.
     * @returns {Object} - `SharedReference` on which the queue of segment for
     * that content can be communicated and updated. See type for more
     * information.
     */
    resetForContent(content, hasInitSegment) {
        var _a;
        (_a = this._currentContentInfo) === null || _a === void 0 ? void 0 : _a.currentCanceller.cancel();
        const downloadQueue = new SharedReference({
            initSegment: null,
            segmentQueue: [],
        });
        const currentCanceller = new TaskCanceller();
        currentCanceller.signal.register(() => {
            downloadQueue.finish();
        });
        const currentContentInfo = {
            content,
            downloadQueue,
            initSegmentInfoRef: hasInitSegment
                ? new SharedReference(undefined)
                : new SharedReference(null),
            currentCanceller,
            initSegmentRequest: null,
            mediaSegmentRequest: null,
            mediaSegmentAwaitingInitMetadata: null,
        };
        this._currentContentInfo = currentContentInfo;
        this.isMediaSegmentQueueInterrupted.onUpdate((val) => {
            if (!val) {
                log.debug("SF", "Media segment can be loaded again, restarting queue.", {
                    type: content.adaptation.type,
                });
                this._restartMediaSegmentDownloadingQueue(currentContentInfo);
            }
        }, { clearSignal: currentCanceller.signal });
        // Listen for asked media segments
        downloadQueue.onUpdate((queue) => {
            const { segmentQueue } = queue;
            if (segmentQueue.length > 0 &&
                segmentQueue[0].segment.id ===
                    currentContentInfo.mediaSegmentAwaitingInitMetadata) {
                // The most needed segment is still the same one, and there's no need to
                // update its priority as the request already ended, just quit.
                return;
            }
            const currentSegmentRequest = currentContentInfo.mediaSegmentRequest;
            if (segmentQueue.length === 0) {
                if (currentSegmentRequest === null) {
                    // There's nothing to load but there's already no request pending.
                    return;
                }
                log.debug("SF", "no more media segment to request. Cancelling queue.", {
                    type: content.adaptation.type,
                });
                this._restartMediaSegmentDownloadingQueue(currentContentInfo);
                return;
            }
            else if (currentSegmentRequest === null) {
                // There's no request although there are needed segments: start requests
                log.debug("SF", "Media segments now need to be requested. Starting queue.", {
                    type: content.adaptation.type,
                    queueLength: segmentQueue.length,
                });
                this._restartMediaSegmentDownloadingQueue(currentContentInfo);
                return;
            }
            else {
                const nextItem = segmentQueue[0];
                if (currentSegmentRequest.segment.id !== nextItem.segment.id) {
                    // The most important request if for another segment, request it
                    log.debug("SF", "Next media segment changed, cancelling previous", {
                        type: content.adaptation.type,
                    });
                    this._restartMediaSegmentDownloadingQueue(currentContentInfo);
                    return;
                }
                if (currentSegmentRequest.priority !== nextItem.priority) {
                    // The priority of the most important request has changed, update it
                    log.debug("SF", "Priority of next media segment changed, updating", {
                        type: content.adaptation.type,
                        prevPriority: currentSegmentRequest.priority,
                        newPriority: nextItem.priority,
                    });
                    this._segmentFetcher.updatePriority(currentSegmentRequest.request, nextItem.priority);
                }
                return;
            }
        }, { emitCurrentValue: true, clearSignal: currentCanceller.signal });
        // Listen for asked init segment
        downloadQueue.onUpdate((next) => {
            var _a;
            const initSegmentRequest = currentContentInfo.initSegmentRequest;
            if (next.initSegment !== null && initSegmentRequest !== null) {
                if (next.initSegment.priority !== initSegmentRequest.priority) {
                    this._segmentFetcher.updatePriority(initSegmentRequest.request, next.initSegment.priority);
                }
                return;
            }
            else if (((_a = next.initSegment) === null || _a === void 0 ? void 0 : _a.segment.id) === (initSegmentRequest === null || initSegmentRequest === void 0 ? void 0 : initSegmentRequest.segment.id)) {
                return;
            }
            if (next.initSegment === null) {
                log.debug("SF", "no more init segment to request. Cancelling queue.", {
                    type: content.adaptation.type,
                });
            }
            this._restartInitSegmentDownloadingQueue(currentContentInfo, next.initSegment);
        }, { emitCurrentValue: true, clearSignal: currentCanceller.signal });
        return downloadQueue;
    }
    /**
     * Stop the currently-active `SegmentQueue`.
     *
     * Do nothing if no queue is active.
     */
    stop() {
        var _a;
        (_a = this._currentContentInfo) === null || _a === void 0 ? void 0 : _a.currentCanceller.cancel();
        this._currentContentInfo = null;
    }
    /**
     * Internal logic performing media segment requests.
     */
    _restartMediaSegmentDownloadingQueue(contentInfo) {
        if (contentInfo.mediaSegmentRequest !== null) {
            contentInfo.mediaSegmentRequest.canceller.cancel();
        }
        const { downloadQueue, content, initSegmentInfoRef, currentCanceller } = contentInfo;
        const recursivelyRequestSegments = () => {
            var _a;
            if (this.isMediaSegmentQueueInterrupted.getValue()) {
                log.debug("SF", "Segment fetching postponed because it cannot stream now.");
                return;
            }
            const { segmentQueue } = downloadQueue.getValue();
            const startingSegment = segmentQueue[0];
            if (currentCanceller !== null && currentCanceller.isUsed()) {
                contentInfo.mediaSegmentRequest = null;
                return;
            }
            if (startingSegment === undefined) {
                contentInfo.mediaSegmentRequest = null;
                this.trigger("emptyQueue", null);
                return;
            }
            const canceller = new TaskCanceller();
            const unlinkCanceller = currentCanceller === null
                ? noop
                : canceller.linkToSignal(currentCanceller.signal);
            const { segment, priority } = startingSegment;
            const context = objectAssign({ segment, nextSegment: (_a = segmentQueue[1]) === null || _a === void 0 ? void 0 : _a.segment }, content);
            /**
             * If `true` , the current task has either errored, finished, or was
             * cancelled.
             */
            let isComplete = false;
            /**
             * If true, we're currently waiting for the initialization segment to be
             * parsed before parsing a received chunk.
             */
            let isWaitingOnInitSegment = false;
            canceller.signal.register(() => {
                contentInfo.mediaSegmentRequest = null;
                if (isComplete) {
                    return;
                }
                if (contentInfo.mediaSegmentAwaitingInitMetadata === segment.id) {
                    contentInfo.mediaSegmentAwaitingInitMetadata = null;
                }
                isComplete = true;
                isWaitingOnInitSegment = false;
            });
            const emitChunk = (parsed) => {
                assert(parsed.segmentType === "media", "Should have loaded a media segment.");
                this.trigger("parsedMediaSegment", objectAssign({}, parsed, { segment }));
            };
            const continueToNextSegment = () => {
                const lastQueue = downloadQueue.getValue().segmentQueue;
                if (lastQueue.length === 0) {
                    isComplete = true;
                    this.trigger("emptyQueue", null);
                    return;
                }
                else if (lastQueue[0].segment.id === segment.id) {
                    lastQueue.shift();
                }
                isComplete = true;
                recursivelyRequestSegments();
            };
            /** Scheduled actual segment request. */
            const request = this._segmentFetcher.createRequest(context, priority, {
                /**
                 * Callback called when the request has to be retried.
                 * @param {Error} error
                 */
                onRetry: (error) => {
                    this.trigger("requestRetry", { segment, error });
                },
                /**
                 * Callback called when the request has to be interrupted and
                 * restarted later.
                 */
                beforeInterrupted() {
                    log.info("SF", "segment request interrupted temporarly.", {
                        segmentId: segment.id,
                        segmentTime: segment.time,
                    });
                },
                /**
                 * Callback called when a decodable chunk of the segment is available.
                 * @param {Function} parse - Function allowing to parse the segment.
                 */
                onChunk: (parse) => {
                    const initTimescale = initSegmentInfoRef.getValue();
                    if (initTimescale !== undefined) {
                        emitChunk(parse(initTimescale !== null && initTimescale !== void 0 ? initTimescale : undefined));
                    }
                    else {
                        isWaitingOnInitSegment = true;
                        // We could also technically call `waitUntilDefined` in both cases,
                        // but I found it globally clearer to segregate the two cases,
                        // especially to always have a meaningful `isWaitingOnInitSegment`
                        // boolean which is a very important variable.
                        initSegmentInfoRef.waitUntilDefined((actualTimescale) => {
                            emitChunk(parse(actualTimescale !== null && actualTimescale !== void 0 ? actualTimescale : undefined));
                        }, { clearSignal: canceller.signal });
                    }
                },
                /** Callback called after all chunks have been sent. */
                onAllChunksReceived: () => {
                    if (!isWaitingOnInitSegment) {
                        this.trigger("fullyLoadedSegment", segment);
                    }
                    else {
                        contentInfo.mediaSegmentAwaitingInitMetadata = segment.id;
                        initSegmentInfoRef.waitUntilDefined(() => {
                            contentInfo.mediaSegmentAwaitingInitMetadata = null;
                            isWaitingOnInitSegment = false;
                            this.trigger("fullyLoadedSegment", segment);
                        }, { clearSignal: canceller.signal });
                    }
                },
                /**
                 * Callback called right after the request ended but before the next
                 * requests are scheduled. It is used to schedule the next segment.
                 */
                beforeEnded: () => {
                    unlinkCanceller();
                    contentInfo.mediaSegmentRequest = null;
                    if (isWaitingOnInitSegment) {
                        initSegmentInfoRef.waitUntilDefined(continueToNextSegment, {
                            clearSignal: canceller.signal,
                        });
                    }
                    else {
                        continueToNextSegment();
                    }
                },
            }, canceller.signal);
            request.catch((error) => {
                unlinkCanceller();
                if (!isComplete) {
                    isComplete = true;
                    this.stop();
                    this.trigger("error", error);
                }
            });
            contentInfo.mediaSegmentRequest = { segment, priority, request, canceller };
        };
        recursivelyRequestSegments();
    }
    /**
     * Internal logic performing initialization segment requests.
     * @param {Object} contentInfo
     * @param {Object} queuedInitSegment
     */
    _restartInitSegmentDownloadingQueue(contentInfo, queuedInitSegment) {
        const { content, initSegmentInfoRef } = contentInfo;
        if (contentInfo.initSegmentRequest !== null) {
            contentInfo.initSegmentRequest.canceller.cancel();
        }
        if (queuedInitSegment === null) {
            return;
        }
        const canceller = new TaskCanceller();
        const unlinkCanceller = contentInfo.currentCanceller === null
            ? noop
            : canceller.linkToSignal(contentInfo.currentCanceller.signal);
        const { segment, priority } = queuedInitSegment;
        const context = objectAssign({ segment, nextSegment: undefined }, content);
        /**
         * If `true` , the current task has either errored, finished, or was
         * cancelled.
         */
        let isComplete = false;
        const request = this._segmentFetcher.createRequest(context, priority, {
            onRetry: (err) => {
                this.trigger("requestRetry", { segment, error: err });
            },
            beforeInterrupted: () => {
                log.info("SF", "init segment request interrupted temporarly.", {
                    segmentId: segment.id,
                });
            },
            beforeEnded: () => {
                unlinkCanceller();
                contentInfo.initSegmentRequest = null;
                isComplete = true;
            },
            onChunk: (parse) => {
                var _a;
                const parsed = parse(undefined);
                assert(parsed.segmentType === "init", "Should have loaded an init segment.");
                this.trigger("parsedInitSegment", objectAssign({}, parsed, { segment }));
                if (parsed.segmentType === "init") {
                    initSegmentInfoRef.setValue((_a = parsed.initTimescale) !== null && _a !== void 0 ? _a : null);
                }
            },
            onAllChunksReceived: () => {
                this.trigger("fullyLoadedSegment", segment);
            },
        }, canceller.signal);
        request.catch((error) => {
            unlinkCanceller();
            if (!isComplete) {
                isComplete = true;
                this.stop();
                this.trigger("error", error);
            }
        });
        canceller.signal.register(() => {
            contentInfo.initSegmentRequest = null;
            if (isComplete) {
                return;
            }
            isComplete = true;
        });
        contentInfo.initSegmentRequest = { segment, priority, request, canceller };
    }
}
