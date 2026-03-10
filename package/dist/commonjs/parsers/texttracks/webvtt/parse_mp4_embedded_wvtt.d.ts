import type { IStyleElements } from "./parse_style_block";
/**
 * WebVTT embedded in an MP4 file weirdly follow another format.
 * This function attempts to parse it.
 * @param {BufferSource|string} buffer
 * @param {number} timescale
 * @param {number} timeOffset
 * @param {Function} cueProducer
 * @returns {Array.<Object>}
 */
export default function parseMp4EmbeddedWebVtt<T>(buffer: Uint8Array, timescale: number, timeOffset: number, cueProducer: ICueProducerFunction<T>): T[];
export type ICueProducerFunction<T> = (cueObj: {
    start: number;
    end: number;
    settings: Partial<Record<string, string>>;
    header?: string | undefined;
    payload: string[];
}, styling: {
    classes: IStyleElements;
    global?: string | undefined;
}) => T | null;
//# sourceMappingURL=parse_mp4_embedded_wvtt.d.ts.map