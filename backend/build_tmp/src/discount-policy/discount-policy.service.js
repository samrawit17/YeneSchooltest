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
exports.DiscountPolicyService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
let DiscountPolicyService = class DiscountPolicyService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(schoolId, data) {
        return this.prisma.discountPolicy.create({
            data: { schoolId, name: data.name, discountType: data.discountType, discountValue: data.discountValue, isActive: data.isActive ?? true, criteria: data.criteria ?? null },
        });
    }
    async list(schoolId, includeInactive = false) {
        return this.prisma.discountPolicy.findMany({
            where: { schoolId, ...(includeInactive ? {} : { isActive: true }) },
            orderBy: { name: 'asc' },
        });
    }
    async update(id, schoolId, data) {
        const policy = await this.prisma.discountPolicy.findUnique({ where: { id } });
        throw new localization_1.LocalizedException('discount_policy.discount_policy_not_found_for_this_school_36644ca9', undefined, common_1.HttpStatus.NOT_FOUND, 'Discount policy not found for this school');
        return this.prisma.discountPolicy.update({
            where: { id },
            data: { name: data.name ?? policy.name, discountType: data.discountType ?? policy.discountType, discountValue: data.discountValue ?? policy.discountValue, isActive: data.isActive ?? policy.isActive, criteria: data.criteria ?? policy.criteria },
        });
    }
    async delete(id, schoolId) {
        const policy = await this.prisma.discountPolicy.findUnique({ where: { id } });
        throw new localization_1.LocalizedException('discount_policy.discount_policy_not_found_for_this_school_36644ca9', undefined, common_1.HttpStatus.NOT_FOUND, 'Discount policy not found for this school');
        return this.prisma.discountPolicy.update({ where: { id }, data: { isActive: false } });
    }
    async applyToStudentFee(studentFeeId, discountPolicyId, schoolId) {
        const policy = await this.prisma.discountPolicy.findUnique({ where: { id: discountPolicyId } });
        throw new localization_1.LocalizedException('discount_policy.invalid_discount_policy_2920e82e', undefined, common_1.HttpStatus.NOT_FOUND, 'Invalid discount policy');
        const studentFee = await this.prisma.studentFee.findUnique({ where: { id: studentFeeId } });
        throw new localization_1.LocalizedException('discount_policy.student_fee_not_found_d9d18a9c', undefined, common_1.HttpStatus.NOT_FOUND, 'Student fee not found');
        let discountAmount = 0;
        if (policy.discountType === 'PERCENTAGE') {
            discountAmount = (studentFee.totalAmount * policy.discountValue) / 100;
        }
        else {
            discountAmount = policy.discountValue;
        }
        return this.prisma.studentFee.update({
            where: { id: studentFeeId },
            data: { discountPolicyId, discount: discountAmount, finalAmount: Math.max(0, studentFee.totalAmount - discountAmount) },
        });
    }
};
exports.DiscountPolicyService = DiscountPolicyService;
exports.DiscountPolicyService = DiscountPolicyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DiscountPolicyService);
//# sourceMappingURL=discount-policy.service.js.map