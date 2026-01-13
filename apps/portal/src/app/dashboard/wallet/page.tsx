'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Wallet,
    Plus,
    ArrowUpRight,
    ArrowDownRight,
    CreditCard,
    Clock,
    CheckCircle,
    AlertCircle,
    X,
    Lock,
    Shield,
    Info
} from 'lucide-react';
import { cn, formatCurrency, formatRelativeTime } from '@/lib/utils';
import { ChargXPaymentForm } from '@/components/billing/chargx-form';
import { toast } from '@/hooks/use-toast';

// Compliance reserve constant - mandatory $500 minimum
const COMPLIANCE_RESERVE_CENTS = 50000; // $500.00

// Mock data
const initialWalletData = {
    balance_cents: 75000, // $750
    reserved_cents: 5895,
    compliance_reserve_cents: COMPLIANCE_RESERVE_CENTS,
    currency: 'USD',
};

const initialTransactions = [
    { id: '1', type: 'TOPUP', amount_cents: 25000, date: '2024-01-10T10:30:00Z', status: 'completed', description: 'Wallet top-up via ChargX' },
    { id: '2', type: 'RESERVATION', amount_cents: -5895, date: '2024-01-10T11:00:00Z', status: 'pending', description: 'Order #1001 reservation' },
    { id: '3', type: 'SETTLEMENT', amount_cents: -4500, date: '2024-01-09T14:20:00Z', status: 'completed', description: 'Order #998 settled' },
    { id: '4', type: 'TOPUP', amount_cents: 50000, date: '2024-01-08T09:00:00Z', status: 'completed', description: 'Wallet top-up via ChargX' },
    { id: '5', type: 'SETTLEMENT', amount_cents: -3200, date: '2024-01-07T16:45:00Z', status: 'completed', description: 'Order #995 settled' },
];

const topUpAmounts = [5000, 10000, 25000, 50000, 100000];

