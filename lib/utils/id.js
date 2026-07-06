"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
//# sourceMappingURL=id.js.map