"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWebVTTPlainTextToVTTCues = exports.parseMp4EmbeddedWebVttToVTTCues = void 0;
/**
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */
var parse_vtt_plain_text_to_cues_1 = require("./parse_vtt_plain_text_to_cues");
exports.parseWebVTTPlainTextToVTTCues = parse_vtt_plain_text_to_cues_1.default;
var parse_webvtt_mp4_to_cues_1 = require("./parse_webvtt_mp4_to_cues");
exports.parseMp4EmbeddedWebVttToVTTCues = parse_webvtt_mp4_to_cues_1.default;
