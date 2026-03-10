"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
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
var errors_1 = require("../../errors");
var array_find_1 = require("../../utils/array_find");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var utils_1 = require("../utils");
var adaptation_1 = require("./adaptation");
/**
 * Class representing the tracks and qualities available from a given time
 * period in the the Manifest.
 * @class Period
 */
var Period = /** @class */ (function () {
    /**
     * @constructor
     * @param {Object} args
     * @param {function|undefined} [representationFilter]
     */
    function Period(args, cachedCodecSupport, representationFilter) {
        this.id = args.id;
        this.adaptations = createAdaptationsObject(args.adaptations, cachedCodecSupport, representationFilter);
        if (isArrayEmpty(this.adaptations.video) && isArrayEmpty(this.adaptations.audio)) {
            throw new errors_1.MediaError("MANIFEST_PARSE_ERROR", "The manifest has no video nor audio tracks.");
        }
        this.thumbnailTracks = args.thumbnailTracks.map(function (thumbnailTrack) { return ({
            id: thumbnailTrack.id,
            mimeType: thumbnailTrack.mimeType,
            index: thumbnailTrack.index,
            cdnMetadata: thumbnailTrack.cdnMetadata,
            height: thumbnailTrack.height,
            width: thumbnailTrack.width,
            horizontalTiles: thumbnailTrack.horizontalTiles,
            verticalTiles: thumbnailTrack.verticalTiles,
            start: thumbnailTrack.start,
            end: thumbnailTrack.end,
            tileDuration: thumbnailTrack.tileDuration,
        }); });
        this.duration = args.duration;
        this.start = args.start;
        if (!(0, is_null_or_undefined_1.default)(this.duration) && !(0, is_null_or_undefined_1.default)(this.start)) {
            this.end = this.start + this.duration;
        }
        this.streamEvents = args.streamEvents === undefined ? [] : args.streamEvents;
    }
    /**
     * Some environments (e.g. in a WebWorker) may not have the capability to know
     * if a mimetype+codec combination is supported on the current platform.
     *
     * Calling `refreshCodecSupport` manually once the codecs supported are known
     * by the current environnement allows to work-around this issue.
     *
     * @param {Array.<Object>} unsupportedAdaptations - Array on which
     * `Adaptation`s objects which are now known to have no supported
     * `Representation` will be pushed.
     * This array might be useful for minor error reporting.
     * @param {Array.<Object>} cachedCodecSupport
     */
    Period.prototype.refreshCodecSupport = function (unsupportedAdaptations, cachedCodecSupport) {
        var _this = this;
        Object.keys(this.adaptations).forEach(function (ttype) {
            var e_1, _a;
            var adaptationsForType = _this.adaptations[ttype];
            if (adaptationsForType === undefined) {
                return;
            }
            try {
                for (var adaptationsForType_1 = __values(adaptationsForType), adaptationsForType_1_1 = adaptationsForType_1.next(); !adaptationsForType_1_1.done; adaptationsForType_1_1 = adaptationsForType_1.next()) {
                    var adaptation = adaptationsForType_1_1.value;
                    if (!adaptation.supportStatus.hasCodecWithUndefinedSupport) {
                        // Go to next adaptation as an optimisation measure.
                        // NOTE this only is true if we never change a codec from supported
                        // to unsuported and its opposite.
                        continue;
                    }
                    var wasSupported = adaptation.supportStatus.hasSupportedCodec;
                    adaptation.refreshCodecSupport(cachedCodecSupport);
                    if (wasSupported !== false &&
                        adaptation.supportStatus.hasSupportedCodec === false) {
                        unsupportedAdaptations.push(adaptation);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (adaptationsForType_1_1 && !adaptationsForType_1_1.done && (_a = adaptationsForType_1.return)) _a.call(adaptationsForType_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }, {});
    };
    /**
     * Returns every `Adaptations` (or `tracks`) linked to that Period, in an
     * Array.
     * @returns {Array.<Object>}
     */
    Period.prototype.getAdaptations = function () {
        return (0, utils_1.getAdaptations)(this);
    };
    /**
     * Returns every `Adaptations` (or `tracks`) linked to that Period for a
     * given type.
     * @param {string} adaptationType
     * @returns {Array.<Object>}
     */
    Period.prototype.getAdaptationsForType = function (adaptationType) {
        var adaptationsForType = this.adaptations[adaptationType];
        return adaptationsForType !== null && adaptationsForType !== void 0 ? adaptationsForType : [];
    };
    /**
     * Returns the Adaptation linked to the given ID.
     * @param {number|string} wantedId
     * @returns {Object|undefined}
     */
    Period.prototype.getAdaptation = function (wantedId) {
        return (0, array_find_1.default)(this.getAdaptations(), function (_a) {
            var id = _a.id;
            return wantedId === id;
        });
    };
    /**
     * Returns Adaptations that contain Representations in supported codecs.
     * @param {string|undefined} type - If set filter on a specific Adaptation's
     * type. Will return for all types if `undefined`.
     * @returns {Array.<Adaptation>}
     */
    Period.prototype.getSupportedAdaptations = function (type) {
        return (0, utils_1.getSupportedAdaptations)(this, type);
    };
    /**
     * Returns true if the give time is in the time boundaries of this `Period`.
     * @param {number} time
     * @param {object|null} nextPeriod - Period coming chronologically just
     * after in the same Manifest. `null` if this instance is the last `Period`.
     * @returns {boolean}
     */
    Period.prototype.containsTime = function (time, nextPeriod) {
        return (0, utils_1.periodContainsTime)(this, time, nextPeriod);
    };
    /**
     * Format the current `Period`'s properties into a
     * `IPeriodMetadata` format which can better be communicated through
     * another thread.
     *
     * Please bear in mind however that the returned object will not be updated
     * when the current `Period` instance is updated, it is only a
     * snapshot at the current time.
     *
     * If you want to keep that data up-to-date with the current `Period`
     * instance, you will have to do it yourself.
     *
     * @returns {Object}
     */
    Period.prototype.getMetadataSnapshot = function () {
        var e_2, _a;
        var adaptations = {};
        var baseAdaptations = this.getAdaptations();
        try {
            for (var baseAdaptations_1 = __values(baseAdaptations), baseAdaptations_1_1 = baseAdaptations_1.next(); !baseAdaptations_1_1.done; baseAdaptations_1_1 = baseAdaptations_1.next()) {
                var adaptation = baseAdaptations_1_1.value;
                var currentAdaps = adaptations[adaptation.type];
                if (currentAdaps === undefined) {
                    currentAdaps = [];
                    adaptations[adaptation.type] = currentAdaps;
                }
                currentAdaps.push(adaptation.getMetadataSnapshot());
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (baseAdaptations_1_1 && !baseAdaptations_1_1.done && (_a = baseAdaptations_1.return)) _a.call(baseAdaptations_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return {
            start: this.start,
            end: this.end,
            id: this.id,
            streamEvents: this.streamEvents,
            adaptations: adaptations,
            thumbnailTracks: this.thumbnailTracks.map(function (thumbnailTrack) { return ({
                id: thumbnailTrack.id,
                mimeType: thumbnailTrack.mimeType,
                height: thumbnailTrack.height,
                width: thumbnailTrack.width,
                horizontalTiles: thumbnailTrack.horizontalTiles,
                verticalTiles: thumbnailTrack.verticalTiles,
                start: thumbnailTrack.start,
                end: thumbnailTrack.end,
                tileDuration: thumbnailTrack.tileDuration,
            }); }),
        };
    };
    return Period;
}());
exports.default = Period;
function isArrayEmpty(array) {
    if (!Array.isArray(array)) {
        return true;
    }
    else {
        return array.length === 0;
    }
}
/**
 * Creates an object representing adaptations grouped by track type,
 * from the given parsed adaptations.
 * @param {Object} adaptations
 * @param {Object} cachedCodecSupport
 * @param {Object|undefined}representationFilter
 * @returns {Object}
 */
function createAdaptationsObject(adaptations, cachedCodecSupport, representationFilter) {
    var e_3, _a;
    var manifestAdaptations = {};
    try {
        for (var _b = __values(Object.entries(adaptations)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = __read(_c.value, 2), type = _d[0], adaptationsForType = _d[1];
            if ((0, is_null_or_undefined_1.default)(adaptationsForType)) {
                continue;
            }
            manifestAdaptations[type] = adaptationsForType
                .map(function (adaptation) {
                var newAdaptation = new adaptation_1.default(adaptation, cachedCodecSupport, {
                    representationFilter: representationFilter,
                });
                return newAdaptation;
            })
                .filter(function (adaptation) { return adaptation.representations.length > 0; });
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_3) throw e_3.error; }
    }
    return manifestAdaptations;
}
