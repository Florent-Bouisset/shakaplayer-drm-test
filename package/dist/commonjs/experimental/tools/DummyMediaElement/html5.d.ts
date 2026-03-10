import type { IMediaElement, IMediaElementEventMap, IMediaKeys } from "../../../compat/browser_compatibility_types";
import type { IEmeApiImplementation } from "../../../compat/eme";
import EventEmitter from "../../../utils/event_emitter";
import { DummyMediaKeys } from "./eme";
import type { IRequestMediaKeySystemAccessConfig } from "./eme";
import { DummyMediaSource } from "./mse";
import TimeRangesWithMetadata from "./utils";
/** Constructor options for a `DummyMediaElement`. */
export interface IDummyMediaElementOptions {
    /**
     * The type of node our `DummyMediaElement` should have:
     *   - `"AUDIO"` for an `HTMLAudioElement`
     *   - `"VIDEO"` for an `HTMLVideoElement`
     *   - Anything else for the default (`HTMLMediaElement`)
     */
    nodeName?: "AUDIO" | "VIDEO" | undefined | null;
    /**
     * If set explicitly to `false`, act as if the current browser forbid
     * content playback (`play` and `autoplay` will return the `NotAllowedError`
     * specified by the WHATWG HTML5 specification in that case).
     */
    allowedToPlay?: boolean;
    /**
     * Options linked to DRM / EME API matters.
     */
    drmOptions?: {
        requestMediaKeySystemAccessConfig?: IRequestMediaKeySystemAccessConfig | undefined;
    } | undefined;
}
/**
 * `HTMLMediaElement` implementation that should be compatible to the
 * `RxPlayer`.
 *
 * This class will act as if it is a regular `HTMLMediaElement` playing media
 * provided through the linked MSE API mocks.
 * Properties will try to mimick what an actual `HTMLMediaElement` would return
 * but the content won't actually be decoded nor deciphered.
 * @class DummyMediaElement
 */
