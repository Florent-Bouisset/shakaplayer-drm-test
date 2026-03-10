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
exports.checkReloadOptions = checkReloadOptions;
exports.parseConstructorOptions = parseConstructorOptions;
exports.parseLoadVideoOptions = parseLoadVideoOptions;
var config_1 = require("../../config");
var log_1 = require("../../log");
var array_includes_1 = require("../../utils/array_includes");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var object_assign_1 = require("../../utils/object_assign");
/**
 * Parse options given to the API constructor and set default options as found
 * in the config.
 *
 * Do not mutate anything, only cross the given options and sane default options
 * (most coming from the config).
 * @param {Object|undefined} options
 * @returns {Object}
 */
function parseConstructorOptions(options) {
    var maxBufferAhead;
    var maxBufferBehind;
    var wantedBufferAhead;
    var maxVideoBufferSize;
    var videoElement;
    var baseBandwidth;
    var _a = config_1.default.getCurrent(), DEFAULT_BASE_BANDWIDTH = _a.DEFAULT_BASE_BANDWIDTH, DEFAULT_VIDEO_RESOLUTION_LIMIT = _a.DEFAULT_VIDEO_RESOLUTION_LIMIT, DEFAULT_MAX_BUFFER_AHEAD = _a.DEFAULT_MAX_BUFFER_AHEAD, DEFAULT_MAX_BUFFER_BEHIND = _a.DEFAULT_MAX_BUFFER_BEHIND, DEFAULT_MAX_VIDEO_BUFFER_SIZE = _a.DEFAULT_MAX_VIDEO_BUFFER_SIZE, DEFAULT_THROTTLE_VIDEO_BITRATE_WHEN_HIDDEN = _a.DEFAULT_THROTTLE_VIDEO_BITRATE_WHEN_HIDDEN, DEFAULT_WANTED_BUFFER_AHEAD = _a.DEFAULT_WANTED_BUFFER_AHEAD;
    if ((0, is_null_or_undefined_1.default)(options.maxBufferAhead)) {
        maxBufferAhead = DEFAULT_MAX_BUFFER_AHEAD;
    }
    else {
        maxBufferAhead = Number(options.maxBufferAhead);
        if (isNaN(maxBufferAhead)) {
            throw new Error("Invalid maxBufferAhead parameter. Should be a number.");
        }
    }
    if ((0, is_null_or_undefined_1.default)(options.maxBufferBehind)) {
        maxBufferBehind = DEFAULT_MAX_BUFFER_BEHIND;
    }
    else {
        maxBufferBehind = Number(options.maxBufferBehind);
        if (isNaN(maxBufferBehind)) {
            throw new Error("Invalid maxBufferBehind parameter. Should be a number.");
        }
    }
    if ((0, is_null_or_undefined_1.default)(options.wantedBufferAhead)) {
        wantedBufferAhead = DEFAULT_WANTED_BUFFER_AHEAD;
    }
    else {
        wantedBufferAhead = Number(options.wantedBufferAhead);
        if (isNaN(wantedBufferAhead)) {
            throw new Error("Invalid wantedBufferAhead parameter. Should be a number.");
        }
    }
    if ((0, is_null_or_undefined_1.default)(options.maxVideoBufferSize)) {
        maxVideoBufferSize = DEFAULT_MAX_VIDEO_BUFFER_SIZE;
    }
    else {
        maxVideoBufferSize = Number(options.maxVideoBufferSize);
        if (isNaN(maxVideoBufferSize)) {
            throw new Error("Invalid maxVideoBufferSize parameter. Should be a number.");
        }
    }
    var videoResolutionLimit = (0, is_null_or_undefined_1.default)(options.videoResolutionLimit)
        ? DEFAULT_VIDEO_RESOLUTION_LIMIT
        : options.videoResolutionLimit;
    var throttleVideoBitrateWhenHidden = (0, is_null_or_undefined_1.default)(options.throttleVideoBitrateWhenHidden)
        ? DEFAULT_THROTTLE_VIDEO_BITRATE_WHEN_HIDDEN
        : !!options.throttleVideoBitrateWhenHidden;
    if ((0, is_null_or_undefined_1.default)(options.videoElement)) {
        videoElement = document.createElement("video");
    }
    else if (options.videoElement.nodeName.toLowerCase() === "video" ||
        options.videoElement.nodeName.toLowerCase() === "audio") {
        videoElement = options.videoElement;
    }
    else {
        throw new Error("Invalid videoElement parameter. Should be a HTMLMediaElement.");
    }
    if ((0, is_null_or_undefined_1.default)(options.baseBandwidth)) {
        baseBandwidth = DEFAULT_BASE_BANDWIDTH;
    }
    else {
        baseBandwidth = Number(options.baseBandwidth);
        if (isNaN(baseBandwidth)) {
            throw new Error("Invalid baseBandwidth parameter. Should be a number.");
        }
    }
    return {
        maxBufferAhead: maxBufferAhead,
        maxBufferBehind: maxBufferBehind,
        videoResolutionLimit: videoResolutionLimit,
        videoElement: videoElement,
        wantedBufferAhead: wantedBufferAhead,
        maxVideoBufferSize: maxVideoBufferSize,
        throttleVideoBitrateWhenHidden: throttleVideoBitrateWhenHidden,
        baseBandwidth: baseBandwidth,
    };
}
/**
 * Check the format of given reload options.
 * Throw if format in invalid.
 * @param {object | undefined} options
 */
