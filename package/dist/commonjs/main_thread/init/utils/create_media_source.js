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
exports.resetMediaElement = resetMediaElement;
exports.disableRemotePlaybackOnManagedMediaSource = disableRemotePlaybackOnManagedMediaSource;
exports.default = openMediaSource;
var browser_compatibility_types_1 = require("../../../compat/browser_compatibility_types");
var clear_element_src_1 = require("../../../compat/clear_element_src");
var log_1 = require("../../../log");
var main_media_source_interface_1 = require("../../../mse/main_media_source_interface");
var create_cancellable_promise_1 = require("../../../utils/create_cancellable_promise");
var id_generator_1 = require("../../../utils/id_generator");
var is_non_empty_string_1 = require("../../../utils/is_non_empty_string");
var generateMediaSourceId = (0, id_generator_1.default)();
/**
 * Dispose of ressources taken by the MediaSource:
 *   - Clear the MediaSource' SourceBuffers
 *   - Clear the mediaElement's src (stop the mediaElement)
 *   - Revoke MediaSource' URL
 * @param {HTMLMediaElement} mediaElement
 * @param {string|null} mediaSourceURL
 */
function resetMediaElement(mediaElement, mediaSourceURL) {
    if (mediaSourceURL !== null && mediaElement.src === mediaSourceURL) {
        log_1.default.info("media", "Clearing HTMLMediaElement's src");
        (0, clear_element_src_1.default)(mediaElement);
    }
    if (mediaSourceURL !== null) {
        try {
            log_1.default.debug("media", "Revoking previous URL");
            URL.revokeObjectURL(mediaSourceURL);
        }
        catch (e) {
            log_1.default.warn("media", "Error while revoking the media source URL", e instanceof Error ? e : "");
        }
    }
}
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
function disableRemotePlaybackOnManagedMediaSource(mediaElement, cancellationSignal) {
    if (browser_compatibility_types_1.isManagedMediaSource && "disableRemotePlayback" in mediaElement) {
        var disableRemotePlaybackPreviousValue_1 = mediaElement.disableRemotePlayback;
        cancellationSignal.register(function () {
            /**
             * Restore the `disableRemotePlayback` attribute to its previous value.
             * This ensures that the media element's state is the same as it was before
             * calling `RxPlayer.loadVideo` in the application.
             */
            mediaElement.disableRemotePlayback = disableRemotePlaybackPreviousValue_1;
        });
        /**
         * Using ManagedMediaSource needs to disableRemotePlayback or to provide
         * an Airplay source alternative, such as HLS.
         * https://github.com/w3c/media-source/issues/320
         */
        mediaElement.disableRemotePlayback = true;
    }
}
/**
 * Create a MediaSource instance and attach it to the given mediaElement element's
 * src attribute.
 *
 * Returns a Promise which resolves with the MediaSource when created and attached
 * to the `mediaElement` element.
 *
 * When the given `unlinkSignal` emits, mediaElement.src is cleaned, MediaSource
 * SourceBuffers are aborted and some minor cleaning is done.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} unlinkSignal
 * @returns {MediaSource}
 */
function createMediaSource(mediaElement, unlinkSignal) {
    // make sure the media has been correctly reset
    var oldSrc = (0, is_non_empty_string_1.default)(mediaElement.src) ? mediaElement.src : null;
    resetMediaElement(mediaElement, oldSrc);
    var mediaSource = new main_media_source_interface_1.default(generateMediaSourceId(), "FORCED_MEDIA_SOURCE" in mediaElement ? mediaElement.FORCED_MEDIA_SOURCE : undefined);
    disableRemotePlaybackOnManagedMediaSource(mediaElement, unlinkSignal);
    unlinkSignal.register(function () {
        mediaSource.dispose();
    });
    return mediaSource;
}
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
function openMediaSource(mediaElement, unlinkSignal) {
    return (0, create_cancellable_promise_1.default)(unlinkSignal, function (resolve) {
        var mediaSource = createMediaSource(mediaElement, unlinkSignal);
        mediaSource.addEventListener("mediaSourceOpen", function () {
            log_1.default.info("mse", "MediaSource opened");
            resolve(mediaSource);
        }, unlinkSignal);
        log_1.default.info("media", "Attaching MediaSource URL to the media element", {
            handleType: mediaSource.handle.type,
        });
        if (mediaSource.handle.type === "handle") {
            mediaElement.srcObject = mediaSource.handle.value;
            unlinkSignal.register(function () {
                resetMediaElement(mediaElement, null);
            });
        }
        else {
            var url_1 = URL.createObjectURL(mediaSource.handle.value);
            mediaElement.removeAttribute("src");
            var source = document.createElement("source");
            source.src = url_1;
            source.type = "";
            mediaElement.appendChild(source);
            // @ts-ignore
            mediaElement.load();
            unlinkSignal.register(function () {
                resetMediaElement(mediaElement, url_1);
            });
        }
    });
}
