import type { IMediaElementEventMap, IMediaSourceEventMap, ISourceBufferEventMap } from "../../../compat/browser_compatibility_types";
import type { CancellationSignal } from "../../../utils/task_canceller";
import type { DummyMediaElement } from "./html5";
import type { DummyMediaSource, DummySourceBuffer } from "./mse";
export declare class EventScheduler {
    private _scheduled;
    constructor();
    schedule(obj: DummyMediaElement, evtName: keyof IMediaElementEventMap, cancelSignal: CancellationSignal | null | undefined): Promise<void>;
    schedule(obj: DummyMediaSource, evtName: keyof IMediaSourceEventMap, cancelSignal: CancellationSignal | null | undefined): Promise<void>;
    schedule(obj: DummySourceBuffer, evtName: keyof ISourceBufferEventMap, cancelSignal: CancellationSignal | null | undefined): Promise<void>;
    private _start;
}
/**
 * Simulate TimeRanges as returned by SourceBuffer.prototype.buffered.
 * Add an "insert" and "remove" methods to manually update it.
 * @class TimeRangesWithMetadata
 */
export default class TimeRangesWithMetadata<T> implements TimeRanges {
    length: number;
    private _rangesWithMetadata;
    private _ranges;
    constructor();
    insert(start: number, end: number, info: T): void;
    getMetadataFor(time: number): T | null;
    getRangeFor(time: number): {
        start: number;
        end: number;
    } | null;
    remove(start: number, end: number): void;
    start(index: number): number;
    end(index: number): number;
}
//# sourceMappingURL=utils.d.ts.map