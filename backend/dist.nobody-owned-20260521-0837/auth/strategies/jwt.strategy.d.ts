import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
declare const JwtStrategy_base: new (...args: any) => any;
export declare class JwtStrategy extends JwtStrategy_base {
    private configService;
    private prismaService;
    constructor(configService: ConfigService, prismaService: PrismaService);
    validate(payload: any): Promise<{
        id: string;
        email: string | null;
        name: string;
        role: import("@prisma/client").$Enums.Role;
        schoolId: string | null;
        permissions: string[];
    } | null>;
}
export {};
