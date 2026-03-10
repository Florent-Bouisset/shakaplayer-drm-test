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
exports.EventScheduler = void 0;
var ranges_1 = require("../../../utils/ranges");
var EventScheduler = /** @class */ (function () {
    function EventScheduler() {
        this._scheduled = [];
    }
    EventScheduler.prototype.schedule = function (obj, evtName, cancelSignal) {
        var _this = this;
        return new Promise(function (res, rej) {
            /* eslint-disable */
            _this._scheduled.push({
                resolve: res,
                reject: rej,
                obj: obj,
                evtName: evtName,
                cancelSignal: cancelSignal !== null && cancelSignal !== void 0 ? cancelSignal : null,
            });
            /* eslint-enable */
            if (_this._scheduled.length === 1) {
                _this._start();
            }
        });
    };
    EventScheduler.prototype._start = function () {
        var _this = this;
        var _a;
        var elt = this._scheduled[0];
        if (elt === undefined) {
            return;
        }
        /* eslint-disable */
        var timeout;
        timeout = setTimeout(function () {
            var evtName = elt.evtName, obj = elt.obj;
            timeout = null;
            var event = new Event(evtName);
            var handlerFnName = "on".concat(evtName);
            if (obj[handlerFnName] !== null) {
                try {
                    obj[handlerFnName](event);
                }
                catch (e) {
                    // nothing
                }
            }
            timeout = setTimeout(function () {
                timeout = null;
                obj.trigger(evtName, event);
                var index = _this._scheduled.indexOf(elt);
                if (index >= 0) {
                    _this._scheduled.splice(index, 1);
                }
                elt.resolve();
                _this._start();
            }, 0);
        }, 0);
        /* eslint-enable */
        (_a = elt.cancelSignal) === null || _a === void 0 ? void 0 : _a.register(function (err) {
            if (timeout !== null) {
                clearTimeout(timeout);
                timeout = null;
            }
            var index = _this._scheduled.indexOf(elt);
            if (index >= 0) {
                _this._scheduled.splice(index, 1);
            }
            elt.reject(err);
            _this._start();
        });
    };
    return EventScheduler;
}());
exports.EventScheduler = EventScheduler;
/**
 * Simulate TimeRanges as returned by SourceBuffer.prototype.buffered.
 * Add an "insert" and "remove" methods to manually update it.
 * @class TimeRangesWithMetadata
 */
