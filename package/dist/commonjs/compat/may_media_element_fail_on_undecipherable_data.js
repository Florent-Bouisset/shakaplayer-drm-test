"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = mayMediaElementFailOnUndecipherableData;
var config_1 = require("../config");
var env_detector_1 = require("./env_detector");
/**
 * We noticed that the PlayStation 5 may have the HTMLMediaElement on which the
 * content is played stop on a `MEDIA_ERR_DECODE` error if it encounters
 * encrypted media data whose key is not usable due to policy restrictions (the
 * most usual issue being non-respect of HDCP restrictions).
 *
 * This is not an usual behavior, other platforms just do not attempt to decode
 * the encrypted media data and stall the playback instead (which is a much
 * preferable behavior for us as we have some advanced mechanism to restart
 * playback when this happens).
 *
 * Consequently, we have to specifically consider platforms with that
 * fail-on-undecipherable-data issue, to perform a work-around in that case.
 * @returns {boolean}
 */
function mayMediaElementFailOnUndecipherableData() {
    var FORCE_MEDIA_ELEMENT_FAIL_ON_UNDECIPHERABLE_DATA = config_1.default.getCurrent().FORCE_MEDIA_ELEMENT_FAIL_ON_UNDECIPHERABLE_DATA;
    return (FORCE_MEDIA_ELEMENT_FAIL_ON_UNDECIPHERABLE_DATA ||
        env_detector_1.default.device === env_detector_1.default.DEVICES.PlayStation5);
}
