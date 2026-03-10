"use strict";
/**
 * This file exportsa tool allowing to easily update the global RxPlayer config
 * at runtime.
 *
 * Note that this should only be used for debugging purposes as the config is
 * __NOT__ part of the RxPlayer API.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var default_config_1 = require("./default_config");
var deep_merge_1 = require("./utils/deep_merge");
var event_emitter_1 = require("./utils/event_emitter");
var ConfigHandler = /** @class */ (function (_super) {
    __extends(ConfigHandler, _super);
    function ConfigHandler() {
        var _this = _super.apply(this, __spreadArray([], __read(arguments), false)) || this;
        _this.updated = false;
        _this._config = default_config_1.default;
        return _this;
    }
    ConfigHandler.prototype.update = function (config) {
        var newConfig = (0, deep_merge_1.default)(this._config, config);
        this._config = newConfig;
        this.updated = true;
        this.trigger("update", config);
    };
    ConfigHandler.prototype.getCurrent = function () {
        return this._config;
    };
    return ConfigHandler;
}(event_emitter_1.default));
var configHandler = new ConfigHandler();
exports.default = configHandler;
