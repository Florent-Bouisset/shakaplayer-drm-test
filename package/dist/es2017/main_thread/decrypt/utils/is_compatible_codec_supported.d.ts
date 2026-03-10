import type { ICodecSupportList } from "../find_key_system";
/**
 * Find the first codec in the provided codec list that is compatible with the given mimeType and codec.
 * This first codec is called the "compatible codec". Return true if the "compatible codec"
 * is supported or false if it's not supported. If no "compatible codec" has been found, return undefined.
 *
 * @param {string} mimeType - The MIME type to check.
 * @param {string} codec - The codec to check.
 * @param {Array} codecList - The list of codecs to check against.
 * @returns {boolean|undefined} - True if the "compatible codec" is supported, false if not,
 * or undefined if no "compatible codec" is found.
 */
export default function isCompatibleCodecSupported(mimeType: string, codec: string, codecList: ICodecSupportList): boolean | undefined;
//# sourceMappingURL=is_compatible_codec_supported.d.ts.map