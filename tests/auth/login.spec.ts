import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsMerchant } from '../fixtures/auth-helpers';

test.describe('Merchant Login', () => {
    test('shows login page with email and password options', async ({ page }) => {
        await page.goto('/login');

        await expect(page.locator('text=Welcome back')).toBeVisible();
        await expect(page.locator('text=Sign in to your merchant account')).toBeVisible();
        await expect(page.getByRole('button', { name: /Magic Link/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Password/i })).toBeVisible();
    });

    test('merchant can log in with password and reach dashboard', async ({ page }) => {
        await loginAsMerchant(page);
        await expect(page).toHaveURL(/\/dashboard/);
        await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
    });

    test('shows error for invalid credentials', async ({ page }) => {
        await page.goto('/login');

        await page.click('button:has-text("Password")');
        await page.fill('input[placeholder="you@company.com"]', 'invalid@example.com');
        await page.fill('input[placeholder="Enter your password"]', 'wrongpassword');
        await page.click('button:has-text("Sign In")');

        await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 5000 });
    });
});

test.describe('Admin Login', () => {
    test('shows admin login page', async ({ page }) => {
        await page.goto('/admin/login');

        await expect(page.locator('text=Admin Portal')).toBeVisible();
        await expect(page.locator('text=Sign in to access')).toBeVisible();
    });

    test('admin can log in with password and reach admin dashboard', async ({ page }) => {
        await loginAsAdmin(page);
        await expect(page).toHaveURL(/\/admin/);
    });
});
