"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DummyMediaKeyStatusMap = exports.DummyMediaKeySession = exports.DummyMediaKeys = exports.DummyMediaKeySystemAccess = void 0;
exports.createRequestMediaKeySystemAccess = createRequestMediaKeySystemAccess;
exports.getPlayReadyKIDFromPssh = getPlayReadyKIDFromPssh;
exports.default = kidToPlatformKid;
var env_detector_1 = require("../../../compat/env_detector");
var isobmff_1 = require("../../../parsers/containers/isobmff");
var array_includes_1 = require("../../../utils/array_includes");
var assert_1 = require("../../../utils/assert");
var base64_1 = require("../../../utils/base64");
var byte_parsing_1 = require("../../../utils/byte_parsing");
var create_uuid_1 = require("../../../utils/create_uuid");
var event_emitter_1 = require("../../../utils/event_emitter");
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
var noop_1 = require("../../../utils/noop");
var reference_1 = require("../../../utils/reference");
var slice_uint8array_1 = require("../../../utils/slice_uint8array");
var string_parsing_1 = require("../../../utils/string_parsing");
/**
 * Return a configured re-implementation of the EME
 * `navigator.requestMediaKeySystemAccess` API.
 * @param {Object|undefined} [config]
 * @returns {Function}
 */
function createRequestMediaKeySystemAccess(config) {
    /**
     * Re-implementation of the EME `navigator.requestMediaKeySystemAccess` API.
     * @param {string} keySystem
     * @param {Array.<Object>} supportedConfigurations
     * @returns {Promise.<Object>}
     */
    return function requestMediaKeySystemAccess(keySystem, supportedConfigurations) {
        var _a;
        if (keySystem === "") {
            return Promise.reject(new TypeError("`requestMediaKeySystemAccess` error: empty string"));
        }
        if (supportedConfigurations.length === 0) {
            return Promise.reject(new TypeError("`requestMediaKeySystemAccess` error: no given configuration."));
        }
        if (typeof (config === null || config === void 0 ? void 0 : config.isKeySystemSupported) === "function" &&
            !config.isKeySystemSupported(keySystem)) {
            var error = new Error("\"".concat(keySystem, "\" is not a supported keySystem"));
            error.name = "NotSupportedError";
            return Promise.reject(error);
        }
        var supportedConfiguration = (_a = supportedConfigurations[0]) !== null && _a !== void 0 ? _a : null;
        if (typeof (config === null || config === void 0 ? void 0 : config.getMediaKeySystemConfiguration) === "function") {
            supportedConfiguration = config.getMediaKeySystemConfiguration(keySystem, supportedConfigurations);
        }
        if (supportedConfiguration === null) {
            var error = new Error("`requestMediaKeySystemAccess` error: No configuration supported.");
            error.name = "NotSupportedError";
            return Promise.reject(error);
        }
        // check some mandatory configuration state
        // Clone so following setter don't update the source object
        supportedConfiguration = __assign({}, supportedConfiguration);
        supportedConfiguration.persistentState =
            (0, is_null_or_undefined_1.default)(supportedConfiguration.persistentState) ||
                supportedConfiguration.persistentState === "optional"
                ? "not-allowed"
                : supportedConfiguration.persistentState;
        supportedConfiguration.distinctiveIdentifier =
            (0, is_null_or_undefined_1.default)(supportedConfiguration.distinctiveIdentifier) ||
                supportedConfiguration.distinctiveIdentifier === "optional"
                ? "not-allowed"
                : supportedConfiguration.distinctiveIdentifier;
        return Promise.resolve(new DummyMediaKeySystemAccess(keySystem, supportedConfiguration));
    };
}
/**
 * Re-implementation of the EME `MediaKeySystemAccess` Object.
 * @class DummyMediaKeySystemAccess
 */
