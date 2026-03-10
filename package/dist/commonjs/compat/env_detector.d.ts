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
/** List of detected browsers. */
declare const BROWSERS: {
    /** Edge since it has been ported to chromium's engine. */
    readonly EdgeChromium: 0;
    /** Firefox Gecko-based browser, any engine. */
    readonly Firefox: 1;
    /** Internet Explorer 11 specifically. */
    readonly Ie11: 2;
    /**
     * Either Internet Explorer pre-11 or Microsoft Edge before Edge was ported on
     * chromium's engines.
     */
    readonly OtherIeOrEdgePreEdgeChromium: 3;
    /** Safari on Desktop devices (not mobile, tablets etc.). */
    readonly SafariDesktop: 4;
    /** Safari on mobile devices (not desktop). */
    readonly SafariMobile: 5;
    /** Another browser that does not match with the others defined here. */
    readonly Other: 6;
};
/** List of detected devices. */
declare const DEVICES: {
    /** Specific A1 STB: KSTB 40xx from Kaon Media. */
    readonly A1KStb40xx: 100;
    /** Panasonic smart TVs */
    readonly Panasonic: 101;
    /** Philips's NetTv browser. */
    readonly PhilipsNetTv: 102;
    /** The PlayStation 4 game console. */
    readonly PlayStation4: 103;
    /** The PlayStation 5 game console. */
    readonly PlayStation5: 104;
    /** Devices where Tizen is the OS (e.g. Samsung TVs). */
    readonly Tizen: 105;
    /** WebOS (mostly LG smart TVs) 2021 version. */
    readonly WebOs2021: 106;
    /** WebOS (mostly LG smart TVs) 2022 version. */
    readonly WebOs2022: 107;
    /** Other WebOS (mostly LG smart TVs) versions. */
    readonly WebOsOther: 108;
    /** The Xbox(es) game console(s). */
    readonly Xbox: 109;
    /** Another device that does not match with the others defined here. */
    readonly Other: 110;
};
/** Interface giving information on the current environment where the RxPlayer runs. */
export interface IEnvDetector {
    /** List of all browsers that can be set to the `browser` property */
    BROWSERS: typeof BROWSERS;
    /** List of all devices that can be set to the `device` property */
    DEVICES: typeof DEVICES;
    /** Categorize a particular browser, without considering the current device. */
    readonly browser: (typeof BROWSERS)[keyof typeof BROWSERS];
    /**
     * Categorize a particular device, without considering the actual browser
     * running our code.
     */
    readonly device: (typeof DEVICES)[keyof typeof DEVICES];
    /**
     * If `true`, we're on Samsung's own browser application
     * TODO: see how to merge it with either of the previous ones */
    readonly isSamsungBrowser: boolean;
}
/**
 * Force `EnvDetector` to report the indicated environment, so other player
 * modules believe they are on another device.
 *
 * This method should only be relied on by tests.
 * @param {number} browser
 * @param {number} device
 * @returns {function} - Function allowing to reset the `EnvDetector`'s actual
 * properties.
 */
export declare function mockEnvironment(browser: (typeof BROWSERS)[keyof typeof BROWSERS], device: (typeof DEVICES)[keyof typeof DEVICES], isSamsungBrowser?: boolean): () => void;
/**
 * Reset `EnvDetector` to its regular state.
 * You want to call this if you mocked an environment with the
 * `mockEnvironment` function and want to reset the `EnvDetector` to its actual
 * value.
 */
declare function resetEnvironment(): void;
export { resetEnvironment };
declare const _default: IEnvDetector;
export default _default;
//# sourceMappingURL=env_detector.d.ts.map