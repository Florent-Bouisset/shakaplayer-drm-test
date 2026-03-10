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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
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
exports.default = updatePeriodInPlace;
var log_1 = require("../../log");
var array_find_index_1 = require("../../utils/array_find_index");
var types_1 = require("./types");
/**
 * Update oldPeriod attributes with the one from newPeriod (e.g. when updating
 * the Manifest).
 * @param {Object} oldPeriod
 * @param {Object} newPeriod
 * @param {number} updateType
 * @returns {Object}
 */
function updatePeriodInPlace(oldPeriod, newPeriod, updateType) {
    var _a, _b, e_1, _c;
    var res = {
        updatedAdaptations: [],
        removedAdaptations: [],
        addedAdaptations: [],
        updatedThumbnailTracks: [],
        removedThumbnailTracks: [],
        addedThumbnailTracks: [],
    };
    oldPeriod.start = newPeriod.start;
    oldPeriod.end = newPeriod.end;
    oldPeriod.duration = newPeriod.duration;
    oldPeriod.streamEvents = newPeriod.streamEvents;
    var oldThumbnailTracks = oldPeriod.thumbnailTracks;
    var newThumbnailTracks = newPeriod.thumbnailTracks;
    var _loop_1 = function (j) {
        var oldThumbnailTrack = oldThumbnailTracks[j];
        var newThumbnailTrackIdx = (0, array_find_index_1.default)(newThumbnailTracks, function (a) { return a.id === oldThumbnailTrack.id; });
        if (newThumbnailTrackIdx === -1) {
            log_1.default.warn("manifest", 'ThumbnailTrack "' + oldThumbnailTracks[j].id + '" not found when merging.');
            var _d = __read(oldThumbnailTracks.splice(j, 1), 1), removed = _d[0];
            j--;
            res.removedThumbnailTracks.push({
                id: removed.id,
            });
        }
        else {
            var _e = __read(newThumbnailTracks.splice(newThumbnailTrackIdx, 1), 1), newThumbnailTrack = _e[0];
            oldThumbnailTrack.mimeType = newThumbnailTrack.mimeType;
            oldThumbnailTrack.height = newThumbnailTrack.height;
            oldThumbnailTrack.width = newThumbnailTrack.width;
            oldThumbnailTrack.horizontalTiles = newThumbnailTrack.horizontalTiles;
            oldThumbnailTrack.verticalTiles = newThumbnailTrack.verticalTiles;
            oldThumbnailTrack.start = newThumbnailTrack.start;
            oldThumbnailTrack.end = newThumbnailTrack.end;
            oldThumbnailTrack.tileDuration = newThumbnailTrack.tileDuration;
            oldThumbnailTrack.cdnMetadata = newThumbnailTrack.cdnMetadata;
            if (updateType === types_1.MANIFEST_UPDATE_TYPE.Full) {
                oldThumbnailTrack.index._replace(newThumbnailTrack.index);
            }
            else {
                oldThumbnailTrack.index._update(newThumbnailTrack.index);
            }
            res.updatedThumbnailTracks.push({
                id: oldThumbnailTrack.id,
                mimeType: oldThumbnailTrack.mimeType,
                height: oldThumbnailTrack.height,
                width: oldThumbnailTrack.width,
                horizontalTiles: oldThumbnailTrack.horizontalTiles,
                verticalTiles: oldThumbnailTrack.verticalTiles,
                start: oldThumbnailTrack.start,
                end: oldThumbnailTrack.end,
                tileDuration: oldThumbnailTrack.tileDuration,
            });
        }
        out_j_1 = j;
    };
    var out_j_1;
    for (var j = 0; j < oldThumbnailTracks.length; j++) {
        _loop_1(j);
        j = out_j_1;
    }
    if (newThumbnailTracks.length > 0) {
        log_1.default.warn("manifest", "".concat(newThumbnailTracks.length, " new Thumbnail tracks ") + "found when merging.");
        (_a = res.addedThumbnailTracks).push.apply(_a, __spreadArray([], __read(newThumbnailTracks.map(function (t) { return ({
            id: t.id,
            mimeType: t.mimeType,
            height: t.height,
            width: t.width,
            horizontalTiles: t.horizontalTiles,
            verticalTiles: t.verticalTiles,
            start: t.start,
            end: t.end,
            tileDuration: t.tileDuration,
        }); })), false));
        (_b = oldPeriod.thumbnailTracks).push.apply(_b, __spreadArray([], __read(newThumbnailTracks), false));
    }
    var oldAdaptations = oldPeriod.getAdaptations();
    var newAdaptations = newPeriod.getAdaptations();
    var _loop_2 = function (j) {
        var _f;
        var oldAdaptation = oldAdaptations[j];
        var newAdaptationIdx = (0, array_find_index_1.default)(newAdaptations, function (a) { return a.id === oldAdaptation.id; });
        if (newAdaptationIdx === -1) {
            log_1.default.warn("manifest", 'Adaptation "' + oldAdaptations[j].id + '" not found when merging.');
            var _g = __read(oldAdaptations.splice(j, 1), 1), removed = _g[0];
            j--;
            res.removedAdaptations.push({
                id: removed.id,
                trackType: removed.type,
            });
        }
        else {
            var _h = __read(newAdaptations.splice(newAdaptationIdx, 1), 1), newAdaptation = _h[0];
            var updatedRepresentations = [];
            var addedRepresentations = [];
            var removedRepresentations = [];
            res.updatedAdaptations.push({
                adaptation: oldAdaptation.id,
                trackType: oldAdaptation.type,
                updatedRepresentations: updatedRepresentations,
                addedRepresentations: addedRepresentations,
                removedRepresentations: removedRepresentations,
            });
            var oldRepresentations = oldAdaptation.representations;
            var newRepresentations = newAdaptation.representations.slice();
            var _loop_3 = function (k) {
                var oldRepresentation = oldRepresentations[k];
                var newRepresentationIdx = (0, array_find_index_1.default)(newRepresentations, function (representation) { return representation.id === oldRepresentation.id; });
                if (newRepresentationIdx === -1) {
                    log_1.default.warn("manifest", "Representation \"".concat(oldRepresentations[k].id, "\" ") + "not found when merging.");
                    var _j = __read(oldRepresentations.splice(k, 1), 1), removed = _j[0];
                    k--;
                    removedRepresentations.push(removed.id);
                }
                else {
                    var _k = __read(newRepresentations.splice(newRepresentationIdx, 1), 1), newRepresentation = _k[0];
                    updatedRepresentations.push(oldRepresentation.getMetadataSnapshot());
                    oldRepresentation.cdnMetadata = newRepresentation.cdnMetadata;
                    if (updateType === types_1.MANIFEST_UPDATE_TYPE.Full) {
                        oldRepresentation.index._replace(newRepresentation.index);
                    }
                    else {
                        oldRepresentation.index._update(newRepresentation.index);
                    }
                }
                out_k_1 = k;
            };
            var out_k_1;
            for (var k = 0; k < oldRepresentations.length; k++) {
                _loop_3(k);
                k = out_k_1;
            }
            if (newRepresentations.length > 0) {
                log_1.default.warn("manifest", "".concat(newRepresentations.length, " new Representations ") + "found when merging.");
                (_f = oldAdaptation.representations).push.apply(_f, __spreadArray([], __read(newRepresentations), false));
                addedRepresentations.push.apply(addedRepresentations, __spreadArray([], __read(newRepresentations.map(function (r) { return r.getMetadataSnapshot(); })), false));
            }
        }
        out_j_2 = j;
    };
    var out_j_2;
    for (var j = 0; j < oldAdaptations.length; j++) {
        _loop_2(j);
        j = out_j_2;
    }
    if (newAdaptations.length > 0) {
        log_1.default.warn("manifest", "".concat(newAdaptations.length, " new Adaptations ") + "found when merging.");
        try {
            for (var newAdaptations_1 = __values(newAdaptations), newAdaptations_1_1 = newAdaptations_1.next(); !newAdaptations_1_1.done; newAdaptations_1_1 = newAdaptations_1.next()) {
                var adap = newAdaptations_1_1.value;
                var prevAdaps = oldPeriod.adaptations[adap.type];
                if (prevAdaps === undefined) {
                    oldPeriod.adaptations[adap.type] = [adap];
                }
                else {
                    prevAdaps.push(adap);
                }
                res.addedAdaptations.push(adap.getMetadataSnapshot());
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (newAdaptations_1_1 && !newAdaptations_1_1.done && (_c = newAdaptations_1.return)) _c.call(newAdaptations_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    return res;
}
