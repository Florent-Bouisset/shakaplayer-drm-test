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
import { type IMediaElement } from "../../../compat/browser_compatibility_types";
import MainMediaSourceInterface from "../../../mse/main_media_source_interface";
import type { CancellationSignal } from "../../../utils/task_canceller";
/**
 * Dispose of ressources taken by the MediaSource:
 *   - Clear the MediaSource' SourceBuffers
 *   - Clear the mediaElement's src (stop the mediaElement)
 *   - Revoke MediaSource' URL
 * @param {HTMLMediaElement} mediaElement
 * @param {string|null} mediaSourceURL
 */
export declare function resetMediaElement(mediaElement: IMediaElement, mediaSourceURL: string | null): void;
/**
 * Temporarily disables remote playback on a media element by setting the
 * `disableRemotePlayback` attribute to `true` when using a `ManagedMediaSource`.
 * The original value of the `disableRemotePlayback` attribute is restored when
 * the cancellation signal is triggered.
 *
 * This is useful when the `ManagedMediaSource` is being used and
 * the media element needs to ensure that remote playback (e.g., Airplay) is disabled
 * during the playback session.
 * @param {HTMLElement} mediaElement - The media element whose `disableRemotePlayback`
 * attribute will be modified.
 * @param {CancellationSignal} cancellationSignal - The signal that, when triggered,
 * restores the `disableRemotePlayback` attribute to its original value.
 */
export declare function disableRemotePlaybackOnManagedMediaSource(mediaElement: IMediaElement, cancellationSignal: CancellationSignal): void;
/**
 * Create and open a new MediaSource object on the given media element.
 * Resolves with the MediaSource when done.
 *
 * When the given `unlinkSignal` emits, mediaElement.src is cleaned, MediaSource
 * SourceBuffers are aborted and some minor cleaning is done.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} unlinkSignal
 * @returns {Promise}
 */
export default function openMediaSource(mediaElement: IMediaElement, unlinkSignal: CancellationSignal): Promise<MainMediaSourceInterface>;
//# sourceMappingURL=create_media_source.d.ts.map