var DummyMediaKeySystemAccess = /** @class */ (function () {
    /**
     * @param {string} keySystem
     * @param {Object} configuration
     */
    function DummyMediaKeySystemAccess(keySystem, configuration) {
        this.keySystem = keySystem;
        this._configuration = configuration;
    }
    /**
     * @returns {Object}
     */
    DummyMediaKeySystemAccess.prototype.getConfiguration = function () {
        return this._configuration;
    };
    /**
     * @returns {Promise.<Object>}
     */
    DummyMediaKeySystemAccess.prototype.createMediaKeys = function () {
        // TODO persistent-license
        return Promise.resolve(new DummyMediaKeys(this.keySystem, ["temporary" /* , "persistent-license" */]));
    };
    return DummyMediaKeySystemAccess;
}());
exports.DummyMediaKeySystemAccess = DummyMediaKeySystemAccess;
/**
 * Re-implementation of the EME `MediaKeys` Object.
 * @class DummyMediaKeys
 */
var DummyMediaKeys = /** @class */ (function () {
    function DummyMediaKeys(keySystem, sessionTypes) {
        this._keySystem = keySystem;
        this._sessionTypes = sessionTypes;
        this._serverCertificateRef = new reference_1.default(null);
        this.dummySessions = [];
        this.onDummySessionKeyUpdates = null;
    }
    /**
     * @param {string} sessionType
     * @returns {Object}
     */
    DummyMediaKeys.prototype.createSession = function (sessionType) {
        if (sessionType === void 0) { sessionType = "temporary"; }
        if (!(0, array_includes_1.default)(this._sessionTypes, sessionType)) {
            var error = new Error("`createSession`: ".concat(sessionType, " sessionType not supported"));
            error.name = "NotSupportedError";
            throw error;
        }
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        var self = this;
        var newSession = new DummyMediaKeySession({
            keySystem: this._keySystem,
            sessionType: sessionType,
            serverCertificateRef: this._serverCertificateRef,
            callbacks: {
                onClosed: function () {
                    var index = self.dummySessions.indexOf(newSession);
                    if (index >= 0) {
                        self.dummySessions.splice(index, 1);
                    }
                },
                onKeysUpdate: function () {
                    var _a;
                    (_a = self.onDummySessionKeyUpdates) === null || _a === void 0 ? void 0 : _a.call(self);
                },
            },
        });
        this.dummySessions.push(newSession);
        return newSession;
    };
    /**
     * @param {BufferSource} serverCertificate
     * @returns {Promise.<boolean>}
     */
    DummyMediaKeys.prototype.setServerCertificate = function (serverCertificate) {
        if (serverCertificate.byteLength === 0) {
            throw new TypeError("Cannot set `serverCertificate`: an empty certificate was given");
        }
        var clonedServerCertificate = (0, byte_parsing_1.toUint8Array)(serverCertificate).slice();
        this._serverCertificateRef.setValue(clonedServerCertificate);
        return Promise.resolve(true);
    };
    return DummyMediaKeys;
}());
exports.DummyMediaKeys = DummyMediaKeys;
/**
 * Re-implementation of the EME `MediaKeySession` Object.
 * @class DummyMediaKeySession
 */
