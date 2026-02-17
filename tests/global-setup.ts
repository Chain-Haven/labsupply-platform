/**
 * Playwright global setup.
 * Creates test users in Supabase before running tests.
 */

import { setupTestUsers } from './fixtures/test-users';

export default async function globalSetup() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        console.warn(
            '[global-setup] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Skipping test user creation.'
        );
        return;
    }

    await setupTestUsers();
}
