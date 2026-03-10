import type { IVTTHTMLCue } from "./to_html";
/**
 * Parse WebVTT subtitles format when embedded in an MP4 file.
 * @throws Error - Throws if the given WebVTT format.
 * @param {string | BufferSource} text - The whole webvtt subtitles to parse
 * @param {Object} context
 * @param {Number} timeOffset - Offset to add to start and end times, in seconds
 * @return {Array.<Object>}
 */
export default function parseWebVTTMp4(text: string | BufferSource, { initTimescale }: {
    initTimescale: number | null;
}, timeOffset: number): IVTTHTMLCue[];
//# sourceMappingURL=parse_webvtt_mp4.d.ts.map