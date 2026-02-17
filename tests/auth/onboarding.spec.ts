import { test, expect } from '@playwright/test';
import { loginAsMerchantNeedingOnboarding } from '../fixtures/auth-helpers';
import path from 'path';

// Minimal valid PDF for document upload (required by step 5)
const TEST_PDF_PATH = path.join(__dirname, '../fixtures/test-document.pdf');

test.describe('Merchant Onboarding', () => {
    test.beforeEach(async ({ page }) => {
        // Clear onboarding localStorage to avoid stale state
        await page.goto('/login');
        await page.evaluate(() => localStorage.removeItem('wlp_onboarding'));
    });

    test('merchant needing onboarding is redirected to onboarding', async ({ page }) => {
        await loginAsMerchantNeedingOnboarding(page);
        await expect(page).toHaveURL(/\/onboarding/);
    });

    test('step 1: welcome - select account type and get started', async ({ page }) => {
        await loginAsMerchantNeedingOnboarding(page);
        await expect(page).toHaveURL(/\/onboarding/);

        await expect(page.locator('text=Welcome to WhiteLabel Peptides')).toBeVisible();

        // Select Reseller (simplest - no research credentials required)
        await page.click('button:has-text("Reseller")');

        // Check agreements
        await page.check('input[type="checkbox"]');
        await page.check('input[type="checkbox"]'); // Both checkboxes

        await page.click('button:has-text("Get Started")');

        await expect(page.locator('text=Business Information')).toBeVisible({ timeout: 5000 });
    });

    test('completes full onboarding flow through all steps', async ({ page }) => {
        await loginAsMerchantNeedingOnboarding(page);
        await expect(page).toHaveURL(/\/onboarding/);

        // Step 1: Welcome
        await page.click('button:has-text("Reseller")');
        await page.check('input[type="checkbox"]');
        await page.check('input[type="checkbox"]');
        await page.click('button:has-text("Get Started")');

        // Step 2: Business Info
        await expect(page.locator('text=Business Information')).toBeVisible({ timeout: 5000 });
        await page.fill('input[placeholder="Your Company LLC"]', 'Test Company LLC');
        await page.selectOption('select', 'llc');
        await page.fill('input[placeholder="XX-XXXXXXX"]', '12-3456789');
        await page.fill('input[placeholder="+1 (555) 000-0000"]', '5551234567');
        await page.click('button:has-text("Continue")');

        // Step 3: Address
        await expect(page.locator('text=Business Address')).toBeVisible({ timeout: 5000 });
        await page.fill('input[placeholder="123 Business Street"]', '123 Test St');
        await page.fill('input[placeholder="City"]', 'San Francisco');
        await page.selectOption('select', 'CA');
        await page.fill('input[placeholder="12345"]', '94105');
        await page.click('button:has-text("Continue")');

        // Step 4: Contact
        await expect(page.locator('text=Primary Contact')).toBeVisible({ timeout: 5000 });
        await page.fill('input[placeholder="John"]', 'John');
        await page.fill('input[placeholder="Smith"]', 'Smith');
        await page.fill('input[placeholder="e.g., CEO, Director, Owner"]', 'Owner');
        await page.fill('input[placeholder="john@company.com"]', 'merchant-onboarding@example.com');
        await page.fill('input[placeholder="+1 (555) 000-0000"]', '5551234567');
        await page.click('button:has-text("Continue")');

        // Step 5: Documents - upload Business License (required)
        await expect(page.locator('text=Compliance Documents')).toBeVisible({ timeout: 5000 });

        // Find the first file input (Business License) - it's in a hidden input
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(TEST_PDF_PATH);

        // Wait for upload to complete (DocumentUploader has 1s delay)
        await page.waitForTimeout(1500);

        // LLC also requires Articles of Incorporation
        const articlesInput = page.locator('input[type="file"]').nth(1);
        await articlesInput.setInputFiles(TEST_PDF_PATH);
        await page.waitForTimeout(1500);

        // Government ID (4th uploader: Business License, Articles, Tax Exempt, Gov ID)
        const govIdInput = page.locator('input[type="file"]').nth(3);
        await govIdInput.setInputFiles(TEST_PDF_PATH);
        await page.waitForTimeout(1500);

        await page.click('button:has-text("Continue")');

        // Step 6: Review - check acknowledgments and submit
        await expect(page.locator('text=Review & Submit')).toBeVisible({ timeout: 5000 });
        await page.getByRole('checkbox').nth(0).check();
        await page.getByRole('checkbox').nth(1).check();
        await page.getByRole('checkbox').nth(2).check();
        await page.click('button:has-text("Submit Application")');

        // Complete page
        await expect(page.locator('text=Application Submitted!')).toBeVisible({ timeout: 10000 });
    });
});
