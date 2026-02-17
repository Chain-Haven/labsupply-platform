import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';

test.describe('Magic Link', () => {
    test('merchant login shows magic link option and sends link', async ({ page }) => {
        await page.goto('/login');

        // Magic link is default mode
        await expect(page.getByRole('button', { name: /Send Magic Link/i })).toBeVisible();

        await page.fill('input[placeholder="you@company.com"]', TEST_USERS.merchant.email);
        await page.click('button:has-text("Send Magic Link")');

        await expect(page.locator('text=Magic link sent!')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Check your email')).toBeVisible();
    });

    test('admin login shows magic link option and sends link', async ({ page }) => {
        await page.goto('/admin/login');

        await expect(page.getByRole('button', { name: /Send Magic Link/i })).toBeVisible();

        await page.fill('input[placeholder="admin@example.com"]', TEST_USERS.admin.email);
        await page.click('button:has-text("Send Magic Link")');

        await expect(page.locator('text=Magic link sent!')).toBeVisible({ timeout: 10000 });
    });

    test('shows error when email is empty', async ({ page }) => {
        await page.goto('/login');

        await page.click('button:has-text("Send Magic Link")');

        await expect(page.locator('text=Please enter your email address')).toBeVisible({ timeout: 3000 });
    });
});
