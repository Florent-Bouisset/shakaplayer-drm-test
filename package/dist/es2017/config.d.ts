/**
 * This file exportsa tool allowing to easily update the global RxPlayer config
 * at runtime.
 *
 * Note that this should only be used for debugging purposes as the config is
 * __NOT__ part of the RxPlayer API.
 */
import type { IDefaultConfig } from "./default_config";
import EventEmitter from "./utils/event_emitter";
interface IConfigHandlerEvents {
    update: Partial<IDefaultConfig>;
}
declare class ConfigHandler extends EventEmitter<IConfigHandlerEvents> {
    updated: boolean;
    private _config;
    update(config: Partial<IDefaultConfig>): void;
    getCurrent(): IDefaultConfig;
}
declare const configHandler: ConfigHandler;
export default configHandler;
//# sourceMappingURL=config.d.ts.map