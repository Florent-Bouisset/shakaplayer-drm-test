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
import type { ITransportPipelines } from "../../../transports";
import type SharedReference from "../../../utils/reference";
import type CmcdDataBuilder from "../../cmcd";
import type { IBufferType } from "../../segment_sinks";
import type CdnPrioritizer from "../cdn_prioritizer";
import type { ISegmentFetcherLifecycleCallbacks } from "./segment_fetcher";
import SegmentQueue from "./segment_queue";
/**
 * Interact with the transport pipelines to download segments with the right
 * priority.
 *
 * @class SegmentQueueCreator
 */
export default class SegmentQueueCreator {
    /**
     * Transport pipelines of the currently choosen streaming protocol (e.g. DASH,
     * Smooth etc.).
     */
    private readonly _transport;
    /**
     * `TaskPrioritizer` linked to this SegmentQueueCreator.
     *
     * Note: this is typed as `any` because segment loaders / parsers can use
     * different types depending on the type of buffer. We could maybe be smarter
     * about it, but typing as any just in select places, like here, looks like
     * a good compromise.
     */
    private readonly _prioritizer;
    /**
     * Options used by the SegmentQueueCreator, e.g. to allow configuration on
     * segment retries (number of retries maximum, default delay and so on).
     */
    private readonly _backoffOptions;
    /** Class allowing to select a CDN when multiple are available for a given resource. */
    private readonly _cdnPrioritizer;
    private _cmcdDataBuilder;
    /**
     * @param {Object} transport
     * @param {Object} cdnPrioritizer
     * @param {Object|null} cmcdDataBuilder
     * @param {Object} options
     */
    constructor(transport: ITransportPipelines, cdnPrioritizer: CdnPrioritizer, cmcdDataBuilder: CmcdDataBuilder | null, options: ISegmentQueueCreatorBackoffOptions);
    /**
     * Create a `SegmentQueue`, allowing to easily perform segment requests.
     * @param {string} bufferType - The type of buffer concerned (e.g. "audio",
     * "video", etc.)
     * @param {Object} eventListeners
     * @param {Object} isMediaSegmentQueueInterrupted - Wheter the downloading of media
     * segment should be interrupted or not.
     * @returns {Object} - `SegmentQueue`, which is an abstraction allowing to
     * perform a queue of segment requests for a given media type (here defined by
     * `bufferType`) with associated priorities.
     */
    createSegmentQueue(bufferType: IBufferType, eventListeners: ISegmentFetcherLifecycleCallbacks, isMediaSegmentQueueInterrupted: SharedReference<boolean>): SegmentQueue<unknown>;
}
/** Options used by the `SegmentQueueCreator`. */
export interface ISegmentQueueCreatorBackoffOptions {
    /**
     * Whether the content is played in a low-latency mode.
     * This has an impact on default backoff delays.
     */
    lowLatencyMode: boolean;
    /** Maximum number of time a request on error will be retried. */
    maxRetry: number | undefined;
    /**
     * Timeout after which request are aborted and, depending on other options,
     * retried.
     * To set to `-1` for no timeout.
     * `undefined` will lead to a default, large, timeout being used.
     */
    requestTimeout: number | undefined;
    /**
     * Timeout for just the "connection" part of the request, before data is
     * actually being transferred.
     *
     * Setting a lower `connectionTimeout` than a `requestTimeout` allows to
     * fail faster without having to take into account a potentially low
     * bandwidth.
     */
    connectionTimeout: number | undefined;
}
//# sourceMappingURL=segment_queue_creator.d.ts.map