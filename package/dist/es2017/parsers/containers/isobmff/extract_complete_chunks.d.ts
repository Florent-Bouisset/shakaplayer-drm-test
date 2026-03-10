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
/**
 * Take a chunk of ISOBMFF data and extract complete `moof`+`mdat` subsegments
 * which are ready to be decoded.
 * Returns a tuple of two containing first an array of those subsegments
 * followed by the last un-decodable part.
 * @param {Uint8Array} buffer
 * @returns {Array}
 */
export default function extractCompleteChunks<T extends ArrayBufferLike>(buffer: Uint8Array<T>): [Array<Uint8Array<T>> | null, Uint8Array<T> | null];
/**
 * @param {Uint8Array} buffer
 * @returns {Array}
 */
export declare function extractInitSegment<T extends ArrayBufferLike>(buffer: Uint8Array<T>): [Uint8Array<T> | null, Uint8Array<T> | null];
//# sourceMappingURL=extract_complete_chunks.d.ts.map