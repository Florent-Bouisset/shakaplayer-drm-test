"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.loadThumbnail = loadThumbnail;
exports.parseThumbnail = parseThumbnail;
var xhr_1 = require("../../utils/request/xhr");
var add_query_string_1 = require("../utils/add_query_string");
var byte_range_1 = require("../utils/byte_range");
var construct_segment_url_1 = require("./construct_segment_url");
/**
 * Load thumbnails for DASH content.
 * @param {Object|null} wantedCdn
 * @param {Object} thumbnail
 * @param {Object} options
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
function loadThumbnail(wantedCdn, thumbnail, options, cancelSignal) {
    return __awaiter(this, void 0, void 0, function () {
        var initialUrl, url, cmcdHeaders, headers;
        var _a, _b;
        return __generator(this, function (_c) {
            initialUrl = (0, construct_segment_url_1.default)(wantedCdn, thumbnail);
            if (initialUrl === null) {
                return [2 /*return*/, Promise.reject(new Error("Cannot load thumbnail: no URL"))];
            }
            url = ((_a = options.cmcdPayload) === null || _a === void 0 ? void 0 : _a.type) === "query"
                ? (0, add_query_string_1.default)(initialUrl, options.cmcdPayload.value)
                : initialUrl;
            cmcdHeaders = ((_b = options.cmcdPayload) === null || _b === void 0 ? void 0 : _b.type) === "headers" ? options.cmcdPayload.value : undefined;
            if (thumbnail.range !== undefined) {
                headers = __assign(__assign({}, cmcdHeaders), { Range: (0, byte_range_1.default)(thumbnail.range) });
            }
            else if (cmcdHeaders !== undefined) {
                headers = cmcdHeaders;
            }
            return [2 /*return*/, (0, xhr_1.default)({
                    url: url,
                    responseType: "arraybuffer",
                    headers: headers,
                    timeout: options.timeout,
                    connectionTimeout: options.connectionTimeout,
                    cancelSignal: cancelSignal,
                })];
        });
    });
}
/**
 * Parse loaded thumbnail data into exploitable thumbnail data and metadata.
 * @param {ArrayBuffer} data - The loaded thumbnail data
 * @param {Object} context
 * @returns {Object}
 */
function parseThumbnail(data, context) {
    var _a;
    var thumbnailTrack = context.thumbnailTrack, wantedThumbnail = context.thumbnail;
    var height = thumbnailTrack.height / thumbnailTrack.verticalTiles;
    var width = thumbnailTrack.width / thumbnailTrack.horizontalTiles;
    var thumbnails = [];
    var tileDuration = (_a = thumbnailTrack.tileDuration) !== null && _a !== void 0 ? _a : (wantedThumbnail.end - wantedThumbnail.time) /
        (thumbnailTrack.horizontalTiles * thumbnailTrack.verticalTiles);
    var start = wantedThumbnail.time;
    for (var row = 0; row < thumbnailTrack.verticalTiles; row++) {
        for (var column = 0; column < thumbnailTrack.horizontalTiles; column++) {
            thumbnails.push({
                start: start,
                end: start + tileDuration,
                offsetX: Math.round(column * width),
                offsetY: Math.round(row * height),
                height: Math.floor(height),
                width: Math.floor(width),
            });
            start += tileDuration;
        }
    }
    return {
        mimeType: thumbnailTrack.mimeType,
        data: data,
        thumbnails: thumbnails,
    };
}
