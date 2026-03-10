import type { IThumbnailRenderingOptions } from "../public_types";
import type { IPublicApiContentInfos } from "./api/public_api";
/**
 * Render thumbnail available at `time` in the given `container` (in place of
 * a potential previously-rendered thumbnail in that container).
 *
 * If there is no thumbnail at this time, or if there is but it fails to
 * load/render, also removes the previously displayed thumbnail, unless
 * `options.keepPreviousThumbnailOnError` is set to `true`.
 *
 * Returns a Promise which resolves when the thumbnail is rendered successfully,
 * rejects if anything prevented a thumbnail to be rendered.
 *
 * A newer `renderThumbnail` call performed while a previous `renderThumbnail`
 * call on the same container did not yet finish will abort that previous call,
 * rejecting the old call's returned promise.
 *
 * You may know if the promise returned by `renderThumbnail` rejected due to it
 * being aborted, by checking the `code` property on the rejected error: Error
 * due to aborting have their `code` property set to `ABORTED`.
 *
 * @param {Object} contentInfos
 * @param {Object} options
 * @returns {Object}
 */
export default function renderThumbnail(contentInfos: IPublicApiContentInfos | null, options: IThumbnailRenderingOptions): Promise<void>;
//# sourceMappingURL=render_thumbnail.d.ts.map