import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { LocalizedException } from '../core/localization';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DiscountPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(schoolId: string, data: { name: string; discountType: string; discountValue: number; isActive?: boolean; criteria?: string }) {
    return this.prisma.discountPolicy.create({
      data: { schoolId, name: data.name, discountType: data.discountType, discountValue: data.discountValue, isActive: data.isActive ?? true, criteria: data.criteria ?? null },
    });
  }

  async list(schoolId: string, includeInactive = false) {
    return this.prisma.discountPolicy.findMany({
      where: { schoolId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, schoolId: string, data: { name?: string; discountType?: string; discountValue?: number; isActive?: boolean; criteria?: string }) {
    const policy = await this.prisma.discountPolicy.findUnique({ where: { id } });
    if (!policy || policy.schoolId !== schoolId) throw new LocalizedException('discount_policy.discount_policy_not_found_for_this_school_36644ca9', undefined, HttpStatus.NOT_FOUND, 'Discount policy not found for this school');
    return this.prisma.discountPolicy.update({
      where: { id },
      data: { name: data.name ?? policy.name, discountType: data.discountType ?? policy.discountType, discountValue: data.discountValue ?? policy.discountValue, isActive: data.isActive ?? policy.isActive, criteria: data.criteria ?? policy.criteria },
    });
  }

  async delete(id: string, schoolId: string) {
    const policy = await this.prisma.discountPolicy.findUnique({ where: { id } });
    if (!policy || policy.schoolId !== schoolId) throw new LocalizedException('discount_policy.discount_policy_not_found_for_this_school_36644ca9', undefined, HttpStatus.NOT_FOUND, 'Discount policy not found for this school');
    return this.prisma.discountPolicy.update({ where: { id }, data: { isActive: false } });
  }

  async applyToStudentFee(studentFeeId: string, discountPolicyId: string, schoolId: string) {
    const policy = await this.prisma.discountPolicy.findUnique({ where: { id: discountPolicyId } });
    if (!policy || policy.schoolId !== schoolId) throw new LocalizedException('discount_policy.invalid_discount_policy_2920e82e', undefined, HttpStatus.NOT_FOUND, 'Invalid discount policy');

    const studentFee = await this.prisma.studentFee.findUnique({ where: { id: studentFeeId } });
    if (!studentFee || studentFee.schoolId !== schoolId) throw new LocalizedException('discount_policy.student_fee_not_found_d9d18a9c', undefined, HttpStatus.NOT_FOUND, 'Student fee not found');

    let discountAmount = 0;
    if (policy.discountType === 'PERCENTAGE') {
      discountAmount = (studentFee.totalAmount * policy.discountValue) / 100;
    } else {
      discountAmount = policy.discountValue;
    }

    return this.prisma.studentFee.update({
      where: { id: studentFeeId },
      data: { discountPolicyId, discount: discountAmount, finalAmount: Math.max(0, studentFee.totalAmount - discountAmount) },
    });
  }
}