function checkReloadOptions(options) {
    var _a, _b, _c, _d;
    if (options === null || (typeof options !== "object" && options !== undefined)) {
        throw new Error("API: reload - Invalid options format.");
    }
    if ((options === null || options === void 0 ? void 0 : options.reloadAt) === null ||
        (typeof (options === null || options === void 0 ? void 0 : options.reloadAt) !== "object" && (options === null || options === void 0 ? void 0 : options.reloadAt) !== undefined)) {
        throw new Error("API: reload - Invalid 'reloadAt' option format.");
    }
    if (typeof ((_a = options === null || options === void 0 ? void 0 : options.reloadAt) === null || _a === void 0 ? void 0 : _a.position) !== "number" &&
        ((_b = options === null || options === void 0 ? void 0 : options.reloadAt) === null || _b === void 0 ? void 0 : _b.position) !== undefined) {
        throw new Error("API: reload - Invalid 'reloadAt.position' option format.");
    }
    if (typeof ((_c = options === null || options === void 0 ? void 0 : options.reloadAt) === null || _c === void 0 ? void 0 : _c.relative) !== "number" &&
        ((_d = options === null || options === void 0 ? void 0 : options.reloadAt) === null || _d === void 0 ? void 0 : _d.relative) !== undefined) {
        throw new Error("API: reload - Invalid 'reloadAt.relative' option format.");
    }
    if (!Array.isArray(options === null || options === void 0 ? void 0 : options.keySystems) && (options === null || options === void 0 ? void 0 : options.keySystems) !== undefined) {
        throw new Error("API: reload - Invalid 'keySystems' option format.");
    }
    if ((options === null || options === void 0 ? void 0 : options.autoPlay) !== undefined && typeof options.autoPlay !== "boolean") {
        throw new Error("API: reload - Invalid 'autoPlay' option format.");
    }
}
/**
 * Parse options given to loadVideo and set default options as found
 * in the config.
 *
 * Do not mutate anything, only cross the given options and sane default options
 * (most coming from the config).
 *
 * Throws if any mandatory option is not set.
 * @param {Object|undefined} options
 * @returns {Object}
 */
