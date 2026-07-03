"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAction = void 0;
class BaseAction {
    success(message, details) {
        return { actionType: this.type, success: true, message, details };
    }
    fail(message, details) {
        return { actionType: this.type, success: false, message, details };
    }
}
exports.BaseAction = BaseAction;
//# sourceMappingURL=base-action.js.map