"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const create_alert_action_1 = require("./create-alert.action");
describe('CreateAlertAction', () => {
    let action;
    let prisma;
    beforeEach(() => {
        prisma = {};
        action = new create_alert_action_1.CreateAlertAction(prisma);
    });
    it('returns success with compiled message', async () => {
        const result = await action.execute({ eventType: 'test', payload: { student: 'Almaz' }, schoolId: 's1', timestamp: new Date() }, { message: 'Alert for {{student}}', type: 'danger', priority: 'high' });
        expect(result.success).toBe(true);
        expect(result.details.message).toBe('Alert for Almaz');
        expect(result.details.type).toBe('danger');
        expect(result.details.priority).toBe('high');
    });
    it('uses defaults when config is minimal', async () => {
        const result = await action.execute({ eventType: 'test', payload: {}, schoolId: 's1', timestamp: new Date() }, {});
        expect(result.success).toBe(true);
        expect(result.details.message).toBe('Automation alert triggered');
        expect(result.details.type).toBe('warning');
        expect(result.details.priority).toBe('low');
    });
});
//# sourceMappingURL=create-alert.action.spec.js.map