export declare class DummyMediaElement extends EventEmitter<IMediaElementEventMap> implements IMediaElement {
    /** Property indicating that we're relying on a `DummyMediaElement. */
    readonly isDummy: true;
    /**
     * Property providing the MSE API implementation we should rely on, instead
     * of the one provided by the browser.
     */
    readonly FORCED_MEDIA_SOURCE: typeof DummyMediaSource;
    /**
     * Property providing the EME API implementation we should rely on, instead
     * of the one provided by the browser.
     */
    readonly FORCED_EME_API: IEmeApiImplementation;
    /** `Node.childNodes` property. */
    readonly childNodes: [];
    /** `Node.nodeName` property. */
    readonly nodeName: "AUDIO" | "VIDEO";
    /** `HTMLMediaElement.textTracks` property. */
    readonly textTracks: never[];
    /** `HTMLMediaElement.ended` property. */
    ended: boolean;
    /** `HTMLMediaElement.buffered` property. */
    buffered: TimeRangesWithMetadata<null>;
    /** `Element.clientHeight` property. */
    clientHeight: undefined;
    /** `Element.clientWidth` property. */
    clientWidth: undefined;
    /** `HTMLMediaElement.error` property. */
    error: MediaError | null;
    /** `HTMLMediaElement.paused` property. */
    paused: boolean;
    /** `HTMLMediaElement.preload` property. */
    preload: "auto";
    /** `HTMLMediaElement.readyState` property. */
    readyState: number;
    /** `HTMLMediaElement.seekable` property. */
    seekable: TimeRangesWithMetadata<null>;
    /** `HTMLMediaElement.seeking` property. */
    seeking: boolean;
    /** EME's `HTMLMediaElement.mediaKeys` property. */
    mediaKeys: DummyMediaKeys | null;
    onencrypted: ((evt: MediaEncryptedEvent) => void) | null;
    oncanplay: ((evt: Event) => void) | null;
    oncanplaythrough: ((evt: Event) => void) | null;
    onenterpictureinpicture: ((evt: Event) => void) | null;
    onleavepictureinpicture: ((evt: Event) => void) | null;
    onended: ((evt: Event) => void) | null;
    onerror: ((evt: Event) => void) | null;
    onloadeddata: ((evt: Event) => void) | null;
    onloadedmetadata: ((evt: Event) => void) | null;
    onpause: ((evt: Event) => void) | null;
    onplay: ((evt: Event) => void) | null;
    onplaying: ((evt: Event) => void) | null;
    onratechange: ((evt: Event) => void) | null;
    onseeked: ((evt: Event) => void) | null;
    onseeking: ((evt: Event) => void) | null;
    onstalled: ((evt: Event) => void) | null;
    ontimeupdate: ((evt: Event) => void) | null;
    onvolumechange: ((evt: Event) => void) | null;
    onwaiting: ((evt: Event) => void) | null;
    /**
     * Correspond to the "allowed to play" flag from the WHATWG HTML5
     * specification.
     */
    private _allowedToPlay;
    /**
     * The `DummyMediaSource` currently "attached" to this `DummyMediaElement`.
     *
     * `null` if not `DummyMediaSource` is attached.
     */
    private _attachedMediaSource;
    /**
     * The real `HTMLMediaElement.autoplay` value, as it is set as getter/setter
     * methods here.
     */
    private _autoplay;
    /**
     * Correspond to the "can autoplay" flag from the WHATWG HTML5
     * specification.
     */
    private _canAutoPlay;
    /**
     * `TaskCanceller` linked to the current playing content (presumably on the
     * `attachedMediaSource`).
     * Cancelling it should free resources linked to that content.
     */
    private _currentContentCanceller;
    /**
     * The real `HTMLMediaElement.duration` value, as it is set as getter/setter
     * methods here.
     */
    private _duration;
    /** Abstraction simplifying the mechanism of sending DOM events. */
    private _eventScheduler;
    /**
     * If set, we're currently "freezing" : playback will stall, even
     * if there's decodable and decipherable data in the buffer.
     */
    private _isFreezing;
    /**
     * Object allowing to calculate easily the current playback position.
     *
     * It is important to re-compute that object each time a property linked
     * to the rate at which playback happens has changed: `paused`,
     * `playbackRate` etc., as the time is calculated in fine by deducing the
     * amount of playback time that should have elapsed since the last time
     * that object was computed.
     */
    private _lastPosition;
    /**
     * The real `HTMLMediaElement.muted` value, as it is set as
     * getter/setter methods here.
     */
    _muted: boolean;
    /** Capture WHATWG's `pending play promises` concept. */
    private _pendingPlayPromises;
    /**
     * The real `HTMLMediaElement.playbackRate` value, as it is set as
     * getter/setter methods here.
     */
    private _playbackRate;
    /**
     * The real `HTMLMediaElement.src` value, as it is set as getter/setter
     * methods here.
     */
    private _src;
    /**
     * The real `HTMLMediaElement.volume` value, as it is set as getter/setter
     * methods here.
     */
    private _volume;
    /**
     * If `true`, the `"loaded"` event was already sent for the current content
     * played. This is necessary as this event is supposed to be only sent once
     * per content as per the WHATWG specification.
     */
    private _wasLoadedDataSentForCurrentContent;
    /**
     * If `true`, the current content was played at least once.
     * `false` if there's no content or if it was always paused.
     */
    private _wasPlayPerformedOnCurrentContent;
    constructor(opts?: IDummyMediaElementOptions);
    /**
     * `HTMLMediaElement.duration` property getter.
     */
    get duration(): number;
    /**
     * `HTMLMediaElement.volume` property getter.
     */
    get volume(): number;
    /**
     * `HTMLMediaElement.volume` property setter.
     */
    set volume(newVolume: number);
    /**
     * `HTMLMediaElement.muted` property getter.
     */
    get muted(): boolean;
    /**
     * `HTMLMediaElement.muted` property setter.
     */
    set muted(newMuted: boolean);
    /**
     * `HTMLMediaElement.autoplay` property getter.
     */
    get autoplay(): boolean;
    /**
     * `HTMLMediaElement.autoplay` property setter.
     *
     * A paused content may play if paused while autoplay is set to `true` and
     * if the current content was never played until now.
     * @param {boolean} val - New `autoplay` value.
     */
    set autoplay(val: boolean);
    /**
     * `HTMLMediaElement.src` property getter.
     */
    get src(): string;
    /**
     * `HTMLMediaElement.src` property setter.
     *
     * For now, we assume that on a `DummyMediaElement` it is only useful to play
     * "directfile" contents which we don't support for now.
     * @param {string} val - The new URL
     */
    set src(val: string);
    /**
     * An `HTMLMediaElement`'s `addTextTrack` method.
     * Here I did not want to implement that complexity for now as we don't really
     * need it at the time I'm writing this. So it just throws.
     */
    addTextTrack(): never;
    /**
     * `HTMLMediaElement.srcObject` property setter,
     *
     * Right now, that the main way to attach a `DummyMediaSource` to a
     * `DummyMediaElement`.
     * @param {Object|null} val - The `DummyMediaSource` wanted or `null` to stop
     * playback.
     */
    set srcObject(val: MediaProvider | null);
    get srcObject(): MediaProvider | null;
    /**
     * EME's `HTMLMediaElement.setMediaKeys` method.
     * Here we go through the `FORCED_EME_API` property instead, so that method
     * just throws.
     */
    setMediaKeys(_mk: IMediaKeys | null): Promise<void>;
    /**
     * `HTMLMediaElement.currentTime` property getter.
     */
    get currentTime(): number;
    /**
     * `HTMLMediaElement.currentTime` property setter.
     */
    set currentTime(val: number);
    /**
     * HTMLMediaElement.playbackRate property setter.
     */
    set playbackRate(val: number);
    /**
     * HTMLMediaElement.playbackRate property getter.
     */
    get playbackRate(): number;
    /**
     * HTMLMediaElement.pause() method.
     */
    play(): Promise<void>;
    /**
     * HTMLMediaElement.pause() method.
     */
    pause(): void;
    /**
     * An `Element`'s `removeAttribute` method.
     * Here I did not want to implement that complexity for now as we don't really
     * need it at the time I'm writing this beside removing the `"src"` attribute.
     * So I just allow to do that
     * @param {string} attr
     */
    removeAttribute(attr: "src"): void;
    /**
     * A `Node`'s `hasChildNodes` method.
     * Here I did not want to implement that complexity for now as we don't really
     * need it at the time I'm writing this. So it just returns false.
     * @returns {boolean}
     */
    hasChildNodes(): false;
    /**
     * A `Node`'s `appendChild` method.
     * Here I did not want to implement that complexity for now as we don't really
     * need it at the time I'm writing this. So it just throws.
     * @param {Node} _child
     */
    appendChild<T extends Node>(_child: T): void;
    /**
     * A `Node`'s `removeChild` method.
     * Here I did not want to implement that complexity for now as we don't really
     * need it at the time I'm writing this. So it just throws.
     * @param {*} x
     */
    removeChild(x: unknown): never;
    /**
     * An added method to force a "freezing" occurence: playback will stall, even
     * if there's decodable and decipherable data in the buffer.
     *
     * Playback will stop freezing once you call the `stopFreezing` method.
     * @param {boolean} resolvesOnSeek - If `true` the freeze occurence will
     * disappear once a seek is performed.
     */
    startFreezing(resolvesOnSeek: boolean): void;
    /**
     * Stop "freezing" occurence started with the `startFreezing` method.
     */
    stopFreezing(): void;
    /**
     * Method to call once playback reaches the end of the content.
     * Will send the right events and performs the right steps at that point.
     */
    private _onPlayingEndOfContent;
    /**
     * Method corresponding to the WHATWG's "is eligible for autoplay" logic.
     * @returns {boolean}
     */
    private _isEligibleForAutoplay;
    /**
     * Performs steps on the `_attachedMediaSource` that have to happen on it when
     * it is attached to the `HTMLMediaElement`.
     */
    private _attachCurrentMediaSource;
    /**
     * Performs the WHATWG "notify about playing" steps.
     */
    private _notifyAboutPlaying;
    /**
     * Performs the WHATWG "internal pause steps".
     */
    private _internalPauseSteps;
    /**
     * Method re-checking the current position to see if we should begin
     * rebuffering, ending the content, changing the `readyState` etc.
     *
     * Should be called at regular intervals and everytime one of the property
     * that has an effect on the playback speed (`paused`, `playbackRate` etc.)
     * will change just before it changes (so the `lastPosition` object is
     * updated accordingly).
     *
     * Returns the new calculated `currentTime` property.
     *
     * @returns {number} - The new `currentTime` property.
     */
    private _tick;
    /**
     * Check if the current `readyState` property is the right one according to
     * the `DummyMediaElement`'s state.
     * If not update it and send the right events.
     * @param {Object} obj
     * @param {boolean} obj.isMissingMetadata - If `true`, at least one active
     * buffer doesn't have enough metadata for the `HAVE_METADATA` `readyState`
     * yet.
     * @param {boolean} obj.isMissingKey - If `true`, at least one active
     * buffer is missing the decryption key for the media at the current
     * position.
     */
    private _updateReadyState;
    /**
     * Update `buffered` HTML5 property based on what MSE sourceBuffers have
     * themselves buffered.
     */
    private _updateBufferedRanges;
    /**
     * Get key information on the media buffers linked to this media element.
     * @returns {Object}
     */
    private _getCurrentBufferHealth;
}
//# sourceMappingURL=html5.d.ts.map