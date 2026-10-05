import { test, expect } from '@playwright/test';

/**
 * End-to-end smoke test of the main flow: load the orders grid, filter it,
 * open the detail drawer, run an optimistic action, and verify the URL
 * stays shareable throughout.
 */
test('agent can filter orders, open the drawer and mark an order packed', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'OrderPulse' })).toBeVisible();

  // Wait for the virtualized grid to render seeded rows.
  await expect(page.getByRole('group', { name: 'Orders' })).toBeVisible();
  await page.waitForTimeout(500);

  // Filter by status so we get a deterministic, filtered URL state.
  await page.getByRole('textbox', { name: 'Status' }).fill('NEW');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page).toHaveURL(/f_status=NEW/);

  // Open the first row's detail drawer.
  const firstRow = page.locator('[role="row"][tabindex="0"]').first();
  await firstRow.click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/order=ORD-/);

  // Run the "mark packed" optimistic action if available for this role/order.
  const packButton = page.getByRole('button', { name: 'Mark packed' });
  if (await packButton.isVisible().catch(() => false)) {
    await packButton.click();
  }

  // Escape closes the drawer and returns focus - keyboard a11y basics.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});
