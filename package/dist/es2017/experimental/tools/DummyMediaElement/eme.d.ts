import type { IMediaKeySession, IMediaKeySystemAccess, IMediaKeys } from "../../../compat/browser_compatibility_types";
import EventEmitter from "../../../utils/event_emitter";
import type { IReadOnlySharedReference } from "../../../utils/reference";
export interface IRequestMediaKeySystemAccessConfig {
    /**
     * For the given arguments of the `navigator.requestMediaKeySystemAccess`
     * API, returns the resulting `MediaKeySystemConfiguration`, or `null` if
     * that configuration should be anounced as not supported.
     *
     * If not set, the first configuration will be anounced as supported for a
     * supported key system.
     *
     * @param {string} keySystem
     * @param {Array.<Object>} configs
     * @returns {Object} config
     */
    getMediaKeySystemConfiguration?: ((keySystem: string, configs: MediaKeySystemConfiguration[]) => MediaKeySystemConfiguration | null) | undefined;
    /**
     * For the given key system, returns `true` if it should be anounced as
     * supported or `false` if it should be anounced as unsupported.
     *
     * If not set, all keySystems are supported.
     * @param {string} keySystem
     * @returns {boolean}
     */
    isKeySystemSupported: ((keySystem: string) => boolean) | undefined;
}
/**
 * Return a configured re-implementation of the EME
 * `navigator.requestMediaKeySystemAccess` API.
 * @param {Object|undefined} [config]
 * @returns {Function}
 */
export declare function createRequestMediaKeySystemAccess(config?: IRequestMediaKeySystemAccessConfig | undefined): (keySystem: string, supportedConfigurations: MediaKeySystemConfiguration[]) => Promise<DummyMediaKeySystemAccess>;
/**
 * Re-implementation of the EME `MediaKeySystemAccess` Object.
 * @class DummyMediaKeySystemAccess
 */
export declare class DummyMediaKeySystemAccess implements IMediaKeySystemAccess {
    readonly keySystem: string;
    private _configuration;
    /**
     * @param {string} keySystem
     * @param {Object} configuration
     */
    constructor(keySystem: string, configuration: MediaKeySystemConfiguration);
    /**
     * @returns {Object}
     */
    getConfiguration(): MediaKeySystemConfiguration;
    /**
     * @returns {Promise.<Object>}
     */
    createMediaKeys(): Promise<DummyMediaKeys>;
}
/**
 * Re-implementation of the EME `MediaKeys` Object.
 * @class DummyMediaKeys
 */
export declare class DummyMediaKeys implements IMediaKeys {
    private _keySystem;
    private _sessionTypes;
    private _serverCertificateRef;
    dummySessions: DummyMediaKeySession[];
    onDummySessionKeyUpdates: (() => void) | null;
    constructor(keySystem: string, sessionTypes: MediaKeySessionType[]);
    /**
     * @param {string} sessionType
     * @returns {Object}
     */
    createSession(sessionType?: MediaKeySessionType): DummyMediaKeySession;
    /**
     * @param {BufferSource} serverCertificate
     * @returns {Promise.<boolean>}
     */
    setServerCertificate(serverCertificate: BufferSource): Promise<boolean>;
}
/**
 * Re-implementation of the EME `MediaKeySession` Object.
 * @class DummyMediaKeySession
 */
