import { MediaError } from "../../errors";
import assert from "../../utils/assert";
import globalScope from "../../utils/global_scope";
import isNode from "../../utils/is_node";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import objectAssign from "../../utils/object_assign";
import EnvDetector from "../env_detector";
import { createCompatibleEventListener } from "../event_listeners";
import shouldFavourCustomSafariEME from "../should_favour_custom_safari_EME";
import CustomMediaKeySystemAccess from "./custom_key_system_access";
import getIE11MediaKeysCallbacks, { MSMediaKeysConstructor, } from "./custom_media_keys/ie11_media_keys";
import getMozMediaKeysCallbacks, { MozMediaKeysConstructor, } from "./custom_media_keys/moz_media_keys_constructor";
import getOldKitWebKitMediaKeyCallbacks, { isOldWebkitMediaElement, } from "./custom_media_keys/old_webkit_media_keys";
import getWebKitMediaKeysCallbacks from "./custom_media_keys/webkit_media_keys";
import getWebKitMediaKeysConstructor from "./custom_media_keys/webkit_media_keys_constructor";
/**
 * Returns the current EME implementation based on what's present on the device
 * and the given preference.
 * @param {string} preferredApiType - EME API preference
 * (@see IPreferredEmeApiType).
 * @returns {Object}
 */
export default function getEmeApiImplementation(preferredApiType) {
    var _a;
    let requestMediaKeySystemAccess;
    let onEncrypted;
    let setMediaKeys = defaultSetMediaKeys;
    let implementation;
    if (preferredApiType === "standard" ||
        (preferredApiType === "auto" && !shouldFavourCustomSafariEME())) {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        if (isNode || isNullOrUndefined(navigator.requestMediaKeySystemAccess)) {
            return null;
        }
        requestMediaKeySystemAccess = (...args) => navigator.requestMediaKeySystemAccess(...args);
        onEncrypted = createCompatibleEventListener(["encrypted"]);
        implementation = "standard";
    }
    else {
        let isTypeSupported;
        let createCustomMediaKeys;
        if (preferredApiType === "webkit" && getWebKitMediaKeysConstructor() !== undefined) {
            const callbacks = getWebKitMediaKeysCallbacks();
            onEncrypted = createOnEncryptedForWebkit();
            isTypeSupported = callbacks.isTypeSupported;
            createCustomMediaKeys = callbacks.createCustomMediaKeys;
            setMediaKeys = callbacks.setMediaKeys;
            implementation = "webkit";
        }
        else {
            // This is for Chrome with unprefixed EME api
            if (isOldWebkitMediaElement((_a = globalScope.HTMLVideoElement) === null || _a === void 0 ? void 0 : _a.prototype)) {
                onEncrypted = createCompatibleEventListener(["needkey"]);
                const callbacks = getOldKitWebKitMediaKeyCallbacks();
                isTypeSupported = callbacks.isTypeSupported;
                createCustomMediaKeys = callbacks.createCustomMediaKeys;
                setMediaKeys = callbacks.setMediaKeys;
                implementation = "older-webkit";
                // This is for WebKit with prefixed EME api
            }
            else if (getWebKitMediaKeysConstructor() !== undefined) {
                onEncrypted = createOnEncryptedForWebkit();
                const callbacks = getWebKitMediaKeysCallbacks();
                isTypeSupported = callbacks.isTypeSupported;
                createCustomMediaKeys = callbacks.createCustomMediaKeys;
                setMediaKeys = callbacks.setMediaKeys;
                implementation = "webkit";
            }
            else if (EnvDetector.browser === EnvDetector.BROWSERS.Ie11 &&
                MSMediaKeysConstructor !== undefined) {
                onEncrypted = createCompatibleEventListener(["encrypted", "needkey"]);
                const callbacks = getIE11MediaKeysCallbacks();
                isTypeSupported = callbacks.isTypeSupported;
                createCustomMediaKeys = callbacks.createCustomMediaKeys;
                setMediaKeys = callbacks.setMediaKeys;
                implementation = "ms";
            }
            else if (MozMediaKeysConstructor !== undefined) {
                onEncrypted = createCompatibleEventListener(["encrypted", "needkey"]);
                const callbacks = getMozMediaKeysCallbacks();
                isTypeSupported = callbacks.isTypeSupported;
                createCustomMediaKeys = callbacks.createCustomMediaKeys;
                setMediaKeys = callbacks.setMediaKeys;
                implementation = "moz";
            }
            else {
                onEncrypted = createCompatibleEventListener(["encrypted", "needkey"]);
                const MK = globalScope.MediaKeys;
                const checkForStandardMediaKeys = () => {
                    if (MK === undefined) {
                        throw new MediaError("MEDIA_KEYS_NOT_SUPPORTED", "No `MediaKeys` implementation found " + "in the current browser.");
                    }
                    if (typeof MK.isTypeSupported === "undefined") {
                        const message = "This browser seems to be unable to play encrypted " +
                            "contents currently." +
                            "Note: Some browsers do not allow decryption " +
                            "in some situations, like when not using HTTPS.";
                        throw new Error(message);
                    }
                };
                isTypeSupported = (keyType) => {
                    checkForStandardMediaKeys();
                    assert(typeof MK.isTypeSupported === "function");
                    return MK.isTypeSupported(keyType);
                };
                createCustomMediaKeys = (keyType) => {
                    checkForStandardMediaKeys();
                    return new MK(keyType);
                };
                implementation = "unknown";
            }
        }
        requestMediaKeySystemAccess = function (keyType, keySystemConfigurations) {
            if (!isTypeSupported(keyType)) {
                return Promise.reject(new Error("Unsupported key type"));
            }
            for (let i = 0; i < keySystemConfigurations.length; i++) {
                const keySystemConfiguration = keySystemConfigurations[i];
                const { videoCapabilities, audioCapabilities, initDataTypes, distinctiveIdentifier, } = keySystemConfiguration;
                let supported = true;
                supported =
                    supported &&
                        (isNullOrUndefined(initDataTypes) ||
                            initDataTypes.some((idt) => idt === "cenc"));
                supported = supported && distinctiveIdentifier !== "required";
                if (supported) {
                    const keySystemConfigurationResponse = {
                        initDataTypes: ["cenc"],
                        distinctiveIdentifier: "not-allowed",
                        persistentState: "required",
                        sessionTypes: ["temporary", "persistent-license"],
                    };
                    if (videoCapabilities !== undefined) {
                        keySystemConfigurationResponse.videoCapabilities = videoCapabilities;
                    }
                    if (audioCapabilities !== undefined) {
                        keySystemConfigurationResponse.audioCapabilities = audioCapabilities;
                    }
                    const customMediaKeys = createCustomMediaKeys(keyType);
                    return Promise.resolve(new CustomMediaKeySystemAccess(keyType, customMediaKeys, keySystemConfigurationResponse));
                }
            }
            return Promise.reject(new Error("Unsupported configuration"));
        };
    }
    return {
        requestMediaKeySystemAccess,
        onEncrypted,
        setMediaKeys,
        implementation,
    };
}
/**
 * Create an event listener for the "webkitneedkey" event
 * @returns
 */
