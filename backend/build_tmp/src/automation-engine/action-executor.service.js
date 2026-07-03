"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ActionExecutorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionExecutorService = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
let ActionExecutorService = ActionExecutorService_1 = class ActionExecutorService {
    moduleRef;
    logger = new common_1.Logger(ActionExecutorService_1.name);
    actionMap = new Map();
    constructor(moduleRef) {
        this.moduleRef = moduleRef;
    }
    registerAction(action) {
        this.actionMap.set(action.type, action);
    }
    async executeActions(actions, event) {
        const results = [];
        for (const actionConfig of actions) {
            try {
                const action = this.actionMap.get(actionConfig.type);
                if (!action) {
                    results.push({
                        actionType: actionConfig.type,
                        success: false,
                        message: `Unknown action type: ${actionConfig.type}`,
                    });
                    continue;
                }
                const result = await action.execute(event, actionConfig.config);
                results.push(result);
            }
            catch (err) {
                this.logger.error(`Action ${actionConfig.type} failed: ${err.message}`);
                results.push({
                    actionType: actionConfig.type,
                    success: false,
                    message: err.message,
                });
            }
        }
        return results;
    }
};
exports.ActionExecutorService = ActionExecutorService;
exports.ActionExecutorService = ActionExecutorService = ActionExecutorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.ModuleRef])
], ActionExecutorService);
//# sourceMappingURL=action-executor.service.js.map