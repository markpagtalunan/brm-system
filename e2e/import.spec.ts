import { test, expect } from '@playwright/test';
import path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';

function createTestExcel(filePath: string) {
  const rows = [
    { SRL: 101, 'BIKE NUMBER': 11111, CATEGORY: 'DXB1', 'CHASSIS NO': 'MD2TEST00000000011', 'TC NO': '12345678', YEAR: 2024, 'REGISTRATION EXPIRY DATE': '2025-06-30', 'PENDING REMARKS': 'ON HIRE', 'RENEWAL REMARKS': '', 'SUB STATUS': '', 'PASSING DATE': '', 'NEW NUMBER': '', 'DATE FINISHED': '', 'NEW EXPIRY DATE': '' },
    { SRL: 102, 'BIKE NUMBER': 22222, CATEGORY: 'SHJ', 'CHASSIS NO': 'MD2TEST00000000022', 'TC NO': '23456789', YEAR: 2023, 'REGISTRATION EXPIRY DATE': '2025-08-15', 'PENDING REMARKS': 'UNDER PASSING FOR RENEWAL', 'RENEWAL REMARKS': 'Test import', 'SUB STATUS': '', 'PASSING DATE': '', 'NEW NUMBER': '', 'DATE FINISHED': '', 'NEW EXPIRY DATE': '' },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'TRACKER');
  XLSX.writeFile(wb, filePath);
}

function createMultiSheetExcel(filePath: string) {
  const rows = [{ SRL: 1, 'BIKE NUMBER': 33333, CATEGORY: 'RAK', 'CHASSIS NO': 'MD2TEST00000000033', 'TC NO': '99887766', YEAR: 2024, 'REGISTRATION EXPIRY DATE': '2025-10-01', 'PENDING REMARKS': '', 'RENEWAL REMARKS': '', 'SUB STATUS': '', 'PASSING DATE': '', 'NEW NUMBER': '', 'DATE FINISHED': '', 'NEW EXPIRY DATE': '' }];
  const ws1 = XLSX.utils.json_to_sheet(rows);
  const ws2 = XLSX.utils.json_to_sheet([]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'TRACKER');
  XLSX.utils.book_append_sheet(wb, ws2, 'FINISHED');
  XLSX.writeFile(wb, filePath);
}

test.describe('Import Excel', () => {
  let testExcelPath: string;
  let multiSheetPath: string;

  test.beforeAll(() => {
    testExcelPath = path.join(process.cwd(), 'e2e', 'test-import.xlsx');
    multiSheetPath = path.join(process.cwd(), 'e2e', 'multi-sheet.xlsx');
    createTestExcel(testExcelPath);
    createMultiSheetExcel(multiSheetPath);
  });

  test.afterAll(() => {
    [testExcelPath, multiSheetPath].forEach((f) => { if (fs.existsSync(f)) fs.unlinkSync(f); });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 15000 });
  });

  test('Import Excel button opens modal', async ({ page }) => {
    await page.getByRole('button', { name: /Import Excel/i }).click();
    await expect(page.getByText('Import from Excel')).toBeVisible();
    await expect(page.getByText('Upload your MONITORING SHEET.xlsx')).toBeVisible();
  });

  test('modal closes on cancel', async ({ page }) => {
    await page.getByRole('button', { name: /Import Excel/i }).click();
    await expect(page.getByText('Import from Excel')).toBeVisible();
    await page.getByRole('button', { name: /Cancel/i }).click();
    await expect(page.getByText('Import from Excel')).not.toBeVisible();
  });

  test('modal closes on backdrop click', async ({ page }) => {
    await page.getByRole('button', { name: /Import Excel/i }).click();
    await expect(page.getByText('Import from Excel')).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(page.getByText('Import from Excel')).not.toBeVisible();
  });

  test('uploads excel and shows preview', async ({ page }) => {
    await page.getByRole('button', { name: /Import Excel/i }).click();
    await page.locator('input[type="file"]').setInputFiles(testExcelPath);

    await expect(page.getByText('test-import.xlsx')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/2 rows detected/i)).toBeVisible();
    await expect(page.getByText('Preview — first 5 rows')).toBeVisible();
    await expect(page.getByText('11111')).toBeVisible();
    await expect(page.getByText('22222')).toBeVisible();
  });

  test('shows sheet selector for multi-sheet workbooks', async ({ page }) => {
    await page.getByRole('button', { name: /Import Excel/i }).click();
    await page.locator('input[type="file"]').setInputFiles(multiSheetPath);

    // Scope to modal to avoid sidebar "Finished" button collision
    const modal = page.locator('div.rounded-2xl').last();
    await expect(modal.getByRole('button', { name: 'TRACKER' })).toBeVisible({ timeout: 5000 });
    await expect(modal.getByRole('button', { name: 'FINISHED' })).toBeVisible();
  });

  test('can switch between sheets', async ({ page }) => {
    await page.getByRole('button', { name: /Import Excel/i }).click();
    await page.locator('input[type="file"]').setInputFiles(multiSheetPath);

    const modal = page.locator('div.rounded-2xl').last();
    await expect(modal.getByRole('button', { name: 'TRACKER' })).toBeVisible({ timeout: 5000 });
    await modal.getByRole('button', { name: 'FINISHED' }).click();
    await expect(page.getByText(/0 rows detected/i)).toBeVisible();
  });

  test('imports bikes and shows success', async ({ page }) => {
    test.slow(); // Triples the default timeout — Firestore writes need extra time

    await page.getByRole('button', { name: /Import Excel/i }).click();
    await page.locator('input[type="file"]').setInputFiles(testExcelPath);
    await expect(page.getByText(/2 rows detected/i)).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: /Import 2 bikes/i }).click();

    await expect(page.getByText('Import complete!')).toBeVisible({ timeout: 120000 });
    await expect(page.getByText(/2 imported successfully/i)).toBeVisible();
  });
});
