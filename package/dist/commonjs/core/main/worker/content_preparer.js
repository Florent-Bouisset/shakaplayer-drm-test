"use strict";
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
var __read =
  (this && this.__read) ||
  function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o),
      r,
      ar = [],
      e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error: error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
var __values =
  (this && this.__values) ||
  function (o) {
    var s = typeof Symbol === "function" && Symbol.iterator,
      m = s && o[s],
      i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number")
      return {
        next: function () {
          if (o && i >= o.length) o = void 0;
          return { value: o && o[i++], done: !o };
        },
      };
    throw new TypeError(
      s ? "Object is not iterable." : "Symbol.iterator is not defined.",
    );
  };
var __spreadArray =
  (this && this.__spreadArray) ||
  function (to, from, pack) {
    if (pack || arguments.length === 2)
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
Object.defineProperty(exports, "__esModule", { value: true });
var browser_compatibility_types_1 = require("../../../compat/browser_compatibility_types");
var features_1 = require("../../../features");
var log_1 = require("../../../log");
var manifest_1 = require("../../../manifest");
var main_media_source_interface_1 = require("../../../mse/main_media_source_interface");
var worker_media_source_interface_1 = require("../../../mse/worker_media_source_interface");
var assert_1 = require("../../../utils/assert");
var id_generator_1 = require("../../../utils/id_generator");
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
var object_assign_1 = require("../../../utils/object_assign");
var task_canceller_1 = require("../../../utils/task_canceller");
var adaptive_1 = require("../../adaptive");
var cmcd_1 = require("../../cmcd");
var fetchers_1 = require("../../fetchers");
var cdn_prioritizer_1 = require("../../fetchers/cdn_prioritizer");
var thumbnail_fetcher_1 = require("../../fetchers/thumbnails/thumbnail_fetcher");
var segment_sinks_1 = require("../../segment_sinks");
var FreezeResolver_1 = require("../common/FreezeResolver");
var globals_1 = require("./globals");
var send_message_1 = require("./send_message");
var track_choice_setter_1 = require("./track_choice_setter");
var worker_text_displayer_interface_1 = require("./worker_text_displayer_interface");
/** Function allowing to associate a unique identifier to all created `MediaSource` */
var generateMediaSourceId = (0, id_generator_1.default)();
/**
 * Class facilitating the workflows behind loading a new content for the
 * RxPlayer Core:
 *
 *   - Handle Manifest fetching and Manifest updates.
 *
 *   - Handle the `MediaSource`'s creation and indirectly of its `SourceBuffer`s
 *     as well as handling "MediaSource reloading".
 *
 *   - initialize various modules (`segmentQueueCreator`, CmcdDataBuilder`,
 *     `RepresentationEstimator`) linked to the initialized content.
 *
 * You can start loading a content through the `initializeNewContent` method.
 *
 * When a content is linked to the `ContentPreparer` you can inspect the
 * different initialized modules by calling its `getCurrentContent` method.
 *
 * @class ContentPreparer
 */
var ContentPreparer = /** @class */ (function () {
  /**
   * @param {Object} capabilities
   * @param {boolean} capabilities.hasVideo - If `true`, we're playing on an
   * element which has video capabilities.
   * If `false`, we're only able to play audio, optionally with subtitles.
   *
   * Typically this boolean is `true` for `<video>` HTMLElement and `false` for
   * `<audio>` HTMLElement.
   */
  function ContentPreparer(_a) {
    var hasVideo = _a.hasVideo;
    this._currentContent = null;
    this._currentMediaSourceCanceller = new task_canceller_1.default();
    this._hasVideo = hasVideo;
    var contentCanceller = new task_canceller_1.default();
    this._contentCanceller = contentCanceller;
  }
  /**
   * Start fetching the wanted content's Manifest and initializing the various
   * modules stored by the `ContentPreparer` linked to that content.
   *
   * The returned Promise resolves with the parsed Manifest when those modules
   * are all ready and you can thus begin to load the content.
   *
   * Reject if it failed to do so.
   * @param {Object} context - Information on the content that should be
   * initialized.
   * @returns {Promise.<Object>}
   */
  ContentPreparer.prototype.initializeNewContent = function (context) {
    var _this = this;
    return new Promise(function (res, rej) {
      var _a, _b;
      _this.disposeCurrentContent();
      var contentCanceller = _this._contentCanceller;
      var currentMediaSourceCanceller = new task_canceller_1.default();
      _this._currentMediaSourceCanceller = currentMediaSourceCanceller;
      currentMediaSourceCanceller.linkToSignal(contentCanceller.signal);
      var contentId = context.contentId,
        url = context.url,
        hasText = context.hasText,
        transportOptions = context.transportOptions,
        useMseInWorker = context.useMseInWorker,
        enableRepresentationAvoidance = context.enableRepresentationAvoidance;
      var manifest = null;
      // TODO better way
      (0, assert_1.default)(
        features_1.default.transports.dash !== undefined,
        "Multithread RxPlayer should have access to the DASH feature",
      );
      var representationFilter =
        typeof transportOptions.representationFilter === "string"
          ? (0, manifest_1.createRepresentationFilterFromFnString)(
              transportOptions.representationFilter,
            )
          : undefined;
      var dashPipelines = features_1.default.transports.dash(
        __assign(__assign({}, transportOptions), {
          representationFilter: representationFilter,
        }),
      );
      var cmcdDataBuilder =
        context.cmcd === undefined ? null : new cmcd_1.default(context.cmcd);
      var manifestFetcher = new fetchers_1.ManifestFetcher(
        url === undefined ? undefined : [url],
        dashPipelines,
        __assign({ cmcdDataBuilder: cmcdDataBuilder }, context.manifestRetryOptions),
      );
      var representationEstimator = (0, adaptive_1.default)({
        initialBitrates: {
          audio: (_a = context.initialAudioBitrate) !== null && _a !== void 0 ? _a : 0,
          video: (_b = context.initialVideoBitrate) !== null && _b !== void 0 ? _b : 0,
        },
        lowLatencyMode: transportOptions.lowLatencyMode,
        throttlers: {
          limitResolution: { video: globals_1.limitVideoResolution },
          throttleBitrate: { video: globals_1.throttleVideoBitrate },
        },
      });
      var unbindRejectOnCancellation = currentMediaSourceCanceller.signal.register(
        function (error) {
          rej(error);
        },
      );
      var cdnPrioritizer = new cdn_prioritizer_1.default(contentCanceller.signal);
      var segmentQueueCreator = new fetchers_1.SegmentQueueCreator(
        dashPipelines,
        cdnPrioritizer,
        cmcdDataBuilder,
        context.segmentRetryOptions,
      );
      var fetchThumbnailData = (0, thumbnail_fetcher_1.default)(
        dashPipelines.thumbnails,
        cdnPrioritizer,
      );
      var trackChoiceSetter = new track_choice_setter_1.default();
      var _c = __read(
          createMediaSourceInterfaceAndSegmentSinksStore(
            contentId,
            {
              useMseInWorker: useMseInWorker,
              hasVideo: _this._hasVideo,
              hasText: hasText,
            },
            currentMediaSourceCanceller.signal,
          ),
          3,
        ),
        mediaSource = _c[0],
        segmentSinksStore = _c[1],
        workerTextSender = _c[2];
      var freezeResolver = new FreezeResolver_1.default(segmentSinksStore);
      _this._currentContent = {
        cmcdDataBuilder: cmcdDataBuilder,
        contentId: contentId,
        enableRepresentationAvoidance: enableRepresentationAvoidance,
        freezeResolver: freezeResolver,
        mediaSource: mediaSource,
        manifest: null,
        manifestFetcher: manifestFetcher,
        representationEstimator: representationEstimator,
        segmentSinksStore: segmentSinksStore,
        segmentQueueCreator: segmentQueueCreator,
        fetchThumbnailData: fetchThumbnailData,
        workerTextSender: workerTextSender,
        trackChoiceSetter: trackChoiceSetter,
        useMseInWorker: useMseInWorker,
      };
      mediaSource.addEventListener(
        "mediaSourceOpen",
        function () {
          checkIfReadyAndValidate();
        },
        currentMediaSourceCanceller.signal,
      );
      contentCanceller.signal.register(function () {
        manifestFetcher.dispose();
      });
      manifestFetcher.addEventListener(
        "warning",
        function (err) {
          (0, send_message_1.default)({
            type: "warning" /* WorkerMessageType.Warning */,
            contentId: contentId,
            value: (0, send_message_1.formatErrorForSender)(err),
          });
        },
        contentCanceller.signal,
      );
      manifestFetcher.addEventListener(
        "manifestReady",
        function (man) {
          if (manifest !== null) {
            log_1.default.warn("Core", "Multiple `manifestReady` events, ignoring");
            return;
          }
          manifest = man;
          if (_this._currentContent !== null) {
            _this._currentContent.manifest = manifest;
          }
          checkIfReadyAndValidate();
        },
        currentMediaSourceCanceller.signal,
      );
      manifestFetcher.addEventListener(
        "error",
        function (err) {
          (0, send_message_1.default)({
            type: "error" /* WorkerMessageType.Error */,
            contentId: contentId,
            value: (0, send_message_1.formatErrorForSender)(err),
          });
          rej(err);
        },
        contentCanceller.signal,
      );
      manifestFetcher.start();
      function checkIfReadyAndValidate() {
        if (
          manifest === null ||
          mediaSource.readyState === "closed" ||
          currentMediaSourceCanceller.isUsed()
        ) {
          return;
        }
        updateCodecSupportInWorkerMode(manifest);
        var sentManifest = manifest.getMetadataSnapshot();
        manifest.addEventListener(
          "manifestUpdate",
          function (updates) {
            if (manifest === null) {
              // TODO log warn?
              return;
            }
            // Remove `periods` key to reduce cost of an unnecessary manifest
            // clone.
            var snapshot = (0, object_assign_1.default)(manifest.getMetadataSnapshot(), {
              periods: [],
            });
            (0, send_message_1.default)({
              type: "manifest-update" /* WorkerMessageType.ManifestUpdate */,
              contentId: contentId,
              value: { manifest: snapshot, updates: updates },
            });
          },
          contentCanceller.signal,
        );
        unbindRejectOnCancellation();
        res(sentManifest);
      }
    });
  };
  /**
   * Get information on the current content prepared through the
   * `initializeNewContent` method, or `null` if no content is currently
   * prepared.
   * @returns {Object|null}
   */
  ContentPreparer.prototype.getCurrentContent = function () {
    return this._currentContent;
  };
  /**
   * Schedule an update for the Manifest file,
   *
   * Do nothing if no content is currently prepared.
   * @param {Object} settings - Various settings to configure the ways and
   * moment at which the Manifest will be refreshed.
   */
  ContentPreparer.prototype.scheduleManifestRefresh = function (settings) {
    var _a;
    (_a = this._currentContent) === null || _a === void 0
      ? void 0
      : _a.manifestFetcher.scheduleManualRefresh(settings);
  };
  /**
   * Signal the ContentPreparer that the MediaSource is "reloading".
   *
   * The returned Promise resolves when it restarts being ready.
   * @returns {Promise}
   */
  ContentPreparer.prototype.reloadMediaSource = function () {
    var _this = this;
    this._currentMediaSourceCanceller.cancel();
    if (this._currentContent === null) {
      return Promise.reject(new Error("CP: No content anymore"));
    }
    this._currentContent.trackChoiceSetter.reset();
    this._currentMediaSourceCanceller = new task_canceller_1.default();
    var _a = __read(
        createMediaSourceInterfaceAndSegmentSinksStore(
          this._currentContent.contentId,
          {
            useMseInWorker: this._currentContent.useMseInWorker,
            hasVideo: this._hasVideo,
            hasText: this._currentContent.workerTextSender !== null,
          },
          this._currentMediaSourceCanceller.signal,
        ),
        3,
      ),
      mediaSourceInterface = _a[0],
      segmentSinksStore = _a[1],
      workerTextSender = _a[2];
    this._currentContent.mediaSource = mediaSourceInterface;
    this._currentContent.segmentSinksStore = segmentSinksStore;
    this._currentContent.freezeResolver = new FreezeResolver_1.default(segmentSinksStore);
    this._currentContent.workerTextSender = workerTextSender;
    return new Promise(function (res, rej) {
      mediaSourceInterface.addEventListener(
        "mediaSourceOpen",
        function () {
          res();
        },
        _this._currentMediaSourceCanceller.signal,
      );
      mediaSourceInterface.addEventListener(
        "mediaSourceClose",
        function () {
          rej(new Error("MediaSource ReadyState changed to close during init."));
        },
        _this._currentMediaSourceCanceller.signal,
      );
      _this._currentMediaSourceCanceller.signal.register(function (error) {
        rej(error);
      });
    });
  };
  /**
   * Dispose all resources linked to the currently preopared content if one and
   * stop linking it to this `ContentPreparer`.
   */
  ContentPreparer.prototype.disposeCurrentContent = function () {
    this._contentCanceller.cancel();
    this._contentCanceller = new task_canceller_1.default();
  };
  return ContentPreparer;
})();
exports.default = ContentPreparer;
/**
 * @param {string} contentId
 * @param {Object} capabilities
 * @param {boolean} capabilities.useMseInWorker
 * @param {boolean} capabilities.hasVideo
 * @param {boolean} capabilities.hasText
 * @param {Object} cancelSignal
 * @returns {Array.<Object>}
 */
function createMediaSourceInterfaceAndSegmentSinksStore(
  contentId,
  capabilities,
  cancelSignal,
) {
  var mediaSourceInterface;
  if (capabilities.useMseInWorker) {
    var mainMediaSource = new main_media_source_interface_1.default(
      generateMediaSourceId(),
    );
    mediaSourceInterface = mainMediaSource;
    var sentMediaSourceLink = void 0;
    var handle = mainMediaSource.handle;
    if (handle.type === "handle") {
      sentMediaSourceLink = { type: "handle", value: handle.value };
    } else {
      var url_1 = URL.createObjectURL(handle.value);
      sentMediaSourceLink = { type: "url", value: url_1 };
      cancelSignal.register(function () {
        URL.revokeObjectURL(url_1);
      });
    }
    (0, send_message_1.default)(
      {
        type: "attach-media-source" /* WorkerMessageType.AttachMediaSource */,
        contentId: contentId,
        value: sentMediaSourceLink,
        mediaSourceId: mediaSourceInterface.id,
      },
      [handle.value],
    );
  } else {
    mediaSourceInterface = new worker_media_source_interface_1.default(
      generateMediaSourceId(),
      contentId,
      send_message_1.default,
    );
  }
  var textSender = capabilities.hasText
    ? new worker_text_displayer_interface_1.default(contentId, send_message_1.default)
    : null;
  var hasVideo = capabilities.hasVideo;
  var segmentSinksStore = new segment_sinks_1.default(
    mediaSourceInterface,
    hasVideo,
    textSender,
  );
  cancelSignal.register(function () {
    segmentSinksStore.disposeAll();
    textSender === null || textSender === void 0 ? void 0 : textSender.stop();
    mediaSourceInterface.dispose();
  });
  return [mediaSourceInterface, segmentSinksStore, textSender];
}
/**
 * Set Representation.isCodecSupportedInWebWorker to true or false
 * If the codec is supported in the current context.
 * If MSE in worker is not available, the attribute is not set.
 */
function updateCodecSupportInWorkerMode(manifestToUpdate) {
  var e_1, _a, e_2, _b, e_3, _c;
  var _d, _e;
  if ((0, is_null_or_undefined_1.default)(browser_compatibility_types_1.MediaSource_)) {
    return;
  }
  var codecsMap = new Map();
  try {
    for (
      var _f = __values(manifestToUpdate.periods), _g = _f.next();
      !_g.done;
      _g = _f.next()
    ) {
      var period = _g.value;
      var checkedAdaptations = __spreadArray(
        __spreadArray(
          [],
          __read((_d = period.adaptations.video) !== null && _d !== void 0 ? _d : []),
          false,
        ),
        __read((_e = period.adaptations.audio) !== null && _e !== void 0 ? _e : []),
        false,
      );
      try {
        for (
          var checkedAdaptations_1 = ((e_2 = void 0), __values(checkedAdaptations)),
            checkedAdaptations_1_1 = checkedAdaptations_1.next();
          !checkedAdaptations_1_1.done;
          checkedAdaptations_1_1 = checkedAdaptations_1.next()
        ) {
          var adaptation = checkedAdaptations_1_1.value;
          try {
            for (
              var _h = ((e_3 = void 0), __values(adaptation.representations)),
                _j = _h.next();
              !_j.done;
              _j = _h.next()
            ) {
              var representation = _j.value;
              var codec = ""
                .concat(representation.mimeType, ';codecs="')
                .concat(representation.codecs[0], '"');
              if (codecsMap.has(codec)) {
                representation.isCodecSupportedInWebWorker = codecsMap.get(codec);
              } else {
                var supported =
                  browser_compatibility_types_1.MediaSource_.isTypeSupported(codec);
                representation.isCodecSupportedInWebWorker = supported;
                codecsMap.set(codec, supported);
              }
            }
          } catch (e_3_1) {
            e_3 = { error: e_3_1 };
          } finally {
            try {
              if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
            } finally {
              if (e_3) throw e_3.error;
            }
          }
        }
      } catch (e_2_1) {
        e_2 = { error: e_2_1 };
      } finally {
        try {
          if (
            checkedAdaptations_1_1 &&
            !checkedAdaptations_1_1.done &&
            (_b = checkedAdaptations_1.return)
          )
            _b.call(checkedAdaptations_1);
        } finally {
          if (e_2) throw e_2.error;
        }
      }
    }
  } catch (e_1_1) {
    e_1 = { error: e_1_1 };
  } finally {
    try {
      if (_g && !_g.done && (_a = _f.return)) _a.call(_f);
    } finally {
      if (e_1) throw e_1.error;
    }
  }
}
