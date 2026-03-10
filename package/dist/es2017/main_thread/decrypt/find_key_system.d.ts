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
import type { IMediaElement, IMediaKeySystemAccess } from "../../compat/browser_compatibility_types";
import type { IEmeApiImplementation } from "../../compat/eme";
import type { IKeySystemOption } from "../../public_types";
import type { CancellationSignal } from "../../utils/task_canceller";
export type ICodecSupportList = Array<{
    codec: string;
    mimeType: string;
    result: boolean;
}>;
export interface IMediaKeySystemAccessInfos {
    /** `MediaKeySystemAccess` to use to create `MediaKeys` instances. */
    mediaKeySystemAccess: IMediaKeySystemAccess;
    /**
     * The MediaKeySystemConfiguration that has been provided to the
     * `requestMediaKeySystemAccess` API.
     */
    askedConfiguration: MediaKeySystemConfiguration;
    /**
     * Corresponding `keySystems` element that has led to the creation of the
     * `MediaKeySystemAccess`.
     */
    options: IKeySystemOption;
    /** Information on supported or unsupported codec on that `MediaKeySystemAccess`. */
    codecSupport: ICodecSupportList;
}
export interface IReuseMediaKeySystemAccessEvent {
    type: "reuse-media-key-system-access";
    value: IMediaKeySystemAccessInfos;
}
export interface ICreateMediaKeySystemAccessEvent {
    type: "create-media-key-system-access";
    value: IMediaKeySystemAccessInfos;
}
export type IFoundMediaKeySystemAccessEvent = IReuseMediaKeySystemAccessEvent | ICreateMediaKeySystemAccessEvent;
/**
 * Extract from the current mediaKeys the supported Codecs.
 * @param {Object} initialConfiguration - The MediaKeySystemConfiguration given
 * to the `navigator.requestMediaKeySystemAccess` API.
 * @param {Object | undefined} mksConfiguration - The result of
 * getConfiguration() of the media keys.
 * @return {Array} The list of supported codec by the CDM.
 */
export declare function extractCodecSupportListFromConfiguration(initialConfiguration: MediaKeySystemConfiguration, mksConfiguration: MediaKeySystemConfiguration): ICodecSupportList;
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
export default function getMediaKeySystemAccess(eme: IEmeApiImplementation, mediaElement: IMediaElement, keySystemsConfigs: IKeySystemOption[], cancelSignal: CancellationSignal): Promise<IFoundMediaKeySystemAccessEvent>;
/**
 * Test a key system configuration, resolves with the MediaKeySystemAccess
 * or reject if the key system is unsupported.
 * @param {Object} eme - current EME implementation
 * @param {string} keyType - The KeySystem string to test (ex: com.microsoft.playready.recommendation)
 * @param {Array.<MediaKeySystemMediaCapability>} keySystemConfigurations - Configurations for this keySystem
 * @returns Promise resolving with the MediaKeySystemAccess. Rejects if unsupported.
 */
export declare function testKeySystem(eme: IEmeApiImplementation, keyType: string, keySystemConfigurations: MediaKeySystemConfiguration[]): Promise<IMediaKeySystemAccess>;
//# sourceMappingURL=find_key_system.d.ts.map