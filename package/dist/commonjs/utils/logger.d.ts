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
import EventEmitter from "./event_emitter";
export type ILoggerLevel = "NONE" | "ERROR" | "WARNING" | "INFO" | "DEBUG";
export type ILogFormat = "standard" | "full";
type IAcceptedLogValueBase = boolean | string | number | null | undefined;
export type IAcceptedLogValue = IAcceptedLogValueBase | Error | Partial<Record<string, IAcceptedLogValueBase>>;
/**
 * Area of the code the log is linked to.
 *
 * Do not forget to update the corresponding API documentation page. When adding
 * or removing namespaces.
 */
export type ILogNamespace = 
/** Linked to adaptive bitrate quality selection */
"ABR"
/** Linked to the RxPlayer public API. */
 | "API"
/** Linked to the part of the RxPlayer handling audio/video/text track selection. */
 | "Track"
/**
 * Linked to the "Init" logic of the RxPlayer, which between other things set up a
 * new content.
 */
 | "Init"
/**
 * Global handling logic in the "Core" part of the player.
 * The main orchestrator in the RxPlayer's worker-side.
 */
 | "Core"
/** Linked to logic implementing Manifest Fetching. */
 | "MF"
/** Linked to logic implementing Segment Fetching. */
 | "SF"
/** Linked to a generic utils function. */
 | "utils"
/** Linked to CMCD logic. */
 | "CMCD"
/** Heuristics involved in freeze-detection (when the media is stalled unexpectedly). */
 | "Freeze"
/** Linked to the DASH protocol implementation and manifest parsing. */
 | "dash"
/** Linked to the Smooth protocol implementation and manifest parsing. */
 | "smooth"
/** Linked to the MetaPlaylist protocol implementation and manifest parsing. */
 | "metaplaylist"
/** Linked to the exploitation of the `HTMLMediaElement` linked to the RxPlayer. */
 | "media"
/** Linked to the code directly interacting with MSE API, e.g. to append media data. */
 | "mse"
/** Linked to the code handling content decryption, including handling the EME API. */
 | "DRM"
/** "Segment Inventory". Estimates the list of segment currently present in buffers, */
 | "SI"
/** Core RxPlayer logic orchestrating segment fetching and pushing. */
 | "Stream"
/** Linked to the code handling the "Manifest" structure, which describes a content. */
 | "manifest"
/** Linked to the logic parsing ISOBMFF-compatible container files. */
 | "isobmff"
/** Linked to the logic parsing MKV-compatible container files. */
 | "webm"
/** Linked to the logic parsing TTML data, for text tracks. */
 | "ttml"
/** Linked to the logic parsing VTT data, for text tracks. */
 | "vtt"
/** Linked to the logic parsing SRT data, for text tracks. */
 | "srt"
/** Linked to the logic parsing SAMI data, for text tracks. */
 | "sami"
/** Linked to in-stream image thumbnails. */
 | "Thumbnails"
/** Linked to subtitles / text management */
 | "text"
/**
 * Message sent from the RxPlayer's "main" part logic (e.g. the API) to the "Core"
 * internal logic.
 * Both may run in parallel (in "multithreading" mode).
 */
 | "M-->C"
/**
 * Message sent from the RxPlayer's "Core" logic to the "main" logic.
 * Both may run in parallel (in "multithreading" mode).
 */
 | "M<--C"
/** Log from the `MediaCapabilitiesProber` tool. */
 | "MediaCapabilitiesProber"
/** Log from the `VideoThumbnailLoader` tool. */
 | "VideoThumbnailLoader";
type IConsoleFn = (namespace: ILogNamespace, ...args: IAcceptedLogValue[]) => void;
/**
 * Events sent by `Logger` where the keys are the events' name and the values
 * are the corresponding payloads.
 */
interface ILoggerEvents {
    onLogLevelChange: {
        level: ILoggerLevel;
        format: ILogFormat;
    };
}
/**
 * Logger implementation.
 * @class Logger
 */
export default class Logger extends EventEmitter<ILoggerEvents> {
    error: IConsoleFn;
    warn: IConsoleFn;
    info: IConsoleFn;
    debug: IConsoleFn;
    private _currentLevel;
    private _currentFormat;
    private readonly _levels;
    constructor();
    /**
     * Update the logger's level to increase or decrease its verbosity, to change
     * its format with a newly set one, or to update its logging function.
     * @param {string} levelStr - One of the [upper-case] logger level. If the
     * given level is not valid, it will default to `"NONE"`.
     * @param {function|undefined} [logFn] - Optional logger function which will
     * be called with logs (with the corresponding upper-case logger level as
     * first argument).
     * Can be omited to just rely on regular logging functions.
     */
    setLevel(levelStr: string, format: string, logFn?: (levelStr: ILoggerLevel, namespace: string, logs: IAcceptedLogValue[]) => void): void;
    /**
     * Get the last set logger level, as an upper-case string value.
     * @returns {string}
     */
    getLevel(): ILoggerLevel;
    /**
     * Get the last set logger's log format.
     * @returns {string}
     */
    getFormat(): ILogFormat;
    /**
     * Returns `true` if the currently set level includes logs of the level given
     * in argument.
     * @param {string} logLevel
     * @returns {boolean}
     */
    hasLevel(logLevel: ILoggerLevel): boolean;
}
export {};
//# sourceMappingURL=logger.d.ts.map