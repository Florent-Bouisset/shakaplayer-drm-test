"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = hasWorkerApi;
var env_detector_1 = require("./env_detector");
/**
 * Return `true` if the current device is compatible with the Worker API.
 *
 * Some old webkit devices, such as the PlayStation 4, returns weird results
 * when doing the most straightforward check. We have to check if other Webkit
 * devices have the same issue.
 * @returns {boolean}
 */
function hasWorkerApi() {
    return env_detector_1.default.device === env_detector_1.default.DEVICES.PlayStation4
        ? typeof Worker === "object" || typeof Worker === "function"
        : typeof Worker === "function";
}
