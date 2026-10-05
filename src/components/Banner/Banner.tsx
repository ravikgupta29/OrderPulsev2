import type { ReactNode } from 'react';
import { cx } from '../../shared/utils/format';
import './banner.css';

export type BannerTone = 'info' | 'success' | 'warning' | 'danger';

export interface BannerProps {
  tone: BannerTone;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Set true for banners that convey time-critical status (e.g. disconnected). */
  assertive?: boolean;
}

export function Banner({ tone, title, description, action, assertive }: BannerProps) {
  return (
    <div
      className={cx('op-banner', `op-banner--${tone}`)}
      role="status"
      aria-live={assertive ? 'assertive' : 'polite'}
    >
      <div className="op-banner__content">
        <p className="op-banner__title">{title}</p>
        {description ? <p className="op-banner__description">{description}</p> : null}
      </div>
      {action ? <div className="op-banner__action">{action}</div> : null}
    </div>
  );
}
