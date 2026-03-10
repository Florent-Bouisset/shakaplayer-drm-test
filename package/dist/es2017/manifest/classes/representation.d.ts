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
import { type IRepresentationMetadata } from "../../manifest";
import type { ICdnMetadata, IContentProtections, IParsedRepresentation } from "../../parsers/manifest";
import type { ITrackType, IHDRInformation } from "../../public_types";
import type codecSupportCache from "./codec_support_cache";
import type { IRepresentationIndex } from "./representation_index";
/**
 * Normalized Representation structure.
 * @class Representation
 */
declare class Representation implements IRepresentationMetadata {
    /** ID uniquely identifying the Representation in its parent Adaptation. */
    readonly id: string;
    /**
     * @see IRepresentationMetadata.uniqueId
     */
    readonly uniqueId: string;
    /**
     * @see IRepresentationMetadata.bitrate
     */
    bitrate: number;
    /**
     * @see IRepresentationMetadata.frameRate
     */
    frameRate?: number;
    /**
     * Interface allowing to get information about segments available for this
     * Representation.
     */
    index: IRepresentationIndex;
    /**
     * Information on the CDN(s) on which requests should be done to request this
     * Representation's initialization and media segments.
     *
     * `null` if there's no CDN involved here (e.g. resources are not requested
     * through the network).
     *
     * An empty array means that no CDN are left to request the resource. As such,
     * no resource can be loaded in that situation.
     */
    cdnMetadata: ICdnMetadata[] | null;
    /**
     * @see IRepresentationMetadata.isSpatialAudio
     */
    isSpatialAudio?: boolean | undefined;
    /**
     * @see IRepresentationMetadata.codecs
     */
    codecs: string[];
    /**
     * @see IRepresentationMetadata.mimeType
     */
    mimeType?: string;
    /**
     * @see IRepresentationMetadata.width
     */
    width?: number;
    /**
     * @see IRepresentationMetadata.height
     */
    height?: number;
    /**
     * @see IRepresentationMetadata.contentProtections
     */
    contentProtections?: IContentProtections;
    /**
     * @see IRepresentationMetadata.hdrInfo
     */
    hdrInfo?: IHDRInformation;
    /**
     * @see IRepresentationMetadata.decipherable
     *
     * Note that this property should __NEVER__ be updated directly on an
     * instanciated `Representation`, you are supposed to rely on
     * `Manifest` methods for this.
     */
    decipherable?: boolean | undefined;
    /**
     * @see IRepresentationMetadata.isSupported
     *
     * Note that this property should __NEVER__ be updated directly on an
     * instanciated `Representation`, you are supposed to rely on
     * `Manifest` methods for this.
     */
    isSupported: boolean | undefined;
    /**
     * @see ITrackType
     */
    trackType: ITrackType;
    /**
     * When set to `true`, the `Representation` should not be played, unless
     * there's no other choice.
     *
     * Note that this property should __NEVER__ be updated directly on an
     * instanciated `Representation`, you are supposed to rely on
     * `Manifest` methods for this.
     */
    shouldBeAvoided: boolean;
    /** If the codec is supported with MSE in worker */
    isCodecSupportedInWebWorker: boolean | undefined;
    /**
     * @param {Object} args
     * @param {string} trackType
     */
    constructor(args: IParsedRepresentation, trackType: ITrackType, cachedCodecSupport: codecSupportCache);
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
    refreshCodecSupport(cachedCodecSupport: codecSupportCache): void;
    /**
     * Returns "mime-type string" which includes both the mime-type and the codec,
     * which is often needed when interacting with the browser's APIs.
     * @returns {string}
     */
    getMimeTypeString(): string;
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
    getEncryptionData(drmSystemId: string): IRepresentationProtectionData[];
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
    getAllEncryptionData(): IRepresentationProtectionData[];
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
    addProtectionData(initDataType: string, keyId: Uint8Array | undefined, data: Array<{
        systemId: string;
        data: Uint8Array;
    }>): boolean;
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
    isPlayable(): boolean | undefined;
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
    getMetadataSnapshot(): IRepresentationMetadata;
}
/** Protection data as returned by a Representation. */
export interface IRepresentationProtectionData {
    /**
     * Initialization data type.
     * String describing the format of the initialization data sent through this
     * event.
     * https://www.w3.org/TR/eme-initdata-registry/
     */
    type: string;
    /**
     * The key ids linked to those initialization data.
     * This should be the key ids for the key concerned by the media which have
     * the present initialization data.
     *
     * `undefined` when not known (different from an empty array - which would
     * just mean that there's no key id involved).
     */
    keyIds: Uint8Array[] | undefined;
    /** Every initialization data for that type. */
    values: Array<{
        /**
         * Hex encoded system id, which identifies the key system.
         * https://dashif.org/identifiers/content_protection/
         */
        systemId: string;
        /**
         * The initialization data itself for that type and systemId.
         * For example, with "cenc" initialization data found in an ISOBMFF file,
         * this will be the whole PSSH box.
         */
        data: Uint8Array;
    }>;
}
export default Representation;
//# sourceMappingURL=representation.d.ts.map