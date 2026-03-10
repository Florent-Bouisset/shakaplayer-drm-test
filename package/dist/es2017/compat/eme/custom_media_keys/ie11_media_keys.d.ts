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
import type { IMediaElement, IMediaKeySession, IMediaKeys } from "../../browser_compatibility_types";
import { MSMediaKeysConstructor } from "./ms_media_keys_constructor";
declare class IE11CustomMediaKeys implements IMediaKeys {
    private _videoElement?;
    private _mediaKeys?;
    constructor(keyType: string);
    _setVideo(videoElement: IMediaElement): Promise<unknown>;
    createSession(): IMediaKeySession;
    setServerCertificate(): Promise<boolean>;
}
export default function getIE11MediaKeysCallbacks(): {
    isTypeSupported: (keyType: string) => boolean;
    createCustomMediaKeys: (keyType: string) => IE11CustomMediaKeys;
    setMediaKeys: (elt: IMediaElement, mediaKeys: IMediaKeys | null) => Promise<unknown>;
};
export { MSMediaKeysConstructor };
//# sourceMappingURL=ie11_media_keys.d.ts.map