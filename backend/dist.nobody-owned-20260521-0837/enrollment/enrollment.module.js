"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrollmentModule = void 0;
const common_1 = require("@nestjs/common");
const enrollment_controller_1 = require("./enrollment.controller");
const enrollment_service_1 = require("./enrollment.service");
const enrollment_request_controller_1 = require("./enrollment-request.controller");
const enrollment_request_service_1 = require("./enrollment-request.service");
const school_module_1 = require("../school/school.module");
const prisma_module_1 = require("../prisma/prisma.module");
const academic_year_module_1 = require("../academic-year/academic-year.module");
const notification_module_1 = require("../notification/notification.module");
const school_settings_module_1 = require("../school-settings/school-settings.module");
const credential_module_1 = require("../credential/credential.module");
let EnrollmentModule = class EnrollmentModule {
};
exports.EnrollmentModule = EnrollmentModule;
exports.EnrollmentModule = EnrollmentModule = __decorate([
    (0, common_1.Module)({
        imports: [
            school_module_1.SchoolModule,
            prisma_module_1.PrismaModule,
            academic_year_module_1.AcademicYearModule,
            notification_module_1.NotificationModule,
            school_settings_module_1.SchoolSettingsModule,
            credential_module_1.CredentialModule,
        ],
        controllers: [enrollment_controller_1.EnrollmentController, enrollment_request_controller_1.EnrollmentRequestController],
        providers: [enrollment_service_1.EnrollmentService, enrollment_request_service_1.EnrollmentRequestService],
        exports: [enrollment_service_1.EnrollmentService, enrollment_request_service_1.EnrollmentRequestService],
    })
], EnrollmentModule);
//# sourceMappingURL=enrollment.module.js.map