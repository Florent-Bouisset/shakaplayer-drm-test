import config from "../../../config";
import { formatError } from "../../../errors";
import log from "../../../log";
import arrayFind from "../../../utils/array_find";
import objectAssign from "../../../utils/object_assign";
import TaskCanceller, { CancellationError } from "../../../utils/task_canceller";
import errorSelector from "../utils/error_selector";
import { scheduleRequestWithCdns } from "../utils/schedule_request";
/**
 * Create an `IThumbnailFetcher` object which will allow to easily fetch and parse
 * segments.
 * An `IThumbnailFetcher` also implements a retry mechanism, based on the given
 * `requestOptions` argument, which may retry a segment request when it fails.
 *
 * @param {Object} pipeline
 * @param {Object|null} cdnPrioritizer
 * @returns {Function}
 */
export default function createThumbnailFetcher(
/** The transport-specific logic allowing to load thumbnails. */
pipeline, 
/**
 * Abstraction allowing to synchronize, update and keep track of the
 * priorization of the CDN to use to load any given segment, in cases where
 * multiple ones are available.
 *
 * Can be set to `null` in which case a minimal priorization logic will be used
 * instead.
 */
cdnPrioritizer) {
    const { loadThumbnail } = pipeline;
    // We store information on pending requests, as often the same thumbnail is
    // requested many times in a row (due to e.g. the mouse cursor rapidly moving
    // on the seek bar).
    // So `pendingRequestsInfo` contains metadata on the pending thumbnail request
    // if one or else `null`.
    const pendingRequestsInfo = [];
    /**
     * Fetch a specific thumbnail.
     * @param {Object} thumbnailContext
     * @param {Object} cancellationSignal
     * @returns {Promise}
     */
    return async function fetchThumbnail(thumbnailContext, cancellationSignal) {
        cancellationSignal.register(onCancellation);
        let currRequestInfo;
        // First check if we're not requesting again the last thumbnail
        const pendingInfo = arrayFind(pendingRequestsInfo, ({ thumbnailContext: pCtxt }) => {
            return (pCtxt.period.id === thumbnailContext.period.id &&
                pCtxt.track.id === thumbnailContext.track.id &&
                pCtxt.segment.id === thumbnailContext.segment.id);
        });
        if (pendingInfo !== undefined) {
            log.debug("Thumbnails", "Requesting same thumbnail than the pending one", {
                time: thumbnailContext.segment.time,
            });
            currRequestInfo = pendingInfo;
            currRequestInfo.referenceCount++;
            // Same thumbnail than the pending one, return it.
            let response;
            try {
                response = await currRequestInfo.promise;
            }
            catch (err) {
                cancellationSignal.deregister(onCancellation);
                throw err;
            }
            cancellationSignal.deregister(onCancellation);
            return response;
        }
        const { segment: thumbnail, track: thumbnailTrack } = thumbnailContext;
        // NOTE: For now, as multiple `fetchThumbnail` calls might rely on the
        // same request, it is difficult to let different request options
        // per call. So this is not enabled yet.
        const requestOptions = getThumbnailFetcherRequestOptions({});
        let connectionTimeout;
        if (requestOptions.connectionTimeout === undefined ||
            requestOptions.connectionTimeout < 0) {
            connectionTimeout = undefined;
        }
        else {
            connectionTimeout = requestOptions.connectionTimeout;
        }
        const pipelineRequestOptions = {
            timeout: requestOptions.requestTimeout < 0 ? undefined : requestOptions.requestTimeout,
            connectionTimeout,
            cmcdPayload: undefined,
        };
        /**
         * `TaskCanceller` linked to the thumbnail request.
         * This is different than `cancellationSignal` which is linked to this call,
         * as several calls might share the same request.
         */
        const requestCanceller = new TaskCanceller();
        const fetchPromise = doFetch();
        currRequestInfo = {
            thumbnailContext,
            promise: fetchPromise,
            referenceCount: 1,
        };
        pendingRequestsInfo.push(currRequestInfo);
        const clearRequestInfo = () => {
            const currRequestIdx = pendingRequestsInfo.indexOf(currRequestInfo);
            if (currRequestIdx >= 0) {
                pendingRequestsInfo.splice(currRequestIdx, 1);
            }
        };
        try {
            const fetchResult = await fetchPromise;
            clearRequestInfo();
            return fetchResult;
        }
        catch (err) {
            clearRequestInfo();
            throw err;
        }
        async function doFetch() {
            log.debug("Thumbnails", "Beginning thumbnail request", { time: thumbnail.time });
            let res;
            try {
                res = await scheduleRequestWithCdns(thumbnailTrack.cdnMetadata, cdnPrioritizer, callLoaderWithUrl, objectAssign({ onRetry }, requestOptions), requestCanceller.signal);
                if (cancellationSignal.isCancelled()) {
                    return Promise.reject(cancellationSignal.cancellationError);
                }
                log.debug("Thumbnails", "Thumbnail request ended with success", {
                    time: thumbnail.time,
                });
                cancellationSignal.deregister(onCancellation);
            }
            catch (err) {
                cancellationSignal.deregister(onCancellation);
                if (err instanceof CancellationError) {
                    log.debug("Thumbnails", "Thumbnail request aborted", { time: thumbnail.time });
                    throw err;
                }
                log.debug("Thumbnails", "Thumbnail request failed", { time: thumbnail.time });
                throw errorSelector(err);
            }
            try {
                const parsed = pipeline.parseThumbnail(res.responseData, {
                    thumbnail,
                    thumbnailTrack,
                });
                return parsed;
            }
            catch (error) {
                throw formatError(error, {
                    defaultCode: "PIPELINE_PARSE_ERROR",
                    defaultReason: "Unknown parsing error",
                });
            }
        }
        function onCancellation() {
            log.debug("Thumbnails", "Thumbnail request cancelled", { time: thumbnail.time });
            const requestIdx = pendingRequestsInfo.indexOf(currRequestInfo);
            if (requestIdx < 0) {
                return;
            }
            pendingRequestsInfo[requestIdx].referenceCount--;
            if (pendingRequestsInfo[requestIdx].referenceCount <= 0) {
                requestCanceller.cancel();
                pendingRequestsInfo.splice(requestIdx, 1);
            }
        }
        /**
         * Call a segment loader for the given URL with the right arguments.
         * @param {Object|null} cdnMetadata
         * @returns {Promise}
         */
        function callLoaderWithUrl(cdnMetadata) {
            return loadThumbnail(cdnMetadata, thumbnail, pipelineRequestOptions, cancellationSignal);
        }
        /**
         * Function called when the function request is retried.
         * @param {*} err
         */
        function onRetry(err) {
            const formattedErr = errorSelector(err);
            log.warn("Thumbnails", "Thumbnail request retry ", {
                time: thumbnail.time,
            }, formattedErr);
        }
    };
}
/**
 * @param {Object} baseOptions
 * @returns {Object}
 */
function getThumbnailFetcherRequestOptions({ maxRetry, requestTimeout, connectionTimeout, }) {
    const { DEFAULT_MAX_THUMBNAIL_REQUESTS_RETRY_ON_ERROR, DEFAULT_THUMBNAIL_REQUEST_TIMEOUT, DEFAULT_THUMBNAIL_CONNECTION_TIMEOUT, INITIAL_BACKOFF_DELAY_BASE, MAX_BACKOFF_DELAY_BASE, } = config.getCurrent();
    return {
        maxRetry: maxRetry !== null && maxRetry !== void 0 ? maxRetry : DEFAULT_MAX_THUMBNAIL_REQUESTS_RETRY_ON_ERROR,
        baseDelay: INITIAL_BACKOFF_DELAY_BASE.REGULAR,
        maxDelay: MAX_BACKOFF_DELAY_BASE.REGULAR,
        requestTimeout: requestTimeout === undefined ? DEFAULT_THUMBNAIL_REQUEST_TIMEOUT : requestTimeout,
        connectionTimeout: connectionTimeout === undefined
            ? DEFAULT_THUMBNAIL_CONNECTION_TIMEOUT
            : connectionTimeout,
    };
}
