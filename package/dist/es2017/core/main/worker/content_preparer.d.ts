import type { IManifest, IManifestMetadata } from "../../../manifest";
import type { IMediaSourceInterface } from "../../../mse";
import type { IContentInitializationData } from "../../../multithread_types";
import type { IRepresentationEstimator } from "../../adaptive";
import CmcdDataBuilder from "../../cmcd";
import type { IManifestRefreshSettings } from "../../fetchers";
import { ManifestFetcher, SegmentQueueCreator } from "../../fetchers";
import type { IThumbnailFetcher } from "../../fetchers/thumbnails/thumbnail_fetcher";
import SegmentSinksStore from "../../segment_sinks";
import FreezeResolver from "../common/FreezeResolver";
import TrackChoiceSetter from "./track_choice_setter";
import WorkerTextDisplayerInterface from "./worker_text_displayer_interface";
/**
 * Class facilitating the workflows behind loading a new content for the
 * RxPlayer Core:
 *
 *   - Handle Manifest fetching and Manifest updates.
 *
 *   - Handle the `MediaSource`'s creation and indirectly of its `SourceBuffer`s
 *     as well as handling "MediaSource reloading".
 *
 *   - initialize various modules (`segmentQueueCreator`, CmcdDataBuilder`,
 *     `RepresentationEstimator`) linked to the initialized content.
 *
 * You can start loading a content through the `initializeNewContent` method.
 *
 * When a content is linked to the `ContentPreparer` you can inspect the
 * different initialized modules by calling its `getCurrentContent` method.
 *
 * @class ContentPreparer
 */
export default class ContentPreparer {
    /**
     * Information on the content linked to that `ContentPreparer` through its
     * `initializeNewContent` method.
     * `null` if no content is initialized.
     */
    private _currentContent;
    /**
     * TaskCanceller which is triggered when the currently-initialized content is
     * not needed anymore, because we stopped it since or switched to a new content.
     */
    private _contentCanceller;
    /**
     * TaskCanceller which is triggered when the currently-created MediaSource is
     * not needed anymore, either because the content has changed or because we
     * had to reload.
     */
    private _currentMediaSourceCanceller;
    /** @see constructor */
    private _hasVideo;
    /**
     * @param {Object} capabilities
     * @param {boolean} capabilities.hasVideo - If `true`, we're playing on an
     * element which has video capabilities.
     * If `false`, we're only able to play audio, optionally with subtitles.
     *
     * Typically this boolean is `true` for `<video>` HTMLElement and `false` for
     * `<audio>` HTMLElement.
     */
    constructor({ hasVideo }: {
        hasVideo: boolean;
    });
    /**
     * Start fetching the wanted content's Manifest and initializing the various
     * modules stored by the `ContentPreparer` linked to that content.
     *
     * The returned Promise resolves with the parsed Manifest when those modules
     * are all ready and you can thus begin to load the content.
     *
     * Reject if it failed to do so.
     * @param {Object} context - Information on the content that should be
     * initialized.
     * @returns {Promise.<Object>}
     */
    initializeNewContent(context: IContentInitializationData): Promise<IManifestMetadata>;
    /**
     * Get information on the current content prepared through the
     * `initializeNewContent` method, or `null` if no content is currently
     * prepared.
     * @returns {Object|null}
     */
    getCurrentContent(): IPreparedContentData | null;
    /**
     * Schedule an update for the Manifest file,
     *
     * Do nothing if no content is currently prepared.
     * @param {Object} settings - Various settings to configure the ways and
     * moment at which the Manifest will be refreshed.
     */
    scheduleManifestRefresh(settings: IManifestRefreshSettings): void;
    /**
     * Signal the ContentPreparer that the MediaSource is "reloading".
     *
     * The returned Promise resolves when it restarts being ready.
     * @returns {Promise}
     */
    reloadMediaSource(): Promise<void>;
    /**
     * Dispose all resources linked to the currently preopared content if one and
     * stop linking it to this `ContentPreparer`.
     */
    disposeCurrentContent(): void;
}
/**
 * Modules and Metadata associated to the current "prepared" content.
 */
export interface IPreparedContentData {
    /**
     * Identifier uniquely identifying a specific content.
     *
     * Protects against all kind of race conditions or asynchronous issues.
     */
    contentId: string;
    /**
     * Perform data collection and retrieval for the "Common Media Client Data"
     * scheme, which is a specification allowing to communicate about playback
     * conditions with a CDN.
     */
    cmcdDataBuilder: CmcdDataBuilder | null;
    /**
     * If `true`, the RxPlayer can enable its "Representation avoidance"
     * mechanism, where it avoid loading Representation that it suspect
     * have issues being decoded on the current device.
     */
    enableRepresentationAvoidance: boolean;
    /**
     * Interface to the MediaSource implementation, allowing to buffer audio
     * and video media segments.
     */
    mediaSource: IMediaSourceInterface;
    /** Class abstracting Manifest fetching and refreshing. */
    manifestFetcher: ManifestFetcher;
    /**
     * Manifest instance.
     *
     * `null` when not fetched yet.
     */
    manifest: IManifest | null;
    /**
     * Specific module detecting freezing issues and trying to work-around
     * them.
     */
    freezeResolver: FreezeResolver;
    /**
     * Perform the adaptive logic, allowing to choose the best Representation for
     * the different types of media to load.
     */
    representationEstimator: IRepresentationEstimator;
    /**
     * Allows to create a "SegmentSink" (powerful abstraction over media
     * buffering API) for each type of media.
     */
    segmentSinksStore: SegmentSinksStore;
    /** Allows to send timed text media data so it can be rendered. */
    workerTextSender: WorkerTextDisplayerInterface | null;
    /**
     * Allows to create `SegmentQueue` which simplifies complex media segment
     * fetching.
     */
    segmentQueueCreator: SegmentQueueCreator;
    /** Allows to load image thumbnails. */
    fetchThumbnailData: IThumbnailFetcher;
    /**
     * Allows to store and update the wanted tracks and Representation inside that
     * track.
     */
    trackChoiceSetter: TrackChoiceSetter;
    /**
     * If `true`, MSE API should be used in the core part of the RxPlayer (in the
     * WebWorker).
     * If `false`, they should be relied on on main thread.
     */
    useMseInWorker: boolean;
}
//# sourceMappingURL=content_preparer.d.ts.map