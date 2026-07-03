"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllowSuperAdminMixedRole = exports.Roles = exports.ALLOW_SUPER_ADMIN_MIXED_ROLE_KEY = exports.ROLES_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.ROLES_KEY = 'roles';
exports.ALLOW_SUPER_ADMIN_MIXED_ROLE_KEY = 'allow_super_admin_mixed_role';
const Roles = (...roles) => (0, common_1.SetMetadata)(exports.ROLES_KEY, roles);
exports.Roles = Roles;
const AllowSuperAdminMixedRole = () => (0, common_1.SetMetadata)(exports.ALLOW_SUPER_ADMIN_MIXED_ROLE_KEY, true);
exports.AllowSuperAdminMixedRole = AllowSuperAdminMixedRole;
//# sourceMappingURL=roles.decorator.js.map