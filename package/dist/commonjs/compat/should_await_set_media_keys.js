"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = shouldAwaitSetMediaKeys;
var config_1 = require("../config");
var env_detector_1 = require("./env_detector");
/**
 * Some devices will give an error if you did not ensure that a `setMediaKeys`
 * call was performed until the end before making another one.
 *
 * This is actually spec-compliant, but we were bitten previously by the other
 * side of that story, when a `setMediaKeys` took a very long time to resolve
 * (thus leading us to not await it).
 *
 * So this function returns `true` when, in actually reproduced scenarios, we
 * encountered situations where both:
 *   1. Time to perform a `setMediaKeys` is not excessive
 *   2. An issue was encountered due to too-close `setMediaKeys` calls.
 *
 * @returns {boolean}
 */
function shouldAwaitSetMediaKeys() {
    var FORCE_SHOULD_AWAIT_SET_MEDIA_KEYS = config_1.default.getCurrent().FORCE_SHOULD_AWAIT_SET_MEDIA_KEYS;
    return (FORCE_SHOULD_AWAIT_SET_MEDIA_KEYS ||
        env_detector_1.default.device === env_detector_1.default.DEVICES.WebOs2021 ||
        env_detector_1.default.device === env_detector_1.default.DEVICES.WebOs2022 ||
        env_detector_1.default.device === env_detector_1.default.DEVICES.WebOsOther);
}
