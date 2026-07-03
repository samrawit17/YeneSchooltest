"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data_quality_service_1 = require("./data-quality.service");
describe('DataQualityService', () => {
    const createService = () => {
        const prisma = {
            academicYear: {
                findFirst: jest.fn(),
            },
            $queryRaw: jest.fn(),
        };
        return {
            prisma,
            service: new data_quality_service_1.DataQualityService(prisma),
        };
    };
    it('matches active-year student placements by stored year name as well as id', async () => {
        const { prisma, service } = createService();
        prisma.academicYear.findFirst.mockResolvedValue({
            id: 'active-year-id',
            name: '2018',
        });
        prisma.$queryRaw
            .mockResolvedValueOnce([
            {
                studentProfileId: 'profile-1',
                studentUserId: 'student-user-1',
                studentCode: 'STU-001',
                studentName: 'Student One',
                enrollmentStatus: 'APPROVED',
                profileClassName: 'Grade 1',
                profileSection: 'A',
                parentCount: 1,
                parentSchoolMismatchCount: 0,
                classId: 'class-1',
                className: 'Grade 1',
                classSection: 'A',
                sectionName: 'A',
                academicYear: '2018',
            },
        ])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);
        const report = await service.getStudentConsistencyReport('school-1');
        const studentQuery = prisma.$queryRaw.mock.calls[0][0];
        expect(studentQuery.values).toEqual(expect.arrayContaining(['active-year-id', '2018']));
        expect(report.academicYearKeysChecked).toEqual([
            'active-year-id',
            '2018',
        ]);
        expect(report.summary.byType.MISSING_CANONICAL_STUDENT_CLASS).toBeUndefined();
        expect(report.summary.total).toBe(0);
    });
    it('warns and avoids active-year placement findings when no active year exists', async () => {
        const { prisma, service } = createService();
        prisma.academicYear.findFirst.mockResolvedValue(null);
        prisma.$queryRaw
            .mockResolvedValueOnce([
            {
                studentProfileId: 'profile-1',
                studentUserId: 'student-user-1',
                studentCode: 'STU-001',
                studentName: 'Student One',
                enrollmentStatus: 'APPROVED',
                profileClassName: 'Grade 1',
                profileSection: 'A',
                parentCount: 1,
                parentSchoolMismatchCount: 0,
                classId: null,
                className: null,
                classSection: null,
                sectionName: null,
                academicYear: null,
            },
        ])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);
        const report = await service.getStudentConsistencyReport('school-1');
        expect(report.warnings).toHaveLength(1);
        expect(report.summary.byType.MISSING_CANONICAL_STUDENT_CLASS).toBeUndefined();
        expect(report.summary.byType.MISSING_CLASS_PLACEMENT).toBeUndefined();
    });
});
//# sourceMappingURL=data-quality.service.spec.js.map