"use strict";
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
exports.default = createThumbnailFetcher;
var config_1 = require("../../../config");
var errors_1 = require("../../../errors");
var log_1 = require("../../../log");
var array_find_1 = require("../../../utils/array_find");
var object_assign_1 = require("../../../utils/object_assign");
var task_canceller_1 = require("../../../utils/task_canceller");
var error_selector_1 = require("../utils/error_selector");
var schedule_request_1 = require("../utils/schedule_request");
/**
 * Create an `IThumbnailFetcher` object which will allow to easily fetch and parse
 * segments.
 * An `IThumbnailFetcher` also implements a retry mechanism, based on the given
 * `requestOptions` argument, which may retry a segment request when it fails.
 *
 * @param {Object} pipeline
 * @param {Object|null} cdnPrioritizer
 * @returns {Function}
 */
function createThumbnailFetcher(
/** The transport-specific logic allowing to load thumbnails. */
pipeline, 
/**
 * Abstraction allowing to synchronize, update and keep track of the
 * priorization of the CDN to use to load any given segment, in cases where
 * multiple ones are available.
 *
 * Can be set to `null` in which case a minimal priorization logic will be used
 * instead.
 */
cdnPrioritizer) {
    var loadThumbnail = pipeline.loadThumbnail;
    // We store information on pending requests, as often the same thumbnail is
    // requested many times in a row (due to e.g. the mouse cursor rapidly moving
    // on the seek bar).
    // So `pendingRequestsInfo` contains metadata on the pending thumbnail request
    // if one or else `null`.
    var pendingRequestsInfo = [];
    /**
     * Fetch a specific thumbnail.
     * @param {Object} thumbnailContext
     * @param {Object} cancellationSignal
     * @returns {Promise}
     */
    return function fetchThumbnail(thumbnailContext, cancellationSignal) {
        return __awaiter(this, void 0, void 0, function () {
            function doFetch() {
                return __awaiter(this, void 0, void 0, function () {
                    var res, err_3, parsed;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                log_1.default.debug("Thumbnails", "Beginning thumbnail request", { time: thumbnail.time });
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 3, , 4]);
                                return [4 /*yield*/, (0, schedule_request_1.scheduleRequestWithCdns)(thumbnailTrack.cdnMetadata, cdnPrioritizer, callLoaderWithUrl, (0, object_assign_1.default)({ onRetry: onRetry }, requestOptions), requestCanceller.signal)];
                            case 2:
                                res = _a.sent();
                                if (cancellationSignal.isCancelled()) {
                                    return [2 /*return*/, Promise.reject(cancellationSignal.cancellationError)];
                                }
                                log_1.default.debug("Thumbnails", "Thumbnail request ended with success", {
                                    time: thumbnail.time,
                                });
                                cancellationSignal.deregister(onCancellation);
                                return [3 /*break*/, 4];
                            case 3:
                                err_3 = _a.sent();
                                cancellationSignal.deregister(onCancellation);
                                if (err_3 instanceof task_canceller_1.CancellationError) {
                                    log_1.default.debug("Thumbnails", "Thumbnail request aborted", { time: thumbnail.time });
                                    throw err_3;
                                }
                                log_1.default.debug("Thumbnails", "Thumbnail request failed", { time: thumbnail.time });
                                throw (0, error_selector_1.default)(err_3);
                            case 4:
                                try {
                                    parsed = pipeline.parseThumbnail(res.responseData, {
                                        thumbnail: thumbnail,
                                        thumbnailTrack: thumbnailTrack,
                                    });
                                    return [2 /*return*/, parsed];
                                }
                                catch (error) {
                                    throw (0, errors_1.formatError)(error, {
                                        defaultCode: "PIPELINE_PARSE_ERROR",
                                        defaultReason: "Unknown parsing error",
                                    });
                                }
                                return [2 /*return*/];
                        }
                    });
                });
            }
            function onCancellation() {
                log_1.default.debug("Thumbnails", "Thumbnail request cancelled", { time: thumbnail.time });
                var requestIdx = pendingRequestsInfo.indexOf(currRequestInfo);
                if (requestIdx < 0) {
                    return;
                }
                pendingRequestsInfo[requestIdx].referenceCount--;
                if (pendingRequestsInfo[requestIdx].referenceCount <= 0) {
                    requestCanceller.cancel();
                    pendingRequestsInfo.splice(requestIdx, 1);
                }
            }
            /**
             * Call a segment loader for the given URL with the right arguments.
             * @param {Object|null} cdnMetadata
             * @returns {Promise}
             */
            function callLoaderWithUrl(cdnMetadata) {
                return loadThumbnail(cdnMetadata, thumbnail, pipelineRequestOptions, cancellationSignal);
            }
            /**
             * Function called when the function request is retried.
             * @param {*} err
             */
            function onRetry(err) {
                var formattedErr = (0, error_selector_1.default)(err);
                log_1.default.warn("Thumbnails", "Thumbnail request retry ", {
                    time: thumbnail.time,
                }, formattedErr);
            }
            var currRequestInfo, pendingInfo, response, err_1, thumbnail, thumbnailTrack, requestOptions, connectionTimeout, pipelineRequestOptions, requestCanceller, fetchPromise, clearRequestInfo, fetchResult, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cancellationSignal.register(onCancellation);
                        pendingInfo = (0, array_find_1.default)(pendingRequestsInfo, function (_a) {
                            var pCtxt = _a.thumbnailContext;
                            return (pCtxt.period.id === thumbnailContext.period.id &&
                                pCtxt.track.id === thumbnailContext.track.id &&
                                pCtxt.segment.id === thumbnailContext.segment.id);
                        });
                        if (!(pendingInfo !== undefined)) return [3 /*break*/, 5];
                        log_1.default.debug("Thumbnails", "Requesting same thumbnail than the pending one", {
                            time: thumbnailContext.segment.time,
                        });
                        currRequestInfo = pendingInfo;
                        currRequestInfo.referenceCount++;
                        response = void 0;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, currRequestInfo.promise];
                    case 2:
                        response = _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        cancellationSignal.deregister(onCancellation);
                        throw err_1;
                    case 4:
                        cancellationSignal.deregister(onCancellation);
                        return [2 /*return*/, response];
                    case 5:
                        thumbnail = thumbnailContext.segment, thumbnailTrack = thumbnailContext.track;
                        requestOptions = getThumbnailFetcherRequestOptions({});
                        if (requestOptions.connectionTimeout === undefined ||
                            requestOptions.connectionTimeout < 0) {
                            connectionTimeout = undefined;
                        }
                        else {
                            connectionTimeout = requestOptions.connectionTimeout;
                        }
                        pipelineRequestOptions = {
                            timeout: requestOptions.requestTimeout < 0 ? undefined : requestOptions.requestTimeout,
                            connectionTimeout: connectionTimeout,
                            cmcdPayload: undefined,
                        };
                        requestCanceller = new task_canceller_1.default();
                        fetchPromise = doFetch();
                        currRequestInfo = {
                            thumbnailContext: thumbnailContext,
                            promise: fetchPromise,
                            referenceCount: 1,
                        };
                        pendingRequestsInfo.push(currRequestInfo);
                        clearRequestInfo = function () {
                            var currRequestIdx = pendingRequestsInfo.indexOf(currRequestInfo);
                            if (currRequestIdx >= 0) {
                                pendingRequestsInfo.splice(currRequestIdx, 1);
                            }
                        };
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, fetchPromise];
                    case 7:
                        fetchResult = _a.sent();
                        clearRequestInfo();
                        return [2 /*return*/, fetchResult];
                    case 8:
                        err_2 = _a.sent();
                        clearRequestInfo();
                        throw err_2;
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
}
/**
 * @param {Object} baseOptions
 * @returns {Object}
 */
