/**
 * Playwright auth helpers for E2E tests.
 * Provides utilities for logging in and asserting auth state.
 */

import { Page } from '@playwright/test';
import { TEST_USERS } from './test-users';

/**
 * Log in as a merchant on the main portal (/login).
 */
export async function loginAsMerchant(page: Page, options?: { useMagicLink?: boolean }): Promise<void> {
    await page.goto('/login');

    if (options?.useMagicLink) {
        // Magic link mode is default; click Send Magic Link
        await page.fill('input[placeholder="you@company.com"]', TEST_USERS.merchant.email);
        await page.click('button:has-text("Send Magic Link")');
        // Wait for success message - actual magic link cannot be clicked in tests
        await page.waitForSelector('text=Magic link sent!', { timeout: 10000 });
        await page.waitForSelector('text=Check your email', { timeout: 5000 });
        return;
    }

    // Password mode: switch to Password tab, fill and submit
    await page.click('button:has-text("Password")');
    await page.fill('input[placeholder="you@company.com"]', TEST_USERS.merchant.email);
    await page.fill('input[placeholder="Enter your password"]', TEST_USERS.merchant.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

/**
 * Log in as admin on the admin portal (/admin/login).
 */
export async function loginAsAdmin(page: Page): Promise<void> {
    await page.goto('/admin/login');

    await page.click('button:has-text("Password")');
    await page.fill('input[placeholder="admin@example.com"]', TEST_USERS.admin.email);
    await page.fill('input[placeholder="Enter your password"]', TEST_USERS.admin.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/\/admin/, { timeout: 15000 });
}

/**
 * Log in as merchant who needs onboarding (kyb_status: not_started).
 */
export async function loginAsMerchantNeedingOnboarding(page: Page): Promise<void> {
    await page.goto('/login');

    await page.click('button:has-text("Password")');
    await page.fill('input[placeholder="you@company.com"]', TEST_USERS.merchantOnboarding.email);
    await page.fill('input[placeholder="Enter your password"]', TEST_USERS.merchantOnboarding.password);
    await page.click('button:has-text("Sign In")');
    // Should redirect to onboarding or dashboard
    await page.waitForURL(/\/(?:onboarding|dashboard)/, { timeout: 15000 });
}
