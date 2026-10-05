import type { KpiSnapshot } from '../hooks/useKpiSnapshot';
import { Can } from '../../authz';
import './kpiPanel.css';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  PROCESSING: 'Processing',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  ON_HOLD: 'On hold',
  CANCELLED: 'Cancelled',
  DELIVERED: 'Delivered',
};

export function KpiPanel({ snapshot }: { snapshot: KpiSnapshot }) {
  const maxCount = Math.max(1, ...Object.values(snapshot.statusBreakdown));

  return (
    <section className="op-kpi" aria-label="Key performance indicators">
      <div className="op-kpi__stats">
        <div className="op-kpi__stat">
          <p className="op-kpi__stat-value">{snapshot.ordersPerMinute}</p>
          <p className="op-kpi__stat-label">Orders / min (live events)</p>
        </div>
        <div className="op-kpi__stat">
          <p className="op-kpi__stat-value">{(snapshot.slaBreachRate * 100).toFixed(1)}%</p>
          <p className="op-kpi__stat-label">SLA breach rate</p>
        </div>
        <Can permission="kpi:view-advanced">
          <div className="op-kpi__stat">
            <p className="op-kpi__stat-value">{snapshot.sampleSize.toLocaleString()}</p>
            <p className="op-kpi__stat-label">Orders tracked</p>
          </div>
        </Can>
      </div>

      <div className="op-kpi__breakdown" role="img" aria-label="Status breakdown bar chart">
        {Object.entries(snapshot.statusBreakdown).map(([status, count]) => (
          <div className="op-kpi__bar-row" key={status}>
            <span className="op-kpi__bar-label">{STATUS_LABELS[status] ?? status}</span>
            <div className="op-kpi__bar-track">
              <div
                className={`op-kpi__bar-fill op-kpi__bar-fill--${status.toLowerCase()}`}
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
            <span className="op-kpi__bar-count">{count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
