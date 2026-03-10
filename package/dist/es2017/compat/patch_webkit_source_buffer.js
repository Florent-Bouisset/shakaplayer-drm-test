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
import EventEmitter from "../utils/event_emitter";
import globalScope from "../utils/global_scope";
import isNode from "../utils/is_node";
import isNullOrUndefined from "../utils/is_null_or_undefined";
import queueMicrotask from "../utils/queue_microtask";
// TODO This is the last ugly side-effect here.
// Either remove it or find the best way to implement that
export default function patchWebkitSourceBuffer() {
    // old WebKit SourceBuffer implementation,
    // where a synchronous append is used instead of appendBuffer
    if (!isNode &&
        !isNullOrUndefined(globalScope.WebKitSourceBuffer) &&
        globalScope.WebKitSourceBuffer.prototype.addEventListener === undefined) {
        const sourceBufferWebkitRef = globalScope.WebKitSourceBuffer;
        const sourceBufferWebkitProto = sourceBufferWebkitRef.prototype;
        for (const fnName in EventEmitter.prototype) {
            if (Object.prototype.hasOwnProperty.call(EventEmitter.prototype, fnName)) {
                sourceBufferWebkitProto[fnName] = EventEmitter.prototype[fnName];
            }
        }
        sourceBufferWebkitProto._listeners = [];
        sourceBufferWebkitProto._emitUpdate = function (eventName, val) {
            queueMicrotask(() => {
                this.trigger(eventName, val);
                this.updating = false;
                this.trigger("updateend", new Event("updateend"));
            });
        };
        sourceBufferWebkitProto.appendBuffer = function (data) {
            var _a, _b;
            if (this.updating) {
                throw new Error("updating");
            }
            this.trigger("updatestart", new Event("updatestart"));
            this.updating = true;
            try {
                this.append(data);
            }
            catch (error) {
                (_a = this._emitUpdate) === null || _a === void 0 ? void 0 : _a.call(this, "error", error);
                return;
            }
            (_b = this._emitUpdate) === null || _b === void 0 ? void 0 : _b.call(this, "update", new Event("update"));
        };
    }
}
