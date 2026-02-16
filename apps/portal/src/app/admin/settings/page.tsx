'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Settings,
    Building,
    DollarSign,
    Mail,
    Bell,
    Shield,
    Save,
    RefreshCw,
    Truck,
    Percent,
    Eye,
    EyeOff,
    AlertCircle,
    CheckCircle,
    Ship,
    Package,
    Zap,
    Users,
    Plus,
    Trash2,
    Loader2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAdminAuth, SUPER_ADMIN_EMAIL } from '@/lib/admin-auth';
import { cn, formatRelativeTime } from '@/lib/utils';

interface AdminSettings {
    [key: string]: string | boolean;
    shipstation_api_key: string;
    shipstation_api_secret: string;
    shipstation_auto_push: boolean;
    standard_shipping_delivery: string;
    standard_shipping_cost: string;
    standard_shipping_service: string;
    expedited_shipping_delivery: string;
    expedited_shipping_cost: string;
    expedited_shipping_service: string;
    processing_time_days: string;
    free_shipping_threshold: string;
    default_markup_percent: string;
    payment_processing_fee: string;
    minimum_wallet_topup: string;
    smtp_host: string;
    smtp_port: string;
    smtp_user: string;
    smtp_pass: string;
    smtp_from_name: string;
    smtp_from_email: string;
    notify_new_orders: boolean;
    notify_low_stock: boolean;
    notify_kyb_submissions: boolean;
    notify_low_balance: boolean;
    low_stock_alert_threshold: string;
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showApiToken, setShowApiToken] = useState(false);
    const [mercuryConfig, setMercuryConfig] = useState({
        apiToken: '',
        accountId: '',
    });

    // All settings in one object (loaded from API)
    const [settings, setSettings] = useState<AdminSettings>({
        shipstation_api_key: '',
        shipstation_api_secret: '',
        shipstation_auto_push: true,
        standard_shipping_delivery: '5-7 business days',
        standard_shipping_cost: '8.95',
        standard_shipping_service: 'usps_priority_mail',
        expedited_shipping_delivery: '1-3 business days',
        expedited_shipping_cost: '24.95',
        expedited_shipping_service: 'ups_2nd_day_air',
        processing_time_days: '1',
        free_shipping_threshold: '150',
        default_markup_percent: '30',
        payment_processing_fee: '2.9',
        minimum_wallet_topup: '50',
        smtp_host: '',
        smtp_port: '587',
        smtp_user: '',
        smtp_pass: '',
        smtp_from_name: 'LabSupply',
        smtp_from_email: '',
        notify_new_orders: true,
        notify_low_stock: true,
        notify_kyb_submissions: true,
        notify_low_balance: true,
        low_stock_alert_threshold: '10',
    });

    // Toggle helpers for password visibility
    const [showShipStationKey, setShowShipStationKey] = useState(false);
    const [showShipStationSecret, setShowShipStationSecret] = useState(false);

    const updateSetting = (key: string, value: string | boolean) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    // Load settings from API
    const loadSettings = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/admin/settings');
            if (res.ok) {
                const data = await res.json();
                if (data.data) {
                    setSettings(prev => ({ ...prev, ...data.data }));
                }
            }
        } catch (err) {
            console.error('Error loading settings:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/v1/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });

            if (res.ok) {
                toast({ title: 'Settings saved', description: 'Your settings have been updated successfully.' });
            } else {
                const data = await res.json();
                toast({ title: 'Saved locally', description: data.error || 'Settings saved. Note: create the admin_settings table for persistent storage.', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    // Admin auth for managing admin users
    const { isSuperAdmin, adminUsers, addAdminUser, removeAdminUser } = useAdminAuth();
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminName, setNewAdminName] = useState('');
    const [isAddingAdmin, setIsAddingAdmin] = useState(false);
    const [showAddAdminForm, setShowAddAdminForm] = useState(false);

    const handleAddAdmin = async () => {
        if (!newAdminEmail || !newAdminName) {
            toast({ title: 'Missing information', description: 'Please enter both email and name.', variant: 'destructive' });
            return;
        }
        setIsAddingAdmin(true);
        const result = await addAdminUser(newAdminEmail, newAdminName);
        setIsAddingAdmin(false);
        if (result.success) {
            toast({ title: 'Admin added', description: `${newAdminName} has been added as an admin.` });
            setNewAdminEmail('');
            setNewAdminName('');
            setShowAddAdminForm(false);
        } else {
            toast({ title: 'Failed to add admin', description: result.error || 'This email may already be registered.', variant: 'destructive' });
        }
    };

    const handleRemoveAdmin = async (id: string, name: string) => {
        const success = await removeAdminUser(id);
        if (success) {
            toast({ title: 'Admin removed', description: `${name} has been removed.` });
        } else {
            toast({ title: 'Cannot remove', description: 'Super admin cannot be removed.', variant: 'destructive' });
        }
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Building },
        { id: 'payments', label: 'Payments', icon: DollarSign },
        { id: 'fulfillment', label: 'Fulfillment', icon: Truck },
        { id: 'pricing', label: 'Pricing & Fees', icon: DollarSign },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Shield },
        ...(isSuperAdmin ? [{ id: 'admins', label: 'Admin Users', icon: Users }] : []),
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-gray-500">Platform configuration and preferences</p>
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
                    {activeTab === 'general' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building className="w-5 h-5" />
                                    General Settings
                                </CardTitle>
                                <CardDescription>
                                    Basic platform configuration
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Company Name
                                    </label>
                                    <Input defaultValue="LabSupply Inc" className="mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Support Email
                                    </label>
                                    <Input defaultValue="support@labsupply.com" className="mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Business Address
                                    </label>
                                    <Input defaultValue="123 Distribution Center, Las Vegas, NV 89101" className="mt-1" />
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

                    {activeTab === 'payments' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building className="w-5 h-5" />
                                    Mercury Banking API
                                </CardTitle>
                                <CardDescription>
                                    Configure your Mercury API credentials for invoicing and payments
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Status Indicator */}
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <div>
                                        <p className="font-medium text-green-900 dark:text-green-100">Connected to Mercury</p>
                                        <p className="text-sm text-green-700 dark:text-green-300">Invoicing is active</p>
                                    </div>
                                </div>

                                {/* API Token */}
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        API Token
                                    </label>
                                    <p className="text-xs text-gray-500 mb-2">
                                        Bearer token for Mercury API authentication
                                    </p>
                                    <div className="relative">
                                        <Input
                                            type={showApiToken ? 'text' : 'password'}
                                            value={mercuryConfig.apiToken}
                                            onChange={(e) => setMercuryConfig({ ...mercuryConfig, apiToken: e.target.value })}
                                            className="pr-10 font-mono text-sm"
                                            placeholder="mercury_live_..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowApiToken(!showApiToken)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showApiToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Account ID */}
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Destination Account ID
                                    </label>
                                    <p className="text-xs text-gray-500 mb-2">
                                        Mercury checking account ID where invoice payments are deposited
                                    </p>
                                    <Input
                                        value={mercuryConfig.accountId}
                                        onChange={(e) => setMercuryConfig({ ...mercuryConfig, accountId: e.target.value })}
                                        className="font-mono text-sm"
                                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    />
                                </div>

                                {/* Security Warning */}
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-medium text-yellow-900 dark:text-yellow-100">Security Notice</p>
                                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                            Your Mercury API Token grants access to your banking data.
                                            Store it securely in environment variables and never commit it to version control.
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <Button onClick={handleSave} disabled={isSaving}>
                                        {isSaving ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                Save Configuration
                                            </>
                                        )}
                                    </Button>
                                    <Button variant="outline" onClick={() => window.open('https://app.mercury.com', '_blank')}>
                                        Open Mercury Dashboard
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'fulfillment' && (
                        <>
                            {/* ShipStation Integration */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Ship className="w-5 h-5" />
                                        ShipStation Integration
                                    </CardTitle>
                                    <CardDescription>
                                        Connect your ShipStation account for automated order fulfillment
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            ShipStation API Key
                                        </label>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Find this in ShipStation &rarr; Settings &rarr; Account &rarr; API Settings
                                        </p>
                                        <div className="relative">
                                            <Input
                                                type={showShipStationKey ? 'text' : 'password'}
                                                value={settings.shipstation_api_key}
                                                onChange={(e) => updateSetting('shipstation_api_key', e.target.value)}
                                                className="pr-10 font-mono text-sm"
                                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowShipStationKey(!showShipStationKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showShipStationKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            ShipStation API Secret
                                        </label>
                                        <div className="relative">
                                            <Input
                                                type={showShipStationSecret ? 'text' : 'password'}
                                                value={settings.shipstation_api_secret}
                                                onChange={(e) => updateSetting('shipstation_api_secret', e.target.value)}
                                                className="pr-10 font-mono text-sm"
                                                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowShipStationSecret(!showShipStationSecret)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showShipStationSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Auto-push toggle */}
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">Auto-push Paid Orders</p>
                                            <p className="text-sm text-gray-500">
                                                Automatically send orders to ShipStation when payment is confirmed
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => updateSetting('shipstation_auto_push', !settings.shipstation_auto_push)}
                                            className={`relative w-11 h-6 rounded-full transition-colors ${settings.shipstation_auto_push ? 'bg-green-500' : 'bg-gray-300'}`}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.shipstation_auto_push ? 'translate-x-5' : ''}`} />
                                        </button>
                                    </div>

                                    {/* Connection Status */}
                                    {settings.shipstation_api_key ? (
                                        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                            <span className="text-sm text-green-700 dark:text-green-300">API keys configured</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200">
                                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                                            <span className="text-sm text-yellow-700 dark:text-yellow-300">No API keys configured</span>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <Button onClick={handleSave} disabled={isSaving}>
                                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                            Save Settings
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Shipping Options */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Package className="w-5 h-5" />
                                        Shipping Options
                                    </CardTitle>
                                    <CardDescription>
                                        Configure shipping methods available to merchants
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Standard Shipping */}
                                    <div className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                                    <Truck className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white">Standard Shipping</p>
                                                    <p className="text-sm text-gray-500">USPS Priority / UPS Ground</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-500">Enabled</span>
                                                <div className="w-4 h-4 rounded-full bg-green-500" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Delivery Time</label>
                                                <Input value={settings.standard_shipping_delivery} onChange={(e) => updateSetting('standard_shipping_delivery', e.target.value)} className="mt-1" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Cost to Merchant ($)</label>
                                                <Input type="number" value={settings.standard_shipping_cost} onChange={(e) => updateSetting('standard_shipping_cost', e.target.value)} step="0.01" className="mt-1" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500">ShipStation Service Code</label>
                                            <select value={settings.standard_shipping_service} onChange={(e) => updateSetting('standard_shipping_service', e.target.value)} className="w-full h-10 mt-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm">
                                                <option value="usps_priority_mail">USPS Priority Mail</option>
                                                <option value="ups_ground">UPS Ground</option>
                                                <option value="fedex_ground">FedEx Ground</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Expedited Shipping */}
                                    <div className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                                    <Zap className="w-5 h-5 text-orange-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white">Expedited Shipping</p>
                                                    <p className="text-sm text-gray-500">UPS 2-Day / FedEx Express</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-500">Enabled</span>
                                                <div className="w-4 h-4 rounded-full bg-green-500" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Delivery Time</label>
                                                <Input value={settings.expedited_shipping_delivery} onChange={(e) => updateSetting('expedited_shipping_delivery', e.target.value)} className="mt-1" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Cost to Merchant ($)</label>
                                                <Input type="number" value={settings.expedited_shipping_cost} onChange={(e) => updateSetting('expedited_shipping_cost', e.target.value)} step="0.01" className="mt-1" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500">ShipStation Service Code</label>
                                            <select value={settings.expedited_shipping_service} onChange={(e) => updateSetting('expedited_shipping_service', e.target.value)} className="w-full h-10 mt-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm">
                                                <option value="ups_2nd_day_air">UPS 2nd Day Air</option>
                                                <option value="fedex_2day">FedEx 2Day</option>
                                                <option value="usps_priority_mail_express">USPS Priority Mail Express</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <Button onClick={handleSave} disabled={isSaving}>
                                            <Save className="w-4 h-4 mr-2" />
                                            Save Shipping Options
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* General Fulfillment Settings */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Truck className="w-5 h-5" />
                                        General Fulfillment
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Processing Time (business days)
                                        </label>
                                        <Input type="number" value={settings.processing_time_days} onChange={(e) => updateSetting('processing_time_days', e.target.value)} className="mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Free Shipping Threshold ($)
                                        </label>
                                        <Input type="number" value={settings.free_shipping_threshold} onChange={(e) => updateSetting('free_shipping_threshold', e.target.value)} className="mt-1" />
                                        <p className="text-xs text-gray-500 mt-1">Orders above this amount get free Standard shipping</p>
                                    </div>
                                    <div className="pt-2">
                                        <Button onClick={handleSave} disabled={isSaving}>
                                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                            Save Changes
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {activeTab === 'pricing' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Percent className="w-5 h-5" />
                                    Pricing & Fees
                                </CardTitle>
                                <CardDescription>
                                    Commission and fee structure
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Default Markup (%)
                                    </label>
                                    <Input type="number" value={settings.default_markup_percent} onChange={(e) => updateSetting('default_markup_percent', e.target.value)} className="mt-1" />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Applied to wholesale price for MAP pricing suggestions
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Payment Processing Fee (%)
                                    </label>
                                    <Input type="number" value={settings.payment_processing_fee} onChange={(e) => updateSetting('payment_processing_fee', e.target.value)} step="0.1" className="mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Minimum Wallet Funding ($)
                                    </label>
                                    <Input type="number" value={settings.minimum_wallet_topup} onChange={(e) => updateSetting('minimum_wallet_topup', e.target.value)} className="mt-1" />
                                </div>
                                <div className="pt-4">
                                    <Button onClick={handleSave} disabled={isSaving}>
                                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                        Save Changes
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'notifications' && (
                        <>
                            {/* SMTP Configuration */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Mail className="w-5 h-5" />
                                        Email (SMTP) Configuration
                                    </CardTitle>
                                    <CardDescription>
                                        Configure SMTP settings for sending email notifications to merchants and admins
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">SMTP Host</label>
                                            <Input value={settings.smtp_host} onChange={(e) => updateSetting('smtp_host', e.target.value)} className="mt-1" placeholder="smtp.example.com" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">SMTP Port</label>
                                            <Input type="number" value={settings.smtp_port} onChange={(e) => updateSetting('smtp_port', e.target.value)} className="mt-1" />
                                        </div>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">SMTP Username</label>
                                            <Input value={settings.smtp_user} onChange={(e) => updateSetting('smtp_user', e.target.value)} className="mt-1" placeholder="username@example.com" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">SMTP Password</label>
                                            <Input type="password" value={settings.smtp_pass} onChange={(e) => updateSetting('smtp_pass', e.target.value)} className="mt-1" placeholder="Enter password" />
                                        </div>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">From Email</label>
                                            <Input value={settings.smtp_from_email} onChange={(e) => updateSetting('smtp_from_email', e.target.value)} className="mt-1" placeholder="noreply@example.com" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">From Name</label>
                                            <Input value={settings.smtp_from_name} onChange={(e) => updateSetting('smtp_from_name', e.target.value)} className="mt-1" placeholder="Company Name" />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <Button onClick={handleSave} disabled={isSaving}>
                                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                            Save SMTP Settings
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Notification Toggles */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Bell className="w-5 h-5" />
                                        Notification Settings
                                    </CardTitle>
                                    <CardDescription>
                                        Configure admin alerts and notifications
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {[
                                        { key: 'notify_kyb_submissions', label: 'New KYB submissions', description: 'When a merchant submits verification' },
                                        { key: 'notify_low_stock', label: 'Low stock alerts', description: 'When products fall below threshold' },
                                        { key: 'notify_new_orders', label: 'New orders', description: 'When new orders are placed' },
                                        { key: 'notify_low_balance', label: 'Low merchant balances', description: 'When merchant wallets are low' },
                                    ].map((notif) => (
                                        <div key={notif.key} className="flex items-center justify-between py-3 border-b last:border-0">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{notif.label}</p>
                                                <p className="text-sm text-gray-500">{notif.description}</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={!!settings[notif.key]} onChange={(e) => updateSetting(notif.key, e.target.checked)} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
                                            </label>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {activeTab === 'security' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="w-5 h-5" />
                                    Security Settings
                                </CardTitle>
                                <CardDescription>
                                    Access control and authentication
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Session Settings</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Session Timeout (minutes)
                                            </label>
                                            <Input type="number" defaultValue="60" className="mt-1" />
                                        </div>
                                    </div>
                                </div>
                                <hr />
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Two-Factor Authentication</h4>
                                    <p className="text-sm text-gray-500 mb-3">
                                        Require 2FA for all admin accounts
                                    </p>
                                    <Button variant="outline">Enable 2FA Requirement</Button>
                                </div>
                                <hr />
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">API Rate Limiting</h4>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Requests per hour (per key)
                                        </label>
                                        <Input type="number" defaultValue="1000" className="mt-1" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Admin Users Tab - Super Admin Only */}
                    {activeTab === 'admins' && isSuperAdmin && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="w-5 h-5" />
                                            Admin Users
                                        </CardTitle>
                                        <CardDescription>
                                            Manage who has access to the admin portal
                                        </CardDescription>
                                    </div>
                                    <Button onClick={() => setShowAddAdminForm(true)}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Admin
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Add Admin Form */}
                                {showAddAdminForm && (
                                    <div className="p-4 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 space-y-4">
                                        <h4 className="font-medium text-gray-900 dark:text-white">Add New Admin</h4>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                                                <Input
                                                    placeholder="Admin Name"
                                                    value={newAdminName}
                                                    onChange={(e) => setNewAdminName(e.target.value)}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                                                <Input
                                                    type="email"
                                                    placeholder="admin@example.com"
                                                    value={newAdminEmail}
                                                    onChange={(e) => setNewAdminEmail(e.target.value)}
                                                    className="mt-1"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button onClick={handleAddAdmin} disabled={isAddingAdmin}>
                                                {isAddingAdmin ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                                Add Admin
                                            </Button>
                                            <Button variant="outline" onClick={() => { setShowAddAdminForm(false); setNewAdminEmail(''); setNewAdminName(''); }}>
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Admin Users List */}
                                <div className="space-y-2">
                                    {adminUsers.map((admin) => (
                                        <div key={admin.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium",
                                                    admin.role === 'super_admin'
                                                        ? "bg-gradient-to-br from-orange-500 to-red-600"
                                                        : "bg-gradient-to-br from-violet-500 to-indigo-600"
                                                )}>
                                                    {admin.role === 'super_admin' ? <Shield className="w-5 h-5" /> : admin.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                        {admin.name}
                                                        {admin.role === 'super_admin' && (
                                                            <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded">
                                                                SUPER ADMIN
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-sm text-gray-500">{admin.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-gray-400">
                                                    Added {formatRelativeTime(admin.created_at)}
                                                </span>
                                                {admin.role !== 'super_admin' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleRemoveAdmin(admin.id, admin.name)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-4 border-t text-sm text-gray-500">
                                    <p><strong>Note:</strong> Admin users can access all areas of the admin portal. Only the super admin ({SUPER_ADMIN_EMAIL}) can add or remove admin users.</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
