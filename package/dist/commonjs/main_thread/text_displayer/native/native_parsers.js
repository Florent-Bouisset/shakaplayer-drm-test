"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = parseTextTrackToCues;
var features_1 = require("../../../features");
var log_1 = require("../../../log");
/**
 * Convert text track data into timed VTT Cues.
 * @param {string} type - Text track format wanted
 * @param {string|BufferSource} data - Text track data
 * @param {Object} context
 * @param {Number} timestampOffset - offset to apply to every timed text
 * @returns {Array.<VTTCue>}
 * @throws Error - Throw if no parser is found for the given type
 */
function parseTextTrackToCues(type, data, context, timestampOffset) {
    log_1.default.debug("text", "Finding parser for native text tracks:", { type: type });
    var parser = features_1.default.nativeTextTracksParsers[type];
    if (typeof parser !== "function") {
        throw new Error("no parser found for the given text track");
    }
    log_1.default.debug("text", "Parser found, parsing...", { type: type });
    var parsed = parser(data, context, timestampOffset);
    log_1.default.debug("text", "Parsed successfully!", { length: parsed.length });
    return parsed;
}
