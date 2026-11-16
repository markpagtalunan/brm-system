import { test, expect } from '@playwright/test';

test.describe('Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 15000 });
    await page.getByRole('button', { name: /^Tracker/ }).click();
    await page.waitForSelector('table');
  });

  test('shows tracker table with bikes', async ({ page }) => {
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('search filters bikes by bike number', async ({ page }) => {
    const firstBikeNo = (await page.locator('tbody tr td:nth-child(2)').first().textContent())?.trim();
    if (!firstBikeNo) return;

    await page.getByPlaceholder('Search bike number, chassis no...').fill(firstBikeNo);
    await page.waitForTimeout(300);

    await expect(page.locator('tbody tr td:nth-child(2)').first()).toContainText(firstBikeNo);
  });

  test('search shows no results for invalid query', async ({ page }) => {
    await page.getByPlaceholder('Search bike number, chassis no...').fill('XXXXXXXXXXX99999');
    await page.waitForTimeout(300);
    await expect(page.getByText('No bikes found')).toBeVisible();
  });

  test('filter by category works', async ({ page }) => {
    await page.locator('select').first().selectOption('DXB1');
    await page.waitForTimeout(300);

    const noResults = await page.getByText('No bikes found').isVisible();
    if (!noResults) {
      const badges = page.locator('tbody tr td:nth-child(3) span');
      const count = await badges.count();
      for (let i = 0; i < count; i++) {
        await expect(badges.nth(i)).toContainText('DXB1');
      }
    }
  });

  test('opens Add Bike modal', async ({ page }) => {
    await page.getByRole('button', { name: /Add Bike/i }).click();
    await expect(page.getByText('Add New Bike')).toBeVisible();
    await expect(page.getByText('Fill in the registration details')).toBeVisible();
  });

  test('add bike modal closes on cancel', async ({ page }) => {
    await page.getByRole('button', { name: /Add Bike/i }).click();
    await expect(page.getByText('Add New Bike')).toBeVisible();
    await page.getByRole('button', { name: /Cancel/i }).click();
    await expect(page.getByText('Add New Bike')).not.toBeVisible();
  });

  test('add bike modal closes on backdrop click', async ({ page }) => {
    await page.getByRole('button', { name: /Add Bike/i }).click();
    await expect(page.getByText('Add New Bike')).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(page.getByText('Add New Bike')).not.toBeVisible();
  });

  test('adds a new bike and appears in table', async ({ page }) => {
    test.setTimeout(60000);
    const testBikeNo = '77777';

    await page.getByRole('button', { name: /Add Bike/i }).click();
    await expect(page.getByText('Add New Bike')).toBeVisible();

    // Use placeholders since labels have no for/id association
    await page.getByPlaceholder('e.g. 1').fill('77');
    await page.getByPlaceholder('e.g. 42096').fill(testBikeNo);
    await page.locator('div.rounded-2xl select').first().selectOption('DXB2');
    await page.getByPlaceholder('e.g. MD2A11CX9RCB10294').fill('MD2TEST00000000077');
    // Registration Expiry Date — find date input inside modal
    await page.locator('div.rounded-2xl input[type="date"]').last().fill('2025-12-31');
    await page.getByRole('button', { name: /Add to Tracker/i }).click();

    await expect(page.getByText('Add New Bike')).not.toBeVisible({ timeout: 15000 });

    await page.getByPlaceholder('Search bike number, chassis no...').fill(testBikeNo);
    await page.waitForTimeout(500);
    await expect(page.locator('tbody tr td:nth-child(2)').first()).toContainText(testBikeNo);
  });

  test('opens edit modal with pre-filled data', async ({ page }) => {
    await page.locator('[title="Edit"]').first().click();
    await expect(page.getByText('Edit Bike')).toBeVisible({ timeout: 5000 });

    // Check bike number input is pre-filled (use placeholder to find it)
    const bikeNoInput = page.getByPlaceholder('e.g. 42096');
    const val = await bikeNoInput.inputValue();
    expect(Number(val)).toBeGreaterThan(0);
  });

  test('opens mark finished modal', async ({ page }) => {
    await page.locator('[title="Mark as Finished"]').first().click();
    await expect(page.getByRole('heading', { name: 'Mark as Finished' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel(/Date Finished/i)).toBeVisible();
    await expect(page.getByLabel(/New Expiry Date/i)).toBeVisible();
  });

  test('mark finished modal closes on cancel', async ({ page }) => {
    await page.locator('[title="Mark as Finished"]').first().click();
    await expect(page.getByRole('heading', { name: 'Mark as Finished' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Cancel/i }).click();
    await expect(page.getByRole('heading', { name: 'Mark as Finished' })).not.toBeVisible();
  });

  test('delete shows confirmation dialog', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Delete');
      await dialog.dismiss();
    });
    await page.locator('[title="Delete"]').first().click();
  });
});
