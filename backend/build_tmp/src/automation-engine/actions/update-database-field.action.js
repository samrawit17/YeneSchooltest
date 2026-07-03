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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateDatabaseFieldAction = void 0;
const common_1 = require("@nestjs/common");
const base_action_1 = require("./base-action");
const prisma_service_1 = require("../../prisma/prisma.service");
let UpdateDatabaseFieldAction = class UpdateDatabaseFieldAction extends base_action_1.BaseAction {
    prisma;
    type = 'update_database_field';
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async execute(event, config) {
        const { model, where, data } = config;
        if (!model || !where || !data) {
            return this.fail('update_database_field requires model, where, and data config');
        }
        try {
            const compiledWhere = this.compileObject(where, event.payload);
            const compiledData = this.compileObject(data, event.payload);
            const prismaModel = this.prisma[model];
            if (!prismaModel || typeof prismaModel.updateMany !== 'function') {
                return this.fail(`Prisma model "${model}" not found or not updatable`);
            }
            const result = await prismaModel.updateMany({
                where: compiledWhere,
                data: compiledData,
            });
            return this.success(`Updated ${result.count} record(s) in ${model}`, {
                model,
                count: result.count,
            });
        }
        catch (error) {
            return this.fail(`Database update failed: ${error.message}`);
        }
    }
    compileObject(obj, payload) {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                result[key] = value.replace(/\{\{(\w+)\}\}/g, (_, k) => String(payload[k] ?? `{{${k}}}`));
            }
            else if (value !== null && typeof value === 'object') {
                result[key] = this.compileObject(value, payload);
            }
            else {
                result[key] = value;
            }
        }
        return result;
    }
};
exports.UpdateDatabaseFieldAction = UpdateDatabaseFieldAction;
exports.UpdateDatabaseFieldAction = UpdateDatabaseFieldAction = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UpdateDatabaseFieldAction);
//# sourceMappingURL=update-database-field.action.js.map