export declare class DummyMediaKeySession extends EventEmitter<MediaKeySessionEventMap> implements IMediaKeySession {
    readonly closed: Promise<MediaKeySessionClosedReason>;
    readonly keyStatuses: DummyMediaKeyStatusMap;
    expiration: number;
    sessionId: string;
    private _sessionType;
    private _unitialized;
    private _callable;
    private _closing;
    private _closed;
    private _keySystem;
    private _onSessionClosed;
    private _serverCertificateRef;
    private _callbacks;
    private _currentPolicyLevel;
    /**
     * @param {Object} args
     */
    constructor({ keySystem, sessionType, serverCertificateRef, callbacks, }: {
        keySystem: string;
        sessionType: MediaKeySessionType;
        serverCertificateRef: IReadOnlySharedReference<Uint8Array | null>;
        callbacks: IDummyMediaKeySessionCallbacks;
    });
    /**
     * @returns {Promise}
     */
    close(): Promise<void>;
    /**
     * @param {string} initDataType
     * @param {BufferSource} initData
     * @returns {Promise}
     */
    generateRequest(initDataType: string, initData: BufferSource): Promise<void>;
    /**
     * @param {string} sessionId
     * @returns {Promise.<boolean>}
     */
    load(sessionId: string): Promise<boolean>;
    /**
     * @returns {Promise}
     */
    remove(): Promise<void>;
    /**
     * @param {BufferSource} response
     * @returns {Promise}
     */
    update(response: BufferSource): Promise<void>;
    getPolicyLevel(): number;
    updatePolicyLevel(newLevel: number): void;
}
interface IDummyMediaKeySessionCallbacks {
    onClosed: () => void;
    onKeysUpdate: () => void;
}
/**
 * Re-implementation of the `MediaKeyStatusMap` where insertion is possible.
 *
 * Used to mock the corresponding EME API.
 * @class DummyMediaKeyStatusMap
 */
export declare class DummyMediaKeyStatusMap implements MediaKeyStatusMap {
    /**
     * Inner Map corresponding to what's that fake `MediaKeyStatusMap` maintains.
     * Key id are actually stored as strings as hex representation of the
     * underlying bytes.
     */
    private _innerMap;
    /**
     * KeySystem maintaining this Map.
     * Needed to perform some work-around on "special" platforms.
     */
    private _keySystem;
    /**
     * @returns {number} - the number of elements in the `DummyMediaKeyStatusMap`.
     */
    get size(): number;
    /**
     * @param {string} keySystem - KeySystem linked to this Map.
     * Needed to perform some work-around on "special" platforms.
     */
    constructor(keySystem: string);
    /**
     * Returns the actual Map backing this `DummyMediaKeyStatusMap`.
     * Useful to perform complex modifications.
     * @returns {Map}
     */
    getInnerMap(): Map<string, {
        status: MediaKeyStatus;
        policyLevel: number;
    }>;
    /**
     * Executes a provided function once per each key/value pair in the
     * `DummyMediaKeyStatusMap`, in insertion order.
     * @param {function} callbackfn
     */
    forEach(callbackfn: (value: MediaKeyStatus, key: ArrayBuffer, parent: MediaKeyStatusMap) => void): void;
    /**
     * Adds a new element with a specified key id and `MediaKeyStatus` to the
     * `DummyMediaKeyStatusMap`.
     * If an element with the same key id already exists, the element will be
     * updated.
     * @param {string} key - Key as an hex string in lower case
     * @param {string} status
     * @param {number} policyLevel
     * @returns {Object}
     */
    set(key: string, status: MediaKeyStatus, policyLevel: number): this;
    /**
     * Returns a specified element from this `DummyMediaKeyStatusMap` object.
     * @param {BufferSource} key
     * @returns {string|undefined} - Returns the element associated with the
     * specified key id.
     * If no element is associated with the specified key id, undefined is
     * returned.
     */
    get(key: BufferSource): MediaKeyStatus | undefined;
    /**
     * @returns {boolean} - Indicate whether an element with the specified key id
     * exists or not.
     */
    has(key: BufferSource): boolean;
    /**
     * Remove all stored key ids from this Map.
     */
    clear(): void;
}
/**
 * Parse PlayReady pssh to get its Hexa-coded KeyID.
 * @param {Uint8Array} buf
 * @param {number} baseOffset
 * @returns {string}
 */
export declare function getPlayReadyKIDFromPssh(buf: Uint8Array, baseOffset: number): string;
/**
 * On EDGE, Microsoft Playready KID are presented into little-endian GUID, this
 * function ensures that everything is in the expected format for the platfrm.
 * @param {String} keySystem
 * @param {Uint8Array} baseKeyId
 * @returns {Uint8Array}
 */
export default function kidToPlatformKid<T extends ArrayBufferLike>(keySystem: string, baseKeyId: Uint8Array<T>): Uint8Array<T | ArrayBuffer>;
export {};
//# sourceMappingURL=eme.d.ts.map