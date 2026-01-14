'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Settings,
    User,
    Building,
    Bell,
    Shield,
    CreditCard,
    Mail,
    Key,
    Save,
    RefreshCw,
    ShoppingCart,
    Zap,
    AlertCircle,
    X,
    Plus,
    Trash2,
    Check,
    Loader2,
    Lock
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useMerchantAuth } from '@/lib/merchant-auth';

export default function SettingsPage() {
    const { user, merchant, updateMerchant } = useMerchantAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [isSaving, setIsSaving] = useState(false);

    // Profile form state - initialized from merchant data
    const [profileForm, setProfileForm] = useState({
        companyName: '',
        website: '',
        phone: '',
    });

    // Initialize form from merchant data
    useEffect(() => {
        if (merchant) {
            setProfileForm({
                companyName: merchant.company_name || '',
                website: merchant.website_url || '',
                phone: merchant.phone || '',
            });
        }
    }, [merchant]);

    const [autoFulfillment, setAutoFulfillment] = useState({
        autoApprove: false,
        autoCharge: false,
        requireMinBalance: true,
        minBalanceAmount: 100,
    });

    // Payment methods state
    const [showAddCardModal, setShowAddCardModal] = useState(false);
    const [isAddingCard, setIsAddingCard] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState<Array<{ id: string; brand: string; last4: string; expMonth: number; expYear: number; isDefault: boolean }>>([]);
    const [newCard, setNewCard] = useState({
        cardNumber: '',
        expiry: '',
        cvv: '',
        cardholderName: '',
        setAsDefault: true,
    });

    // 2FA state
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);
    const [is2FASetupLoading, setIs2FASetupLoading] = useState(false);
    const [totpSecret, setTotpSecret] = useState<string | null>(null);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [is2FAVerifying, setIs2FAVerifying] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await updateMerchant({
                company_name: profileForm.companyName,
                website_url: profileForm.website,
                phone: profileForm.phone,
            });

            if (result.success) {
                toast({
                    title: 'Settings saved',
                    description: 'Your settings have been updated successfully.',
                });
            } else {
                toast({
                    title: 'Error saving settings',
                    description: result.error || 'Please try again.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error saving settings',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Handle adding a new payment method
    const handleAddPaymentMethod = () => {
        if (!newCard.cardNumber || !newCard.expiry || !newCard.cvv || !newCard.cardholderName) {
            toast({
                title: 'Missing information',
                description: 'Please fill in all card details.',
                variant: 'destructive'
            });
            return;
        }

        setIsAddingCard(true);
        // Simulate API call
        setTimeout(() => {
            const last4 = newCard.cardNumber.slice(-4);
            const [expMonth, expYear] = newCard.expiry.split('/');
            const newMethod = {
                id: `pm_${Date.now()}`,
                brand: newCard.cardNumber.startsWith('4') ? 'VISA' :
                    newCard.cardNumber.startsWith('5') ? 'MC' : 'CARD',
                last4,
                expMonth: parseInt(expMonth),
                expYear: parseInt(expYear),
                isDefault: newCard.setAsDefault || paymentMethods.length === 0,
            };

            if (newCard.setAsDefault) {
                setPaymentMethods(prev => prev.map(pm => ({ ...pm, isDefault: false })));
            }

            setPaymentMethods(prev => [...prev, newMethod]);
            setNewCard({ cardNumber: '', expiry: '', cvv: '', cardholderName: '', setAsDefault: true });
            setShowAddCardModal(false);
            setIsAddingCard(false);

            toast({
                title: 'Payment method added',
                description: `Card ending in ${last4} has been added to your account.`,
            });
        }, 1500);
    };

    // Handle removing a payment method
    const handleRemovePaymentMethod = (id: string) => {
        setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
        toast({
            title: 'Payment method removed',
            description: 'The payment method has been removed from your account.',
        });
    };

    // Handle setting a default payment method
    const handleSetDefaultPaymentMethod = (id: string) => {
        setPaymentMethods(prev => prev.map(pm => ({ ...pm, isDefault: pm.id === id })));
        toast({
            title: 'Default updated',
            description: 'Your default payment method has been updated.',
        });
    };

    // Generate base32 secret for TOTP
    const generateBase32Secret = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let secret = '';
        for (let i = 0; i < 32; i++) {
            secret += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return secret;
    };

    // Handle 2FA setup
    const handleEnable2FA = () => {
        setShow2FAModal(true);
        setIs2FASetupLoading(true);

        // Generate a new TOTP secret
        setTimeout(() => {
            const secret = generateBase32Secret();
            setTotpSecret(secret);

            // Generate the TOTP URI for authenticator apps
            const accountName = user?.email || 'user@labsupply.com';
            const issuer = 'LabSupply';
            const totpUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

            // Use quickchart.io to generate a scannable QR code (free, no API key needed)
            const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(totpUri)}&size=200&margin=1`;
            setQrCodeUrl(qrUrl);

            setIs2FASetupLoading(false);
        }, 1000);
    };

    // Handle 2FA verification
    const handleVerify2FA = () => {
        if (verificationCode.length !== 6) {
            toast({
                title: 'Invalid code',
                description: 'Please enter a 6-digit verification code.',
                variant: 'destructive'
            });
            return;
        }

        setIs2FAVerifying(true);
        // In production, this would verify the TOTP code against the secret on the backend
        setTimeout(() => {
            setIs2FAEnabled(true);
            setShow2FAModal(false);
            setVerificationCode('');
            setTotpSecret(null);
            setQrCodeUrl(null);
            setIs2FAVerifying(false);

            toast({
                title: '2FA Enabled',
                description: 'Two-factor authentication has been enabled for your account.',
            });
        }, 1500);
    };

    // Handle 2FA disable
    const handleDisable2FA = () => {
        setIs2FAEnabled(false);
        toast({
            title: '2FA Disabled',
            description: 'Two-factor authentication has been disabled for your account.',
        });
    };

    const tabs = [
        { id: 'profile', label: 'Company Profile', icon: Building },
        { id: 'orders', label: 'Order Settings', icon: ShoppingCart },
        { id: 'account', label: 'Account', icon: User },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'billing', label: 'Billing', icon: CreditCard },
    ];

    return (
        <div className="space-y-6 animate-in">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your account and preferences</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-4">
                {/* Sidebar */}
                <Card className="lg:col-span-1 h-fit">
                    <CardContent className="p-2">
                        <nav className="space-y-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                        ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400'
                                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </CardContent>
                </Card>

                {/* Content */}
                <div className="lg:col-span-3 space-y-6">
                    {activeTab === 'profile' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building className="w-5 h-5" />
                                    Company Profile
                                </CardTitle>
                                <CardDescription>
                                    Information about your business
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Company Name
                                        </label>
                                        <Input
                                            value={profileForm.companyName}
                                            onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
                                            placeholder="Your Company Name"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Business Type
                                        </label>
                                        <Input defaultValue="Research Reseller" className="mt-1" disabled />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Phone Number
                                        </label>
                                        <Input
                                            value={profileForm.phone}
                                            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                            placeholder="+1 (555) 123-4567"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Website
                                        </label>
                                        <Input
                                            value={profileForm.website}
                                            onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                                            placeholder="https://yourcompany.com"
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Business Address
                                    </label>
                                    <Input defaultValue="123 Research Blvd, Suite 100" className="mt-1" />
                                </div>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            City
                                        </label>
                                        <Input defaultValue="Las Vegas" className="mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            State
                                        </label>
                                        <Input defaultValue="NV" className="mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            ZIP Code
                                        </label>
                                        <Input defaultValue="89101" className="mt-1" />
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <Button onClick={handleSave} disabled={isSaving}>
                                        {isSaving ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                Save Changes
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'orders' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className="w-5 h-5" />
                                    Auto-Fulfillment Settings
                                </CardTitle>
                                <CardDescription>
                                    Configure automatic order processing and fulfillment
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Auto-Approve Toggle */}
                                <div className="flex items-center justify-between py-4 border-b">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            Auto-Approve Orders
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Automatically approve incoming orders and push them to fulfillment without manual review
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                                        <input
                                            type="checkbox"
                                            checked={autoFulfillment.autoApprove}
                                            onChange={(e) => setAutoFulfillment({ ...autoFulfillment, autoApprove: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
                                    </label>
                                </div>

                                {/* Auto-Charge Toggle */}
                                <div className="flex items-center justify-between py-4 border-b">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            Auto-Charge Wallet
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Automatically charge your wallet when orders are approved. Funds will be deducted immediately.
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                                        <input
                                            type="checkbox"
                                            checked={autoFulfillment.autoCharge}
                                            onChange={(e) => setAutoFulfillment({ ...autoFulfillment, autoCharge: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
                                    </label>
                                </div>

                                {/* Minimum Balance Requirement */}
                                <div className="flex items-center justify-between py-4 border-b">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            Require Minimum Balance
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Only auto-approve if wallet has sufficient balance for the order
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                                        <input
                                            type="checkbox"
                                            checked={autoFulfillment.requireMinBalance}
                                            onChange={(e) => setAutoFulfillment({ ...autoFulfillment, requireMinBalance: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
                                    </label>
                                </div>

                                {/* Minimum Balance Amount */}
                                {autoFulfillment.requireMinBalance && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Minimum Wallet Balance ($)
                                        </label>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Orders will only auto-approve if your wallet balance exceeds this amount after the order
                                        </p>
                                        <Input
                                            type="number"
                                            value={autoFulfillment.minBalanceAmount}
                                            onChange={(e) => setAutoFulfillment({ ...autoFulfillment, minBalanceAmount: parseInt(e.target.value) || 0 })}
                                            className="w-32"
                                            min="0"
                                            step="10"
                                        />
                                    </div>
                                )}

                                {/* Warning */}
                                {autoFulfillment.autoApprove && autoFulfillment.autoCharge && (
                                    <div className="flex items-start gap-2 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="font-medium text-yellow-900 dark:text-yellow-100">Auto-Fulfillment Active</p>
                                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                                Orders will be automatically approved and charged to your wallet without manual review.
                                                Make sure you have sufficient wallet balance to avoid failed orders.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4">
                                    <Button onClick={handleSave} disabled={isSaving}>
                                        {isSaving ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                Save Settings
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'account' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    Account Settings
                                </CardTitle>
                                <CardDescription>
                                    Your personal account information
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            First Name
                                        </label>
                                        <Input
                                            defaultValue={user?.email?.split('@')[0] || ''}
                                            className="mt-1"
                                            placeholder="First Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Last Name
                                        </label>
                                        <Input defaultValue="" className="mt-1" placeholder="Last Name" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Email Address
                                    </label>
                                    <div className="relative mt-1">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input value={user?.email || ''} className="pl-9" disabled />
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <Button onClick={handleSave} disabled={isSaving}>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Changes
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'notifications' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Bell className="w-5 h-5" />
                                    Notification Preferences
                                </CardTitle>
                                <CardDescription>
                                    Choose what updates you receive
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {[
                                    { label: 'Order confirmations', description: 'When an order is received and confirmed', enabled: true },
                                    { label: 'Shipping updates', description: 'When orders ship and tracking is available', enabled: true },
                                    { label: 'Low wallet balance', description: 'When your wallet balance falls below $50', enabled: true },
                                    { label: 'New products', description: 'When new products are added to the catalog', enabled: false },
                                    { label: 'Marketing emails', description: 'Promotions and special offers', enabled: false },
                                ].map((notif, index) => (
                                    <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{notif.label}</p>
                                            <p className="text-sm text-gray-500">{notif.description}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" defaultChecked={notif.enabled} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
                                        </label>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'security' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="w-5 h-5" />
                                    Security Settings
                                </CardTitle>
                                <CardDescription>
                                    Protect your account
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Change Password</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Current Password
                                            </label>
                                            <div className="relative mt-1">
                                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <Input type="password" placeholder="••••••••" className="pl-9" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                New Password
                                            </label>
                                            <div className="relative mt-1">
                                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <Input type="password" placeholder="••••••••" className="pl-9" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Confirm New Password
                                            </label>
                                            <div className="relative mt-1">
                                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <Input type="password" placeholder="••••••••" className="pl-9" />
                                            </div>
                                        </div>
                                        <Button>Update Password</Button>
                                    </div>
                                </div>
                                <hr />
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">Two-Factor Authentication</h4>
                                    <p className="text-sm text-gray-500 mb-3">Add an extra layer of security to your account</p>
                                    {is2FAEnabled ? (
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
                                                <Check className="w-4 h-4" />
                                                <span className="text-sm font-medium">2FA Enabled</span>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={handleDisable2FA}>
                                                Disable 2FA
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button variant="outline" onClick={handleEnable2FA}>
                                            <Shield className="w-4 h-4 mr-2" />
                                            Enable 2FA
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'billing' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="w-5 h-5" />
                                    Billing Settings
                                </CardTitle>
                                <CardDescription>
                                    Manage your payment methods
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Saved Payment Methods */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Saved Payment Methods</h4>
                                    {paymentMethods.map((method) => (
                                        <div key={method.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-8 rounded flex items-center justify-center text-white text-xs font-bold ${method.brand === 'VISA' ? 'bg-gradient-to-r from-violet-600 to-indigo-600' :
                                                    method.brand === 'MC' ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                                                        'bg-gradient-to-r from-gray-600 to-gray-800'
                                                    }`}>
                                                    {method.brand}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        •••• •••• •••• {method.last4}
                                                        {method.isDefault && (
                                                            <span className="ml-2 text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 px-2 py-0.5 rounded-full">
                                                                Default
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-sm text-gray-500">Expires {method.expMonth}/{method.expYear}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!method.isDefault && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleSetDefaultPaymentMethod(method.id)}
                                                    >
                                                        Set Default
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleRemovePaymentMethod(method.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {paymentMethods.length === 0 && (
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center text-gray-500">
                                            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p>No payment methods saved</p>
                                        </div>
                                    )}
                                </div>

                                <Button variant="outline" onClick={() => setShowAddCardModal(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Payment Method
                                </Button>
                                <p className="text-sm text-gray-500">
                                    Payment methods are used for wallet top-ups via ChargX. Your card information is securely stored with ChargX.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Add Payment Method Modal */}
            {showAddCardModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="w-5 h-5" />
                                    Add Payment Method
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowAddCardModal(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <CardDescription>Add a new card for wallet top-ups</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cardholder Name</label>
                                <Input
                                    placeholder="John Doe"
                                    value={newCard.cardholderName}
                                    onChange={(e) => setNewCard({ ...newCard, cardholderName: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Card Number</label>
                                <Input
                                    placeholder="4111 1111 1111 1111"
                                    value={newCard.cardNumber}
                                    onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value.replace(/\s/g, '') })}
                                    className="mt-1"
                                    maxLength={16}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Expiry</label>
                                    <Input
                                        placeholder="MM/YY"
                                        value={newCard.expiry}
                                        onChange={(e) => setNewCard({ ...newCard, expiry: e.target.value })}
                                        className="mt-1"
                                        maxLength={5}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">CVV</label>
                                    <Input
                                        placeholder="123"
                                        type="password"
                                        value={newCard.cvv}
                                        onChange={(e) => setNewCard({ ...newCard, cvv: e.target.value })}
                                        className="mt-1"
                                        maxLength={4}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="setAsDefault"
                                    checked={newCard.setAsDefault}
                                    onChange={(e) => setNewCard({ ...newCard, setAsDefault: e.target.checked })}
                                    className="rounded border-gray-300"
                                />
                                <label htmlFor="setAsDefault" className="text-sm text-gray-700 dark:text-gray-300">
                                    Set as default payment method
                                </label>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Lock className="w-4 h-4" />
                                <span>Secure payment powered by ChargX</span>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowAddCardModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                                    onClick={handleAddPaymentMethod}
                                    disabled={isAddingCard}
                                >
                                    {isAddingCard ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Card
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 2FA Setup Modal */}
            {show2FAModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="w-5 h-5" />
                                    Enable Two-Factor Authentication
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setShow2FAModal(false);
                                        setQrCodeUrl(null);
                                        setVerificationCode('');
                                    }}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <CardDescription>Scan the QR code with your authenticator app</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {is2FASetupLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                                </div>
                            ) : (
                                <>
                                    {/* QR Code */}
                                    <div className="flex justify-center p-4 bg-white rounded-lg border">
                                        {qrCodeUrl ? (
                                            <img
                                                src={qrCodeUrl}
                                                alt="2FA QR Code"
                                                width={200}
                                                height={200}
                                                className="rounded"
                                            />
                                        ) : (
                                            <div className="w-48 h-48 bg-gray-100 rounded flex items-center justify-center">
                                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-center space-y-2">
                                        <p className="text-sm text-gray-500">Scan this QR code with Google Authenticator, Authy, or any TOTP app</p>
                                        <p className="text-xs text-gray-400">Or enter this secret key manually:</p>
                                        <code className="block px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded font-mono text-sm break-all select-all">
                                            {totpSecret || 'Loading...'}
                                        </code>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Verification Code
                                        </label>
                                        <Input
                                            placeholder="Enter 6-digit code"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            className="mt-1 text-center text-2xl tracking-widest"
                                            maxLength={6}
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => {
                                                setShow2FAModal(false);
                                                setTotpSecret(null);
                                                setQrCodeUrl(null);
                                                setVerificationCode('');
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            className="flex-1 bg-violet-600 hover:bg-violet-700"
                                            onClick={handleVerify2FA}
                                            disabled={is2FAVerifying || verificationCode.length !== 6}
                                        >
                                            {is2FAVerifying ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Verifying...
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-4 h-4 mr-2" />
                                                    Verify & Enable
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
