'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
    LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Merchants', href: '/admin/merchants', icon: Users },
    { name: 'KYB Review', href: '/admin/kyb-review', icon: FileCheck },
    { name: 'Inventory', href: '/admin/inventory', icon: Box },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'API Keys', href: '/admin/api-keys', icon: Key },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();

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
                        <span className="text-lg font-bold">LabSupply</span>
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
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                            SA
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Supplier Admin</p>
                            <p className="text-xs text-white/60">admin@labsupply.com</p>
                        </div>
                    </div>
                    <Link href="/login">
                        <Button variant="ghost" className="w-full justify-start text-white/60 hover:text-white hover:bg-white/5">
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                        </Button>
                    </Link>
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
