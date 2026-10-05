import { useId, useState, type FormEvent } from 'react';
import { Drawer } from '../../../components/Drawer';
import { Banner } from '../../../components/Banner';
import { Button } from '../../../components/Button';
import { Can } from '../../authz';
import { useOrderQuery } from '../hooks/useOrdersQuery';
import { useOrderStatusMutation } from '../hooks/useOrderStatusMutation';
import { useAddOrderNote } from '../hooks/useAddOrderNote';
import { formatCurrency, formatDateTime } from '../../../shared/utils/format';
import type { OrderStatus } from '../../../shared/types/order';

export interface OrderDrawerProps {
  orderId: string | null;
  onClose: () => void;
  onAnnounce: (message: string) => void;
}

const ALLOWED_ACTIONS: Array<{ status: OrderStatus; label: string; permission: Parameters<typeof Can>[0]['permission'] }> = [
  { status: 'PACKED', label: 'Mark packed', permission: 'orders:mark-packed' },
  { status: 'ON_HOLD', label: 'Put on hold', permission: 'orders:hold' },
  { status: 'CANCELLED', label: 'Cancel order', permission: 'orders:cancel' },
];

export function OrderDrawer({ orderId, onClose, onAnnounce }: OrderDrawerProps) {
  const titleId = useId();
  const { data: order, isLoading } = useOrderQuery(orderId);
  const statusMutation = useOrderStatusMutation();
  const noteMutation = useAddOrderNote(orderId ?? '');
  const [noteDraft, setNoteDraft] = useState('');

  function handleAction(nextStatus: OrderStatus) {
    if (!order) return;
    statusMutation.mutate(
      { order, nextStatus },
      {
        onSuccess: () => onAnnounce(`Order ${order.id} updated to ${nextStatus.replace('_', ' ')}.`),
        onError: (err) => onAnnounce(`Could not update order ${order.id}: ${err.message}`),
      },
    );
  }

  function handleNoteSubmit(event: FormEvent) {
    event.preventDefault();
    if (!noteDraft.trim()) return;
    noteMutation.mutate(noteDraft.trim(), {
      onSuccess: () => {
        setNoteDraft('');
        onAnnounce('Note added.');
      },
    });
  }

  return (
    <Drawer.Root open={Boolean(orderId)} onClose={onClose} titleId={titleId}>
      <Drawer.Header>{order ? `Order ${order.id}` : 'Order details'}</Drawer.Header>
      <Drawer.Body>
        {isLoading && <p>Loading order…</p>}
        {!isLoading && !order && <p>Order not found.</p>}
        {order && (
          <div className="op-order-detail">
            {statusMutation.isError && (
              <Banner
                tone="danger"
                title="Action failed"
                description={statusMutation.error.message}
                assertive
              />
            )}

            <section>
              <h3>Summary</h3>
              <dl className="op-detail-grid">
                <div>
                  <dt>Customer</dt>
                  <dd>{order.customerName}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{order.status}</dd>
                </div>
                <div>
                  <dt>Priority</dt>
                  <dd>{order.priority}</dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>{formatCurrency(order.totalCents)}</dd>
                </div>
                <div>
                  <dt>SLA due</dt>
                  <dd>{formatDateTime(order.slaDueAt)}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h3>Items</h3>
              <ul className="op-items-list">
                {order.items.map((item) => (
                  <li key={item.sku}>
                    {item.quantity} × {item.name} ({item.sku}) - {formatCurrency(item.unitPriceCents * item.quantity)}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3>Timeline</h3>
              <ol className="op-timeline">
                {order.timeline.map((event) => (
                  <li key={event.id}>
                    <strong>{event.status}</strong> - {formatDateTime(event.at)}
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h3>Notes</h3>
              <ul className="op-notes-list">
                {order.notes.map((note) => (
                  <li key={note.id}>
                    <strong>{note.author}:</strong> {note.body}
                  </li>
                ))}
              </ul>
              <Can permission="orders:add-note">
                <form onSubmit={handleNoteSubmit} className="op-note-form">
                  <label htmlFor="op-note-input">Add a note</label>
                  <textarea
                    id="op-note-input"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={2}
                  />
                  <Button type="submit" variant="secondary" isLoading={noteMutation.isPending}>
                    Add note
                  </Button>
                </form>
              </Can>
            </section>
          </div>
        )}
      </Drawer.Body>
      {order && (
        <Drawer.Footer>
          {ALLOWED_ACTIONS.map((action) => (
            <Can key={action.status} permission={action.permission}>
              <Button
                variant={action.status === 'CANCELLED' ? 'danger' : 'primary'}
                onClick={() => handleAction(action.status)}
                isLoading={statusMutation.isPending && statusMutation.variables?.nextStatus === action.status}
                disabled={order.status === action.status}
              >
                {action.label}
              </Button>
            </Can>
          ))}
        </Drawer.Footer>
      )}
    </Drawer.Root>
  );
}
