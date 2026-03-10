import features from "../../../features";
import log from "../../../log";
/**
 * Convert text track data into timed VTT Cues.
 * @param {string} type - Text track format wanted
 * @param {string|BufferSource} data - Text track data
 * @param {Object} context
 * @param {Number} timestampOffset - offset to apply to every timed text
 * @returns {Array.<VTTCue>}
 * @throws Error - Throw if no parser is found for the given type
 */
export default function parseTextTrackToCues(type, data, context, timestampOffset) {
    log.debug("text", "Finding parser for native text tracks:", { type });
    const parser = features.nativeTextTracksParsers[type];
    if (typeof parser !== "function") {
        throw new Error("no parser found for the given text track");
    }
    log.debug("text", "Parser found, parsing...", { type });
    const parsed = parser(data, context, timestampOffset);
    log.debug("text", "Parsed successfully!", { length: parsed.length });
    return parsed;
}
