import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JWT_COOKIE_NAME } from '../auth.service';

import {
  DEFAULT_ROLE_PERMISSIONS,
  IT_MANAGER_FORBIDDEN_PERMISSIONS,
} from '../constants/default-permissions.constant';
import { Role } from '../types/role.enum';

function buildJwtExtractors(allowBearerAuth: boolean) {
  const extractors = [
    (req) => {
      return req?.cookies?.[JWT_COOKIE_NAME];
    },
  ];

  if (allowBearerAuth) {
    extractors.push(ExtractJwt.fromAuthHeaderAsBearerToken());
  }

  return extractors;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors(
        buildJwtExtractors(configService.get<string>('ALLOW_BEARER_AUTH') === 'true'),
      ),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Logging removed for production
    // Logging removed for production

    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
      include: {
        userPermissions: {
          include: { permission: true },
        },
      },
    });

    // Logging removed for production

    if (!user) {
      return null;
    }

    // Get role permissions
    const rolePermissions = await this.prismaService.rolePermission.findMany({
      where: { role: user.role },
      include: { permission: true },
    });

    // Retrieve system defaults for this user's role
    const defaultRolePerms = DEFAULT_ROLE_PERMISSIONS[user.role as Role] || [];

    // Combine default limits, user overrides, and role-override permissions, removing duplicates
    const allPermissions = new Set([
      ...defaultRolePerms,
      ...user.userPermissions.map((up) => up.permission.name),
      ...rolePermissions.map((rp) => rp.permission.name),
    ]);

    if (user.role === Role.IT_MANAGER) {
      for (const forbiddenPermission of IT_MANAGER_FORBIDDEN_PERMISSIONS) {
        allPermissions.delete(forbiddenPermission);
      }
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      permissions: Array.from(allPermissions),
    };
  }
}
