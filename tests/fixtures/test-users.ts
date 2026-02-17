/**
 * Test user credentials and setup for E2E auth tests.
 * Users are created via scripts/create-test-user.ts (run pnpm create:test-user).
 */

import { createVerifiedUser } from '../../scripts/create-test-user';

export const TEST_USERS = {
    admin: {
        email: 'admin-test@example.com',
        password: 'testpass123',
        type: 'admin' as const,
    },
    merchant: {
        email: 'merchant-test@example.com',
        password: 'testpass123',
        type: 'merchant' as const,
        skipOnboarding: true,
    },
    merchantOnboarding: {
        email: 'merchant-onboarding@example.com',
        password: 'testpass123',
        type: 'merchant' as const,
        skipOnboarding: false,
    },
};

export async function setupTestUsers(): Promise<void> {
    for (const [key, user] of Object.entries(TEST_USERS)) {
        try {
            await createVerifiedUser(user.email, user.password, user.type, {
                skipOnboarding: user.skipOnboarding ?? true,
            });
            console.log(`✓ Created ${key} test user: ${user.email}`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('already been registered') || msg.includes('duplicate')) {
                console.log(`- ${key} test user already exists: ${user.email}`);
            } else {
                console.error(`✗ Failed to create ${key} (${user.email}):`, msg);
                throw err;
            }
        }
    }
}
