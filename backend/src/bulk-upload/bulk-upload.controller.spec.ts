import { BadRequestException } from '@nestjs/common';
import { BulkUploadController } from './bulk-upload.controller';

describe('BulkUploadController', () => {
  const makeController = () => {
    const service = {
      parseCSV: jest.fn(),
      processBulkStudentsWithAssignment: jest.fn(),
    };
    const controller = new BulkUploadController(service as any);
    return { controller, service };
  };

  it('rejects student auto bulk uploads above 50 records', async () => {
    const { controller, service } = makeController();
    service.parseCSV.mockReturnValue(
      Array.from({ length: 51 }, (_, index) => ({
        full_name: `Student ${index + 1}`,
        phone: `0912345${String(index).padStart(3, '0')}`,
      })),
    );

    await expect(
      controller.uploadBulkStudentsAuto(
        {
          buffer: Buffer.from('first_name,phone\nStudent,0912345678'),
        } as Express.Multer.File,
        {},
        { user: { schoolId: 'school-1', id: 'admin-user-1' } },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

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

    await expect(
      controller.uploadBulkStudentsAuto(
        {
          buffer: Buffer.from('first_name,phone\nStudent,0912345678'),
        } as Express.Multer.File,
        { academicYear: 'year-1' },
        { user: { schoolId: 'school-1', id: 'admin-user-1' } },
      ),
    ).resolves.toEqual({ successful: 50 });

    expect(service.processBulkStudentsWithAssignment).toHaveBeenCalledWith(
      'school-1',
      'admin-user-1',
      records,
      'year-1',
    );
  });
});
