import { test, expect } from '@playwright/test';

test.describe('Merchant Registration', () => {
    test('shows registration form with required fields', async ({ page }) => {
        await page.goto('/register');

        await expect(page.locator('text=Create your account')).toBeVisible();
        await expect(page.getByPlaceholder('Your Company LLC')).toBeVisible();
        await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
        await expect(page.getByPlaceholder('Minimum 8 characters')).toBeVisible();
        await expect(page.getByPlaceholder('Re-enter your password')).toBeVisible();
        await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible();
    });

    test('shows validation error for short password', async ({ page }) => {
        await page.goto('/register');

        await page.fill('input[placeholder="Your Company LLC"]', 'Test Company LLC');
        await page.fill('input[placeholder="you@company.com"]', 'new-merchant@example.com');
        await page.fill('input[placeholder="Minimum 8 characters"]', 'short');
        await page.fill('input[placeholder="Re-enter your password"]', 'short');
        await page.click('button:has-text("Create Account")');

        await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible({ timeout: 5000 });
    });

    test('shows validation error when passwords do not match', async ({ page }) => {
        await page.goto('/register');

        await page.fill('input[placeholder="Your Company LLC"]', 'Test Company LLC');
        await page.fill('input[placeholder="you@company.com"]', 'new-merchant@example.com');
        await page.fill('input[placeholder="Minimum 8 characters"]', 'password123');
        await page.fill('input[placeholder="Re-enter your password"]', 'different123');
        await page.click('button:has-text("Create Account")');

        await expect(page.locator('text=Passwords do not match')).toBeVisible({ timeout: 5000 });
    });

    test('shows email verification screen after successful registration', async ({ page }) => {
        const uniqueEmail = `test-${Date.now()}@example.com`;

        await page.goto('/register');

        await page.fill('input[placeholder="Your Company LLC"]', 'Test Company LLC');
        await page.fill('input[placeholder="you@company.com"]', uniqueEmail);
        await page.fill('input[placeholder="Minimum 8 characters"]', 'password123');
        await page.fill('input[placeholder="Re-enter your password"]', 'password123');
        await page.click('button:has-text("Create Account")');

        await expect(page.locator('text=Verify your email')).toBeVisible({ timeout: 10000 });
        await expect(page.locator(`text=${uniqueEmail}`)).toBeVisible();
    });
});
