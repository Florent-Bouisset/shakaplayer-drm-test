"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = renderThumbnail;
var errors_1 = require("../errors");
var error_message_1 = require("../errors/error_message");
var manifest_1 = require("../manifest");
var array_find_1 = require("../utils/array_find");
var array_find_index_1 = require("../utils/array_find_index");
var task_canceller_1 = require("../utils/task_canceller");
/**
 * Render thumbnail available at `time` in the given `container` (in place of
 * a potential previously-rendered thumbnail in that container).
 *
 * If there is no thumbnail at this time, or if there is but it fails to
 * load/render, also removes the previously displayed thumbnail, unless
 * `options.keepPreviousThumbnailOnError` is set to `true`.
 *
 * Returns a Promise which resolves when the thumbnail is rendered successfully,
 * rejects if anything prevented a thumbnail to be rendered.
 *
 * A newer `renderThumbnail` call performed while a previous `renderThumbnail`
 * call on the same container did not yet finish will abort that previous call,
 * rejecting the old call's returned promise.
 *
 * You may know if the promise returned by `renderThumbnail` rejected due to it
 * being aborted, by checking the `code` property on the rejected error: Error
 * due to aborting have their `code` property set to `ABORTED`.
 *
 * @param {Object} contentInfos
 * @param {Object} options
 * @returns {Object}
 */
