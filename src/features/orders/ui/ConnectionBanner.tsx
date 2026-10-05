import { Banner } from '../../../components/Banner';
import type { StreamStatus } from '../hooks/useLiveOrdersStream';

const COPY: Record<StreamStatus, { tone: 'success' | 'warning' | 'danger'; title: string }> = {
  open: { tone: 'success', title: 'Live - connected' },
  connecting: { tone: 'warning', title: 'Connecting to live updates…' },
  reconnecting: { tone: 'warning', title: 'Connection lost - reconnecting…' },
  closed: { tone: 'danger', title: 'Disconnected from live updates' },
};

export function ConnectionBanner({
  status,
  isStale,
  reconnectAttempt,
}: {
  status: StreamStatus;
  isStale: boolean;
  reconnectAttempt: number;
}) {
  if (status === 'open' && !isStale) return null;

  const copy = COPY[status];
  const description = isStale
    ? 'No live updates received recently. Data on screen may be stale.'
    : status === 'reconnecting'
      ? `Attempt ${reconnectAttempt}. We'll keep retrying with backoff.`
      : undefined;

  return <Banner tone={isStale && status === 'open' ? 'warning' : copy.tone} title={isStale ? 'Data may be stale' : copy.title} description={description} assertive={status !== 'open'} />;
}
