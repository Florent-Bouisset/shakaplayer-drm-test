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
import type { IManifest, IAdaptation, ISegment, IPeriod, IRepresentation } from "../../../manifest";
import type { IPlayerError } from "../../../public_types";
import type { ISegmentParserParsedInitChunk, ISegmentParserParsedMediaChunk } from "../../../transports";
import EventEmitter from "../../../utils/event_emitter";
import SharedReference from "../../../utils/reference";
import type { IPrioritizedSegmentFetcher } from "./prioritized_segment_fetcher";
/** Information about a Segment waiting to be loaded by the SegmentQueue. */
export interface IQueuedSegment {
    /** Priority of the segment request (lower number = higher priority). */
    priority: number;
    /** Segment wanted. */
    segment: ISegment;
}
/**
 * Class scheduling segment downloads as a FIFO queue.
 */
export default class SegmentQueue<T> extends EventEmitter<ISegmentQueueEvent<T>> {
    /** Interface used to load segments. */
    private _segmentFetcher;
    /**
     * Metadata on the content for which segments are currently loaded.
     * `null` if no queue is active.
     */
    private _currentContentInfo;
    /**
     * Indicates whether the segment queue is inturrupted or if
     * it is authorized to download segment data.
     * Updating this value to `true` should stop the
     * loading of new media data. Updating this value to `false` should
     * restart the downloading queue.
     * Note: this does not affect the downloading of init segment as
     * they are always downloaded, regardless of this property value.
     *
     * This option can be used to temporarly reduce the usage of the
     * network.
     */
    private isMediaSegmentQueueInterrupted;
    /**
     * Create a new `SegmentQueue`.
     *
     * @param {Object} segmentFetcher - Interface to facilitate the download of
     * segments.
     * @param {Object} isMediaSegmentQueueInterrupted - Reference to a boolean indicating
     * if the media segment queue is interrupted.
     */
    constructor(segmentFetcher: IPrioritizedSegmentFetcher<T>, isMediaSegmentQueueInterrupted: SharedReference<boolean>);
    /**
     * Returns the initialization segment currently being requested.
     * Returns `null` if no initialization segment request is pending.
     * @returns {Object | null}
     */
    getRequestedInitSegment(): ISegment | null;
    /**
     * Returns the media segment currently being requested.
     * Returns `null` if no media segment request is pending.
     * @returns {Object | null}
     */
    getRequestedMediaSegment(): ISegment | null;
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
    resetForContent(content: ISegmentQueueContext, hasInitSegment: boolean): SharedReference<ISegmentQueueItem>;
    /**
     * Stop the currently-active `SegmentQueue`.
     *
     * Do nothing if no queue is active.
     */
    stop(): void;
    /**
     * Internal logic performing media segment requests.
     */
    private _restartMediaSegmentDownloadingQueue;
    /**
     * Internal logic performing initialization segment requests.
     * @param {Object} contentInfo
     * @param {Object} queuedInitSegment
     */
    private _restartInitSegmentDownloadingQueue;
}
/**
 * Events sent by the `SegmentQueue`.
 *
 * The key is the event's name and the value the format of the corresponding
 * event's payload.
 */
export interface ISegmentQueueEvent<T> {
    /**
     * Notify that the initialization segment has been fully loaded and parsed.
     *
     * You can now push that segment to its corresponding buffer and use its parsed
     * metadata.
     *
     * Only sent if an initialization segment exists (when the `SegmentQueue`'s
     * `hasInitSegment` constructor option has been set to `true`).
     * In that case, an `IParsedInitSegmentEvent` will always be sent before any
     * `IParsedSegmentEvent` event is sent.
     */
    parsedInitSegment: IParsedInitSegmentPayload<T>;
    /**
     * Notify that a media chunk (decodable sub-part of a media segment) has been
     * loaded and parsed.
     *
     * If an initialization segment exists (when the `SegmentQueue`'s
     * `hasInitSegment` constructor option has been set to `true`), an
     * `IParsedSegmentEvent` will always be sent AFTER the `IParsedInitSegmentEvent`
     * event.
     *
     * It can now be pushed to its corresponding buffer. Note that there might be
     * multiple `IParsedSegmentEvent` for a single segment, if that segment is
     * divided into multiple decodable chunks.
     * You will know that all `IParsedSegmentEvent` have been loaded for a given
     * segment once you received the corresponding event.
     */
    parsedMediaSegment: IParsedSegmentPayload<T>;
    /** Notify that a media or initialization segment has been fully-loaded. */
    fullyLoadedSegment: ISegment;
    /**
     * Notify that a media or initialization segment request is retried.
     * This happened most likely because of an HTTP error.
     */
    requestRetry: IRequestRetryPayload;
    /**
     * Notify that the media segment queue is now empty.
     * This can be used to re-check if any segment are now needed.
     */
    emptyQueue: null;
    /**
     * Notify that a fatal error happened (such as request failures), which has
     * completely stopped the downloading queue.
     *
     * You may still restart the queue after receiving this event.
     */
    error: unknown;
}
/** Payload for a `parsedInitSegment` event. */
export type IParsedInitSegmentPayload<T> = ISegmentParserParsedInitChunk<T> & {
    segment: ISegment;
};
/** Payload for a `parsedMediaSegment` event. */
export type IParsedSegmentPayload<T> = ISegmentParserParsedMediaChunk<T> & {
    segment: ISegment;
};
/** Payload for a `requestRetry` event. */
export interface IRequestRetryPayload {
    segment: ISegment;
    error: IPlayerError;
}
/**
 * Structure of the object that has to be emitted through the `SegmentQueue`
 * shared reference, to signal which segments are currently needed.
 */
export interface ISegmentQueueItem {
    /**
     * A potential initialization segment that needs to be loaded and parsed.
     * It will generally be requested in parralel of the first media segments.
     *
     * Can be set to `null` if you don't need to load the initialization segment
     * for now.
     *
     * If the `SegmentQueue`'s `hasInitSegment` constructor option has been
     * set to `true`, no media segment will be parsed before the initialization
     * segment has been loaded and parsed.
     */
    initSegment: IQueuedSegment | null;
    /**
     * The queue of media segments currently needed for download.
     *
     * Those will be loaded from the first element in that queue to the last
     * element in it.
     *
     * Note that any media segments in the segment queue will only be parsed once
     * either of these is true:
     *   - An initialization segment has been loaded and parsed by this
     *     `SegmentQueue` instance.
     *   - The `SegmentQueue`'s `hasInitSegment` constructor option has been
     *     set to `false`.
     */
    segmentQueue: IQueuedSegment[];
}
/** Context for segments downloaded through the SegmentQueue. */
export interface ISegmentQueueContext {
    /** Adaptation linked to the segments you want to load. */
    adaptation: IAdaptation;
    /** Manifest linked to the segments you want to load. */
    manifest: IManifest;
    /** Period linked to the segments you want to load. */
    period: IPeriod;
    /** Representation linked to the segments you want to load. */
    representation: IRepresentation;
}
//# sourceMappingURL=segment_queue.d.ts.map