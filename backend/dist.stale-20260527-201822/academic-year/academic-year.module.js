"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcademicYearModule = void 0;
const common_1 = require("@nestjs/common");
const academic_year_controller_1 = require("./academic-year.controller");
const academic_year_service_1 = require("./academic-year.service");
const school_settings_module_1 = require("../school-settings/school-settings.module");
const prisma_module_1 = require("../prisma/prisma.module");
let AcademicYearModule = class AcademicYearModule {
};
exports.AcademicYearModule = AcademicYearModule;
exports.AcademicYearModule = AcademicYearModule = __decorate([
    (0, common_1.Module)({
        imports: [school_settings_module_1.SchoolSettingsModule, prisma_module_1.PrismaModule],
        controllers: [academic_year_controller_1.AcademicYearController],
        providers: [academic_year_service_1.AcademicYearService],
        exports: [academic_year_service_1.AcademicYearService],
    })
], AcademicYearModule);
//# sourceMappingURL=academic-year.module.js.map