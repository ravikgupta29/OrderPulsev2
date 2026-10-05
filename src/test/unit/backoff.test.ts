import { describe, expect, it } from 'vitest';
import { Backoff, computeBackoffDelay } from '../../shared/utils/backoff';

describe('exponential backoff', () => {
  it('doubles the base delay for each attempt before jitter', () => {
    const noJitter = () => 1; // force max delay for the attempt
    expect(computeBackoffDelay(0, { baseDelayMs: 500, maxDelayMs: 100_000, random: noJitter })).toBe(500);
    expect(computeBackoffDelay(1, { baseDelayMs: 500, maxDelayMs: 100_000, random: noJitter })).toBe(1000);
    expect(computeBackoffDelay(2, { baseDelayMs: 500, maxDelayMs: 100_000, random: noJitter })).toBe(2000);
  });

  it('caps the delay at maxDelayMs', () => {
    const noJitter = () => 1;
    const delay = computeBackoffDelay(10, { baseDelayMs: 500, maxDelayMs: 5000, random: noJitter });
    expect(delay).toBe(5000);
  });

  it('applies jitter between 0 and the capped delay', () => {
    const halfJitter = () => 0.5;
    const delay = computeBackoffDelay(1, { baseDelayMs: 1000, maxDelayMs: 100_000, random: halfJitter });
    expect(delay).toBe(1000); // 0.5 * 2000
  });

  it('Backoff instance increments attempt count and resets', () => {
    const backoff = new Backoff({ baseDelayMs: 100, maxDelayMs: 10_000, random: () => 1 });
    expect(backoff.attemptCount).toBe(0);
    expect(backoff.next()).toBe(100);
    expect(backoff.next()).toBe(200);
    expect(backoff.attemptCount).toBe(2);
    backoff.reset();
    expect(backoff.attemptCount).toBe(0);
    expect(backoff.next()).toBe(100);
  });
});
