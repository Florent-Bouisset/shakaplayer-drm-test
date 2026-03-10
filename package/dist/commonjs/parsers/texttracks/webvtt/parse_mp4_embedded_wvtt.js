"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = parseMp4EmbeddedWebVtt;
var log_1 = require("../../../log");
var byte_parsing_1 = require("../../../utils/byte_parsing");
var string_parsing_1 = require("../../../utils/string_parsing");
var isobmff_1 = require("../../containers/isobmff");
var utils_1 = require("../../containers/isobmff/utils");
var parse_cue_block_1 = require("./parse_cue_block");
/**
 * WebVTT embedded in an MP4 file weirdly follow another format.
 * This function attempts to parse it.
 * @param {BufferSource|string} buffer
 * @param {number} timescale
 * @param {number} timeOffset
 * @param {Function} cueProducer
 * @returns {Array.<Object>}
 */
function parseMp4EmbeddedWebVtt(buffer, timescale, timeOffset, cueProducer) {
    var e_1, _a;
    var _b, _c;
    var cuesArray = [];
    var trackDecodeTime = (0, isobmff_1.getTrackFragmentDecodeTime)(buffer);
    if (trackDecodeTime === undefined) {
        return [];
    }
    var trunSamples = (0, utils_1.getTrunSamples)(buffer);
    var mdat = (0, isobmff_1.getMDAT)(buffer);
    if (mdat === null) {
        return [];
    }
    var mdatOffset = 0;
    var lastTime = trackDecodeTime;
    try {
        for (var trunSamples_1 = __values(trunSamples), trunSamples_1_1 = trunSamples_1.next(); !trunSamples_1_1.done; trunSamples_1_1 = trunSamples_1.next()) {
            var sample = trunSamples_1_1.value;
            var duration = (_b = sample.duration) !== null && _b !== void 0 ? _b : 0;
            var startTime = sample.compositionTimeOffset !== undefined
                ? lastTime + sample.compositionTimeOffset
                : lastTime;
            lastTime = startTime + duration;
            // Read samples until it adds up to the given size.
            var totalSize = 0;
            // No sample size == a single sample
            while (totalSize < ((_c = sample.size) !== null && _c !== void 0 ? _c : 0)) {
                // Read the payload size.
                var payloadSize = (0, byte_parsing_1.be4toi)(mdat, mdatOffset);
                mdatOffset += 4;
                totalSize += payloadSize;
                var currentBoxName = (0, string_parsing_1.utf8ToStr)(mdat.slice(mdatOffset, mdatOffset + 4));
                mdatOffset += 4;
                var currentBoxData = null;
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
                    log_1.default.error("vtt", "encountered unknown fragmented vtt box", {
                        box: currentBoxName,
                    });
                    mdatOffset += Math.min(payloadSize - 8, 1);
                }
                if (duration > 0) {
                    if (currentBoxData !== null) {
                        var cue = parseVttC(currentBoxData, timeOffset + startTime / timescale, timeOffset + lastTime / timescale, cueProducer);
                        if (cue !== null) {
                            cuesArray.push(cue);
                        }
                    }
                }
                else {
                    log_1.default.error("vtt", "cue duration missing");
                }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (trunSamples_1_1 && !trunSamples_1_1.done && (_a = trunSamples_1.return)) _a.call(trunSamples_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    if (mdatOffset !== mdat.length) {
        log_1.default.error("vtt", "end offset is not equal to mdat length", {
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
    var payload = getPayl(data);
    var settings = getSttg(data);
    if (payload === null) {
        return null;
    }
    var cue = cueProducer({
        start: startTime,
        end: endTime,
        settings: settings !== null ? (0, parse_cue_block_1.parseSettings)((0, string_parsing_1.utf8ToStr)(settings)) : {},
        header: undefined,
        payload: [(0, string_parsing_1.utf8ToStr)(payload)],
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
    return (0, isobmff_1.getBoxContent)(buf, 0x7061796c /* "payl" */);
}
/**
 * Returns the content of the first "sttg" box encountered in the given ISOBMFF
 * data.
 * Returns null if not found.
 * @param {Uint8Array} buf
 * @returns {Uint8Array|null}
 */
function getSttg(buf) {
    return (0, isobmff_1.getBoxContent)(buf, 0x73747467 /* "sttg" */);
}
