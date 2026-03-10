import log from "../../../../log";
import isNullOrUndefined from "../../../../utils/is_null_or_undefined";
import getMonotonicTimeStamp from "../../../../utils/monotonic_timestamp";
import { SegmentSink, SegmentSinkOperation } from "../types";
/**
 * SegmentSink implementation to add text data, most likely subtitles.
 * @class TextSegmentSink
 */
export default class TextSegmentSink extends SegmentSink {
    /**
     * @param {Object} textDisplayerSender
     */
    constructor(textDisplayerSender) {
        log.debug("Stream", "Creating TextSegmentSink");
        super();
        this.bufferType = "text";
        this._sender = textDisplayerSender;
        this._pendingOperations = [];
        this._sender.reset();
    }
    /**
     * @param {string} uniqueId
     */
    declareInitSegment(uniqueId) {
        log.warn("Stream", "Declaring initialization segment for  Text SegmentSink", {
            uniqueId,
        });
    }
    /**
     * @param {string} uniqueId
     */
    freeInitSegment(uniqueId) {
        log.warn("Stream", "Freeing initialization segment for  Text SegmentSink", {
            uniqueId,
        });
    }
    /**
     * Push text segment to the TextSegmentSink.
     * @param {Object} infos
     * @returns {Promise}
     */
    async pushChunk(infos) {
        const { data } = infos;
        assertChunkIsTextTrackSegmentData(data.chunk);
        // Needed for TypeScript :(
        const promise = this._sender.pushTextData(Object.assign(Object.assign({}, data), { chunk: data.chunk }));
        this._addToOperationQueue(promise, {
            type: SegmentSinkOperation.Push,
            value: infos,
        });
        const ranges = await promise;
        if (infos.inventoryInfos !== null) {
            this._segmentInventory.insertChunk(infos.inventoryInfos, true, getMonotonicTimeStamp());
        }
        this._segmentInventory.synchronizeBuffered(ranges);
        return ranges;
    }
    /**
     * Remove buffered data.
     * @param {number} start - start position, in seconds
     * @param {number} end - end position, in seconds
     * @returns {Promise}
     */
    async removeBuffer(start, end) {
        const promise = this._sender.remove(start, end);
        this._addToOperationQueue(promise, {
            type: SegmentSinkOperation.Remove,
            value: { start, end },
        });
        const ranges = await promise;
        this._segmentInventory.synchronizeBuffered(ranges);
        return ranges;
    }
    /**
     * @param {Object} infos
     * @returns {Promise}
     */
    async signalSegmentComplete(infos) {
        if (this._pendingOperations.length > 0) {
            // Only validate after preceding operation
            const { promise } = this._pendingOperations[this._pendingOperations.length - 1];
            this._addToOperationQueue(promise, {
                type: SegmentSinkOperation.SignalSegmentComplete,
                value: infos,
            });
            try {
                await promise;
            }
            catch (_) {
                // We don't really care of what happens of the preceding operation here
            }
        }
        this._segmentInventory.completeSegment(infos);
    }
    /**
     * @returns {Array.<Object>}
     */
    getPendingOperations() {
        return this._pendingOperations.map((p) => p.operation);
    }
    dispose() {
        log.debug("Stream", "Disposing TextSegmentSink");
        this._sender.reset();
    }
    _addToOperationQueue(promise, operation) {
        const queueObject = { operation, promise };
        this._pendingOperations.push(queueObject);
        const endOperation = () => {
            const indexOf = this._pendingOperations.indexOf(queueObject);
            if (indexOf >= 0) {
                this._pendingOperations.splice(indexOf, 1);
            }
        };
        promise.then(endOperation, endOperation); // `finally` not supported everywhere
    }
}
/**
 * Throw if the given input is not in the expected format.
 * Allows to enforce runtime type-checking as compile-time type-checking here is
 * difficult to enforce.
 * @param {Object} chunk
 */
function assertChunkIsTextTrackSegmentData(chunk) {
    if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 0 /* __ENVIRONMENT__.PRODUCTION */) {
        return;
    }
    if (typeof chunk !== "object" ||
        chunk === null ||
        isNullOrUndefined(chunk.data)) {
        throw new Error("Invalid format given to a TextSegmentSink");
    }
    if (!isTextTracksBufferSegmentData(chunk)) {
        throw new Error("Invalid format given to a TextSegmentSink");
    }
    if (typeof chunk.data !== "string" &&
        typeof chunk
            .data.byteLength !== "number") {
        throw new Error("Invalid format given to a TextSegmentSink");
    }
}
/**
 * Get a value in argument that may or may not be
 * `ITextT nor hangracksBufferSegmentData`.
 *
 * Returns `true` if it corresponds to that type definition, `false` otherwise.
 *
 * Basically it's a runtime type check.It was added here as we may be casting as
 * `any` at some point to facilitate implementation.
 * @param {*} chunk
 * @returns {boolean}
 */
function isTextTracksBufferSegmentData(chunk) {
    if (typeof chunk !== "object" || chunk === null) {
        return false;
    }
    if (typeof chunk.type !== "string") {
        return false;
    }
    if (chunk.language !== undefined && typeof chunk.language !== "string") {
        return false;
    }
    if (chunk.initTimescale !== null && typeof chunk.initTimescale !== "number") {
        return false;
    }
    if (chunk.start !== undefined && typeof chunk.start !== "number") {
        return false;
    }
    if (chunk.end !== undefined && typeof chunk.end !== "number") {
        return false;
    }
    return true;
}
/*
 * The following ugly code is here to provide a compile-time check that an
 * `ITextTracksBufferSegmentData` (type of data pushed to a
 * `TextSegmentSink`) can be derived from a `ITextTrackSegmentData`
 * (text track data parsed from a segment).
 *
 * It doesn't correspond at all to real code that will be called. This is just
 * a hack to tell TypeScript to perform that check.
 */
if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
    // @ts-expect-error: unused function for type checking
    function _checkType(input) {
        function checkEqual(_arg) {
            /* nothing */
        }
        checkEqual(input);
    }
}
