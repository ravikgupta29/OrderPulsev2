import { z } from 'zod';
import { orderSchema } from '../shared/types/order';
import { orderStore } from './store';

/**
 * Validated wire shape for stream events. The client never trusts a raw
 * message - everything is parsed through this schema at the boundary.
 */
export const orderStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ORDER_UPDATED'), order: orderSchema, seq: z.number() }),
  z.object({ type: z.literal('HEARTBEAT'), seq: z.number() }),
]);
export type OrderStreamEvent = z.infer<typeof orderStreamEventSchema>;

type Listener = (event: OrderStreamEvent) => void;

/**
 * Simulates a live SSE/WebSocket feed entirely in-memory (no real network
 * hop), including periodic order updates, heartbeats and occasional forced
 * disconnects so the UI's reconnect/backoff/resync logic has something real
 * to exercise. A sequence number lets the client detect and resync missed
 * events after a reconnect.
 */
export class MockOrderStream {
  private listeners = new Set<Listener>();
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private dropHandle: ReturnType<typeof setTimeout> | null = null;
  private seq = 0;
  private connected = false;

  connect(): void {
    if (this.connected) return;
    this.connected = true;
    this.tickHandle = setInterval(() => this.tick(), 1000);
    this.scheduleRandomDrop();
  }

  disconnect(): void {
    this.connected = false;
    if (this.tickHandle) clearInterval(this.tickHandle);
    if (this.dropHandle) clearTimeout(this.dropHandle);
    this.tickHandle = null;
    this.dropHandle = null;
  }

  onMessage(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Returns events strictly after `sinceSeq`, used to resync after a reconnect. */
  replaySince(sinceSeq: number): OrderStreamEvent[] {
    // In this simulation we only resync with a heartbeat carrying the
    // current sequence; a real backend would persist an event log.
    return [{ type: 'HEARTBEAT', seq: this.seq } satisfies OrderStreamEvent].filter((e) => e.seq > sinceSeq);
  }

  get currentSeq(): number {
    return this.seq;
  }

  private tick(): void {
    this.seq += 1;
    const updates = orderStore.simulateRandomUpdates(3 + Math.floor(Math.random() * 5));
    if (updates.length === 0) {
      this.emit({ type: 'HEARTBEAT', seq: this.seq });
      return;
    }
    updates.forEach((order) => {
      this.seq += 1;
      this.emit({ type: 'ORDER_UPDATED', order, seq: this.seq });
    });
  }

  private scheduleRandomDrop(): void {
    const delay = 20_000 + Math.random() * 25_000;
    this.dropHandle = setTimeout(() => {
      if (!this.connected) return;
      this.disconnect();
      // Downstream consumer (useLiveOrdersStream) owns reconnect/backoff and
      // will call connect() again.
      this.emitClose();
    }, delay);
  }

  private closeListeners = new Set<() => void>();

  onClose(listener: () => void): () => void {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  private emitClose(): void {
    this.closeListeners.forEach((l) => l());
  }

  private emit(event: OrderStreamEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}

export const mockOrderStream = new MockOrderStream();
