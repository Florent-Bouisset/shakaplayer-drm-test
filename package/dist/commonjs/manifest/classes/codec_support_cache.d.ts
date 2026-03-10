/**
 * Interface representing codec and support information.
 */
export interface ICodecSupportInfo extends ICodecSupportMatrix {
    mimeType: string;
    codec: string;
}
/**
 * Interface representing support information.
 */
interface ICodecSupportMatrix {
    supported?: boolean | undefined;
    supportedIfEncrypted?: boolean | undefined;
}
/**
 * Class setting up a cache of which codec is currently known to be supported or
 * not.
 *
 * We keep this only at the Manifest level because external conditions can change
 * from Manifest to Manifest (e.g. not the same decryption cabalities used etc.).
 */
export default class CodecSupportCache {
    supportMap: Map<string, Map<string, ICodecSupportMatrix>>;
    /**
     * Constructs an CodecSupportCache instance.
     * @param {Array} codecList - List of codec support information.
     */
    constructor(codecList: ICodecSupportInfo[]);
    /**
     * Adds codec support information to this `CodecSupportCache`.
     * @param {Array} codecList - List of codec support information.
     */
    addCodecs(codecList: ICodecSupportInfo[]): void;
    /**
     * Checks if a codec is supported for a given MIME type.
     * @param {string} mimeType - The MIME type to check.
     * @param {string} codec - The codec to check.
     * @param {boolean} isEncrypted - Whether the content is encrypted.
     * @returns {boolean | undefined} - `true` if the codec is supported, `false`
     * if not, or `undefined` if no support information is found.
     */
    isSupported(mimeType: string, codec: string, isEncrypted: boolean): boolean | undefined;
}
export {};
//# sourceMappingURL=codec_support_cache.d.ts.map