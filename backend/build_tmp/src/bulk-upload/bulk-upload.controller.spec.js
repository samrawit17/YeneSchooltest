"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const bulk_upload_controller_1 = require("./bulk-upload.controller");
describe('BulkUploadController', () => {
    const makeController = () => {
        const service = {
            parseCSV: jest.fn(),
            processBulkStudentsWithAssignment: jest.fn(),
        };
        const controller = new bulk_upload_controller_1.BulkUploadController(service, {});
        return { controller, service };
    };
    it('rejects student auto bulk uploads above 50 records', async () => {
        const { controller, service } = makeController();
        service.parseCSV.mockReturnValue(Array.from({ length: 51 }, (_, index) => ({
            full_name: `Student ${index + 1}`,
            phone: `0912345${String(index).padStart(3, '0')}`,
        })));
        await expect(controller.uploadBulkStudentsAuto({
            buffer: Buffer.from('first_name,phone\nStudent,0912345678'),
        }, {}, { user: { schoolId: 'school-1', id: 'admin-user-1' } })).rejects.toBeInstanceOf(common_1.BadRequestException);
        expect(service.processBulkStudentsWithAssignment).not.toHaveBeenCalled();
    });
    it('allows student auto bulk uploads at 50 records', async () => {
        const { controller, service } = makeController();
        const records = Array.from({ length: 50 }, (_, index) => ({
            full_name: `Student ${index + 1}`,
            phone: `0912345${String(index).padStart(3, '0')}`,
        }));
        service.parseCSV.mockReturnValue(records);
        service.processBulkStudentsWithAssignment.mockResolvedValue({
            successful: 50,
        });
        await expect(controller.uploadBulkStudentsAuto({
            buffer: Buffer.from('first_name,phone\nStudent,0912345678'),
        }, { academicYear: 'year-1' }, { user: { schoolId: 'school-1', id: 'admin-user-1' } })).resolves.toEqual({ successful: 50 });
        expect(service.processBulkStudentsWithAssignment).toHaveBeenCalledWith('school-1', 'admin-user-1', records, 'year-1');
    });
});
//# sourceMappingURL=bulk-upload.controller.spec.js.map