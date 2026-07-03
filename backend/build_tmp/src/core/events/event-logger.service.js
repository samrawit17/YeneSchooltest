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
var EventLoggerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventLoggerService = void 0;
const common_1 = require("@nestjs/common");
const event_bus_service_1 = require("./event-bus.service");
let EventLoggerService = EventLoggerService_1 = class EventLoggerService {
    eventBus;
    logger = new common_1.Logger(EventLoggerService_1.name);
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.eventBus.on('*', this.logAllEvents);
    }
    logAllEvents = (event) => {
        this.logger.log(`[${event.eventType}] correlationId=${event.metadata?.correlationId} payload=${JSON.stringify(event.payload)}`);
    };
};
exports.EventLoggerService = EventLoggerService;
exports.EventLoggerService = EventLoggerService = EventLoggerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_bus_service_1.EventBusService])
], EventLoggerService);
//# sourceMappingURL=event-logger.service.js.map