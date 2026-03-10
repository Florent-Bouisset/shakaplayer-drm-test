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
import type { IMediaElement, IMediaKeys, IMediaKeySystemAccess } from "../../../compat/browser_compatibility_types";
import type { IEmeApiImplementation } from "../../../compat/eme";
import type { IKeySystemOption } from "../../../public_types";
import type LoadedSessionsStore from "./loaded_sessions_store";
/** DRM-related state that can be associated to a single HTMLMediaElement. */
export interface IMediaElementMediaKeysInfos {
    emeImplementation: IEmeApiImplementation;
    /** Last keySystemOptions used with that HTMLMediaElement. */
    keySystemOptions: IKeySystemOption;
    /**
     * The actual MediaKeySystemConfiguration asked to the
     * `requestMediaKeySystemAccess` API.
     */
    askedConfiguration: MediaKeySystemConfiguration;
    /**
     * Last MediaKeySystemAccess used to create a MediaKeys bound to that
     * HTMLMediaElement.
     */
    mediaKeySystemAccess: IMediaKeySystemAccess;
    /** Last MediaKeys instance bound to that HTMLMediaElement. */
    mediaKeys: IMediaKeys;
    /**
     * Store containing information about every MediaKeySession active on the
     * MediaKeys instance bound to that HTMLMediaElement.
     */
    loadedSessionsStore: LoadedSessionsStore;
}
declare const _default: {
    /**
     * Attach new MediaKeys infos set on a HMTLMediaElement.
     * @param {HTMLMediaElement} mediaElement
     * @param {Object} mediaKeysInfo
     * @returns {Promise}
     */
    attach(mediaElement: IMediaElement, mediaKeysInfo: IMediaElementMediaKeysInfos): Promise<void>;
    /**
     * Get MediaKeys information expected to be linked to the given
     * `HTMLMediaElement`.
     *
     * Unlike `getAttachedMediaKeysState`, this method is synchronous and will
     * also return the expected state when `MediaKeys` attachment is still
     * pending and thus when that state is not truly applied (and where it
     * might fail before being applied).
     *
     * As such, only call this method if you want the currently expected state,
     * not the actual one.
     * @param {HTMLMediaElement} mediaElement
     * @returns {Array}
     */
    getAwaitedState(mediaElement: IMediaElement): IMediaElementMediaKeysInfos | null;
    /**
     * Get MediaKeys information set on a HMTLMediaElement.
     *
     * This method is asynchronous because that state may still be in a process
     * of being attached to the `HTMLMediaElement` (and the state we're
     * currently setting may not work out).
     * @param {HTMLMediaElement} mediaElement
     * @returns {Object|null}
     */
    getAttachedMediaKeysState(mediaElement: IMediaElement): Promise<IMediaElementMediaKeysInfos | null>;
    /**
     * Remove MediaKeys currently set on a HMTLMediaElement and update state
     * accordingly.
     * @param {HTMLMediaElement} mediaElement
     * @returns {Promise}
     */
    clearMediaKeys(mediaElement: IMediaElement): Promise<void>;
};
export default _default;
//# sourceMappingURL=media_keys_attacher.d.ts.map