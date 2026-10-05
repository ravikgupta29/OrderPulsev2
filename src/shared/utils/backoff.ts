/**
 * Exponential backoff with jitter for the live-stream reconnect logic.
 * Pure function so it can be unit tested without timers/fake sockets.
 */
export interface BackoffOptions {
  baseDelayMs: number;
  maxDelayMs: number;
  /** Injectable randomness source, defaults to Math.random for jitter. */
  random?: () => number;
}

export function computeBackoffDelay(attempt: number, options: BackoffOptions): number {
  const { baseDelayMs, maxDelayMs, random = Math.random } = options;
  const safeAttempt = Math.max(0, attempt);
  const exponential = baseDelayMs * 2 ** safeAttempt;
  const capped = Math.min(exponential, maxDelayMs);
  // Full jitter: random value between 0 and the capped delay.
  return Math.round(random() * capped);
}

export class Backoff {
  private attempt = 0;

  constructor(private readonly options: BackoffOptions) {}

  next(): number {
    const delay = computeBackoffDelay(this.attempt, this.options);
    this.attempt += 1;
    return delay;
  }

  reset(): void {
    this.attempt = 0;
  }

  get attemptCount(): number {
    return this.attempt;
  }
}
