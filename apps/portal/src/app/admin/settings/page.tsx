'use client';

import { useState } from 'react';
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
    CreditCard,
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

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general');
    const [isSaving, setIsSaving] = useState(false);
    const [showPublishableKey, setShowPublishableKey] = useState(false);
    const [showSecretKey, setShowSecretKey] = useState(false);
    const [chargxKeys, setChargxKeys] = useState({
        publishableKey: 'pk_live_xxxxxxxxxxxxxxxx',
        secretKey: 'sk_live_xxxxxxxxxxxxxxxx',
    });

    // ShipStation settings
    const [showShipStationKey, setShowShipStationKey] = useState(false);
    const [showShipStationSecret, setShowShipStationSecret] = useState(false);
    const [autoPushEnabled, setAutoPushEnabled] = useState(true);
    const [shipstationKeys, setShipstationKeys] = useState({
        apiKey: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        apiSecret: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    });

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            toast({
                title: 'Settings saved',
                description: 'Your settings have been updated successfully.',
            });
        }, 1000);
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
        { id: 'payments', label: 'Payments', icon: CreditCard },
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
                                    <CreditCard className="w-5 h-5" />
                                    ChargX Payment Gateway
                                </CardTitle>
                                <CardDescription>
                                    Configure your ChargX API credentials for payment processing
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Status Indicator */}
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <div>
                                        <p className="font-medium text-green-900 dark:text-green-100">Connected to ChargX</p>
                                        <p className="text-sm text-green-700 dark:text-green-300">Payment processing is active</p>
                                    </div>
                                </div>

                                {/* Publishable Key */}
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Publishable API Key
                                    </label>
                                    <p className="text-xs text-gray-500 mb-2">
                                        This key is safe to expose in your frontend code
                                    </p>
                                    <div className="relative">
                                        <Input
                                            type={showPublishableKey ? 'text' : 'password'}
                                            value={chargxKeys.publishableKey}
                                            onChange={(e) => setChargxKeys({ ...chargxKeys, publishableKey: e.target.value })}
                                            className="pr-10 font-mono text-sm"
                                            placeholder="pk_live_..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPublishableKey(!showPublishableKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPublishableKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Secret Key */}
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Secret API Key
                                    </label>
                                    <p className="text-xs text-gray-500 mb-2">
                                        Keep this key secret. Never share it or expose it in frontend code.
                                    </p>
                                    <div className="relative">
                                        <Input
                                            type={showSecretKey ? 'text' : 'password'}
                                            value={chargxKeys.secretKey}
                                            onChange={(e) => setChargxKeys({ ...chargxKeys, secretKey: e.target.value })}
                                            className="pr-10 font-mono text-sm"
                                            placeholder="sk_live_..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowSecretKey(!showSecretKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Security Warning */}
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-medium text-yellow-900 dark:text-yellow-100">Security Notice</p>
                                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                            Your Secret API Key grants full access to your ChargX account.
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
                                                Save API Keys
                                            </>
                                        )}
                                    </Button>
                                    <Button variant="outline" onClick={() => window.open('https://dashboard.chargx.io', '_blank')}>
                                        Open ChargX Dashboard
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
                                            Find this in ShipStation → Settings → Account → API Settings
                                        </p>
                                        <div className="relative">
                                            <Input
                                                type={showShipStationKey ? 'text' : 'password'}
                                                value={shipstationKeys.apiKey}
                                                onChange={(e) => setShipstationKeys({ ...shipstationKeys, apiKey: e.target.value })}
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
                                                value={shipstationKeys.apiSecret}
                                                onChange={(e) => setShipstationKeys({ ...shipstationKeys, apiSecret: e.target.value })}
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
                                            onClick={() => setAutoPushEnabled(!autoPushEnabled)}
                                            className={`relative w-11 h-6 rounded-full transition-colors ${autoPushEnabled ? 'bg-green-500' : 'bg-gray-300'
                                                }`}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${autoPushEnabled ? 'translate-x-5' : ''
                                                }`} />
                                        </button>
                                    </div>

                                    {/* Connection Status */}
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        <span className="text-sm text-green-700 dark:text-green-300">
                                            Connected to ShipStation
                                        </span>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button onClick={handleSave} disabled={isSaving}>
                                            <Save className="w-4 h-4 mr-2" />
                                            Save Settings
                                        </Button>
                                        <Button variant="outline" onClick={() => {
                                            toast({ title: 'Connection tested', description: 'Successfully connected to ShipStation API.' });
                                        }}>
                                            Test Connection
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
                                                <Input defaultValue="5-7 business days" className="mt-1" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Cost to Merchant</label>
                                                <Input type="number" defaultValue="8.95" step="0.01" className="mt-1" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500">ShipStation Service Code</label>
                                            <select className="w-full h-10 mt-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm">
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
                                                <Input defaultValue="1-3 business days" className="mt-1" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Cost to Merchant</label>
                                                <Input type="number" defaultValue="24.95" step="0.01" className="mt-1" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500">ShipStation Service Code</label>
                                            <select className="w-full h-10 mt-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm">
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
                                        <Input type="number" defaultValue="1" className="mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Free Shipping Threshold ($)
                                        </label>
                                        <Input type="number" defaultValue="150" className="mt-1" />
                                        <p className="text-xs text-gray-500 mt-1">Orders above this amount get free Standard shipping</p>
                                    </div>
                                    <div className="pt-2">
                                        <Button onClick={handleSave} disabled={isSaving}>
                                            <Save className="w-4 h-4 mr-2" />
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
                                    <Input type="number" defaultValue="30" className="mt-1" />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Applied to wholesale price for MAP pricing suggestions
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Payment Processing Fee (%)
                                    </label>
                                    <Input type="number" defaultValue="2.9" step="0.1" className="mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Minimum Wallet Top-up ($)
                                    </label>
                                    <Input type="number" defaultValue="50" className="mt-1" />
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
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                SMTP Host
                                            </label>
                                            <Input defaultValue="smtp.gmail.com" className="mt-1" placeholder="smtp.example.com" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                SMTP Port
                                            </label>
                                            <Input type="number" defaultValue="587" className="mt-1" />
                                        </div>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                SMTP Username
                                            </label>
                                            <Input defaultValue="noreply@labsupply.io" className="mt-1" placeholder="username@example.com" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                SMTP Password
                                            </label>
                                            <Input type="password" defaultValue="••••••••••••" className="mt-1" placeholder="Enter password" />
                                        </div>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                From Email
                                            </label>
                                            <Input defaultValue="noreply@labsupply.io" className="mt-1" placeholder="noreply@example.com" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                From Name
                                            </label>
                                            <Input defaultValue="LabSupply Platform" className="mt-1" placeholder="Company Name" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-3 border rounded-lg px-4 bg-gray-50 dark:bg-gray-800">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">Use TLS/SSL</p>
                                            <p className="text-sm text-gray-500">Enable secure connection (recommended)</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" defaultChecked className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
                                        </label>
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <Button onClick={handleSave} disabled={isSaving}>
                                            <Save className="w-4 h-4 mr-2" />
                                            Save SMTP Settings
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                toast({
                                                    title: 'Test email sent',
                                                    description: 'A test email has been sent to the configured address.',
                                                });
                                            }}
                                        >
                                            Send Test Email
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
                                        { label: 'New KYB submissions', description: 'When a merchant submits verification', enabled: true },
                                        { label: 'Low stock alerts', description: 'When products fall below threshold', enabled: true },
                                        { label: 'High value orders', description: 'Orders above $1,000', enabled: true },
                                        { label: 'Failed payments', description: 'When wallet top-ups fail', enabled: true },
                                        { label: 'Daily summary', description: 'Daily digest of platform activity', enabled: false },
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
                                                    Added {formatRelativeTime(admin.createdAt)}
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
