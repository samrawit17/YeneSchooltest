import { EventEmitterService } from './event-emitter.service';
import { AutomationEvent } from './interfaces/event.interface';

describe('EventEmitterService', () => {
  let service: EventEmitterService;

  beforeEach(() => {
    service = new EventEmitterService();
  });

  it('emits to registered handlers for exact event type', () => {
    const handler = jest.fn();
    service.on('attendance.marked', handler);
    service.emit('attendance.marked', { studentId: 's1' }, 'school-1');
    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as AutomationEvent;
    expect(event.eventType).toBe('attendance.marked');
    expect(event.schoolId).toBe('school-1');
    expect(event.payload).toEqual({ studentId: 's1' });
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it('does not call handler for non-matching event type', () => {
    const handler = jest.fn();
    service.on('attendance.marked', handler);
    service.emit('fee.paid', {}, 'school-1');
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls wildcard handlers for matching prefix', () => {
    const handler = jest.fn();
    service.on('attendance.*', handler);
    service.emit('attendance.marked', { studentId: 's1' }, 'school-1');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not call wildcard handler when prefix does not match', () => {
    const handler = jest.fn();
    service.on('attendance.*', handler);
    service.emit('fee.paid', {}, 'school-1');
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls both exact and wildcard handlers', () => {
    const exactHandler = jest.fn();
    const wildcardHandler = jest.fn();
    service.on('attendance.marked', exactHandler);
    service.on('attendance.*', wildcardHandler);
    service.emit('attendance.marked', {}, 'school-1');
    expect(exactHandler).toHaveBeenCalledTimes(1);
    expect(wildcardHandler).toHaveBeenCalledTimes(1);
  });

  it('removes handler with off()', () => {
    const handler = jest.fn();
    service.on('test.event', handler);
    service.off('test.event', handler);
    service.emit('test.event', {}, 'school-1');
    expect(handler).not.toHaveBeenCalled();
  });

  it('off() is a no-op for non-existent event type', () => {
    const handler = jest.fn();
    service.off('nonexistent', handler);
    service.emit('nonexistent', {}, 'school-1');
    expect(handler).not.toHaveBeenCalled();
  });

  it('supports multiple handlers for the same event', () => {
    const h1 = jest.fn();
    const h2 = jest.fn();
    service.on('test.event', h1);
    service.on('test.event', h2);
    service.emit('test.event', {}, 'school-1');
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('does not throw when async handler rejects', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('handler error'));
    service.on('test.event', handler);
    expect(() => service.emit('test.event', {}, 'school-1')).not.toThrow();
    await new Promise((r) => setTimeout(r, 50));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('creates a valid AutomationEvent with timestamp', () => {
    const handler = jest.fn();
    const before = new Date();
    service.on('test.event', handler);
    service.emit('test.event', { key: 'value' }, 'school-42');
    const event = handler.mock.calls[0][0] as AutomationEvent;
    expect(event.eventType).toBe('test.event');
    expect(event.payload).toEqual({ key: 'value' });
    expect(event.schoolId).toBe('school-42');
    expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});
