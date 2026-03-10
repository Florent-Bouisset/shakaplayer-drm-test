"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = sendMessage;
var log_1 = require("../../log");
function sendMessage(worker, msg, transferables) {
    log_1.default.debug("M-->C", "Sending message", { name: msg.type });
    if (transferables === undefined) {
        worker.postMessage(msg);
    }
    else {
        worker.postMessage(msg, transferables);
    }
}
