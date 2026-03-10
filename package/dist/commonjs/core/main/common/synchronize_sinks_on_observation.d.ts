import type { ICorePlaybackObservation } from "../../../main_thread/init/utils/create_core_playback_observer";
import type SegmentSinksStore from "../../segment_sinks";
/**
 * Synchronize SegmentSinks with what has been buffered.
 * @param {Object} observation - The just-received playback observation,
 * including what has been buffered on lower-level buffers
 * @param {Object} segmentSinksStore - Interface allowing to interact
 * with `SegmentSink`s, so their inventory can be updated accordingly.
 */
export default function synchronizeSegmentSinksOnObservation(observation: ICorePlaybackObservation, segmentSinksStore: SegmentSinksStore): void;
//# sourceMappingURL=synchronize_sinks_on_observation.d.ts.map