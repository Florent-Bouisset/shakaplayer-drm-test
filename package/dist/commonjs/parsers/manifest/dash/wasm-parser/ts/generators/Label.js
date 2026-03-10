"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLabelElementParser = generateLabelElementParser;
var utils_1 = require("../utils");
function generateLabelElementParser(adaptationSet, linearMemory) {
    var textDecoder = new TextDecoder();
    return function onMPDAttribute(attr, ptr, len) {
        if (attr === 64 /* AttributeName.Text */) {
            adaptationSet.label = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
        }
    };
}
