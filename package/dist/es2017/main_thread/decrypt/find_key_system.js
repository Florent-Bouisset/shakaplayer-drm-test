/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { canRelyOnRequestMediaKeySystemAccess } from "../../compat/can_rely_on_request_media_key_system_access";
import { generatePlayReadyInitData, DUMMY_PLAY_READY_HEADER, } from "../../compat/generate_init_data";
import shouldRenewMediaKeySystemAccess from "../../compat/should_renew_media_key_system_access";
import config from "../../config";
import { EncryptedMediaError } from "../../errors";
import log from "../../log";
import { parseCodec } from "../../utils/are_codecs_compatible";
import arrayIncludes from "../../utils/array_includes";
import flatMap from "../../utils/flat_map";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import MediaKeysAttacher from "./utils/media_keys_attacher";
/**
 * Takes a `newConfiguration` `MediaKeySystemConfiguration`, that is intended
 * for the creation of a `MediaKeySystemAccess`, and a `prevConfiguration`
 * `MediaKeySystemConfiguration`, that was the one used at creation of the
 * current `MediaKeySystemAccess`.
 *
 * This function will then return `true` if it determined that the new
 * configuration is conceptually compatible with the one used before, and
 * `false` otherwise.
 * @param {Object} newConfiguration - New wanted `MediaKeySystemConfiguration`
 * @param {Object} prevConfiguration - The `MediaKeySystemConfiguration` that is
 * relied on util now.
 * @returns {boolean} - `true` if `newConfiguration` is compatible with
 * `prevConfiguration`.
 */
function isNewMediaKeySystemConfigurationCompatibleWithPreviousOne(newConfiguration, prevConfiguration) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    if (newConfiguration.label !== prevConfiguration.label) {
        return false;
    }
    const prevDistinctiveIdentifier = (_a = prevConfiguration.distinctiveIdentifier) !== null && _a !== void 0 ? _a : "optional";
    const newDistinctiveIdentifier = (_b = newConfiguration.distinctiveIdentifier) !== null && _b !== void 0 ? _b : "optional";
    if (prevDistinctiveIdentifier !== newDistinctiveIdentifier) {
        return false;
    }
    const prevPersistentState = (_c = prevConfiguration.persistentState) !== null && _c !== void 0 ? _c : "optional";
    const newPersistentState = (_d = newConfiguration.persistentState) !== null && _d !== void 0 ? _d : "optional";
    if (prevPersistentState !== newPersistentState) {
        return false;
    }
    const prevInitDataTypes = (_e = prevConfiguration.initDataTypes) !== null && _e !== void 0 ? _e : [];
    const newInitDataTypes = (_f = newConfiguration.initDataTypes) !== null && _f !== void 0 ? _f : [];
    if (!isArraySubsetOf(newInitDataTypes, prevInitDataTypes)) {
        return false;
    }
    const prevSessionTypes = (_g = prevConfiguration.sessionTypes) !== null && _g !== void 0 ? _g : [];
    const newSessionTypes = (_h = newConfiguration.sessionTypes) !== null && _h !== void 0 ? _h : [];
    if (!isArraySubsetOf(newSessionTypes, prevSessionTypes)) {
        return false;
    }
    for (const prop of ["audioCapabilities", "videoCapabilities"]) {
        const newCapabilities = (_j = newConfiguration[prop]) !== null && _j !== void 0 ? _j : [];
        const prevCapabilities = (_k = prevConfiguration[prop]) !== null && _k !== void 0 ? _k : [];
        const wasFound = newCapabilities.every((n) => {
            var _a, _b, _c, _d, _e, _f;
            for (let i = 0; i < prevCapabilities.length; i++) {
                const prevCap = prevCapabilities[i];
                if (((_a = prevCap.robustness) !== null && _a !== void 0 ? _a : "") === ((_b = n.robustness) !== null && _b !== void 0 ? _b : "") ||
                    ((_c = prevCap.encryptionScheme) !== null && _c !== void 0 ? _c : null) === ((_d = n.encryptionScheme) !== null && _d !== void 0 ? _d : null) ||
                    ((_e = prevCap.robustness) !== null && _e !== void 0 ? _e : "") === ((_f = n.robustness) !== null && _f !== void 0 ? _f : "")) {
                    return true;
                }
            }
            return false;
        });
        if (!wasFound) {
            return false;
        }
    }
    return true;
}
/**
 * Find key system canonical name from key system type.
 * @param {string} ksType - Obtained via inversion
 * @returns {string|undefined} - Either the canonical name, or undefined.
 */
