import { test, expect } from '@playwright/test';

test.describe('Finished Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 15000 });
    await page.getByRole('button', { name: /Finished/i }).click();
    await page.waitForSelector('table');
  });

  test('shows finished bikes table', async ({ page }) => {
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('shows completed renewals count', async ({ page }) => {
    await expect(page.getByText(/completed renewals/i)).toBeVisible();
  });

  test('shows new expiry date column', async ({ page }) => {
    await expect(page.getByText('New Expiry')).toBeVisible();
  });

  test('shows date finished column', async ({ page }) => {
    await expect(page.getByText('Date Finished')).toBeVisible();
  });

  test('search filters finished bikes', async ({ page }) => {
    const firstBikeNo = await page.locator('tbody tr td:nth-child(2)').first().textContent();
    if (!firstBikeNo) return;

    await page.getByPlaceholder('Search bike number, chassis no...').fill(firstBikeNo.trim());
    await page.waitForTimeout(300);

    await expect(page.locator('tbody tr td:nth-child(2)').first()).toContainText(firstBikeNo.trim());
  });

  test('search no results for invalid query', async ({ page }) => {
    await page.getByPlaceholder('Search bike number, chassis no...').fill('ZZZZZZ99999');
    await page.waitForTimeout(300);
    await expect(page.getByText('No finished records found')).toBeVisible();
  });

  test('delete shows confirmation', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Delete');
      await dialog.dismiss();
    });
    await page.locator('button[title="Delete"]').first().click();
  });
});
