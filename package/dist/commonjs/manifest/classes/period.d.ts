import type { ICdnMetadata, IManifestStreamEvent, IParsedPeriod } from "../../parsers/manifest";
import type { ITrackType, IRepresentationFilter } from "../../public_types";
import type { IPeriodMetadata } from "../types";
import Adaptation from "./adaptation";
import type CodecSupportCache from "./codec_support_cache";
import type { IRepresentationIndex } from "./representation_index";
/** Structure listing every `Adaptation` in a Period. */
export type IManifestAdaptations = Partial<Record<ITrackType, Adaptation[]>>;
/**
 * Class representing the tracks and qualities available from a given time
 * period in the the Manifest.
 * @class Period
 */
export default class Period implements IPeriodMetadata {
    /** ID uniquely identifying the Period in the Manifest. */
    readonly id: string;
    /** Every 'Adaptation' in that Period, per type of Adaptation. */
    adaptations: IManifestAdaptations;
    /** Absolute start time of the Period, in seconds. */
    start: number;
    /**
     * Duration of this Period, in seconds.
     * `undefined` for still-running Periods.
     */
    duration: number | undefined;
    /**
     * Absolute end time of the Period, in seconds.
     * `undefined` for still-running Periods.
     */
    end: number | undefined;
    /** Array containing every stream event happening on the period */
    streamEvents: IManifestStreamEvent[];
    /**
     * If set to an object, this Period has thumbnail tracks.
     */
    thumbnailTracks: IThumbnailTrack[];
    /**
     * @constructor
     * @param {Object} args
     * @param {function|undefined} [representationFilter]
     */
    constructor(args: IParsedPeriod, cachedCodecSupport: CodecSupportCache, representationFilter?: IRepresentationFilter | undefined);
    /**
     * Some environments (e.g. in a WebWorker) may not have the capability to know
     * if a mimetype+codec combination is supported on the current platform.
     *
     * Calling `refreshCodecSupport` manually once the codecs supported are known
     * by the current environnement allows to work-around this issue.
     *
     * @param {Array.<Object>} unsupportedAdaptations - Array on which
     * `Adaptation`s objects which are now known to have no supported
     * `Representation` will be pushed.
     * This array might be useful for minor error reporting.
     * @param {Array.<Object>} cachedCodecSupport
     */
    refreshCodecSupport(unsupportedAdaptations: Adaptation[], cachedCodecSupport: CodecSupportCache): void;
    /**
     * Returns every `Adaptations` (or `tracks`) linked to that Period, in an
     * Array.
     * @returns {Array.<Object>}
     */
    getAdaptations(): Adaptation[];
    /**
     * Returns every `Adaptations` (or `tracks`) linked to that Period for a
     * given type.
     * @param {string} adaptationType
     * @returns {Array.<Object>}
     */
    getAdaptationsForType(adaptationType: ITrackType): Adaptation[];
    /**
     * Returns the Adaptation linked to the given ID.
     * @param {number|string} wantedId
     * @returns {Object|undefined}
     */
    getAdaptation(wantedId: string): Adaptation | undefined;
    /**
     * Returns Adaptations that contain Representations in supported codecs.
     * @param {string|undefined} type - If set filter on a specific Adaptation's
     * type. Will return for all types if `undefined`.
     * @returns {Array.<Adaptation>}
     */
    getSupportedAdaptations(type?: ITrackType | undefined): Adaptation[];
    /**
     * Returns true if the give time is in the time boundaries of this `Period`.
     * @param {number} time
     * @param {object|null} nextPeriod - Period coming chronologically just
     * after in the same Manifest. `null` if this instance is the last `Period`.
     * @returns {boolean}
     */
    containsTime(time: number, nextPeriod: Period | null): boolean;
    /**
     * Format the current `Period`'s properties into a
     * `IPeriodMetadata` format which can better be communicated through
     * another thread.
     *
     * Please bear in mind however that the returned object will not be updated
     * when the current `Period` instance is updated, it is only a
     * snapshot at the current time.
     *
     * If you want to keep that data up-to-date with the current `Period`
     * instance, you will have to do it yourself.
     *
     * @returns {Object}
     */
    getMetadataSnapshot(): IPeriodMetadata;
}
/**
 * Metadata on an image thumbnail track associated to a Period.
 */
export interface IThumbnailTrack {
    /** Identifier for that thumbnail track. */
    id: string;
    /** interface allowing to obtain information on the actual thumbnails. */
    index: IRepresentationIndex;
    /** Mime-type for loaded thumbnails, allowing to know their format. */
    mimeType: string;
    /** CDN(s) on which the thumbnails may be loaded. */
    cdnMetadata: ICdnMetadata[] | null;
    /**
     * A loaded thumbnail's height in pixels. Note that there can be multiple actual
     * thumbnails per loaded thumbnail resource (see `horizontalTiles` and
     * `verticalTiles` properties.
     */
    height: number;
    /**
     * A loaded thumbnail's width in pixels. Note that there can be multiple actual
     * thumbnails per loaded thumbnail resource (see `horizontalTiles` and
     * `verticalTiles` properties.
     */
    width: number;
    /**
     * Thumbnail tracks are usually grouped together. This is the number of
     * images contained horizontally in a whole loaded thumbnail resource.
     */
    horizontalTiles: number;
    /**
     * Thumbnail tracks are usually grouped together. This is the number of
     * images contained vertically in a whole loaded thumbnail resource.
     */
    verticalTiles: number;
    /**
     * Starting `position` the first thumbnail of this thumbnail track applies to,
     * if known.
     */
    start: number | undefined;
    /**
     * Ending `position` the last thumbnail of this thumbnail track applies to,
     * if known.
     */
    end: number | undefined;
    /**
     * Thumbnail tracks are usually grouped together into separate tiles.
     * This is the amount of time in seconds each tile spans.
     */
    tileDuration: number | undefined;
}
//# sourceMappingURL=period.d.ts.map