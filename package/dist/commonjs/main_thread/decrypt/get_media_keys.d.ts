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
import type { IMediaElement, IMediaKeySystemAccess, IMediaKeys } from "../../compat/browser_compatibility_types";
import type { IEmeApiImplementation } from "../../compat/eme";
import type { IKeySystemOption } from "../../public_types";
import type { CancellationSignal } from "../../utils/task_canceller";
import type { ICodecSupportList } from "./find_key_system";
import type { IMediaKeySessionStores } from "./types";
/** Object returned by `getMediaKeysInfos`. */
export interface IMediaKeysInfos {
    /** The MediaKeySystemAccess which allowed to create the MediaKeys instance. */
    mediaKeySystemAccess: IMediaKeySystemAccess;
    /**
     * The MediaKeySystemConfiguration that has been provided to the
     * `requestMediaKeySystemAccess` API.
     */
    askedConfiguration: MediaKeySystemConfiguration;
    /** The MediaKeys instance. */
    mediaKeys: IMediaKeys;
    /** Stores allowing to create and retrieve MediaKeySessions. */
    stores: IMediaKeySessionStores;
    /** IKeySystemOption compatible to the created MediaKeys instance. */
    options: IKeySystemOption;
    /** The codecs support */
    codecSupport: ICodecSupportList;
}
/**
 * Create a MediaKeys instance and associated structures (or just return the
 * current ones if sufficient) based on a wanted configuration.
 * @param {Object} eme - current EME implementation
 * @param {HTMLMediaElement} mediaElement - The HTMLMediaElement on which you
 * will attach the MediaKeys instance.
 * This Element is here only used to check if the current MediaKeys and
 * MediaKeySystemAccess instances are sufficient
 * @param {Array.<Object>} keySystemsConfigs - The key system configuration.
 * Needed to ask the right MediaKeySystemAccess.
 * @param {Object} cancelSignal - CancellationSignal allowing to cancel the
 * creation of the MediaKeys instance while the task is still pending.
 * @returns {Promise.<Object>}
 */
export default function getMediaKeysInfos(eme: IEmeApiImplementation, mediaElement: IMediaElement, keySystemsConfigs: IKeySystemOption[], cancelSignal: CancellationSignal): Promise<IMediaKeysInfos>;
//# sourceMappingURL=get_media_keys.d.ts.map