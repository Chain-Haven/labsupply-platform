/**
 * Creates verified test users in Supabase for E2E testing.
 * Uses service role to create users with email_confirm: true (no email verification needed).
 *
 * Usage: pnpm create:test-user
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    });
}

export type TestUserType = 'admin' | 'merchant' | 'merchant_onboarding';

export interface CreateVerifiedUserOptions {
    /** Skip onboarding: use kyb_status 'approved'. If false, use 'not_started' for onboarding tests. */
    skipOnboarding?: boolean;
}

/**
 * Create a verified user in Supabase (email pre-confirmed).
 * For admins: inserts into admin_users.
 * For merchants: inserts into merchants with appropriate kyb_status.
 */
export async function createVerifiedUser(
    email: string,
    password: string,
    type: 'admin' | 'merchant',
    options: CreateVerifiedUserOptions = {}
): Promise<{ id: string; email: string }> {
    const { skipOnboarding = true } = options;

    const supabase = getSupabase();
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: `${type} Test User` },
    });

    if (userError) throw userError;
    if (!userData.user) throw new Error('No user returned from createUser');

    if (type === 'admin') {
        const { error: adminError } = await supabase.from('admin_users').insert({
            user_id: userData.user.id,
            email,
            name: `${type} Test User`,
            role: 'admin',
        });

        if (adminError) throw adminError;
    } else {
        const { error: merchantError } = await supabase.from('merchants').insert({
            user_id: userData.user.id,
            email,
            company_name: `${type} Test Company`,
            status: 'approved',
            kyb_status: skipOnboarding ? 'approved' : 'not_started',
            wallet_balance_cents: 100000,
        });

        if (merchantError) throw merchantError;
    }

    return { id: userData.user.id, email: userData.user.email! };
}

const TEST_USERS = [
    { email: 'admin-test@example.com', password: 'testpass123', type: 'admin' as const },
    {
        email: 'merchant-test@example.com',
        password: 'testpass123',
        type: 'merchant' as const,
        skipOnboarding: true,
    },
    {
        email: 'merchant-onboarding@example.com',
        password: 'testpass123',
        type: 'merchant' as const,
        skipOnboarding: false,
    },
];

async function ensureMerchantProfile(userId: string, email: string, skipOnboarding: boolean) {
    const supabase = getSupabase();
    const { data: existing } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', userId)
        .single();

    if (existing) {
        console.log(`  - Merchant profile already exists for ${email}`);
        return;
    }

    const { error } = await supabase.from('merchants').insert({
        user_id: userId,
        email,
        company_name: 'Test Company',
        status: 'approved',
        kyb_status: skipOnboarding ? 'approved' : 'not_started',
        wallet_balance_cents: 100000,
    });

    if (error) throw error;
    console.log(`  - Created merchant profile for ${email}`);
}

async function ensureAdminProfile(userId: string, email: string) {
    const supabase = getSupabase();
    const { data: existing } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', userId)
        .single();

    if (existing) {
        console.log(`  - Admin profile already exists for ${email}`);
        return;
    }

    const { error } = await supabase.from('admin_users').insert({
        user_id: userId,
        email,
        name: 'admin Test User',
        role: 'admin',
    });

    if (error) throw error;
    console.log(`  - Created admin profile for ${email}`);
}

async function main() {
    console.log('Creating test users...\n');

    const supabase = getSupabase();

    for (const user of TEST_USERS) {
        try {
            const { id, email } = await createVerifiedUser(
                user.email,
                user.password,
                user.type,
                { skipOnboarding: user.skipOnboarding ?? true }
            );
            console.log(`✓ Created ${user.type} test user: ${email} (${id})`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('already been registered') || msg.includes('duplicate')) {
                console.log(`- ${user.type} auth user already exists: ${user.email}`);
                // Look up the existing user and ensure profile exists
                const { data } = await supabase.auth.admin.listUsers();
                const existingUser = data?.users?.find(u => u.email === user.email);
                if (existingUser) {
                    if (user.type === 'merchant') {
                        await ensureMerchantProfile(existingUser.id, user.email, user.skipOnboarding ?? true);
                    } else if (user.type === 'admin') {
                        await ensureAdminProfile(existingUser.id, user.email);
                    }
                }
            } else {
                console.error(`✗ Failed to create ${user.email}:`, msg);
                process.exit(1);
            }
        }
    }

    console.log('\nDone.');
}

// Only run when executed directly (pnpm create:test-user), not when imported by tests
if (process.argv[1]?.includes('create-test-user')) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        console.error('Missing required environment variables:');
        console.error('- NEXT_PUBLIC_SUPABASE_URL');
        console.error('- SUPABASE_SERVICE_ROLE_KEY');
        process.exit(1);
    }
    main();
}