function renderThumbnail(contentInfos, options) {
    return __awaiter(this, void 0, void 0, function () {
        function clearPreviousThumbnails() {
            for (var i = container.children.length - 1; i >= 0; i--) {
                var child = container.children[i];
                if (child.className === "__rx-thumbnail__") {
                    container.removeChild(child);
                }
            }
        }
        var time, container, thumbnailRequestsInfo, currentContentCanceller, canceller, unlinkCanceller, imageUrl, olderTaskSameContainer, onFinished, period, thumbnailTracks, thumbnailTrack, lastResponse, res_1, previousThumbs, canvas_1, context_1, foundIdx_1, image_1, blob, srcError_1, error, formattedErr, returnedError;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    time = options.time, container = options.container;
                    if (contentInfos === null ||
                        contentInfos.fetchThumbnailDataCallback === null ||
                        contentInfos.manifest === null) {
                        return [2 /*return*/, Promise.reject(new ThumbnailRenderingError("NO_CONTENT", "Cannot get thumbnail: no content loaded"))];
                    }
                    thumbnailRequestsInfo = contentInfos.thumbnailRequestsInfo, currentContentCanceller = contentInfos.currentContentCanceller;
                    canceller = new task_canceller_1.default();
                    unlinkCanceller = canceller.linkToSignal(currentContentCanceller.signal);
                    olderTaskSameContainer = thumbnailRequestsInfo.pendingRequests.get(container);
                    olderTaskSameContainer === null || olderTaskSameContainer === void 0 ? void 0 : olderTaskSameContainer.cancel();
                    thumbnailRequestsInfo.pendingRequests.set(container, canceller);
                    onFinished = function () {
                        unlinkCanceller();
                        canceller.cancel();
                        thumbnailRequestsInfo.pendingRequests.delete(container);
                        // Let's revoke the URL after a round-trip to the event loop just in case
                        // to prevent revoking before the browser use it.
                        // This is normally not necessary, but better safe than sorry.
                        setTimeout(function () {
                            if (imageUrl !== undefined) {
                                URL.revokeObjectURL(imageUrl);
                            }
                        }, 0);
                    };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    period = (0, manifest_1.getPeriodForTime)(contentInfos.manifest, time);
                    if (period === undefined) {
                        throw new ThumbnailRenderingError("NO_THUMBNAIL", "Wanted Period not found.");
                    }
                    thumbnailTracks = period.thumbnailTracks;
                    thumbnailTrack = options.thumbnailTrackId !== undefined
                        ? (0, array_find_1.default)(thumbnailTracks, function (t) { return t.id === options.thumbnailTrackId; })
                        : thumbnailTracks[0];
                    if (thumbnailTrack === undefined) {
                        if (options.thumbnailTrackId !== undefined) {
                            throw new ThumbnailRenderingError("NO_THUMBNAIL", "Given `thumbnailTrackId` not found");
                        }
                        else {
                            throw new ThumbnailRenderingError("NO_THUMBNAIL", "Wanted Period has no thumbnail track.");
                        }
                    }
                    lastResponse = thumbnailRequestsInfo.lastResponse;
                    if (lastResponse !== null &&
                        lastResponse.thumbnailTrackId === thumbnailTrack.id &&
                        lastResponse.periodId === period.id) {
                        previousThumbs = lastResponse.response.thumbnails;
                        if (previousThumbs.length > 0 &&
                            time >= previousThumbs[0].start &&
                            time < previousThumbs[previousThumbs.length - 1].end) {
                            res_1 = lastResponse.response;
                        }
                    }
                    if (!(res_1 === undefined)) return [3 /*break*/, 3];
                    return [4 /*yield*/, contentInfos.fetchThumbnailDataCallback(period.id, thumbnailTrack.id, time)];
                case 2:
                    res_1 = _a.sent();
                    thumbnailRequestsInfo.lastResponse = {
                        response: res_1,
                        periodId: period.id,
                        thumbnailTrackId: thumbnailTrack.id,
                    };
                    _a.label = 3;
                case 3:
                    if (canceller.signal.cancellationError !== null) {
                        throw canceller.signal.cancellationError;
                    }
                    canvas_1 = document.createElement("canvas");
                    context_1 = canvas_1.getContext("2d");
                    if (context_1 === null) {
                        throw new ThumbnailRenderingError("RENDERING", "Cannot display thumbnail: cannot create canvas context");
                    }
                    foundIdx_1 = (0, array_find_index_1.default)(res_1.thumbnails, function (t) {
                        return t.start <= time && t.end > time;
                    });
                    if (foundIdx_1 < 0) {
                        throw new Error("Cannot display thumbnail: time not found in fetched data");
                    }
                    image_1 = new Image();
                    blob = new Blob([res_1.data], { type: res_1.mimeType });
                    imageUrl = URL.createObjectURL(blob);
                    image_1.src = imageUrl;
                    canvas_1.height = res_1.thumbnails[foundIdx_1].height;
                    canvas_1.width = res_1.thumbnails[foundIdx_1].width;
                    return [2 /*return*/, new Promise(function (resolve, reject) {
                            image_1.onload = function () {
                                if (canceller.signal.cancellationError !== null) {
                                    reject(canceller.signal.cancellationError);
                                    onFinished();
                                    return;
                                }
                                try {
                                    context_1.drawImage(image_1, res_1.thumbnails[foundIdx_1].offsetX, res_1.thumbnails[foundIdx_1].offsetY, res_1.thumbnails[foundIdx_1].width, res_1.thumbnails[foundIdx_1].height, 0, 0, res_1.thumbnails[foundIdx_1].width, res_1.thumbnails[foundIdx_1].height);
                                    canvas_1.style.width = "100%";
                                    canvas_1.style.height = "100%";
                                    canvas_1.className = "__rx-thumbnail__";
                                    clearPreviousThumbnails();
                                    container.appendChild(canvas_1);
                                    resolve();
                                }
                                catch (srcError) {
                                    reject(new ThumbnailRenderingError("RENDERING", "Could not draw the image in a canvas:" +
                                        (srcError instanceof Error ? srcError.toString() : "Unknown Error")));
                                }
                                onFinished();
                            };
                            image_1.onerror = function () {
                                if (canceller.signal.cancellationError !== null) {
                                    reject(canceller.signal.cancellationError);
                                    onFinished();
                                    return;
                                }
                                if (options.keepPreviousThumbnailOnError !== true) {
                                    clearPreviousThumbnails();
                                }
                                reject(new ThumbnailRenderingError("RENDERING", "Could not load the corresponding image in the DOM"));
                                onFinished();
                            };
                        })];
                case 4:
                    srcError_1 = _a.sent();
                    if (options.keepPreviousThumbnailOnError !== true) {
                        clearPreviousThumbnails();
                    }
                    if (srcError_1 !== null && srcError_1 === canceller.signal.cancellationError) {
                        error = new ThumbnailRenderingError("ABORTED", "Thumbnail rendering has been aborted");
                        throw error;
                    }
                    formattedErr = (0, errors_1.formatError)(srcError_1, {
                        defaultCode: "NONE",
                        defaultReason: "Unknown error",
                    });
                    returnedError = void 0;
                    if (formattedErr.type === "NETWORK_ERROR") {
                        returnedError = new ThumbnailRenderingError("LOADING", formattedErr.message);
                    }
                    else {
                        returnedError = new ThumbnailRenderingError("NOT_FOUND", formattedErr.message);
                    }
                    onFinished();
                    throw returnedError;
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Error specifcically defined for the thumbnail rendering API.
 * A caller is then supposed to programatically classify the type of error
 * by checking the `code` property from such an error.
 * @class ThumbnailRenderingError
 */
var ThumbnailRenderingError = /** @class */ (function (_super) {
    __extends(ThumbnailRenderingError, _super);
    /**
     * @param {string} code
     * @param {string} message
     */
    function ThumbnailRenderingError(code, message) {
        var _this = _super.call(this, (0, error_message_1.default)(code, message)) || this;
        Object.setPrototypeOf(_this, ThumbnailRenderingError.prototype);
        _this.name = "ThumbnailRenderingError";
        _this.code = code;
        return _this;
    }
    return ThumbnailRenderingError;
}(Error));
