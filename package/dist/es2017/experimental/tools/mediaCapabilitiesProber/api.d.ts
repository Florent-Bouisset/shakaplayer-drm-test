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
import type { IDisplayConfiguration, IMediaConfiguration, IMediaKeySystemConfiguration } from "./types";
/**
 * A set of API to probe media capabilites.
 * Each API allow to evalute a specific feature (HDCP support, decoding infos, etc)
 * and relies on different browser API to probe capabilites.
 */
declare const mediaCapabilitiesProber: {
    /**
     * Set logger level
     * @param {string} level
     */
    LogLevel: string;
    /**
     * @param {string} keySystemType - Reverse domain name of the wanted key
     * system.
     * @param {Array.<MediaKeySystemConfiguration>} keySystemConfiguration - DRM
     * configuration wanted.
     * @returns {Promise.<MediaKeySystemConfiguration>} - Resolved the
     * MediaKeySystemConfiguration actually obtained if the given configuration is
     * compatible or a rejected Promise if not.
     */
    checkDrmConfiguration(keySystemType: string, keySystemConfiguration: IMediaKeySystemConfiguration[]): Promise<MediaKeySystemConfiguration>;
    /**
     * Get HDCP status. Evaluates if current equipement support given
     * HDCP revision.
     * @param {string} hdcpVersion - The wanted HDCP version to test (e.g.
     * `"1.1"`).
     * @returns {Promise.<string>} - Returns a Promise which rejects if the
     * browser API we need to rely on unexpectedly fail.
     *
     * If they resolve, resolve with one of the following string:
     *
     *   - `"Supported"`: The HDCP version is probably supported
     *
     *   - `"NotSupported"`: The HDCP version is probably not supported
     *
     *   - `"Unknown"`: It is unknown if the HDCP version may be supported or not.
     */
    getStatusForHDCP(hdcpVersion: string): Promise<string>;
    /**
     * Get decoding capabilities from a given video and/or audio
     * configuration.
     * TODO check alongside key system.
     * @param {Object} mediaConfig
     * @returns {Promise.<string>}
     */
    getDecodingCapabilities(mediaConfig: IMediaConfiguration): Promise<"Supported" | "Unknown" | "NotSupported">;
    /**
     * Get display capabilites. Tells if display can output
     * with specific video and/or audio constrains.
     * TODO I'm sure there's now newer APIs we can use for this (e.g. CSS etc.)
     * @param {Object} displayConfig
     * @returns {Promise.<string>}
     */
    getDisplayCapabilities(displayConfig: IDisplayConfiguration): Promise<string>;
};
export default mediaCapabilitiesProber;
//# sourceMappingURL=api.d.ts.map