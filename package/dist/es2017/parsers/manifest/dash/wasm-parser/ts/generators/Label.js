import { parseString } from "../utils";
export function generateLabelElementParser(adaptationSet, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onMPDAttribute(attr, ptr, len) {
        if (attr === 64 /* AttributeName.Text */) {
            adaptationSet.label = parseString(textDecoder, linearMemory.buffer, ptr, len);
        }
    };
}
