import { EventBusService } from './event-bus.service';

describe('EventBusService', () => {
  let bus: EventBusService;

  beforeEach(() => {
    bus = new EventBusService();
  });

  afterEach(() => {
    bus.clear();
  });

  it('emits to handler for exact event type', () => {
    const handler = jest.fn();
    bus.on('attendance.marked', handler);
    bus.emit('attendance.marked', { studentId: 's1' });
    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0];
    expect(event.eventType).toBe('attendance.marked');
    expect(event.payload).toEqual({ studentId: 's1' });
    expect(event.timestamp).toBeInstanceOf(Date);
    expect(event.metadata?.correlationId).toBeDefined();
  });

  it('does not call handler for non-matching event', () => {
    const handler = jest.fn();
    bus.on('attendance.marked', handler);
    bus.emit('fee.paid', {});
    expect(handler).not.toHaveBeenCalled();
  });

  it('supports wildcard * matching all events', () => {
    const handler = jest.fn();
    bus.on('*', handler);
    bus.emit('attendance.marked', {});
    bus.emit('fee.paid', {});
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('supports domain-level wildcard attendance.*', () => {
    const handler = jest.fn();
    bus.on('attendance.*', handler);
    bus.emit('attendance.marked', {});
    bus.emit('attendance.sync', {});
    bus.emit('fee.paid', {});
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('calls both exact and wildcard handlers', () => {
    const exact = jest.fn();
    const wildcard = jest.fn();
    bus.on('attendance.marked', exact);
    bus.on('attendance.*', wildcard);
    bus.emit('attendance.marked', {});
    expect(exact).toHaveBeenCalledTimes(1);
    expect(wildcard).toHaveBeenCalledTimes(1);
  });

  it('removes handler with off()', () => {
    const handler = jest.fn();
    bus.on('test.event', handler);
    bus.off('test.event', handler);
    bus.emit('test.event', {});
    expect(handler).not.toHaveBeenCalled();
  });

  it('off() is no-op for non-existent event type', () => {
    const handler = jest.fn();
    bus.off('nonexistent', handler);
    bus.emit('nonexistent', {});
    expect(handler).not.toHaveBeenCalled();
  });

  it('off() does not break other handlers', () => {
    const h1 = jest.fn();
    const h2 = jest.fn();
    bus.on('test.event', h1);
    bus.on('test.event', h2);
    bus.off('test.event', h1);
    bus.emit('test.event', {});
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('supports multiple handlers for the same event', () => {
    const h1 = jest.fn();
    const h2 = jest.fn();
    bus.on('test.event', h1);
    bus.on('test.event', h2);
    bus.emit('test.event', {});
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('does not throw when async handler rejects', () => {
    const handler = jest.fn().mockRejectedValue(new Error('handler error'));
    bus.on('test.event', handler);
    expect(() => bus.emit('test.event', {})).not.toThrow();
  });

  it('does not break other handlers when one rejects', async () => {
    const failing = jest.fn().mockRejectedValue(new Error('fail'));
    const passing = jest.fn();
    bus.on('test.event', failing);
    bus.on('test.event', passing);
    bus.emit('test.event', {});
    await new Promise((r) => setTimeout(r, 50));
    expect(passing).toHaveBeenCalledTimes(1);
  });

  it('listenerCount returns number of matched handlers', () => {
    bus.on('attendance.marked', jest.fn());
    bus.on('attendance.*', jest.fn());
    expect(bus.listenerCount('attendance.marked')).toBe(2);
    expect(bus.listenerCount('fee.paid')).toBe(0);
  });

  it('listenerCount includes wildcard matches', () => {
    bus.on('*', jest.fn());
    bus.on('attendance.*', jest.fn());
    expect(bus.listenerCount('attendance.marked')).toBe(2);
    expect(bus.listenerCount('fee.paid')).toBe(1);
  });

  it('clear removes all handlers', () => {
    bus.on('a', jest.fn());
    bus.on('b', jest.fn());
    bus.clear();
    expect(bus.registeredEventTypes()).toHaveLength(0);
  });

  it('registeredEventTypes returns all registered patterns', () => {
    bus.on('a', jest.fn());
    bus.on('b', jest.fn());
    expect(bus.registeredEventTypes()).toEqual(['a', 'b']);
  });

  it('sets correlationId in metadata', () => {
    const handler = jest.fn();
    bus.on('test', handler);
    bus.emit('test', {});
    const event = handler.mock.calls[0][0];
    expect(event.metadata?.correlationId).toBeDefined();
    expect(typeof event.metadata?.correlationId).toBe('string');
  });

  it('generates unique correlationId per emit', () => {
    const ids: string[] = [];
    const handler = jest.fn((e) => ids.push(e.metadata.correlationId));
    bus.on('test', handler);
    bus.emit('test', {});
    bus.emit('test', {});
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('handles events with no listeners silently', () => {
    expect(() => bus.emit('no.listeners', {})).not.toThrow();
  });
});
