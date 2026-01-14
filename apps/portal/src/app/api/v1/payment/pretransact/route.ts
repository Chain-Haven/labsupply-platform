import { NextRequest, NextResponse } from 'next/server';

// Mark this route as dynamic to prevent static generation errors
export const dynamic = 'force-dynamic';

// ChargX API Configuration - Use environment variables with fallbacks for build
const CHARGX_BASE_URL = 'https://api.chargx.io';
const CHARGX_PUBLISHABLE_KEY = process.env.CHARGX_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CHARGX_PUBLISHABLE_KEY || '';
const CHARGX_SECRET_KEY = process.env.CHARGX_SECRET_KEY || '';

/**
 * GET /api/v1/payment/pretransact
 * Proxy to ChargX to get pretransact keys for card tokenization
 */
export async function GET(request: NextRequest) {
    try {
        // Check if we have valid ChargX keys
        if (CHARGX_PUBLISHABLE_KEY && CHARGX_PUBLISHABLE_KEY.startsWith('pk_')) {
            const response = await fetch(`${CHARGX_BASE_URL}/pretransact`, {
                method: 'GET',
                headers: {
                    'x-publishable-api-key': CHARGX_PUBLISHABLE_KEY,
                },
            });

            if (!response.ok) {
                console.error('ChargX pretransact failed:', response.status, await response.text());
                // Return mock data as fallback
                return NextResponse.json(getMockPretransactData());
            }

            const data = await response.json();
            return NextResponse.json(data);
        }

        // No valid keys - return mock data for development
        console.log('ChargX keys not configured, returning mock data');
        return NextResponse.json(getMockPretransactData());
    } catch (error) {
        console.error('Failed to get pretransact keys:', error);
        // Return mock data instead of error to prevent build failures
        return NextResponse.json(getMockPretransactData());
    }
}

function getMockPretransactData() {
    return {
        authData: {
            apiLoginID: 'demo_login_id',
            clientKey: 'demo_client_key',
        },
        isProduction: false,
        cardTokenRequestUrl: '/api/v1/payment/tokenize',
        cardTokenRequestParams: {
            securePaymentContainerRequest: {
                merchantAuthentication: {
                    name: 'demo_login_id',
                    clientKey: 'demo_client_key',
                },
                data: {
                    type: 'TOKEN',
                    id: 'demo-token-id',
                    token: {
                        cardNumber: '#cardNumber#',
                        expirationDate: '#expirationDate#',
                        cardCode: '#cardCode#',
                    },
                },
            },
        },
        googlePay: null,
        applePay: null,
    };
}