function findKeySystemCanonicalName(ksType) {
    const { EME_KEY_SYSTEMS } = config.getCurrent();
    for (const ksName of Object.keys(EME_KEY_SYSTEMS)) {
        if (arrayIncludes(EME_KEY_SYSTEMS[ksName], ksType)) {
            return ksName;
        }
    }
    return undefined;
}
/**
 * Build configuration for the requestMediaKeySystemAccess EME API, based
 * on the current keySystem object.
 * @param {Object} keySystemTypeInfo
 * @returns {Array.<Object>} - Configuration to give to the
 * requestMediaKeySystemAccess API.
 */
function buildKeySystemConfigurations(keySystemTypeInfo) {
    const { keyName, keyType, keySystemOptions: keySystem } = keySystemTypeInfo;
    let sessionTypes;
    let persistentState = "optional";
    let distinctiveIdentifier = "optional";
    if (Array.isArray(keySystem.wantedSessionTypes)) {
        sessionTypes = keySystem.wantedSessionTypes;
        if (arrayIncludes(keySystem.wantedSessionTypes, "persistent-license") &&
            !isNullOrUndefined(keySystem.persistentLicenseConfig)) {
            persistentState = "required";
        }
    }
    else if (!isNullOrUndefined(keySystem.persistentLicenseConfig)) {
        persistentState = "required";
        sessionTypes = ["persistent-license"];
    }
    else {
        sessionTypes = ["temporary"];
    }
    if (!isNullOrUndefined(keySystem.persistentState)) {
        persistentState = keySystem.persistentState;
    }
    if (!isNullOrUndefined(keySystem.distinctiveIdentifier)) {
        distinctiveIdentifier = keySystem.distinctiveIdentifier;
    }
    const { EME_DEFAULT_AUDIO_CODECS, EME_DEFAULT_VIDEO_CODECS, EME_DEFAULT_WIDEVINE_ROBUSTNESSES, EME_DEFAULT_PLAYREADY_RECOMMENDATION_ROBUSTNESSES, } = config.getCurrent();
    // From the W3 EME spec, we have to provide videoCapabilities and
    // audioCapabilities.
    // These capabilities must specify a codec (even though you can use a
    // completely different codec afterward).
    // It is also strongly recommended to specify the required security
    // robustness. As we do not want to forbide any security level, we specify
    // every existing security level from highest to lowest so that the best
    // security level is selected.
    // More details here:
    // https://storage.googleapis.com/wvdocs/Chrome_EME_Changes_and_Best_Practices.pdf
    // https://www.w3.org/TR/encrypted-media/#get-supported-configuration-and-consent
    let audioCapabilities;
    let videoCapabilities;
    const { audioCapabilitiesConfig, videoCapabilitiesConfig } = keySystem;
    if ((audioCapabilitiesConfig === null || audioCapabilitiesConfig === void 0 ? void 0 : audioCapabilitiesConfig.type) === "full") {
        audioCapabilities = audioCapabilitiesConfig.value;
    }
    else {
        let audioRobustnesses;
        if ((audioCapabilitiesConfig === null || audioCapabilitiesConfig === void 0 ? void 0 : audioCapabilitiesConfig.type) === "robustness") {
            audioRobustnesses = audioCapabilitiesConfig.value;
        }
        else if (keyName === "widevine") {
            audioRobustnesses = EME_DEFAULT_WIDEVINE_ROBUSTNESSES;
        }
        else if (keyType === "com.microsoft.playready.recommendation") {
            audioRobustnesses = EME_DEFAULT_PLAYREADY_RECOMMENDATION_ROBUSTNESSES;
        }
        else {
            audioRobustnesses = [];
        }
        if (audioRobustnesses.length === 0) {
            audioRobustnesses.push(undefined);
        }
        const audioCodecs = (audioCapabilitiesConfig === null || audioCapabilitiesConfig === void 0 ? void 0 : audioCapabilitiesConfig.type) === "contentType"
            ? audioCapabilitiesConfig.value
            : EME_DEFAULT_AUDIO_CODECS;
        audioCapabilities = flatMap(audioRobustnesses, (robustness) => audioCodecs.map((contentType) => {
            return robustness !== undefined ? { contentType, robustness } : { contentType };
        }));
    }
    if ((videoCapabilitiesConfig === null || videoCapabilitiesConfig === void 0 ? void 0 : videoCapabilitiesConfig.type) === "full") {
        videoCapabilities = videoCapabilitiesConfig.value;
    }
    else {
        let videoRobustnesses;
        if ((videoCapabilitiesConfig === null || videoCapabilitiesConfig === void 0 ? void 0 : videoCapabilitiesConfig.type) === "robustness") {
            videoRobustnesses = videoCapabilitiesConfig.value;
        }
        else if (keyName === "widevine") {
            videoRobustnesses = EME_DEFAULT_WIDEVINE_ROBUSTNESSES;
        }
        else if (keyType === "com.microsoft.playready.recommendation") {
            videoRobustnesses = EME_DEFAULT_PLAYREADY_RECOMMENDATION_ROBUSTNESSES;
        }
        else {
            videoRobustnesses = [];
        }
        if (videoRobustnesses.length === 0) {
            videoRobustnesses.push(undefined);
        }
        const videoCodecs = (videoCapabilitiesConfig === null || videoCapabilitiesConfig === void 0 ? void 0 : videoCapabilitiesConfig.type) === "contentType"
            ? videoCapabilitiesConfig.value
            : EME_DEFAULT_VIDEO_CODECS;
        videoCapabilities = flatMap(videoRobustnesses, (robustness) => videoCodecs.map((contentType) => {
            return robustness !== undefined ? { contentType, robustness } : { contentType };
        }));
    }
    const wantedMediaKeySystemConfiguration = {
        initDataTypes: ["cenc"],
        videoCapabilities,
        audioCapabilities,
        distinctiveIdentifier,
        persistentState,
        sessionTypes,
    };
    if (audioCapabilitiesConfig !== undefined) {
        if (videoCapabilitiesConfig !== undefined) {
            return [wantedMediaKeySystemConfiguration];
        }
        return [
            wantedMediaKeySystemConfiguration,
            Object.assign(Object.assign({}, wantedMediaKeySystemConfiguration), { 
                // Re-try without `videoCapabilities` in case the EME implementation is
                // buggy
                videoCapabilities: undefined }),
        ];
    }
    else if (videoCapabilitiesConfig !== undefined) {
        return [
            wantedMediaKeySystemConfiguration,
            Object.assign(Object.assign({}, wantedMediaKeySystemConfiguration), { 
                // Re-try without `audioCapabilities` in case the EME implementation is
                // buggy
                audioCapabilities: undefined }),
        ];
    }
    return [
        wantedMediaKeySystemConfiguration,
        // Some legacy implementations have issues with `audioCapabilities` and
        // `videoCapabilities`, so we're including a supplementary
        // `MediaKeySystemConfiguration` without those properties.
        Object.assign(Object.assign({}, wantedMediaKeySystemConfiguration), { audioCapabilities: undefined, videoCapabilities: undefined }),
    ];
}
/**
 * Extract from the current mediaKeys the supported Codecs.
 * @param {Object} initialConfiguration - The MediaKeySystemConfiguration given
 * to the `navigator.requestMediaKeySystemAccess` API.
 * @param {Object | undefined} mksConfiguration - The result of
 * getConfiguration() of the media keys.
 * @return {Array} The list of supported codec by the CDM.
 */