export default function WalletPage() {
    const [walletData, setWalletData] = useState(initialWalletData);
    const [transactions, setTransactions] = useState(initialTransactions);
    const [customAmount, setCustomAmount] = useState('');
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);

    // Available balance = Total - Reserved - Compliance Reserve
    const availableBalance = walletData.balance_cents - walletData.reserved_cents - COMPLIANCE_RESERVE_CENTS;
    const usableBalance = Math.max(0, availableBalance);
    const isComplianceMet = walletData.balance_cents >= COMPLIANCE_RESERVE_CENTS;

    const getTopUpAmount = () => {
        if (selectedAmount) return selectedAmount / 100;
        if (customAmount) return parseFloat(customAmount);
        return 0;
    };

    const handleContinueToPayment = () => {
        const amount = getTopUpAmount();
        if (amount < 5) {
            toast({
                title: 'Invalid amount',
                description: 'Minimum top-up amount is $5.00',
                variant: 'destructive'
            });
            return;
        }
        setShowPaymentForm(true);
    };

    const handlePaymentSuccess = (result: { transactionId: string; newBalance: number; displayId: string }) => {
        // Update wallet balance
        const amountCents = getTopUpAmount() * 100;
        setWalletData(prev => ({
            ...prev,
            balance_cents: prev.balance_cents + amountCents
        }));

        // Add transaction to history
        setTransactions(prev => [{
            id: result.transactionId,
            type: 'TOPUP',
            amount_cents: amountCents,
            date: new Date().toISOString(),
            status: 'completed',
            description: `Wallet top-up via ChargX (#${result.displayId})`
        }, ...prev]);

        // Close form and reset
        setShowPaymentForm(false);
        setSelectedAmount(null);
        setCustomAmount('');

        toast({
            title: 'Payment successful!',
            description: `$${getTopUpAmount().toFixed(2)} has been added to your wallet.`,
        });
    };

    const handlePaymentError = (error: string) => {
        toast({
            title: 'Payment failed',
            description: error,
            variant: 'destructive'
        });
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wallet</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your prepaid wallet for order fulfillment</p>
            </div>

            {/* Compliance Reserve Warning */}
            {!isComplianceMet && (
                <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                    <CardContent className="p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="font-medium text-red-900 dark:text-red-100">Compliance Reserve Required</h4>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                Your wallet balance is below the mandatory $500.00 compliance reserve.
                                Order processing is suspended until you add funds.
                            </p>
                            <p className="text-sm font-medium text-red-800 dark:text-red-200 mt-2">
                                Amount needed: {formatCurrency(COMPLIANCE_RESERVE_CENTS - walletData.balance_cents)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Balance Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-0">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Wallet className="w-8 h-8 opacity-80" />
                            <span className="text-sm opacity-80">Available</span>
                        </div>
                        <p className="text-3xl font-bold">{formatCurrency(usableBalance)}</p>
                        <p className="text-sm opacity-80 mt-1">Ready to use for orders</p>
                    </CardContent>
                </Card>

                {/* Compliance Reserve Card */}
                <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Shield className="w-8 h-8 text-amber-600" />
                            <span className="text-sm text-amber-700 dark:text-amber-400">Compliance</span>
                        </div>
                        <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                            {formatCurrency(COMPLIANCE_RESERVE_CENTS)}
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                            Mandatory reserve
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Clock className="w-8 h-8 text-yellow-500" />
                            <span className="text-sm text-gray-500">Reserved</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(walletData.reserved_cents)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">Held for pending orders</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <CreditCard className="w-8 h-8 text-gray-400" />
                            <span className="text-sm text-gray-500">Total Balance</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(walletData.balance_cents)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{walletData.currency}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Top Up Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5" />
                            Add Funds
                        </CardTitle>
                        <CardDescription>
                            Top up your wallet to fund orders automatically
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Preset amounts */}
                        <div className="grid grid-cols-3 gap-2">
                            {topUpAmounts.map((amount) => (
                                <Button
                                    key={amount}
                                    variant={selectedAmount === amount ? 'default' : 'outline'}
                                    onClick={() => {
                                        setSelectedAmount(amount);
                                        setCustomAmount('');
                                    }}
                                    className={selectedAmount === amount ? 'bg-violet-600 hover:bg-violet-700' : ''}
                                >
                                    {formatCurrency(amount)}
                                </Button>
                            ))}
                        </div>

                        {/* Custom amount */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Or enter custom amount
                            </label>
                            <div className="relative mt-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={customAmount}
                                    onChange={(e) => {
                                        setCustomAmount(e.target.value);
                                        setSelectedAmount(null);
                                    }}
                                    className="pl-7"
                                    min="5"
                                    step="0.01"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Minimum: $5.00</p>
                        </div>

                        <Button
                            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90"
                            onClick={handleContinueToPayment}
                            disabled={!selectedAmount && !customAmount}
                        >
                            Continue to Payment
                        </Button>

                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Lock className="w-4 h-4" />
                            <span>Secure payment via ChargX</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Transaction History */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                        <CardDescription>Your wallet activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {transactions.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between py-3 border-b last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            'w-10 h-10 rounded-full flex items-center justify-center',
                                            tx.amount_cents > 0
                                                ? 'bg-green-100 dark:bg-green-900/20'
                                                : 'bg-gray-100 dark:bg-gray-800'
                                        )}>
                                            {tx.amount_cents > 0 ? (
                                                <ArrowDownRight className="w-5 h-5 text-green-600" />
                                            ) : (
                                                <ArrowUpRight className="w-5 h-5 text-gray-600" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                                                {tx.description}
                                            </p>
                                            <p className="text-xs text-gray-500">{formatRelativeTime(tx.date)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn(
                                            'font-medium',
                                            tx.amount_cents > 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'
                                        )}>
                                            {tx.amount_cents > 0 ? '+' : ''}{formatCurrency(tx.amount_cents)}
                                        </p>
                                        <div className="flex items-center gap-1 justify-end">
                                            {tx.status === 'completed' ? (
                                                <CheckCircle className="w-3 h-3 text-green-500" />
                                            ) : (
                                                <Clock className="w-3 h-3 text-yellow-500" />
                                            )}
                                            <span className="text-xs text-gray-500 capitalize">{tx.status}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Compliance Reserve Info Box */}
            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <CardContent className="p-4 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="font-medium text-amber-900 dark:text-amber-100">$500 Compliance Reserve</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            A mandatory $500.00 compliance reserve is held in your wallet at all times.
                            This reserve cannot be used for orders and ensures you maintain good standing
                            with platform requirements. Your available balance is your total balance minus
                            the compliance reserve and any pending order reservations.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* How it works Info Box */}
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-100">How it works</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            When an order comes in, funds are reserved from your available balance.
                            Once the order ships, the actual amount (including shipping) is settled.
                            Any difference is returned to your available balance.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* ChargX Payment Modal */}
            {showPaymentForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-md">
                        <div className="flex justify-end mb-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white hover:bg-white/10"
                                onClick={() => setShowPaymentForm(false)}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                        <ChargXPaymentForm
                            amount={getTopUpAmount()}
                            customer={{
                                name: 'Demo User',
                                email: 'demo@example.com',
                            }}
                            onSuccess={handlePaymentSuccess}
                            onError={handlePaymentError}
                            onCancel={() => setShowPaymentForm(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
