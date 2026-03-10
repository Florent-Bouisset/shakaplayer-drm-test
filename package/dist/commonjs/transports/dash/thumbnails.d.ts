import type { ISegment } from "../../manifest";
import type { ICdnMetadata } from "../../parsers/manifest";
import type { CancellationSignal } from "../../utils/task_canceller";
import type { IRequestedData, IThumbnailContext, IThumbnailLoaderOptions, IThumbnailResponse } from "../types";
/**
 * Load thumbnails for DASH content.
 * @param {Object|null} wantedCdn
 * @param {Object} thumbnail
 * @param {Object} options
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export declare function loadThumbnail(wantedCdn: ICdnMetadata | null, thumbnail: ISegment, options: IThumbnailLoaderOptions, cancelSignal: CancellationSignal): Promise<IRequestedData<ArrayBuffer>>;
/**
 * Parse loaded thumbnail data into exploitable thumbnail data and metadata.
 * @param {ArrayBuffer} data - The loaded thumbnail data
 * @param {Object} context
 * @returns {Object}
 */
export declare function parseThumbnail(data: ArrayBuffer, context: IThumbnailContext): IThumbnailResponse;
//# sourceMappingURL=thumbnails.d.ts.map