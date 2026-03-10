import log from "../../../log";
import { be4toi } from "../../../utils/byte_parsing";
import { utf8ToStr } from "../../../utils/string_parsing";
import { getBoxContent, getMDAT, getTrackFragmentDecodeTime, } from "../../containers/isobmff";
import { getTrunSamples } from "../../containers/isobmff/utils";
import { parseSettings } from "./parse_cue_block";
/**
 * WebVTT embedded in an MP4 file weirdly follow another format.
 * This function attempts to parse it.
 * @param {BufferSource|string} buffer
 * @param {number} timescale
 * @param {number} timeOffset
 * @param {Function} cueProducer
 * @returns {Array.<Object>}
 */
export default function parseMp4EmbeddedWebVtt(buffer, timescale, timeOffset, cueProducer) {
    var _a, _b;
    const cuesArray = [];
    const trackDecodeTime = getTrackFragmentDecodeTime(buffer);
    if (trackDecodeTime === undefined) {
        return [];
    }
    const trunSamples = getTrunSamples(buffer);
    const mdat = getMDAT(buffer);
    if (mdat === null) {
        return [];
    }
    let mdatOffset = 0;
    let lastTime = trackDecodeTime;
    for (const sample of trunSamples) {
        const duration = (_a = sample.duration) !== null && _a !== void 0 ? _a : 0;
        const startTime = sample.compositionTimeOffset !== undefined
            ? lastTime + sample.compositionTimeOffset
            : lastTime;
        lastTime = startTime + duration;
        // Read samples until it adds up to the given size.
        let totalSize = 0;
        // No sample size == a single sample
        while (totalSize < ((_b = sample.size) !== null && _b !== void 0 ? _b : 0)) {
            // Read the payload size.
            const payloadSize = be4toi(mdat, mdatOffset);
            mdatOffset += 4;
            totalSize += payloadSize;
            const currentBoxName = utf8ToStr(mdat.slice(mdatOffset, mdatOffset + 4));
            mdatOffset += 4;
            let currentBoxData = null;
            if (currentBoxName === "vttc") {
                if (payloadSize > 8) {
                    currentBoxData = mdat.slice(mdatOffset, mdatOffset + (payloadSize - 8));
                    mdatOffset += payloadSize - 8;
                }
            }
            else if (currentBoxName === "vtte") {
                if (payloadSize > 8) {
                    mdatOffset += payloadSize - 8;
                }
            }
            else {
                log.error("vtt", "encountered unknown fragmented vtt box", {
                    box: currentBoxName,
                });
                mdatOffset += Math.min(payloadSize - 8, 1);
            }
            if (duration > 0) {
                if (currentBoxData !== null) {
                    const cue = parseVttC(currentBoxData, timeOffset + startTime / timescale, timeOffset + lastTime / timescale, cueProducer);
                    if (cue !== null) {
                        cuesArray.push(cue);
                    }
                }
            }
            else {
                log.error("vtt", "cue duration missing");
            }
        }
    }
    if (mdatOffset !== mdat.length) {
        log.error("vtt", "end offset is not equal to mdat length", {
            mdataOffset: mdatOffset,
            mdatLength: mdat.length,
        });
    }
    return cuesArray;
}
/**
 * Parse VTT cue data as found in an "vttc" mp4 box.
 * @param {Uint8Array} data
 * @param {number} startTime
 * @param {number} endTime
 * @returns {Object|null}
 */
function parseVttC(data, startTime, endTime, cueProducer) {
    const payload = getPayl(data);
    const settings = getSttg(data);
    if (payload === null) {
        return null;
    }
    const cue = cueProducer({
        start: startTime,
        end: endTime,
        settings: settings !== null ? parseSettings(utf8ToStr(settings)) : {},
        header: undefined,
        payload: [utf8ToStr(payload)],
    }, {
        classes: {},
        global: undefined,
    });
    return cue;
}
/**
 * Returns the content of the first "payl" box encountered in the given ISOBMFF
 * data.
 * Returns null if not found.
 * @param {Uint8Array} buf
 * @returns {Uint8Array|null}
 */
function getPayl(buf) {
    return getBoxContent(buf, 0x7061796c /* "payl" */);
}
/**
 * Returns the content of the first "sttg" box encountered in the given ISOBMFF
 * data.
 * Returns null if not found.
 * @param {Uint8Array} buf
 * @returns {Uint8Array|null}
 */
function getSttg(buf) {
    return getBoxContent(buf, 0x73747467 /* "sttg" */);
}
