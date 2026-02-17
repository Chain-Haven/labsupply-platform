import { test, expect } from '@playwright/test';

test.describe('Auth Error Scenarios', () => {
    test('unauthenticated user cannot access dashboard', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/login/);
    });

    test('unauthenticated user cannot access admin', async ({ page }) => {
        await page.goto('/admin');
        await expect(page).toHaveURL(/\/admin\/login/);
    });

    test('merchant cannot access admin login with merchant credentials', async ({ page }) => {
        await page.goto('/admin/login');

        await page.click('button:has-text("Password")');
        await page.fill('input[placeholder="admin@example.com"]', 'merchant-test@example.com');
        await page.fill('input[placeholder="Enter your password"]', 'testpass123');
        await page.click('button:has-text("Sign In")');

        await expect(page.locator('text=You do not have admin access')).toBeVisible({ timeout: 10000 });
    });

    test('login shows error for empty credentials', async ({ page }) => {
        await page.goto('/login');

        await page.click('button:has-text("Password")');
        await page.click('button:has-text("Sign In")');

        await expect(page.locator('text=Please enter email and password')).toBeVisible({ timeout: 5000 });
    });

    test('register shows error for missing company name', async ({ page }) => {
        await page.goto('/register');

        await page.fill('input[placeholder="you@company.com"]', 'test@example.com');
        await page.fill('input[placeholder="Minimum 8 characters"]', 'password123');
        await page.fill('input[placeholder="Re-enter your password"]', 'password123');
        await page.click('button:has-text("Create Account")');

        await expect(page.locator('text=Company name is required')).toBeVisible({ timeout: 5000 });
    });
});
