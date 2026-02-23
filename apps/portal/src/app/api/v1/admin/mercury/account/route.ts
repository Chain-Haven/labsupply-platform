/**
 * GET /api/v1/admin/mercury/account
 * Get Mercury account information (balance, status) for admin dashboard
 * ?include_all=true also returns all organization accounts for deposit account selection
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const token = process.env.MERCURY_API_TOKEN;

        if (!token) {
            return NextResponse.json({
                data: {
                    id: '',
                    name: 'Not Configured - Set MERCURY_API_TOKEN',
                    availableBalance: 0,
                    currentBalance: 0,
                    status: 'unconfigured',
                },
            });
        }

        // Auto-discover account ID if not in env
        let accountId = process.env.MERCURY_ACCOUNT_ID;
        if (!accountId) {
            try {
                const allRes = await fetch('https://api.mercury.com/api/v1/accounts', {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
                });
                if (allRes.ok) {
                    const allData = await allRes.json();
                    const checking = (allData.accounts || []).find(
                        (a: Record<string, string>) => a.type === 'checking' && a.status === 'active'
                    ) || (allData.accounts || [])[0];
                    if (checking) accountId = checking.id;
                }
            } catch (e) {
                console.error('Auto-discover account error:', e);
            }
        }

        if (!accountId) {
            return NextResponse.json({
                data: {
                    id: '',
                    name: 'No Mercury accounts found',
                    availableBalance: 0,
                    currentBalance: 0,
                    status: 'no_accounts',
                },
            });
        }

        const { searchParams } = new URL(request.url);
        const includeAll = searchParams.get('include_all') === 'true';

        // Fetch primary account
        const response = await fetch(
            `https://api.mercury.com/api/v1/account/${accountId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            console.error('Mercury API error:', response.status, response.statusText);
            return NextResponse.json(
                { error: 'Failed to fetch Mercury account details. The Mercury API may be temporarily unavailable — try again later.' },
                { status: 502 }
            );
        }

        const account = await response.json();

        const result: Record<string, unknown> = {
            data: {
                id: account.id,
                name: account.name,
                availableBalance: account.availableBalance,
                currentBalance: account.currentBalance,
                status: account.status,
            },
        };

        // Optionally fetch all accounts for the deposit account selector
        if (includeAll) {
            try {
                const allRes = await fetch('https://api.mercury.com/api/v1/accounts', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                });

                if (allRes.ok) {
                    const allData = await allRes.json();
                    const accounts = (allData.accounts || []).map((a: Record<string, unknown>) => ({
                        id: a.id,
                        name: a.name,
                        type: a.type,
                        status: a.status,
                    }));
                    (result.data as Record<string, unknown>).allAccounts = accounts;
                }
            } catch (err) {
                console.error('Error fetching all Mercury accounts:', err);
            }
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Mercury account fetch error:', error);
        return NextResponse.json({ error: 'Mercury account operation failed unexpectedly. Please try again.' }, { status: 500 });
    }
}
