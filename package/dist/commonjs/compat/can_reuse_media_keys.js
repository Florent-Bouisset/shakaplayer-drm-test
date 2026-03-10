"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = canReuseMediaKeys;
var config_1 = require("../config");
var env_detector_1 = require("./env_detector");
/**
 * Returns `true` if a `MediaKeys` instance (the  `Encrypted Media Extension`
 * concept) can be reused between contents.
 *
 * This should usually be the case but we found rare devices where this would
 * cause problem:
 *   - (2022-11-21): WebOS (LG TVs), for some encrypted contents, just
 *     rebuffered indefinitely when loading a content already-loaded on the
 *     HTMLMediaElement.
 *   - (2024-08-23): Seen on Philips 2024 and 2023 in:
 *     https://github.com/canalplus/rx-player/issues/1464
 *   - (2024-09-04): Another case seen on an "A1" set-top box model made by
 *     Kaonmedia we will call the KSTB40xx.
 *     It may share the problematic with other devices, but we have only seen
 *     the problem on this one for now.
 *
 * @returns {boolean}
 */
function canReuseMediaKeys() {
    var FORCE_CANNOT_REUSE_MEDIA_KEYS = config_1.default.getCurrent().FORCE_CANNOT_REUSE_MEDIA_KEYS;
    return (!FORCE_CANNOT_REUSE_MEDIA_KEYS &&
        env_detector_1.default.device !== env_detector_1.default.DEVICES.WebOs2021 &&
        env_detector_1.default.device !== env_detector_1.default.DEVICES.WebOs2022 &&
        env_detector_1.default.device !== env_detector_1.default.DEVICES.WebOsOther &&
        env_detector_1.default.device !== env_detector_1.default.DEVICES.PhilipsNetTv &&
        env_detector_1.default.device !== env_detector_1.default.DEVICES.Panasonic &&
        env_detector_1.default.device !== env_detector_1.default.DEVICES.A1KStb40xx);
}
