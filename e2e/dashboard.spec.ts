import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 15000 });
  });

  test('shows sidebar navigation', async ({ page }) => {
    await expect(page.getByText('BRM System')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Tracker/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Finished/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import Excel' })).toBeVisible();
  });

  test('shows stat cards', async ({ page }) => {
    await expect(page.getByText('Total Bikes')).toBeVisible();
    await expect(page.getByText('In Tracker')).toBeVisible();
    await expect(page.getByText('Expiring Soon').first()).toBeVisible();
    await expect(page.getByText('Completed renewals')).toBeVisible();
  });

  test('stat cards show non-zero counts', async ({ page }) => {
    // Find the Total Bikes card value
    const card = page.locator('.grid > div').first();
    const count = await card.locator('.text-3xl').textContent();
    expect(Number(count)).toBeGreaterThan(0);
  });

  test('shows category breakdown', async ({ page }) => {
    await expect(page.getByText('By Category')).toBeVisible();
    await expect(page.getByText('Breakdown per category')).toBeVisible();
  });

  test('shows expiring soon section', async ({ page }) => {
    await expect(page.getByText('Registrations expiring within 30 days')).toBeVisible();
  });

  test('navigates to tracker page', async ({ page }) => {
    await page.getByRole('button', { name: /^Tracker/ }).click();
    await expect(page.getByRole('button', { name: /Add Bike/i })).toBeVisible();
  });

  test('navigates to finished page', async ({ page }) => {
    await page.getByRole('button', { name: /^Finished/ }).click();
    await expect(page.getByText(/completed renewals/i)).toBeVisible();
  });
});
