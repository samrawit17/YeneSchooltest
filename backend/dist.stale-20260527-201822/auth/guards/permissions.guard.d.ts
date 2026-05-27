import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
export declare class PermissionsGuard implements CanActivate {
    private reflector;
    private prismaService;
    private readonly logger;
    constructor(reflector: Reflector, prismaService: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
