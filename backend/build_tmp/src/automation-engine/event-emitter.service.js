"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEmitterService = void 0;
const common_1 = require("@nestjs/common");
let EventEmitterService = class EventEmitterService {
    handlers = new Map();
    on(eventType, handler) {
        const handlers = this.handlers.get(eventType) || [];
        handlers.push(handler);
        this.handlers.set(eventType, handlers);
    }
    off(eventType, handler) {
        const handlers = this.handlers.get(eventType);
        if (!handlers)
            return;
        this.handlers.set(eventType, handlers.filter((h) => h !== handler));
    }
    emit(eventType, payload, schoolId) {
        const event = {
            eventType,
            payload,
            schoolId,
            timestamp: new Date(),
        };
        const handlers = this.handlers.get(eventType) || [];
        for (const handler of handlers) {
            Promise.resolve(handler(event)).catch((err) => console.error(`Automation handler error for ${eventType}:`, err));
        }
        const wildcard = eventType.split('.').slice(0, -1).join('.') + '.*';
        const wildcardHandlers = this.handlers.get(wildcard) || [];
        for (const handler of wildcardHandlers) {
            Promise.resolve(handler(event)).catch((err) => console.error(`Automation handler error for ${wildcard}:`, err));
        }
    }
};
exports.EventEmitterService = EventEmitterService;
exports.EventEmitterService = EventEmitterService = __decorate([
    (0, common_1.Injectable)()
], EventEmitterService);
//# sourceMappingURL=event-emitter.service.js.map