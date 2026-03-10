import type { ICompatVTTCue } from "../../../../compat/browser_compatibility_types";
/**
 * Parse WebVTT subtitles format when embedded in an MP4 file.
 * @throws Error - Throws if the given WebVTT format.
 * @param {string | BufferSource} input - The whole webvtt subtitles to parse
 * @param {Object} context
 * @param {Number} timeOffset - Offset to add to start and end times, in seconds
 * @return {Array.<Object>}
 */
export default function parseMp4EmbeddedWebVttToVTTCues(input: string | BufferSource, { initTimescale }: {
    initTimescale: number | null;
}, timeOffset: number): Array<TextTrackCue | ICompatVTTCue>;
//# sourceMappingURL=parse_webvtt_mp4_to_cues.d.ts.map