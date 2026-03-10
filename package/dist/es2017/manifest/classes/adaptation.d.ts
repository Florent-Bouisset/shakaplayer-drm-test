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
import type { IParsedAdaptation } from "../../parsers/manifest";
import type { ITrackType, IRepresentationFilter } from "../../public_types";
import type { IAdaptationMetadata, IAdaptationSupportStatus } from "../types";
import type CodecSupportCache from "./codec_support_cache";
import Representation from "./representation";
/**
 * Normalized Adaptation structure.
 * An `Adaptation` describes a single `Track`. For example a specific audio
 * track (in a given language) or a specific video track.
 * It istelf can be represented in different qualities, which we call here
 * `Representation`.
 * @class Adaptation
 */
export default class Adaptation implements IAdaptationMetadata {
    /** ID uniquely identifying the Adaptation in the Period. */
    readonly id: string;
    /**
     * `true` if this Adaptation was not present in the original Manifest, but was
     * manually added after through the corresponding APIs.
     */
    manuallyAdded?: boolean;
    /**
     * @see IAdaptationMetadata.representations
     */
    readonly representations: Representation[];
    /**
     * @see ITrackType
     */
    readonly type: ITrackType;
    /**
     * @see IAdaptationMetadata.isAudioDescription
     */
    isAudioDescription?: boolean;
    /**
     * @see IAdaptationMetadata.isClosedCaption
     */
    isClosedCaption?: boolean;
    /**
     * @see IAdaptationMetadata.isForcedSubtitles
     */
    isForcedSubtitles?: boolean;
    /**
     * @see IAdaptationMetadata.isSignInterpreted
     */
    isSignInterpreted?: boolean;
    /**
     * @see IAdaptationMetadata.isDub
     */
    isDub?: boolean;
    /**
     * @see IAdaptationMetadata.language
     */
    language?: string;
    /**
     * @see IAdaptationMetadata.normalizedLanguage
     */
    normalizedLanguage?: string;
    /**
     * @see IAdaptationSupportStatus
     */
    supportStatus: IAdaptationSupportStatus;
    /**
     * @see IAdaptationMetadata.isTrickModeTrack
     */
    isTrickModeTrack?: boolean;
    /**
     * @see IAdaptationMetadata.label
     */
    label?: string;
    /**
     * @see IAdaptationMetadata.trickModeTracks
     */
    readonly trickModeTracks?: Adaptation[];
    /**
     * @constructor
     * @param {Object} parsedAdaptation
     * @param {Object|undefined} [options]
     */
    constructor(parsedAdaptation: IParsedAdaptation, cachedCodecSupport: CodecSupportCache, options?: {
        representationFilter?: IRepresentationFilter | undefined;
        isManuallyAdded?: boolean | undefined;
    });
    /**
     * Some environments (e.g. in a WebWorker) may not have the capability to know
     * if a mimetype+codec combination is supported on the current platform.
     *
     * Calling `refreshCodecSupport` manually once the codecs supported are known
     * by the current environnement allows to work-around this issue.
     *
     *
     * If the right mimetype+codec combination is found in the provided object,
     * this `Adaptation`'s `isSupported` property will be updated accordingly as
     * well as all of its inner `Representation`'s `isSupported` attributes.
     *
     * @param {Array.<Object>} cachedCodecSupport
     */
    refreshCodecSupport(cachedCodecSupport: CodecSupportCache): void;
    /**
     * Returns the Representation linked to the given ID.
     * @param {number|string} wantedId
     * @returns {Object|undefined}
     */
    getRepresentation(wantedId: number | string): Representation | undefined;
    /**
     * Format the current `Adaptation`'s properties into a
     * `IAdaptationMetadata` format which can better be communicated through
     * another thread.
     *
     * Please bear in mind however that the returned object will not be updated
     * when the current `Adaptation` instance is updated, it is only a
     * snapshot at the current time.
     *
     * If you want to keep that data up-to-date with the current `Adaptation`
     * instance, you will have to do it yourself.
     *
     * @returns {Object}
     */
    getMetadataSnapshot(): IAdaptationMetadata;
}
//# sourceMappingURL=adaptation.d.ts.map