"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sms_action_1 = require("./sms.action");
describe('SmsAction', () => {
    let action;
    beforeEach(() => {
        action = new sms_action_1.SmsAction();
    });
    it('returns success with queued message when "to" is provided', async () => {
        const result = await action.execute({ eventType: 'test', payload: {}, schoolId: 's1', timestamp: new Date() }, { to: '+251911111111', message: 'Hello {{name}}' });
        expect(result.success).toBe(true);
        expect(result.message).toContain('queued');
        expect(result.details.to).toBe('+251911111111');
    });
    it('falls back to event payload phone when "to" is missing', async () => {
        const result = await action.execute({ eventType: 'test', payload: { phone: '+251922222222' }, schoolId: 's1', timestamp: new Date() }, { message: 'Alert' });
        expect(result.success).toBe(true);
        expect(result.details.to).toBe('+251922222222');
    });
    it('compiles template variables from payload', async () => {
        const result = await action.execute({ eventType: 'test', payload: { name: 'Abebe', grade: 'A' }, schoolId: 's1', timestamp: new Date() }, { to: '+251911111111', message: 'Hi {{name}}, your grade is {{grade}}' });
        expect(result.details.message).toBe('Hi Abebe, your grade is A');
    });
    it('fails when no recipient is configured', async () => {
        const result = await action.execute({ eventType: 'test', payload: {}, schoolId: 's1', timestamp: new Date() }, { message: 'Test' });
        expect(result.success).toBe(false);
        expect(result.message).toContain('No recipient');
    });
});
//# sourceMappingURL=sms.action.spec.js.map