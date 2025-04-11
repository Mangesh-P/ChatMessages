import { afterEach, beforeEach, describe, expect, vi, it } from 'vitest';
import { Socket } from './socket';

const streamingEventIntervalMs = 500;

describe('Socket', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('automatically streams events', async () => {
    const socket = new Socket();
    const subscriber = vi.fn();
    socket.subscribe(subscriber);

    subscriber.mockClear();
    await vi.advanceTimersByTimeAsync(streamingEventIntervalMs);
    expect(subscriber).not.toHaveBeenCalled();

    subscriber.mockClear();
    socket.startStreamingEvents();
    await vi.advanceTimersByTimeAsync(2 * streamingEventIntervalMs);
    expect(subscriber).toHaveBeenCalledTimes(2);
    expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({ type: expect.any(String) }));

    subscriber.mockClear();
    socket.stopStreamingEvents();
    await vi.advanceTimersByTimeAsync(streamingEventIntervalMs);
    expect(subscriber).not.toHaveBeenCalled();
  });

  it('manually dispatches events', async () => {
    const socket = new Socket();
    const subscriber = vi.fn();
    socket.subscribe(subscriber);

    socket.receiveNextEvent();
    expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({ type: expect.any(String) }));
  });
});
