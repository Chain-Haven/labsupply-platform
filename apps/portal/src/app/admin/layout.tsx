'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Package,
    LayoutDashboard,
    Users,
    Box,
    ShoppingCart,
    FileCheck,
    Settings,
    Key,
    BarChart3,
    DollarSign,
    LogOut,
    Loader2,
    Shield,
    Bitcoin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AdminAuthProvider, useAdminAuth } from '@/lib/admin-auth';

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Merchants', href: '/admin/merchants', icon: Users },
    { name: 'KYB Review', href: '/admin/kyb-review', icon: FileCheck },
    { name: 'Compliance', href: '/admin/compliance', icon: Shield },
    { name: 'Inventory', href: '/admin/inventory', icon: Box },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'Mercury', href: '/admin/mercury', icon: DollarSign },
    { name: 'Crypto', href: '/admin/crypto', icon: Bitcoin },
    { name: 'Withdrawals', href: '/admin/withdrawals', icon: LogOut },
    { name: 'API Keys', href: '/admin/api-keys', icon: Key },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

function AdminLayoutContent({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { currentAdmin, isAuthenticated, isLoading, logout, isSuperAdmin } = useAdminAuth();

    // Allow login page to render without auth
    const isLoginPage = pathname === '/admin/login';

    useEffect(() => {
        if (!isLoading && !isAuthenticated && !isLoginPage) {
            router.push('/admin/login');
        }
    }, [isLoading, isAuthenticated, isLoginPage, router]);

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
        );
    }

    // Render login page without layout
    if (isLoginPage) {
        return <>{children}</>;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
        );
    }

    const handleLogout = () => {
        logout();
        router.push('/admin/login');
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white">
                {/* Logo */}
                <div className="flex items-center gap-2 h-16 px-6 border-b border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                        <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <span className="text-lg font-bold">WhiteLabel Peptides</span>
                        <span className="ml-2 text-xs px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">
                            ADMIN
                        </span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== '/admin' && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-white/10 text-white'
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium",
                            isSuperAdmin
                                ? "bg-gradient-to-br from-orange-500 to-red-600"
                                : "bg-gradient-to-br from-violet-500 to-indigo-600"
                        )}>
                            {isSuperAdmin ? (
                                <Shield className="w-5 h-5" />
                            ) : (
                                currentAdmin?.name?.substring(0, 2).toUpperCase() || 'AD'
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white flex items-center gap-1">
                                {currentAdmin?.name || 'Admin'}
                                {isSuperAdmin && (
                                    <span className="text-xs px-1 py-0.5 bg-orange-500/20 text-orange-400 rounded">
                                        SUPER
                                    </span>
                                )}
                            </p>
                            <p className="text-xs text-white/60">{currentAdmin?.email}</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-white/60 hover:text-white hover:bg-white/5"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main content */}
            <main className="pl-64">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <AdminAuthProvider>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </AdminAuthProvider>
    );
}

