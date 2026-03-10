import isCodecSupported from "../../../compat/is_codec_supported";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import { ContentDecryptorState } from "../../decrypt";
export function getCodecsWithUnknownSupport(manifest) {
    var _a, _b, _c, _d, _e;
    const codecsWithUnknownSupport = [];
    for (const period of manifest.periods) {
        const checkedAdaptations = [
            ...((_a = period.adaptations.video) !== null && _a !== void 0 ? _a : []),
            ...((_b = period.adaptations.audio) !== null && _b !== void 0 ? _b : []),
        ];
        for (const adaptation of checkedAdaptations) {
            if (!adaptation.supportStatus.hasCodecWithUndefinedSupport) {
                continue;
            }
            for (const representation of adaptation.representations) {
                if (representation.isSupported === undefined) {
                    codecsWithUnknownSupport.push({
                        mimeType: (_c = representation.mimeType) !== null && _c !== void 0 ? _c : "",
                        codec: (_e = (_d = representation.codecs) === null || _d === void 0 ? void 0 : _d[0]) !== null && _e !== void 0 ? _e : "",
                    });
                }
            }
        }
    }
    return codecsWithUnknownSupport;
}
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
export function updateManifestCodecSupport(manifest, contentDecryptor, mediaElement, isPlayingWithMSEinWorker) {
    const codecSupportMap = new Map();
    const updatedCodecs = [];
    const efficientlyGetCodecSupport = (mimeType, codec) => {
        var _a;
        const inputCodec = `${mimeType !== null && mimeType !== void 0 ? mimeType : ""};codecs="${codec !== null && codec !== void 0 ? codec : ""}"`;
        const baseData = codecSupportMap.get(inputCodec);
        if (baseData !== undefined) {
            return baseData;
        }
        let newData;
        const isSupported = isCodecSupported(mediaElement, inputCodec);
        if (!isSupported) {
            newData = {
                isSupportedClear: false,
                isSupportedEncrypted: false,
            };
        }
        else if (isNullOrUndefined(contentDecryptor)) {
            newData = {
                isSupportedClear: true,
                // This is ambiguous. Less assume that with no ContentDecryptor, an
                // encrypted codec is supported
                isSupportedEncrypted: true,
            };
        }
        else if (contentDecryptor.getState() === ContentDecryptorState.Initializing) {
            newData = {
                isSupportedClear: true,
                isSupportedEncrypted: undefined,
            };
        }
        else {
            newData = {
                isSupportedClear: true,
                isSupportedEncrypted: (_a = contentDecryptor.isCodecSupported(mimeType !== null && mimeType !== void 0 ? mimeType : "", codec !== null && codec !== void 0 ? codec : "")) !== null && _a !== void 0 ? _a : true,
            };
        }
        codecSupportMap.set(inputCodec, newData);
        updatedCodecs.push({
            codec: codec !== null && codec !== void 0 ? codec : "",
            mimeType: mimeType !== null && mimeType !== void 0 ? mimeType : "",
            supported: newData.isSupportedClear,
            supportedIfEncrypted: newData.isSupportedEncrypted,
        });
        return newData;
    };
    manifest.periods.forEach((p) => {
        var _a, _b, _c;
        [
            ...((_a = p.adaptations.audio) !== null && _a !== void 0 ? _a : []),
            ...((_b = p.adaptations.video) !== null && _b !== void 0 ? _b : []),
            ...((_c = p.adaptations.text) !== null && _c !== void 0 ? _c : []),
        ].forEach((adaptation) => {
            let hasSupportedCodec = false;
            let hasCodecWithUndefinedSupport = false;
            adaptation.representations.forEach((representation) => {
                var _a, _b;
                if (representation.isCodecSupportedInWebWorker === false &&
                    isPlayingWithMSEinWorker) {
                    representation.isSupported = false;
                    return;
                }
                if (representation.isSupported !== undefined) {
                    if (representation.isSupported) {
                        hasSupportedCodec = true;
                    }
                    // We already knew the support for that one, continue to next one
                    return;
                }
                const isEncrypted = representation.contentProtections !== undefined;
                const mimeType = (_a = representation.mimeType) !== null && _a !== void 0 ? _a : "";
                let codecs = (_b = representation.codecs) !== null && _b !== void 0 ? _b : [];
                if (codecs.length === 0) {
                    codecs = [""];
                }
                for (const codec of codecs) {
                    const codecSupportInfo = efficientlyGetCodecSupport(mimeType, codec);
                    if (!isEncrypted) {
                        representation.isSupported = codecSupportInfo.isSupportedClear;
                    }
                    else if (representation.isSupported !== codecSupportInfo.isSupportedEncrypted) {
                        representation.isSupported = codecSupportInfo.isSupportedEncrypted;
                    }
                    if (representation.isSupported === undefined) {
                        hasCodecWithUndefinedSupport = true;
                    }
                    else if (representation.isSupported) {
                        hasSupportedCodec = true;
                        representation.codecs = [codec];
                        // Don't test subsequent codecs for that Representation
                        break;
                    }
                }
            });
            adaptation.supportStatus.hasCodecWithUndefinedSupport =
                hasCodecWithUndefinedSupport;
            if (hasCodecWithUndefinedSupport && !hasSupportedCodec) {
                adaptation.supportStatus.hasSupportedCodec = undefined;
            }
            else {
                adaptation.supportStatus.hasSupportedCodec = hasSupportedCodec;
            }
        });
    });
    return updatedCodecs;
}
