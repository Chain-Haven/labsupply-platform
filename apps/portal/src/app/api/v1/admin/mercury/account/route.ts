/**
 * GET /api/v1/admin/mercury/account
 * Get Mercury account information (balance, status) for admin dashboard
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const token = process.env.MERCURY_API_TOKEN;
        const accountId = process.env.MERCURY_ACCOUNT_ID;

        if (!token || !accountId) {
            return NextResponse.json({
                data: {
                    name: 'Not Configured',
                    availableBalance: 0,
                    currentBalance: 0,
                    status: 'unconfigured',
                },
            });
        }

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
                { error: 'Failed to fetch Mercury account' },
                { status: 502 }
            );
        }

        const account = await response.json();

        return NextResponse.json({
            data: {
                name: account.name,
                availableBalance: account.availableBalance,
                currentBalance: account.currentBalance,
                status: account.status,
            },
        });
    } catch (error) {
        console.error('Mercury account fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