export function extractCodecSupportListFromConfiguration(initialConfiguration, mksConfiguration) {
    var _a, _b, _c, _d, _e, _f;
    const testedAudioCodecs = (_b = (_a = initialConfiguration.audioCapabilities) === null || _a === void 0 ? void 0 : _a.map((v) => v.contentType)) !== null && _b !== void 0 ? _b : [];
    const testedVideoCodecs = (_d = (_c = initialConfiguration.videoCapabilities) === null || _c === void 0 ? void 0 : _c.map((v) => v.contentType)) !== null && _d !== void 0 ? _d : [];
    const testedCodecs = testedAudioCodecs
        .concat(testedVideoCodecs)
        .filter((c) => c !== undefined);
    const supportedVideoCodecs = (_e = mksConfiguration.videoCapabilities) === null || _e === void 0 ? void 0 : _e.map((entry) => entry.contentType);
    const supportedAudioCodecs = (_f = mksConfiguration.audioCapabilities) === null || _f === void 0 ? void 0 : _f.map((entry) => entry.contentType);
    const supportedCodecs = [
        ...(supportedVideoCodecs !== null && supportedVideoCodecs !== void 0 ? supportedVideoCodecs : []),
        ...(supportedAudioCodecs !== null && supportedAudioCodecs !== void 0 ? supportedAudioCodecs : []),
    ].filter((contentType) => contentType !== undefined);
    if (supportedCodecs.length === 0) {
        // Some legacy implementations have issues with `audioCapabilities` and
        // `videoCapabilities` in requestMediaKeySystemAccess so the codecs are not provided.
        // In this case, we can't tell which codec is supported or not.
        // Let's instead provide an empty list.
        // Note: on a correct EME implementation, if a list of codec is provided
        // with `audioCapabilities` or `videoCapabilities`, but none of them is supported,
        // requestMediaKeySystemAccess should yield an error "NotSupported" and we should
        // never reach this code.
        return [];
    }
    const codecSupportList = testedCodecs.map((codec) => {
        const { codecs, mimeType } = parseCodec(codec);
        const isSupported = arrayIncludes(supportedCodecs, codec);
        return {
            codec: codecs,
            mimeType,
            result: isSupported,
        };
    });
    return codecSupportList;
}
/**
 * Try to find a compatible key system from the keySystems array given.
 *
 * This function will request a MediaKeySystemAccess based on the various
 * keySystems provided.
 *
 * This Promise might either:
 *   - resolves the MediaKeySystemAccess and the keySystems as an object, when
 *     found.
 *   - reject if no compatible key system has been found.
 *
 * @param {Object} eme - current EME implementation
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystemsConfigs - The keySystems you want to test.
 * @param {Object} cancelSignal
 * @returns {Promise.<Object>}
 */
