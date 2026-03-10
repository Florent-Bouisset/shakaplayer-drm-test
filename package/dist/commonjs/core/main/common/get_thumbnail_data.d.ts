import type { IManifest } from "../../../manifest";
import type { IThumbnailResponse } from "../../../transports";
import type { IThumbnailFetcher } from "../../fetchers";
/**
 * @param {function} fetchThumbnails
 * @param {Object} manifest
 * @param {string} periodId
 * @param {string} thumbnailTrackId
 * @param {number} time
 * @returns {Promise.<Object>}
 */
export default function getThumbnailData(fetchThumbnails: IThumbnailFetcher, manifest: IManifest, periodId: string, thumbnailTrackId: string, time: number): Promise<IThumbnailResponse>;
//# sourceMappingURL=get_thumbnail_data.d.ts.map