function createOnEncryptedForWebkit() {
    const compatibleEventListener = createCompatibleEventListener(["needkey"], undefined /* prefixes */);
    const onEncrypted = (target, listener, cancelSignal) => {
        compatibleEventListener(target, (event) => {
            const patchedEvent = objectAssign(event, {
                forceSessionRecreation: true,
            });
            listener(patchedEvent);
        }, cancelSignal);
    };
    return onEncrypted;
}
/**
 * Set the given MediaKeys on the given HTMLMediaElement.
 * Emits null when done then complete.
 * @param {HTMLMediaElement} elt
 * @param {Object} mediaKeys
 * @returns {Promise}
 */
function defaultSetMediaKeys(elt, mediaKeys) {
    try {
        let ret;
        if (typeof elt.setMediaKeys === "function") {
            // eslint-disable-next-line @typescript-eslint/no-restricted-types
            ret = elt.setMediaKeys(mediaKeys);
        }
        // If we get in the following code, it means that no compat case has been
        // found and no standard setMediaKeys API exists. This case is particulary
        // rare. We will try to call each API with native media keys.
        else if (typeof elt.webkitSetMediaKeys === "function") {
            ret = elt.webkitSetMediaKeys(mediaKeys);
        }
        else if (typeof elt.mozSetMediaKeys === "function") {
            ret = elt.mozSetMediaKeys(mediaKeys);
        }
        else if (typeof elt.msSetMediaKeys === "function" && mediaKeys !== null) {
            ret = elt.msSetMediaKeys(mediaKeys);
        }
        if (typeof ret === "object" &&
            ret !== null &&
            typeof ret.then === "function") {
            return ret;
        }
        else {
            return Promise.resolve(ret);
        }
    }
    catch (err) {
        return Promise.reject(err);
    }
}
