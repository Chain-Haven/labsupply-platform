import { test, expect } from '@playwright/test';

test.describe('Password Reset', () => {
    test('login page has forgot password link', async ({ page }) => {
        await page.goto('/login');

        await page.click('button:has-text("Password")');
        await expect(page.locator('a:has-text("Forgot password?")')).toBeVisible();
    });

    test('navigates to forgot password page', async ({ page }) => {
        await page.goto('/login');

        await page.click('button:has-text("Password")');
        await page.click('a:has-text("Forgot password?")');

        await expect(page).toHaveURL(/\/forgot-password/);
    });

    test('forgot password page has email input', async ({ page }) => {
        await page.goto('/forgot-password');

        await expect(page.locator('input[type="email"]')).toBeVisible();
    });
});
