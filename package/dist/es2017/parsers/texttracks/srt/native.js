/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import makeVTTCue from "../../../compat/make_vtt_cue";
import bufferSourceToUint8 from "../../../utils/buffer_source_to_uint8";
import { utf8ToStr } from "../../../utils/string_parsing";
import getCueBlocks from "./get_cue_blocks";
import parseCueBlock from "./parse_cue";
/**
 * Parse whole srt file into an array of cues, to be inserted in a video's
 * TrackElement.
 * @param {string|bufferSource} input
 * @param {Object} _context
 * @param {Number} timeOffset
 * @returns {Array.<VTTCue|TextTrackCue>}
 */
export default function parseSRTStringToVTTCues(input, _context, timeOffset) {
    let srtStr;
    if (typeof input !== "string") {
        // Assume UTF-8
        // TODO: detection?
        srtStr = utf8ToStr(bufferSourceToUint8(input));
    }
    else {
        srtStr = input;
    }
    // Even if srt only authorize CRLF, we will also take LF or CR as line
    // terminators for resilience
    const lines = srtStr.split(/\r\n|\n|\r/);
    const cueBlocks = getCueBlocks(lines);
    const cues = [];
    for (let i = 0; i < cueBlocks.length; i++) {
        const cueObject = parseCueBlock(cueBlocks[i], timeOffset);
        if (cueObject !== null) {
            const nativeCue = toNativeCue(cueObject);
            if (nativeCue !== null) {
                cues.push(nativeCue);
            }
        }
    }
    return cues;
}
/**
 * @param {Object} cueObj
 * @returns {TextTrackCue|VTTCue|null}
 */
function toNativeCue(cueObj) {
    const { start, end, payload } = cueObj;
    const text = payload.join("\n");
    return makeVTTCue(start, end, text);
}
