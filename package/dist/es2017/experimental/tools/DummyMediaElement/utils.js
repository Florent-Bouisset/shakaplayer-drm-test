import { insertInto, keepRangeIntersection } from "../../../utils/ranges";
export class EventScheduler {
    constructor() {
        this._scheduled = [];
    }
    schedule(obj, evtName, cancelSignal) {
        return new Promise((res, rej) => {
            /* eslint-disable */
            this._scheduled.push({
                resolve: res,
                reject: rej,
                obj: obj,
                evtName: evtName,
                cancelSignal: cancelSignal !== null && cancelSignal !== void 0 ? cancelSignal : null,
            });
            /* eslint-enable */
            if (this._scheduled.length === 1) {
                this._start();
            }
        });
    }
    _start() {
        var _a;
        const elt = this._scheduled[0];
        if (elt === undefined) {
            return;
        }
        /* eslint-disable */
        let timeout;
        timeout = setTimeout(() => {
            const { evtName, obj } = elt;
            timeout = null;
            const event = new Event(evtName);
            const handlerFnName = `on${evtName}`;
            if (obj[handlerFnName] !== null) {
                try {
                    obj[handlerFnName](event);
                }
                catch (e) {
                    // nothing
                }
            }
            timeout = setTimeout(() => {
                timeout = null;
                obj.trigger(evtName, event);
                const index = this._scheduled.indexOf(elt);
                if (index >= 0) {
                    this._scheduled.splice(index, 1);
                }
                elt.resolve();
                this._start();
            }, 0);
        }, 0);
        /* eslint-enable */
        (_a = elt.cancelSignal) === null || _a === void 0 ? void 0 : _a.register((err) => {
            if (timeout !== null) {
                clearTimeout(timeout);
                timeout = null;
            }
            const index = this._scheduled.indexOf(elt);
            if (index >= 0) {
                this._scheduled.splice(index, 1);
            }
            elt.reject(err);
            this._start();
        });
    }
}
/**
 * Simulate TimeRanges as returned by SourceBuffer.prototype.buffered.
 * Add an "insert" and "remove" methods to manually update it.
 * @class TimeRangesWithMetadata
 */
export default class TimeRangesWithMetadata {
    constructor() {
        this._ranges = [];
        this._rangesWithMetadata = [];
        this.length = 0;
    }
    insert(start, end, info) {
        insertInto(this._ranges, { start, end });
        this.length = this._ranges.length;
        insertToMetadataRanges(this._rangesWithMetadata, { start, end, info });
    }
    getMetadataFor(time) {
        for (const element of this._rangesWithMetadata) {
            if (element.start <= time && element.end > time) {
                return element.info;
            }
        }
        return null;
    }
    getRangeFor(time) {
        for (const element of this._rangesWithMetadata) {
            if (element.start <= time && element.end > time) {
                return { start: element.start, end: element.end };
            }
        }
        return null;
    }
    remove(start, end) {
        const rangesToIntersect = [];
        if (start > 0) {
            rangesToIntersect.push({ start: 0, end: start });
        }
        if (end < Infinity) {
            rangesToIntersect.push({ start: end, end: Infinity });
        }
        this._ranges = keepRangeIntersection(this._ranges, rangesToIntersect);
        this.length = this._ranges.length;
        for (let i = 0; i < this._rangesWithMetadata.length; i++) {
            const element = this._rangesWithMetadata[i];
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
                    const oldEnd = element.end;
                    element.end = start;
                    const nextElement = {
                        start: end,
                        end: oldEnd,
                        info: element.info,
                    };
                    this._rangesWithMetadata.splice(i + 1, 0, nextElement);
                    return;
                }
            }
        }
    }
    start(index) {
        if (index >= this._ranges.length) {
            throw new Error("INDEX_SIZE_ERROR");
        }
        return this._ranges[index].start;
    }
    end(index) {
        if (index >= this._ranges.length) {
            throw new Error("INDEX_SIZE_ERROR");
        }
        return this._ranges[index].end;
    }
}
function insertToMetadataRanges(ranges, element) {
    const { start, end } = element;
    if (start >= end) {
        return;
    }
    // begin by the end as in most use cases this will be faster
    for (let i = ranges.length - 1; i >= 0; i--) {
        const elementI = ranges[i];
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
                ranges.splice(i + 1, 0, Object.assign({}, element));
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
                        const nextElement = {
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
    const firstElement = ranges[0];
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
