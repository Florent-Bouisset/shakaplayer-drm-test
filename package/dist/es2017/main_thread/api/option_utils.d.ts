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
/**
 * This file exports various helpers to parse options given to various APIs,
 * throw if something is wrong, and return a normalized option object.
 */
import type { IMediaElement } from "../../compat/browser_compatibility_types";
import type { IAudioTrackSwitchingMode, IConstructorOptions, IKeySystemOption, ILoadedManifestFormat, ILoadVideoOptions, IManifestLoader, IRequestConfig, IRepresentationFilter, ISegmentLoader, IServerSyncInfos, IRxPlayerMode, ICmcdOptions } from "../../public_types";
/** Value once parsed for the `startAt` option of the `loadVideo` method. */
export type IParsedStartAtOption = {
    position: number;
} | {
    wallClockTime: number;
} | {
    percentage: number;
} | {
    fromLastPosition: number;
} | {
    fromLivePosition: number;
} | {
    fromFirstPosition: number;
};
/** Options of the RxPlayer's constructor once parsed. */
export interface IParsedConstructorOptions {
    maxBufferAhead: number;
    maxBufferBehind: number;
    wantedBufferAhead: number;
    maxVideoBufferSize: number;
    videoResolutionLimit: "videoElement" | "screen" | "none";
    throttleVideoBitrateWhenHidden: boolean;
    videoElement: IMediaElement;
    baseBandwidth: number;
}
/**
 * Base type which the types for the parsed options of the RxPlayer's
 * `loadVideo` method exend.
 * @see ILoadVideoOptions
 */
interface IParsedLoadVideoOptionsBase {
    /** @see ILoadVideoOptions.url */
    url: string | undefined;
    /** @see ILoadVideoOptions.transport */
    transport: string;
    /** @see ILoadVideoOptions.autoPlay */
    autoPlay: boolean;
    /** @see ILoadVideoOptions.initialManifest */
    initialManifest: ILoadedManifestFormat | undefined;
    /** @see ILoadVideoOptions.keySystems */
    keySystems: IKeySystemOption[];
    /** @see ILoadVideoOptions.lowLatencyMode */
    lowLatencyMode: boolean;
    /** @see ILoadVideoOptions.minimumManifestUpdateInterval */
    minimumManifestUpdateInterval: number;
    /** @see ILoadVideoOptions.requestConfig */
    requestConfig: IRequestConfig;
    /** @see ILoadVideoOptions.startAt */
    startAt: IParsedStartAtOption | undefined;
    /** @see ILoadVideoOptions.enableFastSwitching */
    enableFastSwitching: boolean;
    /** @see ILoadVideoOptions.defaultAudioTrackSwitchingMode */
    defaultAudioTrackSwitchingMode: IAudioTrackSwitchingMode | undefined;
    /** @see ILoadVideoOptions.onCodecSwitch */
    onCodecSwitch: "continue" | "reload";
    /** @see ILoadVideoOptions.onAudioTracksNotPlayable */
    onAudioTracksNotPlayable: "continue" | "error";
    /** @see ILoadVideoOptions.onVideoTracksNotPlayable */
    onVideoTracksNotPlayable: "continue" | "error";
    /** @see ILoadVideoOptions.checkMediaSegmentIntegrity */
    checkMediaSegmentIntegrity?: boolean | undefined;
    /** @see ILoadVideoOptions.checkManifestIntegrity */
    checkManifestIntegrity?: boolean | undefined;
    /** @see ILoadVideoOptions.manifestLoader */
    manifestLoader?: IManifestLoader | undefined;
    /** @see ILoadVideoOptions.referenceDateTime */
    referenceDateTime?: number | undefined;
    /** @see ILoadVideoOptions.representationFilter */
    representationFilter?: IRepresentationFilter | string | undefined;
    /** @see ILoadVideoOptions.segmentLoader */
    segmentLoader?: ISegmentLoader | undefined;
    /** @see ILoadVideoOptions.serverSyncInfos */
    serverSyncInfos?: IServerSyncInfos | undefined;
    /** @see ILoadVideoOptions.mode */
    mode: IRxPlayerMode;
    /** @see ILoadVideoOptions.cmcd */
    cmcd: ICmcdOptions | undefined;
    /** @see ILoadVideoOptions.experimentalOptions */
    experimentalOptions: {
        enableRepresentationAvoidance: boolean;
    };
    __priv_manifestUpdateUrl?: string | undefined;
    __priv_patchLastSegmentInSidx?: boolean | undefined;
}
/**
 * Options of the RxPlayer's `loadVideo` method once parsed when a "native"
 * `textTrackMode` is asked.
 */
interface IParsedLoadVideoOptionsNative extends IParsedLoadVideoOptionsBase {
    textTrackMode: "native";
}
/**
 * Options of the RxPlayer's `loadVideo` method once parsed when an "html"
 * `textTrackMode` is asked.
 */
interface IParsedLoadVideoOptionsHTML extends IParsedLoadVideoOptionsBase {
    textTrackMode: "html";
    textTrackElement: HTMLElement;
}
/**
 * Type enumerating all possible forms for the parsed options of the RxPlayer's
 * `loadVideo` method.
 */
export type IParsedLoadVideoOptions = IParsedLoadVideoOptionsNative | IParsedLoadVideoOptionsHTML;
/**
 * Parse options given to the API constructor and set default options as found
 * in the config.
 *
 * Do not mutate anything, only cross the given options and sane default options
 * (most coming from the config).
 * @param {Object|undefined} options
 * @returns {Object}
 */
declare function parseConstructorOptions(options: IConstructorOptions): IParsedConstructorOptions;
/**
 * Check the format of given reload options.
 * Throw if format in invalid.
 * @param {object | undefined} options
 */
declare function checkReloadOptions(options?: {
    reloadAt?: {
        position?: number;
        relative?: number;
    };
    keySystems?: IKeySystemOption[];
    autoPlay?: boolean;
}): void;
/**
 * Parse options given to loadVideo and set default options as found
 * in the config.
 *
 * Do not mutate anything, only cross the given options and sane default options
 * (most coming from the config).
 *
 * Throws if any mandatory option is not set.
 * @param {Object|undefined} options
 * @returns {Object}
 */
declare function parseLoadVideoOptions(options: ILoadVideoOptions): IParsedLoadVideoOptions;
export { checkReloadOptions, parseConstructorOptions, parseLoadVideoOptions };
//# sourceMappingURL=option_utils.d.ts.map