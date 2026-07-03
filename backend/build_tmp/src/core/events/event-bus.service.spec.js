"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const event_bus_service_1 = require("./event-bus.service");
describe('EventBusService', () => {
    let bus;
    const mockQueueService = {
        getQueue: jest.fn().mockReturnValue(undefined),
    };
    const mockEventStore = {
        persist: jest.fn().mockResolvedValue('event-id'),
    };
    beforeEach(() => {
        bus = new event_bus_service_1.EventBusService(mockQueueService, mockEventStore);
    });
    afterEach(() => {
        bus.clear();
    });
    it('emits to handler for exact event type', async () => {
        const handler = jest.fn();
        bus.on('attendance.marked', handler);
        await bus.emit('attendance.marked', { studentId: 's1', schoolId: 's1', sessionId: 's1', status: 'present' });
        expect(handler).toHaveBeenCalledTimes(1);
        const event = handler.mock.calls[0][0];
        expect(event.eventType).toBe('attendance.marked');
        expect(event.payload).toEqual({ studentId: 's1', schoolId: 's1', sessionId: 's1', status: 'present' });
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.metadata?.correlationId).toBeDefined();
    });
    it('does not call handler for non-matching event', async () => {
        const handler = jest.fn();
        bus.on('attendance.marked', handler);
        await bus.emit('fee.paid', { schoolId: 's1', studentId: 's1', amount: 100 });
        expect(handler).not.toHaveBeenCalled();
    });
    it('supports wildcard * matching all events', async () => {
        const handler = jest.fn();
        bus.on('*', handler);
        await bus.emit('attendance.marked', { schoolId: 's1', studentId: 's1', sessionId: 's1', status: 'present' });
        await bus.emit('fee.paid', { schoolId: 's1', studentId: 's1', amount: 100 });
        expect(handler).toHaveBeenCalledTimes(2);
    });
    it('supports domain-level wildcard attendance.*', async () => {
        const handler = jest.fn();
        bus.on('attendance.*', handler);
        await bus.emit('attendance.marked', { schoolId: 's1', studentId: 's1', sessionId: 's1', status: 'present' });
        await bus.emit('fee.paid', { schoolId: 's1', studentId: 's1', amount: 100 });
        expect(handler).toHaveBeenCalledTimes(1);
    });
    it('calls both exact and wildcard handlers', async () => {
        const exact = jest.fn();
        const wildcard = jest.fn();
        bus.on('attendance.marked', exact);
        bus.on('attendance.*', wildcard);
        await bus.emit('attendance.marked', { schoolId: 's1', studentId: 's1', sessionId: 's1', status: 'present' });
        expect(exact).toHaveBeenCalledTimes(1);
        expect(wildcard).toHaveBeenCalledTimes(1);
    });
    it('removes handler with off()', async () => {
        const handler = jest.fn();
        bus.on('test.event', handler);
        bus.off('test.event', handler);
        await bus.emit('test.event', {});
        expect(handler).not.toHaveBeenCalled();
    });
    it('supports multiple handlers for the same event', async () => {
        const h1 = jest.fn();
        const h2 = jest.fn();
        bus.on('test.event', h1);
        bus.on('test.event', h2);
        await bus.emit('test.event', {});
        expect(h1).toHaveBeenCalledTimes(1);
        expect(h2).toHaveBeenCalledTimes(1);
    });
    it('does not throw when async handler rejects', async () => {
        const handler = jest.fn().mockRejectedValue(new Error('handler error'));
        bus.on('test.event', handler);
        await expect(bus.emit('test.event', {})).resolves.toBeDefined();
    });
    it('listenerCount returns number of matched handlers', () => {
        bus.on('attendance.marked', jest.fn());
        bus.on('attendance.*', jest.fn());
        expect(bus.listenerCount('attendance.marked')).toBe(2);
        expect(bus.listenerCount('fee.paid')).toBe(0);
    });
    it('clear removes all handlers', () => {
        bus.on('a', jest.fn());
        bus.on('b', jest.fn());
        bus.clear();
        expect(bus.registeredEventTypes()).toHaveLength(0);
    });
});
//# sourceMappingURL=event-bus.service.spec.js.map