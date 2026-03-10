import request from "../../utils/request/xhr";
import addQueryString from "../utils/add_query_string";
import byteRange from "../utils/byte_range";
import constructSegmentUrl from "./construct_segment_url";
/**
 * Load thumbnails for DASH content.
 * @param {Object|null} wantedCdn
 * @param {Object} thumbnail
 * @param {Object} options
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export async function loadThumbnail(wantedCdn, thumbnail, options, cancelSignal) {
    var _a, _b;
    const initialUrl = constructSegmentUrl(wantedCdn, thumbnail);
    if (initialUrl === null) {
        return Promise.reject(new Error("Cannot load thumbnail: no URL"));
    }
    const url = ((_a = options.cmcdPayload) === null || _a === void 0 ? void 0 : _a.type) === "query"
        ? addQueryString(initialUrl, options.cmcdPayload.value)
        : initialUrl;
    const cmcdHeaders = ((_b = options.cmcdPayload) === null || _b === void 0 ? void 0 : _b.type) === "headers" ? options.cmcdPayload.value : undefined;
    let headers;
    if (thumbnail.range !== undefined) {
        headers = Object.assign(Object.assign({}, cmcdHeaders), { Range: byteRange(thumbnail.range) });
    }
    else if (cmcdHeaders !== undefined) {
        headers = cmcdHeaders;
    }
    return request({
        url,
        responseType: "arraybuffer",
        headers,
        timeout: options.timeout,
        connectionTimeout: options.connectionTimeout,
        cancelSignal,
    });
}
/**
 * Parse loaded thumbnail data into exploitable thumbnail data and metadata.
 * @param {ArrayBuffer} data - The loaded thumbnail data
 * @param {Object} context
 * @returns {Object}
 */
export function parseThumbnail(data, context) {
    var _a;
    const { thumbnailTrack, thumbnail: wantedThumbnail } = context;
    const height = thumbnailTrack.height / thumbnailTrack.verticalTiles;
    const width = thumbnailTrack.width / thumbnailTrack.horizontalTiles;
    const thumbnails = [];
    const tileDuration = (_a = thumbnailTrack.tileDuration) !== null && _a !== void 0 ? _a : (wantedThumbnail.end - wantedThumbnail.time) /
        (thumbnailTrack.horizontalTiles * thumbnailTrack.verticalTiles);
    let start = wantedThumbnail.time;
    for (let row = 0; row < thumbnailTrack.verticalTiles; row++) {
        for (let column = 0; column < thumbnailTrack.horizontalTiles; column++) {
            thumbnails.push({
                start,
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
        data,
        thumbnails,
    };
}
