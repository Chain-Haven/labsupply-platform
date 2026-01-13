import { NextRequest, NextResponse } from 'next/server';

// ChargX API Configuration
const CHARGX_BASE_URL = 'https://api.chargx.io';
const CHARGX_PUBLISHABLE_KEY = process.env.CHARGX_PUBLISHABLE_KEY || 'pk_test_demo';

/**
 * GET /api/v1/payment/pretransact
 * Proxy to ChargX to get pretransact keys for card tokenization
 */
export async function GET(request: NextRequest) {
    try {
        // In production, this calls the real ChargX API
        // For demo, return mock data that simulates the response

        if (process.env.NODE_ENV === 'production' && CHARGX_PUBLISHABLE_KEY.startsWith('pk_')) {
            const response = await fetch(`${CHARGX_BASE_URL}/pretransact`, {
                method: 'GET',
                headers: {
                    'x-publishable-api-key': CHARGX_PUBLISHABLE_KEY,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to get pretransact keys from ChargX');
            }

            const data = await response.json();
            return NextResponse.json(data);
        }

        // Demo/development mode: return mock pretransact data
        return NextResponse.json({
            authData: {
                apiLoginID: 'demo_login_id',
                clientKey: 'demo_client_key',
            },
            isProduction: false,
            cardTokenRequestUrl: '/api/v1/payment/tokenize', // Mock tokenization endpoint
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
        });
    } catch (error) {
        console.error('Failed to get pretransact keys:', error);
        return NextResponse.json(
            { error: 'Failed to initialize payment' },
            { status: 500 }
        );
    }
}
