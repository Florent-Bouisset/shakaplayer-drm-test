/**
 * Class setting up a cache of which codec is currently known to be supported or
 * not.
 *
 * We keep this only at the Manifest level because external conditions can change
 * from Manifest to Manifest (e.g. not the same decryption cabalities used etc.).
 */
export default class CodecSupportCache {
    /**
     * Constructs an CodecSupportCache instance.
     * @param {Array} codecList - List of codec support information.
     */
    constructor(codecList) {
        this.supportMap = new Map();
        this.addCodecs(codecList);
    }
    /**
     * Adds codec support information to this `CodecSupportCache`.
     * @param {Array} codecList - List of codec support information.
     */
    addCodecs(codecList) {
        for (const codec of codecList) {
            let mimeTypeMap = this.supportMap.get(codec.mimeType);
            if (mimeTypeMap === undefined) {
                mimeTypeMap = new Map();
                this.supportMap.set(codec.mimeType, mimeTypeMap);
            }
            mimeTypeMap.set(codec.codec, {
                supported: codec.supported,
                supportedIfEncrypted: codec.supportedIfEncrypted,
            });
        }
    }
    /**
     * Checks if a codec is supported for a given MIME type.
     * @param {string} mimeType - The MIME type to check.
     * @param {string} codec - The codec to check.
     * @param {boolean} isEncrypted - Whether the content is encrypted.
     * @returns {boolean | undefined} - `true` if the codec is supported, `false`
     * if not, or `undefined` if no support information is found.
     */
    isSupported(mimeType, codec, isEncrypted) {
        const mimeTypeMap = this.supportMap.get(mimeType);
        if (mimeTypeMap === undefined) {
            return undefined;
        }
        const result = mimeTypeMap.get(codec);
        if (result === undefined) {
            return undefined;
        }
        if (isEncrypted) {
            return result.supportedIfEncrypted;
        }
        else {
            return result.supported;
        }
    }
}
