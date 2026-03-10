"use strict";
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
var log_1 = require("../../log");
var manifest_1 = require("../../manifest");
var are_arrays_of_numbers_equal_1 = require("../../utils/are_arrays_of_numbers_equal");
var id_generator_1 = require("../../utils/id_generator");
var string_parsing_1 = require("../../utils/string_parsing");
var generateRepresentationUniqueId = (0, id_generator_1.default)();
/**
 * Normalized Representation structure.
 * @class Representation
 */
var Representation = /** @class */ (function () {
    /**
     * @param {Object} args
     * @param {string} trackType
     */
    function Representation(args, trackType, cachedCodecSupport) {
        var _a, _b, _c, _d, _e;
        this.id = args.id;
        this.uniqueId = generateRepresentationUniqueId();
        this.shouldBeAvoided = false;
        this.bitrate = args.bitrate;
        this.codecs = [];
        this.trackType = trackType;
        if (args.isSpatialAudio !== undefined) {
            this.isSpatialAudio = args.isSpatialAudio;
        }
        if (args.height !== undefined) {
            this.height = args.height;
        }
        if (args.width !== undefined) {
            this.width = args.width;
        }
        if (args.mimeType !== undefined) {
            this.mimeType = args.mimeType;
        }
        if (args.contentProtections !== undefined) {
            this.contentProtections = args.contentProtections;
        }
        if (args.frameRate !== undefined) {
            this.frameRate = args.frameRate;
        }
        if (args.hdrInfo !== undefined) {
            this.hdrInfo = args.hdrInfo;
        }
        this.cdnMetadata = args.cdnMetadata;
        this.index = args.index;
        var isEncrypted = this.contentProtections !== undefined;
        if (trackType === "audio" || trackType === "video") {
            // Supplemental codecs are defined as backwards-compatible codecs enhancing
            // the experience of a base layer codec
            if (args.supplementalCodecs !== undefined) {
                var isSupplementaryCodecSupported = cachedCodecSupport.isSupported((_a = this.mimeType) !== null && _a !== void 0 ? _a : "", (_b = args.supplementalCodecs) !== null && _b !== void 0 ? _b : "", isEncrypted);
                if (isSupplementaryCodecSupported !== false) {
                    this.codecs = [args.supplementalCodecs];
                    this.isSupported = isSupplementaryCodecSupported;
                }
            }
            if (this.isSupported !== true) {
                if (this.codecs.length > 0) {
                    // We couldn't check for support of another supplemental codec.
                    // Just push that codec without testing support yet, we'll check
                    // support later.
                    this.codecs.push((_c = args.codecs) !== null && _c !== void 0 ? _c : "");
                }
                else {
                    this.codecs = args.codecs === undefined ? [] : [args.codecs];
                    this.isSupported = cachedCodecSupport.isSupported((_d = this.mimeType) !== null && _d !== void 0 ? _d : "", (_e = args.codecs) !== null && _e !== void 0 ? _e : "", isEncrypted);
                }
            }
        }
        else {
            if (args.codecs !== undefined) {
                this.codecs.push(args.codecs);
            }
            this.isSupported = true;
        }
    }
    /**
     * Some environments (e.g. in a WebWorker) may not have the capability to know
     * if a mimetype+codec combination is supported on the current platform.
     *
     * Calling `refreshCodecSupport` manually once the codecs supported are known
     * by the current environnement allows to work-around this issue.
     *
     * If the right mimetype+codec combination is found in the provided object,
     * this `Representation`'s `isSupported` property will be updated accordingly.
     *
     * @param {Array.<Object>} cachedCodecSupport;
     */
    Representation.prototype.refreshCodecSupport = function (cachedCodecSupport) {
        var e_1, _a;
        var _b, _c;
        if (this.isSupported !== undefined) {
            return;
        }
        var isEncrypted = this.contentProtections !== undefined;
        var isSupported = false;
        var mimeType = (_b = this.mimeType) !== null && _b !== void 0 ? _b : "";
        var codecs = (_c = this.codecs) !== null && _c !== void 0 ? _c : [];
        if (codecs.length === 0) {
            codecs = [""];
        }
        var representationHasUnknownCodecs = false;
        try {
            for (var codecs_1 = __values(codecs), codecs_1_1 = codecs_1.next(); !codecs_1_1.done; codecs_1_1 = codecs_1.next()) {
                var codec = codecs_1_1.value;
                isSupported = cachedCodecSupport.isSupported(mimeType, codec, isEncrypted);
                if (isSupported === true) {
                    this.codecs = [codec];
                    break;
                }
                if (isSupported === undefined) {
                    representationHasUnknownCodecs = true;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (codecs_1_1 && !codecs_1_1.done && (_a = codecs_1.return)) _a.call(codecs_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        /** If any codec is supported, the representation is supported */
        if (isSupported === true) {
            this.isSupported = true;
        }
        else {
            /** If some codecs support are not known it's too early to assume
             *  representation is unsupported */
            if (representationHasUnknownCodecs) {
                this.isSupported = undefined;
            }
            else {
                /** If all codecs support are known and none are supported,
                 * the representation is not supported.
                 */
                this.isSupported = false;
            }
        }
    };
    /**
     * Returns "mime-type string" which includes both the mime-type and the codec,
     * which is often needed when interacting with the browser's APIs.
     * @returns {string}
     */
    Representation.prototype.getMimeTypeString = function () {
        var _a, _b, _c;
        return "".concat((_a = this.mimeType) !== null && _a !== void 0 ? _a : "", ";codecs=\"").concat((_c = (_b = this.codecs) === null || _b === void 0 ? void 0 : _b[0]) !== null && _c !== void 0 ? _c : "", "\"");
    };
    /**
     * Returns encryption initialization data linked to the given DRM's system ID.
     * This data may be useful to decrypt encrypted media segments.
     *
     * Returns an empty array if there is no data found for that system ID at the
     * moment.
     *
     * When you know that all encryption data has been added to this
     * Representation, you can also call the `getAllEncryptionData` method.
     * This second function will return all encryption initialization data
     * regardless of the DRM system, and might thus be used in all cases.
     *
     * /!\ Note that encryption initialization data may be progressively added to
     * this Representation after `_addProtectionData` calls or Manifest updates.
     * Because of this, the return value of this function might change after those
     * events.
     *
     * @param {string} drmSystemId - The hexa-encoded DRM system ID
     * @returns {Array.<Object>}
     */
    Representation.prototype.getEncryptionData = function (drmSystemId) {
        var _a;
        var allInitData = this.getAllEncryptionData();
        var filtered = [];
        for (var i = 0; i < allInitData.length; i++) {
            var createdObjForType = false;
            var initData = allInitData[i];
            for (var j = 0; j < initData.values.length; j++) {
                if (initData.values[j].systemId.toLowerCase() === drmSystemId.toLowerCase()) {
                    if (!createdObjForType) {
                        var keyIds = (_a = this.contentProtections) === null || _a === void 0 ? void 0 : _a.keyIds;
                        filtered.push({
                            type: initData.type,
                            keyIds: keyIds,
                            values: [initData.values[j]],
                        });
                        createdObjForType = true;
                    }
                    else {
                        filtered[filtered.length - 1].values.push(initData.values[j]);
                    }
                }
            }
        }
        return filtered;
    };
    /**
     * Returns all currently-known encryption initialization data linked to this
     * Representation.
     * Encryption initialization data is generally required to be able to decrypt
     * those Representation's media segments.
     *
     * Unlike `getEncryptionData`, this method will return all available
     * encryption data.
     * It might as such might be used when either the current drm's system id is
     * not known or when no encryption data specific to it was found. In that
     * case, providing every encryption data linked to this Representation might
     * still allow decryption.
     *
     * Returns an empty array in two cases:
     *   - the content is not encrypted.
     *   - We don't have any decryption data yet.
     *
     * /!\ Note that new encryption initialization data can be added progressively
     * through the `_addProtectionData` method or through Manifest updates.
     * It is thus highly advised to only rely on this method once every protection
     * data related to this Representation has been known to be added.
     *
     * The main situation where new encryption initialization data is added is
     * after parsing this Representation's initialization segment, if one exists.
     * @returns {Array.<Object>}
     */
    Representation.prototype.getAllEncryptionData = function () {
        var _a;
        if (this.contentProtections === undefined ||
            this.contentProtections.initData.length === 0) {
            return [];
        }
        var keyIds = (_a = this.contentProtections) === null || _a === void 0 ? void 0 : _a.keyIds;
        return this.contentProtections.initData.map(function (x) {
            return { type: x.type, keyIds: keyIds, values: x.values };
        });
    };
    /**
     * Add new encryption initialization data to this Representation if it was not
     * already included.
     *
     * Returns `true` if new encryption initialization data has been added.
     * Returns `false` if none has been added (e.g. because it was already known).
     *
     * /!\ Mutates the current Representation
     *
     * TODO better handle use cases like key rotation by not always grouping
     * every protection data together? To check.
     * @param {string} initDataType
     * @param {Uint8Array|undefined} keyId
     * @param {Uint8Array} data
     * @returns {boolean}
     */
    Representation.prototype.addProtectionData = function (initDataType, keyId, data) {
        var e_2, _a;
        var hasUpdatedProtectionData = false;
        if (this.contentProtections === undefined) {
            this.contentProtections = {
                keyIds: keyId !== undefined ? [keyId] : [],
                initData: [{ type: initDataType, values: data }],
            };
            return true;
        }
        if (keyId !== undefined) {
            var keyIds = this.contentProtections.keyIds;
            if (keyIds === undefined) {
                this.contentProtections.keyIds = [keyId];
            }
            else {
                var foundKeyId = false;
                try {
                    for (var keyIds_1 = __values(keyIds), keyIds_1_1 = keyIds_1.next(); !keyIds_1_1.done; keyIds_1_1 = keyIds_1.next()) {
                        var knownKeyId = keyIds_1_1.value;
                        if ((0, are_arrays_of_numbers_equal_1.default)(knownKeyId, keyId)) {
                            foundKeyId = true;
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (keyIds_1_1 && !keyIds_1_1.done && (_a = keyIds_1.return)) _a.call(keyIds_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                if (!foundKeyId) {
                    log_1.default.warn("manifest", "found unanounced key id.", {
                        keyId: (0, string_parsing_1.bytesToHex)(keyId),
                    });
                    keyIds.push(keyId);
                }
            }
        }
        var cInitData = this.contentProtections.initData;
        for (var i = 0; i < cInitData.length; i++) {
            if (cInitData[i].type === initDataType) {
                var cValues = cInitData[i].values;
                // loop through data
                for (var dataI = 0; dataI < data.length; dataI++) {
                    var dataToAdd = data[dataI];
                    var cValuesIdx = void 0;
                    for (cValuesIdx = 0; cValuesIdx < cValues.length; cValuesIdx++) {
                        if (dataToAdd.systemId === cValues[cValuesIdx].systemId) {
                            if ((0, are_arrays_of_numbers_equal_1.default)(dataToAdd.data, cValues[cValuesIdx].data)) {
                                // go to next dataToAdd
                                break;
                            }
                            else {
                                log_1.default.warn("manifest", "different init data for the same system ID", {
                                    systemId: dataToAdd.systemId,
                                });
                            }
                        }
                    }
                    if (cValuesIdx === cValues.length) {
                        // we didn't break the loop === we didn't already find that value
                        cValues.push(dataToAdd);
                        hasUpdatedProtectionData = true;
                    }
                }
                return hasUpdatedProtectionData;
            }
        }
        // If we are here, this means that we didn't find the corresponding
        // init data type in this.contentProtections.initData.
        this.contentProtections.initData.push({ type: initDataType, values: data });
        return true;
    };
    /**
     * Returns `true` if the `Representation` has a high chance of being playable on
     * the current device (its codec seems supported and we don't consider it to be
     * un-decipherable).
     *
     * Returns `false` if the `Representation` has a high chance of being unplayable
     * on the current device (its codec seems unsupported and/or we consider it to
     * be un-decipherable).
     *
     * Returns `undefined` if we don't know as the codec has not been checked yet.
     *
     * @returns {boolean|undefined}
     */
    Representation.prototype.isPlayable = function () {
        return (0, manifest_1.isRepresentationPlayable)(this);
    };
    /**
     * Format the current `Representation`'s properties into a
     * `IRepresentationMetadata` format which can better be communicated through
     * another thread.
     *
     * Please bear in mind however that the returned object will not be updated
     * when the current `Representation` instance is updated, it is only a
     * snapshot at the current time.
     *
     * If you want to keep that data up-to-date with the current `Representation`
     * instance, you will have to do it yourself.
     *
     * @returns {Object}
     */
    Representation.prototype.getMetadataSnapshot = function () {
        return {
            id: this.id,
            uniqueId: this.uniqueId,
            bitrate: this.bitrate,
            codecs: this.codecs,
            mimeType: this.mimeType,
            width: this.width,
            height: this.height,
            frameRate: this.frameRate,
            isSupported: this.isSupported,
            hdrInfo: this.hdrInfo,
            contentProtections: this.contentProtections,
            decipherable: this.decipherable,
            isCodecSupportedInWebWorker: this.isCodecSupportedInWebWorker,
        };
    };
    return Representation;
}());
exports.default = Representation;
