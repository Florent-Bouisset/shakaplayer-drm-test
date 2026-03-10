"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = canPreloadBeforePlay;
var env_detector_1 = require("./env_detector");
/**
 * On Safari (both mobile and desktop), when using direct file playback,
 * the `readyState` may remain at `1` (HAVE_METADATA) until `play()` is called,
 * even though the media is effectively ready to play.
 *
 * In such cases, the media cannot be preloaded before `play()`.
 * @param {boolean} isDirectfile - Whether playback is through directfile.
 * @returns {boolean} - True if the media can be preloaded; false otherwise.
 */
function canPreloadBeforePlay(isDirectfile) {
    if (isDirectfile &&
        (env_detector_1.default.browser === env_detector_1.default.BROWSERS.SafariMobile ||
            env_detector_1.default.browser === env_detector_1.default.BROWSERS.SafariDesktop)) {
        return false;
    }
    else {
        return true;
    }
}
