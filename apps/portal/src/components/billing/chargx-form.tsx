'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    CreditCard,
    Lock,
    Loader2,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChargXPretransactResponse {
    authData: {
        apiLoginID: string;
        clientKey: string;
    };
    isProduction: boolean;
    cardTokenRequestUrl: string;
    cardTokenRequestParams: Record<string, unknown>;
}

interface ChargXFormProps {
    amount: number;
    onSuccess: (result: {
        transactionId: string;
        newBalance: number;
        displayId: string;
    }) => void;
    onError: (error: string) => void;
    onCancel?: () => void;
    customer: {
        name: string;
        email: string;
        phone?: string;
    };
    merchantId?: string;
    billingAddress?: {
        street: string;
        unit?: string;
        city: string;
        state: string;
        zipCode: string;
        countryCode?: string;
    };
    saveCard?: boolean;
    className?: string;
}

export function ChargXPaymentForm({
    amount,
    onSuccess,
    onError,
    onCancel,
    customer,
    merchantId,
    billingAddress,
    saveCard = false,
    className,
}: ChargXFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [pretransactData, setPretransactData] = useState<ChargXPretransactResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Card form state
    const [cardNumber, setCardNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [cvv, setCvv] = useState('');
    const [cardholderName, setCardholderName] = useState(customer.name || '');

    // Fetch pretransact keys on mount
    useEffect(() => {
        async function fetchPretransactKeys() {
            try {
                const response = await fetch('/api/v1/payment/pretransact');
                if (!response.ok) {
                    throw new Error('Failed to initialize payment');
                }
                const data = await response.json();
                setPretransactData(data);
            } catch (err) {
                setError('Failed to initialize payment. Please try again.');
                onError('Payment initialization failed');
            } finally {
                setIsInitializing(false);
            }
        }

        fetchPretransactKeys();
    }, [onError]);

    // Format card number with spaces
    const formatCardNumber = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        const groups = cleaned.match(/.{1,4}/g);
        return groups ? groups.join(' ').slice(0, 19) : cleaned;
    };

    // Format expiry date as MM/YY
    const formatExpiryDate = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length >= 2) {
            return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
        }
        return cleaned;
    };

    // Get card type from number
    const getCardType = (number: string) => {
        const cleaned = number.replace(/\D/g, '');
        if (cleaned.startsWith('4')) return 'visa';
        if (/^5[1-5]/.test(cleaned)) return 'mastercard';
        if (/^3[47]/.test(cleaned)) return 'amex';
        if (/^6011/.test(cleaned)) return 'discover';
        return null;
    };

    // Tokenize card and process payment
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!pretransactData) {
            setError('Payment not initialized. Please refresh and try again.');
            return;
        }

        // Validate inputs
        const cleanedCardNumber = cardNumber.replace(/\D/g, '');
        if (cleanedCardNumber.length < 15) {
            setError('Please enter a valid card number');
            return;
        }

        if (expiryDate.length !== 5) {
            setError('Please enter a valid expiry date (MM/YY)');
            return;
        }

        if (cvv.length < 3) {
            setError('Please enter a valid CVV');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Step 1: Tokenize the card
            const tokenRequestParams = JSON.stringify(pretransactData.cardTokenRequestParams)
                .replace('#cardNumber#', cleanedCardNumber)
                .replace('#expirationDate#', expiryDate.replace('/', ''))
                .replace('#cardCode#', cvv);

            const tokenResponse = await fetch(pretransactData.cardTokenRequestUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: tokenRequestParams,
            });

            const tokenData = await tokenResponse.json();

            // Extract opaque data (format depends on processor)
            let opaqueData: Record<string, string>;
            if (tokenData.opaqueData) {
                opaqueData = tokenData.opaqueData;
            } else if (tokenData.token) {
                opaqueData = { token: tokenData.token };
            } else {
                throw new Error('Failed to tokenize card');
            }

            // Step 2: Process payment with our backend
            const paymentResponse = await fetch('/api/v1/wallet/topup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-merchant-id': merchantId || '', // Merchant ID from authenticated session
                },
                body: JSON.stringify({
                    amount,
                    opaqueData,
                    saveCard,
                    customer: {
                        name: cardholderName || customer.name,
                        email: customer.email,
                        phone: customer.phone,
                    },
                    billingAddress: billingAddress ? {
                        ...billingAddress,
                        countryCode: billingAddress.countryCode || 'USA',
                    } : undefined,
                }),
            });

            const paymentResult = await paymentResponse.json();

            if (!paymentResponse.ok) {
                throw new Error(paymentResult.error || 'Payment failed');
            }

            onSuccess({
                transactionId: paymentResult.result.transaction_id,
                displayId: paymentResult.result.display_id,
                newBalance: paymentResult.result.new_balance_cents / 100,
            });

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Payment failed';
            setError(errorMessage);
            onError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (isInitializing) {
        return (
            <Card className={className}>
                <CardContent className="p-6 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-600 mr-2" />
                    <span className="text-gray-500">Initializing secure payment...</span>
                </CardContent>
            </Card>
        );
    }

    const cardType = getCardType(cardNumber);

    return (
        <Card className={className}>
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Details
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Secured by ChargX
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Cardholder Name */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Cardholder Name
                        </label>
                        <Input
                            value={cardholderName}
                            onChange={(e) => setCardholderName(e.target.value)}
                            placeholder="John Smith"
                            className="mt-1"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {/* Card Number */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Card Number
                        </label>
                        <div className="relative mt-1">
                            <Input
                                value={cardNumber}
                                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                placeholder="4111 1111 1111 1111"
                                maxLength={19}
                                className="pr-12"
                                required
                                disabled={isLoading}
                            />
                            {cardType && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <span className={cn(
                                        'text-xs font-medium uppercase px-1.5 py-0.5 rounded',
                                        cardType === 'visa' && 'bg-blue-100 text-blue-700',
                                        cardType === 'mastercard' && 'bg-orange-100 text-orange-700',
                                        cardType === 'amex' && 'bg-cyan-100 text-cyan-700',
                                        cardType === 'discover' && 'bg-purple-100 text-purple-700'
                                    )}>
                                        {cardType}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Expiry and CVV */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Expiry Date
                            </label>
                            <Input
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                                placeholder="MM/YY"
                                maxLength={5}
                                className="mt-1"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                CVV
                            </label>
                            <Input
                                type="password"
                                value={cvv}
                                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="•••"
                                maxLength={4}
                                className="mt-1"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Amount Display */}
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">Amount to charge:</span>
                            <span className="text-xl font-bold text-gray-900 dark:text-white">
                                ${amount.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Pay ${amount.toFixed(2)}
                                </>
                            )}
                        </Button>
                        {onCancel && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onCancel}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                        )}
                    </div>

                    {/* Security Badge */}
                    <p className="text-xs text-center text-gray-500 mt-4">
                        <Lock className="w-3 h-3 inline mr-1" />
                        Your payment info is encrypted and secure
                    </p>
                </form>
            </CardContent>
        </Card>
    );
}

export default ChargXPaymentForm;