var TimeRangesWithMetadata = /** @class */ (function () {
    function TimeRangesWithMetadata() {
        this._ranges = [];
        this._rangesWithMetadata = [];
        this.length = 0;
    }
    TimeRangesWithMetadata.prototype.insert = function (start, end, info) {
        (0, ranges_1.insertInto)(this._ranges, { start: start, end: end });
        this.length = this._ranges.length;
        insertToMetadataRanges(this._rangesWithMetadata, { start: start, end: end, info: info });
    };
    TimeRangesWithMetadata.prototype.getMetadataFor = function (time) {
        var e_1, _a;
        try {
            for (var _b = __values(this._rangesWithMetadata), _c = _b.next(); !_c.done; _c = _b.next()) {
                var element = _c.value;
                if (element.start <= time && element.end > time) {
                    return element.info;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return null;
    };
    TimeRangesWithMetadata.prototype.getRangeFor = function (time) {
        var e_2, _a;
        try {
            for (var _b = __values(this._rangesWithMetadata), _c = _b.next(); !_c.done; _c = _b.next()) {
                var element = _c.value;
                if (element.start <= time && element.end > time) {
                    return { start: element.start, end: element.end };
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return null;
    };
    TimeRangesWithMetadata.prototype.remove = function (start, end) {
        var rangesToIntersect = [];
        if (start > 0) {
            rangesToIntersect.push({ start: 0, end: start });
        }
        if (end < Infinity) {
            rangesToIntersect.push({ start: end, end: Infinity });
        }
        this._ranges = (0, ranges_1.keepRangeIntersection)(this._ranges, rangesToIntersect);
        this.length = this._ranges.length;
        for (var i = 0; i < this._rangesWithMetadata.length; i++) {
            var element = this._rangesWithMetadata[i];
            if (element.end > start) {
                if (element.start >= end) {
                    // Our element is after:
                    //
                    // Case 1:
                    // element  :      |=======|
                    // removing : |====|
                    //
                    // Case 2:
                    // element  :         |=======|
                    // removing : |====|
                    return;
                }
                if (element.end <= end) {
                    if (element.start >= start) {
                        // Our element is totally included:
                        //
                        // Case 1:
                        // element  :  |=======|
                        // removing :  |=======|
                        //
                        // Case 2:
                        // element  :  |=======|
                        // removing :  |=========|
                        //
                        // Case 3:
                        // element  :  |=======|
                        // removing : |=========|
                        //
                        // Case 4:
                        // element  :  |=======|
                        // removing : |========|
                        this._rangesWithMetadata.splice(i, 1);
                        i--;
                    }
                    else {
                        // Our element starts before:
                        //
                        // Case 1:
                        // element  :  |=======|
                        // removing :    |=====|
                        // result   :  |=|
                        //
                        // Case 2:
                        // element  :  |=======|
                        // removing :      |=====|
                        // result   :  |===|
                        element.end = start;
                    }
                }
                else if (element.start >= start) {
                    // Our element just ends after
                    //
                    // Case 1:
                    // element  :   |==========|
                    // removing : |=======|
                    // result   :         |====|
                    //
                    // Case 2:
                    // element  : |============|
                    // removing : |=========|
                    // result   :           |==|
                    element.start = end;
                    return;
                }
                else {
                    // Case 1:
                    // element  : |=============|
                    // removing :     |====|
                    // result   : |===|    |====|
                    var oldEnd = element.end;
                    element.end = start;
                    var nextElement = {
                        start: end,
                        end: oldEnd,
                        info: element.info,
                    };
                    this._rangesWithMetadata.splice(i + 1, 0, nextElement);
                    return;
                }
            }
        }
    };
    TimeRangesWithMetadata.prototype.start = function (index) {
        if (index >= this._ranges.length) {
            throw new Error("INDEX_SIZE_ERROR");
        }
        return this._ranges[index].start;
    };
    TimeRangesWithMetadata.prototype.end = function (index) {
        if (index >= this._ranges.length) {
            throw new Error("INDEX_SIZE_ERROR");
        }
        return this._ranges[index].end;
    };
    return TimeRangesWithMetadata;
}());
exports.default = TimeRangesWithMetadata;
function insertToMetadataRanges(ranges, element) {
    var start = element.start, end = element.end;
    if (start >= end) {
        return;
    }
    // begin by the end as in most use cases this will be faster
    for (var i = ranges.length - 1; i >= 0; i--) {
        var elementI = ranges[i];
        if (elementI.start <= start) {
            if (elementI.end <= start) {
                // our element is after, push it after this one
                //
                // Case 1:
                //   prevElement : |------|
                //   element     :        |======|
                //   ===>        : |------|======|
                //
                // Case 2:
                //   prevElement : |------|
                //   element     :          |======|
                //   ===>        : |------| |======|
                ranges.splice(i + 1, 0, __assign({}, element));
                i += 2; // Go to element immediately after element
                while (i < ranges.length && ranges[i].start < element.end) {
                    if (ranges[i].end > element.end) {
                        ranges[i].start = element.end;
                        return;
                    }
                    // The next element was completely contained in element.
                    // Remove it.
                    //
                    // Case 1:
                    //   prevElement : |------|
                    //   element     :        |======|
                    //   nextElement :          |---|
                    //   ===>        : |------|======|
                    //
                    // Case 2:
                    //   prevElement  : |------|
                    //   element   :        |======|
                    //   nextElement  :          |----|
                    //   ===>         : |------|======|
                    ranges.splice(i, 1);
                }
                return;
            }
            else {
                if (elementI.start === start) {
                    if (elementI.end <= end) {
                        // In those cases, replace
                        //
                        // Case 1:
                        //  prevElement  : |-------|
                        //  element   : |=======|
                        //  ===>         : |=======|
                        //
                        // Case 2:
                        //  prevElement  : |-------|
                        //  element   : |==========|
                        //  ===>         : |==========|
                        ranges.splice(i, 1, element);
                        i += 1; // Go to element immediately after element
                        while (i < ranges.length && ranges[i].start < element.end) {
                            if (ranges[i].end > element.end) {
                                // The next element ends after element.
                                // Mutate the next element.
                                //
                                // Case 1:
                                //   element   : |======|
                                //   nextElement  :      |----|
                                //   ===>         : |======|--|
                                ranges[i].start = element.end;
                                return;
                            }
                            // The next element was completely contained in element.
                            // Remove it.
                            //
                            // Case 1:
                            //   element   : |======|
                            //   nextElement  :   |---|
                            //   ===>         : |======|
                            //
                            // Case 2:
                            //   element   : |======|
                            //   nextElement  :   |----|
                            //   ===>         : |======|
                            ranges.splice(i, 1);
                        }
                        return;
                    }
                    else {
                        // The previous element starts at the same time and finishes
                        // after the new element.
                        // Update the start of the previous element and put the new
                        // element before.
                        //
                        // Case 1:
                        //  prevElement  : |------------|
                        //  element   : |==========|
                        //  ===>         : |==========|-|
                        ranges.splice(i, 0, element);
                        elementI.start = element.end;
                        return;
                    }
                }
                else {
                    if (elementI.end <= element.end) {
                        // our element has a "complex" relation with this one,
                        // update the old one end and add this one after it.
                        //
                        // Case 1:
                        //  prevElement  : |-------|
                        //  element   :    |======|
                        //  ===>         : |--|======|
                        //
                        // Case 2:
                        //  prevElement  : |-------|
                        //  element   :    |====|
                        //  ===>         : |--|====|
                        ranges.splice(i + 1, 0, element);
                        elementI.end = element.start;
                        i += 2; // Go to element immediately after element
                        while (i < ranges.length && ranges[i].start < element.end) {
                            if (ranges[i].end > element.end) {
                                // The next element ends after element.
                                // Mutate the next element.
                                //
                                // Case 1:
                                //   element   : |======|
                                //   nextElement  :      |----|
                                //   ===>         : |======|--|
                                ranges[i].start = element.end;
                                return;
                            }
                            // The next element was completely contained in element.
                            // Remove it.
                            //
                            // Case 1:
                            //   element   : |======|
                            //   nextElement  :   |---|
                            //   ===>         : |======|
                            //
                            // Case 2:
                            //   element   : |======|
                            //   nextElement  :   |----|
                            //   ===>         : |======|
                            ranges.splice(i, 1);
                        }
                        return;
                    }
                    else {
                        // The previous element completely recovers the new element.
                        // Split the previous element into two elements, before and after
                        // the new element.
                        //
                        // Case 1:
                        //  prevElement  : |---------|
                        //  element   :    |====|
                        //  ===>         : |--|====|-|
                        var nextElement = {
                            start: element.end,
                            end: elementI.end,
                            info: elementI.info,
                        };
                        elementI.end = element.start;
                        ranges.splice(i + 1, 0, element);
                        ranges.splice(i + 2, 0, nextElement);
                        return;
                    }
                }
            }
        }
    }
    // if we got here, we are at the first element
    // check bounds of the previous first element
    var firstElement = ranges[0];
    if (firstElement === undefined) {
        // we do not have any element yet
        ranges.push(element);
        return;
    }
    if (firstElement.start >= end) {
        // our element is before, put it before
        //
        // Case 1:
        //  firstElement :      |----|
        //  element   : |====|
        //  ===>         : |====|----|
        //
        // Case 2:
        //  firstElement :        |----|
        //  element   : |====|
        //  ===>         : |====| |----|
        ranges.splice(0, 0, element);
    }
    else if (firstElement.end <= end) {
        // Our segment is bigger, replace the first
        //
        // Case 1:
        //  firstElement :   |---|
        //  element   : |=======|
        //  ===>         : |=======|
        //
        // Case 2:
        //  firstElement :   |-----|
        //  element   : |=======|
        //  ===>         : |=======|
        ranges.splice(0, 1, element);
        while (ranges.length > 1 && ranges[1].start < element.end) {
            if (ranges[1].end > element.end) {
                // The next segment ends after element.
                // Mutate the next segment.
                //
                // Case 1:
                //   element   : |======|
                //   nextElement  :      |----|
                //   ===>         : |======|--|
                ranges[1].start = element.end;
                return;
            }
            // The next segment was completely contained in element.
            // Remove it.
            //
            // Case 1:
            //   element   : |======|
            //   nextElement  :   |---|
            //   ===>         : |======|
            //
            // Case 2:
            //   element   : |======|
            //   nextElement  :   |----|
            //   ===>         : |======|
            ranges.splice(1, 1);
        }
        return;
    }
    else {
        // our segment has a "complex" relation with the first one,
        // update the old one start and add this one before it.
        //
        // Case 1:
        //  firstElement :    |------|
        //  element   : |======|
        //  ===>         : |======|--|
        firstElement.start = end;
        ranges.splice(0, 0, element);
        return;
    }
}