function getThumbnailFetcherRequestOptions(_a) {
    var maxRetry = _a.maxRetry, requestTimeout = _a.requestTimeout, connectionTimeout = _a.connectionTimeout;
    var _b = config_1.default.getCurrent(), DEFAULT_MAX_THUMBNAIL_REQUESTS_RETRY_ON_ERROR = _b.DEFAULT_MAX_THUMBNAIL_REQUESTS_RETRY_ON_ERROR, DEFAULT_THUMBNAIL_REQUEST_TIMEOUT = _b.DEFAULT_THUMBNAIL_REQUEST_TIMEOUT, DEFAULT_THUMBNAIL_CONNECTION_TIMEOUT = _b.DEFAULT_THUMBNAIL_CONNECTION_TIMEOUT, INITIAL_BACKOFF_DELAY_BASE = _b.INITIAL_BACKOFF_DELAY_BASE, MAX_BACKOFF_DELAY_BASE = _b.MAX_BACKOFF_DELAY_BASE;
    return {
        maxRetry: maxRetry !== null && maxRetry !== void 0 ? maxRetry : DEFAULT_MAX_THUMBNAIL_REQUESTS_RETRY_ON_ERROR,
        baseDelay: INITIAL_BACKOFF_DELAY_BASE.REGULAR,
        maxDelay: MAX_BACKOFF_DELAY_BASE.REGULAR,
        requestTimeout: requestTimeout === undefined ? DEFAULT_THUMBNAIL_REQUEST_TIMEOUT : requestTimeout,
        connectionTimeout: connectionTimeout === undefined
            ? DEFAULT_THUMBNAIL_CONNECTION_TIMEOUT
            : connectionTimeout,
    };
}
