import type { ISegment, IThumbnailTrack } from "../../../manifest";
import type { IPeriod } from "../../../public_types";
import type { IThumbnailPipeline, IThumbnailResponse } from "../../../transports";
import type { CancellationSignal } from "../../../utils/task_canceller";
import type CdnPrioritizer from "../cdn_prioritizer";
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
pipeline: IThumbnailPipeline, 
/**
 * Abstraction allowing to synchronize, update and keep track of the
 * priorization of the CDN to use to load any given segment, in cases where
 * multiple ones are available.
 *
 * Can be set to `null` in which case a minimal priorization logic will be used
 * instead.
 */
cdnPrioritizer: CdnPrioritizer | null): IThumbnailFetcher;
/**
 * Defines the `IThumbnailFetcher` function which allows to load a single segment.
 *
 * Loaded data is entirely communicated through callbacks present in the
 * `callbacks` arguments.
 *
 * The returned Promise only gives an indication of if the request ended with
 * success or on error.
 */
export type IThumbnailFetcher = (
/** Context on the thumbnail you want to load */
thumbnailContext: {
    /** Thumbnail "segment". */
    segment: ISegment;
    /** Metadata on the linked thumbnails track. */
    track: IThumbnailTrack;
    /** Metadata on the `Period` this thumbnail track is a part of. */
    period: IPeriod;
}, 
/** CancellationSignal allowing to cancel the request. */
cancellationSignal: CancellationSignal) => Promise<IThumbnailResponse>;
/** requestOptions allowing to configure an `IThumbnailFetcher`'s behavior. */
export interface IThumbnailFetcherOptions {
    /**
     * Initial delay to wait if a request fails before making a new request, in
     * milliseconds.
     */
    baseDelay: number;
    /**
     * Maximum delay to wait if a request fails before making a new request, in
     * milliseconds.
     */
    maxDelay: number;
    /**
     * Maximum number of retries to perform on "regular" errors (e.g. due to HTTP
     * status, integrity errors, timeouts...).
     */
    maxRetry: number;
    /**
     * Timeout after which request are aborted and, depending on other requestOptions,
     * retried.
     * To set to `-1` for no timeout.
     */
    requestTimeout: number;
    /**
     * Connection timeout, in milliseconds, after which the request is canceled
     * if the responses headers has not being received.
     * Do not set or set to "undefined" to disable it.
     */
    connectionTimeout: number | undefined;
}
//# sourceMappingURL=thumbnail_fetcher.d.ts.map