export default function getMediaKeySystemAccess(eme, mediaElement, keySystemsConfigs, cancelSignal) {
    log.info("DRM", "Searching for compatible MediaKeySystemAccess");
    /** Array of set keySystems for this content. */
    const keySystemsType = keySystemsConfigs.reduce((arr, keySystemOptions) => {
        const { EME_KEY_SYSTEMS } = config.getCurrent();
        const managedRDNs = EME_KEY_SYSTEMS[keySystemOptions.type];
        let ksType;
        if (!isNullOrUndefined(managedRDNs)) {
            ksType = managedRDNs.map((keyType) => {
                const keyName = keySystemOptions.type;
                return { keyName, keyType, keySystemOptions };
            });
        }
        else {
            const keyName = findKeySystemCanonicalName(keySystemOptions.type);
            const keyType = keySystemOptions.type;
            ksType = [{ keyName, keyType, keySystemOptions }];
        }
        return arr.concat(ksType);
    }, []);
    return recursivelyTestKeySystems(0);
    /**
     * Test all key system configuration stored in `keySystemsType` one by one
     * recursively.
     * Returns a Promise which will emit the MediaKeySystemAccess if one was
     * found compatible with one of the configurations or just reject if none
     * were found to be compatible.
     * @param {Number} index - The index in `keySystemsType` to start from.
     * Should be set to `0` when calling directly.
     * @returns {Promise.<Object>}
     */
    async function recursivelyTestKeySystems(index) {
        // if we iterated over the whole keySystemsType Array, quit on error
        if (index >= keySystemsType.length) {
            throw new EncryptedMediaError("INCOMPATIBLE_KEYSYSTEMS", "No key system compatible with your wanted " +
                "configuration has been found in the current " +
                "browser.", {
                keyStatuses: undefined,
                keySystemConfiguration: undefined,
                keySystem: undefined,
            });
        }
        if (isNullOrUndefined(eme.requestMediaKeySystemAccess)) {
            throw new Error("requestMediaKeySystemAccess is not implemented in your browser.");
        }
        const chosenType = keySystemsType[index];
        const { keyType, keySystemOptions } = chosenType;
        const keySystemConfigurations = buildKeySystemConfigurations(chosenType);
        log.debug(`DRM`, `Request keysystem access`, {
            keyType,
            index,
            length: keySystemsType.length,
        });
        let keySystemAccess;
        const currentState = await MediaKeysAttacher.getAttachedMediaKeysState(mediaElement);
        for (let configIdx = 0; configIdx < keySystemConfigurations.length; configIdx++) {
            const keySystemConfiguration = keySystemConfigurations[configIdx];
            // Check if the current `MediaKeySystemAccess` created cannot be reused here
            if (currentState !== null &&
                !shouldRenewMediaKeySystemAccess(currentState.mediaKeySystemAccess.keySystem) &&
                // TODO: Do it with MediaKeySystemAccess.prototype.keySystem instead?
                keyType === currentState.mediaKeySystemAccess.keySystem &&
                eme.implementation === currentState.emeImplementation.implementation &&
                isNewMediaKeySystemConfigurationCompatibleWithPreviousOne(keySystemConfiguration, currentState.askedConfiguration)) {
                log.info("DRM", "Found cached compatible keySystem");
                return Promise.resolve({
                    type: "reuse-media-key-system-access",
                    value: {
                        mediaKeySystemAccess: currentState.mediaKeySystemAccess,
                        askedConfiguration: currentState.askedConfiguration,
                        options: keySystemOptions,
                        codecSupport: extractCodecSupportListFromConfiguration(currentState.askedConfiguration, currentState.mediaKeySystemAccess.getConfiguration()),
                    },
                });
            }
            try {
                keySystemAccess = await testKeySystem(eme, keyType, [keySystemConfiguration]);
                log.info("DRM", "Found compatible keysystem", {
                    keyType,
                    index,
                    configIndex: configIdx,
                });
                return {
                    type: "create-media-key-system-access",
                    value: {
                        options: keySystemOptions,
                        mediaKeySystemAccess: keySystemAccess,
                        askedConfiguration: keySystemConfiguration,
                        codecSupport: extractCodecSupportListFromConfiguration(keySystemConfiguration, keySystemAccess.getConfiguration()),
                    },
                };
            }
            catch (_) {
                log.debug("DRM", "Rejected access to keysystem", {
                    keyType,
                    index,
                    configIndex: configIdx,
                });
                if (cancelSignal.cancellationError !== null) {
                    throw cancelSignal.cancellationError;
                }
            }
        }
        return recursivelyTestKeySystems(index + 1);
    }
}
/**
 * Test a key system configuration, resolves with the MediaKeySystemAccess
 * or reject if the key system is unsupported.
 * @param {Object} eme - current EME implementation
 * @param {string} keyType - The KeySystem string to test (ex: com.microsoft.playready.recommendation)
 * @param {Array.<MediaKeySystemMediaCapability>} keySystemConfigurations - Configurations for this keySystem
 * @returns Promise resolving with the MediaKeySystemAccess. Rejects if unsupported.
 */
export async function testKeySystem(eme, keyType, keySystemConfigurations) {
    const keySystemAccess = await eme.requestMediaKeySystemAccess(keyType, keySystemConfigurations);
    if (!canRelyOnRequestMediaKeySystemAccess(keyType)) {
        try {
            const mediaKeys = await keySystemAccess.createMediaKeys();
            const session = mediaKeys.createSession();
            const initData = generatePlayReadyInitData(DUMMY_PLAY_READY_HEADER);
            await session.generateRequest("cenc", initData);
            session.close().catch(() => {
                log.warn("DRM", "Failed to close the dummy session");
            });
        }
        catch (err) {
            log.debug("DRM", "KeySystemAccess was granted but it is not usable");
            throw err;
        }
    }
    return keySystemAccess;
}
/**
 * Returns `true` if `arr1`'s values are entirely contained in `arr2`.
 * @param {string} arr1
 * @param {string} arr2
 * @return {boolean}
 */
function isArraySubsetOf(arr1, arr2) {
    for (let i = 0; i < arr1.length; i++) {
        if (!arrayIncludes(arr2, arr1[i])) {
            return false;
        }
    }
    return true;
}
