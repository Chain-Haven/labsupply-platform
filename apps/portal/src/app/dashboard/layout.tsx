'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Package,
    ShoppingCart,
    Wallet,
    Store,
    Settings,
    LogOut,
    Menu,
    X,
    Upload,
    LayoutDashboard,
    BookOpen,
    Loader2,
    Clock,
    CheckCircle,
    AlertTriangle,
    XCircle,
    ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useMerchantAuth } from '@/lib/merchant-auth';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Guide', href: '/dashboard/guide', icon: BookOpen },
    { name: 'Catalog', href: '/dashboard/catalog', icon: Package },
    { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
    { name: 'Wallet', href: '/dashboard/wallet', icon: Wallet },
    { name: 'Stores', href: '/dashboard/stores', icon: Store },
    { name: 'Uploads', href: '/dashboard/uploads', icon: Upload },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

function AccountStatusBanner({ status, kybStatus }: { status: string; kybStatus: string }) {
    const config = (() => {
        if (status === 'suspended') {
            return {
                icon: XCircle,
                title: 'Account Suspended',
                description: 'Your account has been suspended. Please contact support at whitelabel@peptidetech.co for assistance.',
                bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
                iconColor: 'text-red-600 dark:text-red-400',
                titleColor: 'text-red-900 dark:text-red-100',
                descColor: 'text-red-700 dark:text-red-300',
            };
        }
        if (kybStatus === 'rejected') {
            return {
                icon: AlertTriangle,
                title: 'Application Rejected',
                description: 'Your merchant application was not approved. Please contact support at whitelabel@peptidetech.co to discuss next steps.',
                bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
                iconColor: 'text-red-600 dark:text-red-400',
                titleColor: 'text-red-900 dark:text-red-100',
                descColor: 'text-red-700 dark:text-red-300',
            };
        }
        if (kybStatus === 'in_progress') {
            return {
                icon: Clock,
                title: 'Application Under Review',
                description: 'Your merchant application has been submitted and is being reviewed by our compliance team. This typically takes 1-2 business days. You will receive an email once approved.',
                bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
                iconColor: 'text-amber-600 dark:text-amber-400',
                titleColor: 'text-amber-900 dark:text-amber-100',
                descColor: 'text-amber-700 dark:text-amber-300',
            };
        }
        return {
            icon: ShieldCheck,
            title: 'Account Pending Verification',
            description: 'Your account is pending verification. Complete your onboarding application to get started, or wait for admin approval if already submitted.',
            bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
            iconColor: 'text-blue-600 dark:text-blue-400',
            titleColor: 'text-blue-900 dark:text-blue-100',
            descColor: 'text-blue-700 dark:text-blue-300',
        };
    })();

    const Icon = config.icon;

    return (
        <div className={cn('border-b px-4 lg:px-6 py-3', config.bg)}>
            <div className="flex items-start gap-3">
                <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', config.iconColor)} />
                <div className="flex-1 min-w-0">
                    <p className={cn('font-semibold text-sm', config.titleColor)}>{config.title}</p>
                    <p className={cn('text-sm mt-0.5', config.descColor)}>{config.description}</p>
                </div>
                <div className="shrink-0">
                    <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                        status === 'suspended' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                        kybStatus === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                        kybStatus === 'in_progress' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                    )}>
                        <span className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            status === 'suspended' || kybStatus === 'rejected' ? 'bg-red-500' :
                            kybStatus === 'in_progress' ? 'bg-amber-500 animate-pulse' :
                            'bg-blue-500'
                        )} />
                        {status === 'suspended' ? 'Suspended' :
                         kybStatus === 'rejected' ? 'Rejected' :
                         kybStatus === 'in_progress' ? 'Under Review' :
                         'Pending'}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, merchant, isLoading, isAuthenticated, logout } = useMerchantAuth();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isLoading, isAuthenticated, router]);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    // Get display name and initials
    const displayName = merchant?.company_name || user?.email?.split('@')[0] || 'Merchant';
    const displayEmail = user?.email || '';
    const initials = displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    // Show loading while checking auth
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Don't render dashboard if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                            <Package className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">WhiteLabel Peptides</span>
                    </Link>
                    <button
                        className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400'
                                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-gray-700 dark:text-gray-300"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Top bar */}
                <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 lg:px-6">
                    <button
                        className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex-1" />

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{displayName}</p>
                            <p className="text-xs text-gray-500">{displayEmail}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                            {initials}
                        </div>
                    </div>
                </header>

                {/* Account approval status banner */}
                {merchant && merchant.status !== 'approved' && (
                    <AccountStatusBanner status={merchant.status} kybStatus={merchant.kyb_status} />
                )}

                {/* Page content */}
                <main className="p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
