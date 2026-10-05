import type { ReactElement } from 'react';

/**
 * App-wide `aria-live` region, rendered once near the root. Features push
 * text into it via `useAnnouncer()` rather than creating ad-hoc live
 * regions scattered across the tree.
 */
export function LiveRegion({ message }: { message: string }): ReactElement {
  return (
    <div aria-live="polite" role="status" className="sr-only">
      {message}
    </div>
  );
}
