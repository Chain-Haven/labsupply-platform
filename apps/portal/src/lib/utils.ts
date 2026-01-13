import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(cents / 100);
}

export function formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(date);
}

export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        RECEIVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        AWAITING_FUNDS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        FUNDED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        RELEASED_TO_FULFILLMENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        PICKING: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        PACKED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
        SHIPPED: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
        COMPLETE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        ON_HOLD_PAYMENT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        ON_HOLD_COMPLIANCE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
        REFUNDED: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
        PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        CONNECTED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        DISCONNECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        SUSPENDED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
}
