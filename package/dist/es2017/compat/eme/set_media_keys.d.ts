import type { IMediaElement, IMediaKeys } from "../browser_compatibility_types";
import type { IEmeApiImplementation } from "./eme-api-implementation";
/**
 * @param {Object} emeImplementation
 * @param {Object} mediaElement
 * @param {Object|null} mediaKeys
 * @returns {Promise}
 */
export declare function setMediaKeys(emeImplementation: IEmeApiImplementation, mediaElement: IMediaElement, mediaKeys: IMediaKeys | null): Promise<unknown>;
//# sourceMappingURL=set_media_keys.d.ts.map