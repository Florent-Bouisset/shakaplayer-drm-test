"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = sendMessage;
exports.formatErrorForSender = formatErrorForSender;
var errors_1 = require("../../../errors");
var log_1 = require("../../../log");
function sendMessage(msg, transferables) {
    log_1.default.debug("M<--C", "Sending message", { name: msg.type });
    if (transferables === undefined) {
        postMessage(msg);
    }
    else {
        // TypeScript made a mistake here, and 2busy2fix
        postMessage(msg, transferables);
    }
}
function formatErrorForSender(error) {
    var formattedError = (0, errors_1.formatError)(error, {
        defaultCode: "NONE",
        defaultReason: "An unknown error stopped content playback.",
    });
    return formattedError.serialize();
}