var DummyMediaKeySession = /** @class */ (function (_super) {
    __extends(DummyMediaKeySession, _super);
    /**
     * @param {Object} args
     */
    function DummyMediaKeySession(_a) {
        var keySystem = _a.keySystem, sessionType = _a.sessionType, serverCertificateRef = _a.serverCertificateRef, callbacks = _a.callbacks;
        var _this = _super.call(this) || this;
        _this._callbacks = callbacks;
        _this._onSessionClosed = noop_1.default; // Just here to make TypeScript happy
        _this.closed = new Promise(function (resolve) {
            _this._onSessionClosed = function () {
                _this.removeEventListener();
                try {
                    _this._callbacks.onClosed();
                }
                catch (_a) {
                    // we don't care
                }
                resolve("closed-by-application");
            };
        });
        _this._currentPolicyLevel = 100;
        _this.expiration = NaN;
        _this.keyStatuses = new DummyMediaKeyStatusMap(keySystem);
        _this.sessionId = "";
        _this._serverCertificateRef = serverCertificateRef;
        _this._keySystem = keySystem;
        _this._sessionType = sessionType;
        _this._unitialized = true;
        _this._callable = false;
        _this._closing = false;
        _this._closed = false;
        return _this;
    }
    /**
     * @returns {Promise}
     */
    DummyMediaKeySession.prototype.close = function () {
        var _this = this;
        // 1. If this object's closing or closed value is true, return a resolved promise.
        if (this._closing || this._closed) {
            return Promise.resolve();
        }
        // 2. If this object's callable value is false, return a promise rejected with an InvalidStateError.
        if (!this._callable) {
            var err = new Error("Cannot call `close` at this time");
            err.name = "InvalidStateError";
            return Promise.reject(err);
        }
        // 4. Set this object's closing or closed value to true.
        this._closing = true;
        this.keyStatuses.clear();
        return new Promise(function (resolve) {
            setTimeout(function () {
                try {
                    _this._callbacks.onKeysUpdate();
                }
                catch (_a) {
                    // We don't care
                }
                try {
                    _this.trigger("keystatuseschange", new Event("keystatuseschange"));
                }
                catch (_b) {
                    // We don't care
                }
                _this.expiration = NaN;
                _this._closed = true;
                _this._onSessionClosed();
                resolve();
            }, 0);
        });
    };
    /**
     * @param {string} initDataType
     * @param {BufferSource} initData
     * @returns {Promise}
     */
    DummyMediaKeySession.prototype.generateRequest = function (initDataType, initData) {
        var e_1, _a;
        var _this = this;
        // 1. If this object's closing or closed value is true, return a promise
        // rejected with an InvalidStateError.
        if (this._closing || this._closed) {
            var err = new Error("Cannot call `generateRequest`: closing session");
            err.name = "InvalidStateError";
            return Promise.reject(err);
        }
        // 2. If this object's uninitialized value is false, return a promise
        // rejected with an InvalidStateError.
        if (!this._unitialized) {
            var err = new Error("Cannot call `generateRequest`: already initialized");
            err.name = "InvalidStateError";
            return Promise.reject(err);
        }
        // 3. Let this object's uninitialized value be false.
        this._unitialized = false;
        // 4. If initDataType is the empty string, return a promise rejected with a
        // newly created TypeError.
        if (typeof initDataType !== "string" || initDataType === "") {
            return Promise.reject(new TypeError("Invalid `generateRequest` call: empty initDataType"));
        }
        // 5. If initData is an empty array, return a promise rejected with a newly
        // created TypeError.
        var initDataU8;
        if (initData instanceof ArrayBuffer) {
            initDataU8 = new Uint8Array(initData);
        }
        else if (initData instanceof Uint8Array) {
            initDataU8 = initData;
        }
        else {
            initDataU8 = new Uint8Array(initData.buffer);
        }
        if (initDataU8.byteLength === 0) {
            return Promise.reject(new TypeError("Invalid `generateRequest` call: empty initData"));
        }
        // 6. If the Key System implementation represented by this object's cdm
        // implementation value does not support initDataType as an Initialization
        // Data Type, return a promise rejected with a NotSupportedError. String
        // comparison is case-sensitive.
        if (initDataType !== "cenc") {
            var err = new Error("Cannot call `generateRequest`: unsupported initDataType \"".concat(initDataType, "\""));
            err.name = "NotSupportedError";
            return Promise.reject(err);
        }
        // 7. Let init data be a copy of the contents of the initData parameter.
        var clonedInitData = initDataU8.slice();
        var psshs = splitPsshBoxes(clonedInitData);
        var keyIds = null;
        try {
            for (var psshs_1 = __values(psshs), psshs_1_1 = psshs_1.next(); !psshs_1_1.done; psshs_1_1 = psshs_1.next()) {
                var pssh = psshs_1_1.value;
                try {
                    var psshInfo = getKeyIdsFromPssh(pssh, 0);
                    if (psshInfo !== null) {
                        switch (psshInfo.systemId) {
                            case undefined:
                                if (psshInfo.kids.length === 0) {
                                    keyIds = psshInfo.kids;
                                }
                                break;
                            case "PlayReady":
                                if (this._keySystem.indexOf("playready") >= 0) {
                                    keyIds = psshInfo.kids;
                                }
                                break;
                            case "Widevine":
                                if (this._keySystem.indexOf("widevine") >= 0) {
                                    keyIds = psshInfo.kids;
                                }
                                break;
                            case "Nagra":
                                if (this._keySystem.indexOf("nagra") >= 0) {
                                    keyIds = psshInfo.kids;
                                }
                                break;
                        }
                    }
                }
                catch (_b) {
                    /* noop */
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (psshs_1_1 && !psshs_1_1.done && (_a = psshs_1.return)) _a.call(psshs_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (keyIds === null || keyIds.length === 0) {
            throw new TypeError("No key id found in initialization data");
        }
        var kids = keyIds.map(function (k) { return (0, string_parsing_1.bytesToHex)(k); });
        this.sessionId = (0, create_uuid_1.default)();
        this._callable = true;
        setTimeout(function () {
            var certificateBase = _this._serverCertificateRef.getValue();
            var certificate = certificateBase === null ? null : (0, base64_1.bytesToBase64)(certificateBase);
            var message = {
                certificate: certificate,
                persistent: _this._sessionType === "persistent-license",
                keyIds: kids,
            };
            _this.trigger("message", new MediaKeyMessageEvent("message", {
                messageType: "license-request",
                message: (0, string_parsing_1.strToUtf8)(JSON.stringify(message)).buffer,
            }));
        }, 0);
        return Promise.resolve();
    };
    /**
     * @param {string} sessionId
     * @returns {Promise.<boolean>}
     */
    DummyMediaKeySession.prototype.load = function (sessionId) {
        // 1. If this object's closing or closed value is true, return a promise
        // rejected with an InvalidStateError.
        if (this._closing || this._closed) {
            var err = new Error("Cannot call `load`: closing session");
            err.name = "InvalidStateError";
            return Promise.reject(err);
        }
        // 2. If this object's uninitialized value is false, return a promise
        // rejected with an InvalidStateError.
        if (!this._unitialized) {
            var err = new Error("Cannot call `load`: already initialized");
            err.name = "InvalidStateError";
            return Promise.reject(err);
        }
        // 3. Let this object's uninitialized value be false.
        this._unitialized = false;
        // 4. If sessionId is the empty string, return a promise rejected with a
        // newly created TypeError.
        if (typeof sessionId !== "string" || sessionId === "") {
            return Promise.reject(new TypeError("Invalid `load` call: empty sessionId"));
        }
        // TODO persistent license
        return Promise.reject(new TypeError("Persistent license not implemented yet."));
    };
    /**
     * @returns {Promise}
     */
    DummyMediaKeySession.prototype.remove = function () {
        var _this = this;
        // 1. If this object's closing or closed value is true, return a promise
        // rejected with an InvalidStateError.
        if (this._closing || this._closed) {
            var err = new Error("Cannot call `remove`: closing session");
            err.name = "InvalidStateError";
            return Promise.reject(err);
        }
        // 2. If this object's callable value is false, return a promise rejected
        // with an InvalidStateError.
        if (!this._callable) {
            var err = new Error("Cannot call `remove` at this time");
            err.name = "InvalidStateError";
            return Promise.reject(err);
        }
        // Run the Update Key Statuses algorithm on the session, providing all key
        // ID(s) in the session along with the "released" MediaKeyStatus value for
        // each.
        var keymap = this.keyStatuses.getInnerMap();
        keymap.forEach(function (_a, key) {
            var policyLevel = _a.policyLevel;
            keymap.set(key, { status: "released", policyLevel: policyLevel });
        });
        if (this.keyStatuses.size > 0) {
            try {
                this._callbacks.onKeysUpdate();
            }
            catch (_a) {
                // We don't care
            }
            setTimeout(function () {
                _this.trigger("keystatuseschange", new Event("keystatuseschange"));
            }, 0);
        }
        this.expiration = NaN;
        return new Promise(function (resolve) {
            resolve();
        });
    };
    /**
     * @param {BufferSource} response
     * @returns {Promise}
     */
    DummyMediaKeySession.prototype.update = function (response) {
        var e_2, _a;
        var _this = this;
        // 1. If this object's closing or closed value is true, return a promise
        // rejected with an InvalidStateError.
        if (this._closing || this._closed) {
            var err = new Error("Cannot call `update`: closing session");
            err.name = "InvalidStateError";
            return Promise.reject(err);
        }
        // 2. If this object's callable value is false, return a promise
        // rejected with an InvalidStateError.
        if (!this._callable) {
            var err = new Error("Cannot call `update` at this time");
            err.name = "InvalidStateError";
            return Promise.reject(err);
        }
        // 3. If response is an empty array, return a promise rejected with a
        // newly created TypeError.
        if (response.byteLength === 0) {
            return Promise.reject(new TypeError("Invalid `update` call: empty response"));
        }
        var responseU8 = (0, byte_parsing_1.toUint8Array)(response);
        var parsed = (0, string_parsing_1.utf8ToStr)(responseU8);
        var hasUpdatedKeys = false;
        try {
            var parsedObj = JSON.parse(parsed);
            try {
                for (var _b = __values(Object.keys(parsedObj.keys)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var key = _c.value;
                    var policyLevel = parsedObj.keys[key].policyLevel;
                    if (policyLevel > this._currentPolicyLevel) {
                        this.keyStatuses.set(key, "output-restricted", policyLevel);
                    }
                    else {
                        this.keyStatuses.set(key, "usable", policyLevel);
                    }
                    hasUpdatedKeys = true;
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            if (parsedObj.expiration !== undefined) {
                this.expiration = parsedObj.expiration;
            }
        }
        catch (err) {
            throw new TypeError(err instanceof Error ? err.message : "Invalid message");
        }
        if (hasUpdatedKeys) {
            setTimeout(function () {
                try {
                    _this._callbacks.onKeysUpdate();
                }
                catch (_a) {
                    // We don't care
                }
                _this.trigger("keystatuseschange", new Event("keystatuseschange"));
            }, 0);
        }
        return Promise.resolve();
    };
    DummyMediaKeySession.prototype.getPolicyLevel = function () {
        return this._currentPolicyLevel;
    };
    DummyMediaKeySession.prototype.updatePolicyLevel = function (newLevel) {
        var _this = this;
        this._currentPolicyLevel = newLevel;
        var hasUpdatedKeys = false;
        try {
            var keymap_1 = this.keyStatuses.getInnerMap();
            keymap_1.forEach(function (_a, key) {
                var status = _a.status, policyLevel = _a.policyLevel;
                if (policyLevel > newLevel) {
                    if (status !== "output-restricted") {
                        keymap_1.set(key, { status: "output-restricted", policyLevel: policyLevel });
                        hasUpdatedKeys = true;
                    }
                }
                else if (status === "output-restricted") {
                    keymap_1.set(key, { status: "usable", policyLevel: policyLevel });
                    hasUpdatedKeys = true;
                }
            });
        }
        catch (_a) {
            // we don't care
        }
        if (hasUpdatedKeys) {
            setTimeout(function () {
                try {
                    _this._callbacks.onKeysUpdate();
                }
                catch (_a) {
                    // We don't care
                }
                _this.trigger("keystatuseschange", new Event("keystatuseschange"));
            }, 0);
        }
    };
    return DummyMediaKeySession;
}(event_emitter_1.default));
exports.DummyMediaKeySession = DummyMediaKeySession;
/**
 * Re-implementation of the `MediaKeyStatusMap` where insertion is possible.
 *
 * Used to mock the corresponding EME API.
 * @class DummyMediaKeyStatusMap
 */
var DummyMediaKeyStatusMap = /** @class */ (function () {
    /**
     * @param {string} keySystem - KeySystem linked to this Map.
     * Needed to perform some work-around on "special" platforms.
     */
    function DummyMediaKeyStatusMap(keySystem) {
        this._innerMap = new Map();
        this._keySystem = keySystem;
    }
    Object.defineProperty(DummyMediaKeyStatusMap.prototype, "size", {
        /**
         * @returns {number} - the number of elements in the `DummyMediaKeyStatusMap`.
         */
        get: function () {
            return this._innerMap.size;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Returns the actual Map backing this `DummyMediaKeyStatusMap`.
     * Useful to perform complex modifications.
     * @returns {Map}
     */
    DummyMediaKeyStatusMap.prototype.getInnerMap = function () {
        return this._innerMap;
    };
    /**
     * Executes a provided function once per each key/value pair in the
     * `DummyMediaKeyStatusMap`, in insertion order.
     * @param {function} callbackfn
     */
    DummyMediaKeyStatusMap.prototype.forEach = function (callbackfn) {
        var _this = this;
        return this._innerMap.forEach(function (value, key) {
            var toLocalFormat = kidToPlatformKid(_this._keySystem, (0, byte_parsing_1.toUint8Array)((0, string_parsing_1.hexToBytes)(key)));
            callbackfn(value.status, toLocalFormat.buffer, _this);
        });
    };
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
    DummyMediaKeyStatusMap.prototype.set = function (key, status, policyLevel) {
        this._innerMap.set(key, { status: status, policyLevel: policyLevel });
        return this;
    };
    /**
     * Returns a specified element from this `DummyMediaKeyStatusMap` object.
     * @param {BufferSource} key
     * @returns {string|undefined} - Returns the element associated with the
     * specified key id.
     * If no element is associated with the specified key id, undefined is
     * returned.
     */
    DummyMediaKeyStatusMap.prototype.get = function (key) {
        var _a;
        var toLocalFormat = kidToPlatformKid(this._keySystem, (0, byte_parsing_1.toUint8Array)(key));
        var keyStr = (0, string_parsing_1.bytesToHex)(toLocalFormat);
        return (_a = this._innerMap.get(keyStr)) === null || _a === void 0 ? void 0 : _a.status;
    };
    /**
     * @returns {boolean} - Indicate whether an element with the specified key id
     * exists or not.
     */
    DummyMediaKeyStatusMap.prototype.has = function (key) {
        var toLocalFormat = kidToPlatformKid(this._keySystem, (0, byte_parsing_1.toUint8Array)(key));
        var keyStr = (0, string_parsing_1.bytesToHex)(toLocalFormat);
        return this._innerMap.has(keyStr);
    };
    /**
     * Remove all stored key ids from this Map.
     */
    DummyMediaKeyStatusMap.prototype.clear = function () {
        return this._innerMap.clear();
    };
    return DummyMediaKeyStatusMap;
}());
exports.DummyMediaKeyStatusMap = DummyMediaKeyStatusMap;
/* eslint-disable @typescript-eslint/naming-convention */
var SYSTEM_IDS = {
    "1077EFECC0B24D02ACE33C1E52E2FB4B": "cenc",
    // "1F83E1E86EE94F0DBA2F5EC4E3ED1A66": "SecureMedia",
    // "35BF197B530E42D78B651B4BF415070F": "DivX DRM",
    // "45D481CB8FE049C0ADA9AB2D2455B2F2": "CoreCrypt",
    // "5E629AF538DA4063897797FFBD9902D4": "Marlin",
    // "616C7469636173742D50726F74656374": "AltiProtect",
    // "644FE7B5260F4FAD949A0762FFB054B4": "CMLA",
    // "69F908AF481646EA910CCD5DCCCB0A3A": "Marlin",
    // "6A99532D869F59229A91113AB7B1E2F3": "MobiDRM",
    // "80A6BE7E14484C379E70D5AEBE04C8D2": "Irdeto",
    // "94CE86FB07FF4F43ADB893D2FA968CA2": "FairPlay",
    // "992C46E6C4374899B6A050FA91AD0E39": "SteelKnot",
    "9A04F07998404286AB92E65BE0885F95": "PlayReady",
    // "9A27DD82FDE247258CBC4234AA06EC09": "Verimatrix VCAS",
    // "A68129D3575B4F1A9CBA3223846CF7C3": "VideoGuard Everywhere",
    ADB41C242DBF4A6D958B4457C0D27B95: "Nagra",
    // "B4413586C58CFFB094A5D4896C1AF6C3": "Viaccess-Orca",
    // "DCF4E3E362F158187BA60A6FE33FF3DD": "DigiCAP",
    // E2719D58A985B3C9781AB030AF78D30E: "ClearKey",
    EDEF8BA979D64ACEA3C827DCD51D21ED: "Widevine",
    // "F239E769EFA348509C16A903C6932EFB": "PrimeTime",
};
function getKeyIdsFromPssh(buf, baseOffset) {
    var offset = baseOffset + 4 + 4;
    var version = buf[offset];
    if (version === undefined || version > 1) {
        throw new Error("Invalid PSSH: Invalid version");
    }
    offset++;
    if (buf.length < offset + offset + 19) {
        throw new Error("Invalid PSSH: too short");
    }
    offset += 3; // flags
    var systemId = (0, string_parsing_1.bytesToHex)(buf.subarray(offset, offset + 16));
    offset += 16;
    if (version === 1) {
        if (buf.length < offset + 4) {
            return null;
        }
        var kidCount = (0, byte_parsing_1.be4toi)(buf, offset);
        offset += 4;
        var kids = [];
        var i = kidCount;
        while (i-- > 0) {
            if (buf.length < offset + 16) {
                return null;
            }
            kids.push(buf.subarray(offset, offset + 16));
            offset += 16;
        }
        return {
            systemId: undefined,
            kids: kids,
        };
    }
    var systemIdStr = SYSTEM_IDS[systemId.toUpperCase()];
    switch (systemIdStr) {
        case "PlayReady": {
            var kid = getPlayReadyKIDFromPssh(buf, baseOffset);
            return {
                systemId: "PlayReady",
                kids: [(0, string_parsing_1.hexToBytes)(kid)],
            };
        }
        case "Widevine": {
            var innerOffset = 4 /* box length */ +
                4 /* box name */ +
                4 /* version + flags */ +
                16 /* system id */ +
                4; /* length of widevine header. */
            // TODO real widevine PSSH parsing.
            while (true) {
                if (buf.byteLength < baseOffset + innerOffset + 16 + 2) {
                    return null;
                }
                if (buf[baseOffset + innerOffset] === 0x12 &&
                    buf[baseOffset + innerOffset + 1] === 0x10) {
                    var kid = buf.subarray(baseOffset + innerOffset + 2, baseOffset + innerOffset + 2 + 16);
                    return {
                        systemId: "Widevine",
                        kids: [kid],
                    };
                }
                innerOffset += 1;
            }
        }
        case "Nagra": {
            var innerOffset = baseOffset +
                4 /* box length */ +
                4 /* box name */ +
                4 /* version + flags */ +
                16 /* system id */ +
                4; /* length */
            var nagraBase64 = (0, string_parsing_1.utf8ToStr)(buf.subarray(innerOffset));
            var decodedBase64 = (0, base64_1.base64ToBytes)(nagraBase64);
            var nagraStr = (0, string_parsing_1.utf8ToStr)(decodedBase64);
            var parsed = JSON.parse(nagraStr);
            if (parsed === null || parsed === undefined || parsed.keyId === undefined) {
                throw new Error("Unrecognized Nagra PSSH");
            }
            return {
                systemId: "Nagra",
                kids: [(0, string_parsing_1.hexToBytes)(parsed.keyId.replace(/-/g, ""))],
            };
        }
        case "cenc":
            throw new Error("cenc pssh should have been set to version 1");
    }
}
/**
 * Parse PlayReady pssh to get its Hexa-coded KeyID.
 * @param {Uint8Array} buf
 * @param {number} baseOffset
 * @returns {string}
 */
function getPlayReadyKIDFromPssh(buf, baseOffset) {
    var innerOffset = baseOffset +
        4 /* box length */ +
        4 /* box name */ +
        4 /* version + flags */ +
        16; /* system id */
    var xmlLength = (0, byte_parsing_1.le2toi)(buf.subarray(innerOffset), 4);
    var xml = (0, string_parsing_1.utf16LEToStr)(buf.subarray(innerOffset + 14, innerOffset + 14 + xmlLength));
    var doc = new DOMParser().parseFromString(xml, "application/xml");
    var kidElement = doc.querySelector("KID");
    if (kidElement === null) {
        throw new Error("Cannot parse PlayReady PSSH: invalid XML");
    }
    var b64guidKid = kidElement.textContent === null ? "" : kidElement.textContent;
    var uuidKid = (0, string_parsing_1.guidToUuid)((0, base64_1.base64ToBytes)(b64guidKid));
    return (0, string_parsing_1.bytesToHex)(uuidKid).toLowerCase();
}
/**
 * @param {Uint8Array} data
 * @returns {Array.<Uint8Array>} - The extracted PSSH boxes. In the order they
 * are encountered.
 */
function splitPsshBoxes(data) {
    var i = 0;
    var psshBoxes = [];
    while (i < data.length) {
        var psshOffsets = void 0;
        try {
            psshOffsets = (0, isobmff_1.getBoxOffsets)(data, 0x70737368 /* pssh */);
        }
        catch (_a) {
            return psshBoxes;
        }
        if (psshOffsets === null) {
            return psshBoxes;
        }
        var pssh = (0, slice_uint8array_1.default)(data, psshOffsets[0], psshOffsets[2]);
        psshBoxes.push(pssh);
        i = psshOffsets[2];
    }
    return psshBoxes;
}
/**
 * On EDGE, Microsoft Playready KID are presented into little-endian GUID, this
 * function ensures that everything is in the expected format for the platfrm.
 * @param {String} keySystem
 * @param {Uint8Array} baseKeyId
 * @returns {Uint8Array}
 */
function kidToPlatformKid(keySystem, baseKeyId) {
    if (keySystem.indexOf("playready") !== -1 &&
        (env_detector_1.default.browser === env_detector_1.default.BROWSERS.EdgeChromium ||
            env_detector_1.default.browser === env_detector_1.default.BROWSERS.OtherIeOrEdgePreEdgeChromium ||
            env_detector_1.default.browser === env_detector_1.default.BROWSERS.Ie11)) {
        return uuidToGuid(baseKeyId);
    }
    return baseKeyId;
}
/**
 * Convert big-endian UUID into little-endian GUID.
 * @param {Uint8Array} uuid
 * @returns {Uint8Array} - guid
 * @throws AssertionError - The uuid length is not 16
 */
function uuidToGuid(uuid) {
    (0, assert_1.default)(uuid.length === 16, "UUID length should be 16");
    var p1A = uuid[0];
    var p1B = uuid[1];
    var p1C = uuid[2];
    var p1D = uuid[3];
    var p2A = uuid[4];
    var p2B = uuid[5];
    var p3A = uuid[6];
    var p3B = uuid[7];
    var guid = new Uint8Array(16);
    // swapping byte endian on 4 bytes
    // [4, 3, 2, 1] => [1, 2, 3, 4]
    guid[0] = p1D;
    guid[1] = p1C;
    guid[2] = p1B;
    guid[3] = p1A;
    // swapping byte endian on 2 bytes
    // [6, 5] => [5, 6]
    guid[4] = p2B;
    guid[5] = p2A;
    // swapping byte endian on 2 bytes
    // [8, 7] => [7, 8]
    guid[6] = p3B;
    guid[7] = p3A;
    guid.set(uuid.subarray(8, 16), 8);
    return guid;
}
