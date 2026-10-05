import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { Drawer } from '../../components/Drawer';

describe('baseline accessibility (axe)', () => {
  it('Button and Banner have no detectable a11y violations', async () => {
    const { container } = render(
      <main>
        <Banner tone="warning" title="Reconnecting…" description="Attempt 2" />
        <Button variant="primary">Mark packed</Button>
      </main>,
    );
    const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results).toHaveNoViolations();
  });

  it('an open Drawer has no detectable a11y violations', async () => {
    const { container } = render(
      <Drawer.Root open onClose={() => {}} titleId="drawer-title">
        <Drawer.Header>Order ORD-10001</Drawer.Header>
        <Drawer.Body>
          <p>Details go here.</p>
        </Drawer.Body>
        <Drawer.Footer>
          <Button variant="secondary">Close</Button>
        </Drawer.Footer>
      </Drawer.Root>,
    );
    const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results).toHaveNoViolations();
  });
});