function parseLoadVideoOptions(options) {
    var e_1, _a;
    var _b, _c, _d, _e;
    var url;
    var transport;
    var keySystems;
    var textTrackMode;
    var mode;
    var textTrackElement;
    var startAt;
    var _f = config_1.default.getCurrent(), DEFAULT_AUTO_PLAY = _f.DEFAULT_AUTO_PLAY, DEFAULT_CODEC_SWITCHING_BEHAVIOR = _f.DEFAULT_CODEC_SWITCHING_BEHAVIOR, DEFAULT_ENABLE_FAST_SWITCHING = _f.DEFAULT_ENABLE_FAST_SWITCHING, DEFAULT_TEXT_TRACK_MODE = _f.DEFAULT_TEXT_TRACK_MODE, DEFAULT_AUDIO_TRACKS_NOT_PLAYABLE_BEHAVIOR = _f.DEFAULT_AUDIO_TRACKS_NOT_PLAYABLE_BEHAVIOR, DEFAULT_VIDEO_TRACKS_NOT_PLAYABLE_BEHAVIOR = _f.DEFAULT_VIDEO_TRACKS_NOT_PLAYABLE_BEHAVIOR;
    if ((0, is_null_or_undefined_1.default)(options)) {
        throw new Error("No option set on loadVideo");
    }
    if (!(0, is_null_or_undefined_1.default)(options.url)) {
        url = String(options.url);
    }
    else if ((0, is_null_or_undefined_1.default)(options.initialManifest) &&
        (0, is_null_or_undefined_1.default)(options.manifestLoader)) {
        throw new Error("Unable to load a content: no url set on loadVideo.\n" +
            "Please provide at least either an `url` argument, a " +
            "`initialManifest` option or a " +
            "`manifestLoader` option so the RxPlayer " +
            "can load the content.");
    }
    if ((0, is_null_or_undefined_1.default)(options.transport)) {
        throw new Error("No transport set on loadVideo");
    }
    else {
        transport = String(options.transport);
    }
    var autoPlay = (0, is_null_or_undefined_1.default)(options.autoPlay)
        ? DEFAULT_AUTO_PLAY
        : !!options.autoPlay;
    if ((0, is_null_or_undefined_1.default)(options.keySystems)) {
        keySystems = [];
    }
    else {
        keySystems = Array.isArray(options.keySystems)
            ? options.keySystems
            : [options.keySystems];
        try {
            for (var keySystems_1 = __values(keySystems), keySystems_1_1 = keySystems_1.next(); !keySystems_1_1.done; keySystems_1_1 = keySystems_1.next()) {
                var keySystem = keySystems_1_1.value;
                if (typeof keySystem.type !== "string" ||
                    typeof keySystem.getLicense !== "function") {
                    throw new Error("Invalid key system given: Missing type string or " + "getLicense callback");
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (keySystems_1_1 && !keySystems_1_1.done && (_a = keySystems_1.return)) _a.call(keySystems_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    var lowLatencyMode = options.lowLatencyMode === undefined ? false : !!options.lowLatencyMode;
    var initialManifest = options.initialManifest;
    var minimumManifestUpdateInterval = (_b = options.minimumManifestUpdateInterval) !== null && _b !== void 0 ? _b : 0;
    var defaultAudioTrackSwitchingMode = (_c = options.defaultAudioTrackSwitchingMode) !== null && _c !== void 0 ? _c : undefined;
    if (defaultAudioTrackSwitchingMode !== undefined &&
        !(0, array_includes_1.default)(["seamless", "direct", "reload"], defaultAudioTrackSwitchingMode)) {
        log_1.default.warn("API", "The `defaultAudioTrackSwitchingMode` loadVideo option must match one of " +
            "the following strategy name:\n" +
            "- `seamless`\n" +
            "- `direct`\n" +
            "- `reload`");
        defaultAudioTrackSwitchingMode = undefined;
    }
    var onCodecSwitch = (0, is_null_or_undefined_1.default)(options.onCodecSwitch)
        ? DEFAULT_CODEC_SWITCHING_BEHAVIOR
        : options.onCodecSwitch;
    if (!(0, array_includes_1.default)(["continue", "reload"], onCodecSwitch)) {
        log_1.default.warn("API", "The `onCodecSwitch` loadVideo option must match one of " +
            "the following string:\n" +
            "- `continue`\n" +
            "- `reload`\n" +
            "If badly set, " +
            DEFAULT_CODEC_SWITCHING_BEHAVIOR +
            " will be used as default");
        onCodecSwitch = DEFAULT_CODEC_SWITCHING_BEHAVIOR;
    }
    var onAudioTracksNotPlayable = (0, is_null_or_undefined_1.default)(options.onAudioTracksNotPlayable)
        ? DEFAULT_AUDIO_TRACKS_NOT_PLAYABLE_BEHAVIOR
        : options.onAudioTracksNotPlayable;
    if (!(0, array_includes_1.default)(["continue", "error"], onAudioTracksNotPlayable)) {
        log_1.default.warn("API", "The `onAudioTracksNotPlayable` loadVideo option must match one of " +
            "the following string:\n" +
            "- `continue`\n" +
            "- `error`\n" +
            "If badly set, " +
            DEFAULT_AUDIO_TRACKS_NOT_PLAYABLE_BEHAVIOR +
            " will be used as default");
        onAudioTracksNotPlayable = DEFAULT_AUDIO_TRACKS_NOT_PLAYABLE_BEHAVIOR;
    }
    var onVideoTracksNotPlayable = (0, is_null_or_undefined_1.default)(options.onVideoTracksNotPlayable)
        ? DEFAULT_VIDEO_TRACKS_NOT_PLAYABLE_BEHAVIOR
        : options.onVideoTracksNotPlayable;
    if (!(0, array_includes_1.default)(["continue", "error"], onVideoTracksNotPlayable)) {
        log_1.default.warn("API", "The `onVideoTracksNotPlayable` loadVideo option must match one of " +
            "the following string:\n" +
            "- `continue`\n" +
            "- `error`\n" +
            "If badly set, " +
            DEFAULT_VIDEO_TRACKS_NOT_PLAYABLE_BEHAVIOR +
            " will be used as default");
        onVideoTracksNotPlayable = DEFAULT_VIDEO_TRACKS_NOT_PLAYABLE_BEHAVIOR;
    }
    if ((0, is_null_or_undefined_1.default)(options.textTrackMode)) {
        textTrackMode = DEFAULT_TEXT_TRACK_MODE;
    }
    else {
        if (options.textTrackMode !== "native" && options.textTrackMode !== "html") {
            throw new Error("Invalid textTrackMode.");
        }
        textTrackMode = options.textTrackMode;
    }
    if (textTrackMode === "html") {
        // TODO Better way to express that in TypeScript?
        if ((0, is_null_or_undefined_1.default)(options.textTrackElement)) {
            throw new Error("You have to provide a textTrackElement " + 'in "html" textTrackMode.');
        }
        else if (!(options.textTrackElement instanceof HTMLElement)) {
            throw new Error("textTrackElement should be an HTMLElement.");
        }
        else {
            textTrackElement = options.textTrackElement;
        }
    }
    else if (!(0, is_null_or_undefined_1.default)(options.textTrackElement)) {
        log_1.default.warn("API", "You have set a textTrackElement without being in " +
            'an "html" textTrackMode. It will be ignored.');
    }
    if ((0, is_null_or_undefined_1.default)(options.mode)) {
        mode = "auto";
    }
    else {
        if (!(0, array_includes_1.default)(["auto", "multithread", "main"], options.mode)) {
            throw new Error("Invalid `mode` option.");
        }
        mode = options.mode;
    }
    var enableFastSwitching = (0, is_null_or_undefined_1.default)(options.enableFastSwitching)
        ? DEFAULT_ENABLE_FAST_SWITCHING
        : options.enableFastSwitching;
    if (!(0, is_null_or_undefined_1.default)(options.startAt)) {
        if ("wallClockTime" in options.startAt &&
            options.startAt.wallClockTime instanceof Date) {
            var wallClockTime = options.startAt.wallClockTime.getTime() / 1000;
            startAt = (0, object_assign_1.default)({}, options.startAt, { wallClockTime: wallClockTime });
        }
        else {
            startAt = options.startAt;
        }
    }
    var requestConfig = (_d = options.requestConfig) !== null && _d !== void 0 ? _d : {};
    // All those eslint disable are needed because the option is voluntarily
    // hidden from the base type to limit discovery of this hidden API.
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        __priv_patchLastSegmentInSidx: options.__priv_patchLastSegmentInSidx,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        __priv_manifestUpdateUrl: options.__priv_manifestUpdateUrl,
        checkMediaSegmentIntegrity: options.checkMediaSegmentIntegrity,
        checkManifestIntegrity: options.checkManifestIntegrity,
        autoPlay: autoPlay,
        defaultAudioTrackSwitchingMode: defaultAudioTrackSwitchingMode,
        enableFastSwitching: enableFastSwitching,
        initialManifest: initialManifest,
        keySystems: keySystems,
        lowLatencyMode: lowLatencyMode,
        manifestLoader: options.manifestLoader,
        minimumManifestUpdateInterval: minimumManifestUpdateInterval,
        requestConfig: requestConfig,
        onCodecSwitch: onCodecSwitch,
        onAudioTracksNotPlayable: onAudioTracksNotPlayable,
        onVideoTracksNotPlayable: onVideoTracksNotPlayable,
        referenceDateTime: options.referenceDateTime,
        representationFilter: options.representationFilter,
        segmentLoader: options.segmentLoader,
        serverSyncInfos: options.serverSyncInfos,
        startAt: startAt,
        textTrackElement: textTrackElement,
        textTrackMode: textTrackMode,
        transport: transport,
        mode: mode,
        url: url,
        cmcd: options.cmcd,
        experimentalOptions: {
            enableRepresentationAvoidance: ((_e = options.experimentalOptions) === null || _e === void 0 ? void 0 : _e.enableRepresentationAvoidance) === true,
        },
    };
}
