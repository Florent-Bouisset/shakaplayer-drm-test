import type { IMediaElement } from "../../../compat/browser_compatibility_types";
import type { IManifestMetadata } from "../../../manifest";
import type Manifest from "../../../manifest/classes";
import type { ICodecSupportInfo } from "../../../multithread_types";
import type ContentDecryptor from "../../decrypt";
/**
 * Returns a list of all codecs that the support is not known yet on the given
 * Manifest.
 * If a representation with (`isSupported`) is undefined, we consider the
 * codec support as unknown.
 *
 * This function iterates through all periods, adaptations, and representations,
 * and collects unknown codecs.
 *
 * @returns {Array} The list of codecs with unknown support status.
 */
export declare function getCodecsWithUnknownSupport(manifest: Manifest): Array<{
    mimeType: string;
    codec: string;
}>;
/**
 * Ensure that all `Representation` and `Adaptation` have a known status
 * for their codec support and probe it for cases where that's not the
 * case.
 *
 * Because probing for codec support is always synchronous in the main thread,
 * calling this function ensures that support is now known.
 *
 * @param {Object} manifest - The manifest to update
 * @param {Object|null} contentDecryptor - The current content decryptor
 * @param {boolean} isPlayingWithMSEinWorker - True if WebWorker is used with MSE in worker
 * @returns {Array.<Object>}
 */
export declare function updateManifestCodecSupport(manifest: IManifestMetadata, contentDecryptor: ContentDecryptor | null, mediaElement: IMediaElement, isPlayingWithMSEinWorker: boolean): ICodecSupportInfo[];
//# sourceMappingURL=update_manifest_codec_support.d.ts.map