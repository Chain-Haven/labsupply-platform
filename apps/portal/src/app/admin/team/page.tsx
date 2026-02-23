'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Users,
    Mail,
    UserPlus,
    Loader2,
    Trash2,
    Clock,
    ShieldCheck,
    Crown,
    XCircle,
    CheckCircle,
    AlertCircle,
} from 'lucide-react';
import { useAdminAuth } from '@/lib/admin-auth';

interface AdminUser {
    id: string;
    email: string;
    name?: string;
    role: 'super_admin' | 'admin';
    is_active?: boolean;
    last_login_at?: string;
    created_at: string;
}

interface PendingInvitation {
    id: string;
    email: string;
    role: string;
    expires_at: string;
    created_at: string;
}

export default function AdminTeamPage() {
    const { currentAdmin, isSuperAdmin } = useAdminAuth();
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [inviteEmail, setInviteEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [toast, setToast] = useState<{ title: string; desc?: string; type: 'success' | 'error' } | null>(null);

    const showToast = (title: string, desc?: string, type: 'success' | 'error' = 'success') => {
        setToast({ title, desc, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchTeam = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/admin/team', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setAdmins(data.admins || []);
                setInvitations(data.invitations || []);
            }
        } catch {
            showToast('Error', 'Failed to load team data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchTeam(); }, [fetchTeam]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        setIsSending(true);
        try {
            const res = await fetch('/api/v1/admin/team/invite', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail.trim(), role: 'admin' }),
            });
            const data = await res.json();
            if (!res.ok) {
                showToast('Error', data.error || 'Failed to send invitation.', 'error');
                return;
            }
            showToast('Invitation sent', `Invitation sent to ${inviteEmail}.`);
            setInviteEmail('');
            fetchTeam();
        } catch {
            showToast('Error', 'Failed to send invitation.', 'error');
        } finally {
            setIsSending(false);
        }
    };

    const handleRevokeInvite = async (id: string) => {
        try {
            const res = await fetch(`/api/v1/admin/team/invite/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (res.ok) {
                showToast('Invitation revoked');
                fetchTeam();
            } else {
                const data = await res.json();
                showToast('Error', data.error, 'error');
            }
        } catch {
            showToast('Error', 'Failed to revoke invitation.', 'error');
        }
    };

    const handleRemoveAdmin = async (id: string, email: string) => {
        if (!confirm(`Remove ${email} from the admin team? They will lose admin access immediately.`)) return;
        try {
            const res = await fetch(`/api/v1/admin/team/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (res.ok) {
                showToast('Admin removed', `${email} has been removed.`);
                fetchTeam();
            } else {
                const data = await res.json();
                showToast('Error', data.error, 'error');
            }
        } catch {
            showToast('Error', 'Failed to remove admin.', 'error');
        }
    };

    const handleToggleActive = async (id: string, currentlyActive: boolean) => {
        try {
            const res = await fetch(`/api/v1/admin/team/${id}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentlyActive }),
            });
            if (res.ok) {
                showToast(currentlyActive ? 'Admin deactivated' : 'Admin reactivated');
                fetchTeam();
            } else {
                const data = await res.json();
                showToast('Error', data.error, 'error');
            }
        } catch {
            showToast('Error', 'Failed to update admin.', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 max-w-4xl">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border shadow-lg max-w-sm ${
                    toast.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                    <div className="flex items-start gap-2">
                        {toast.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                        <div>
                            <p className="text-sm font-medium">{toast.title}</p>
                            {toast.desc && <p className="text-xs mt-0.5 opacity-80">{toast.desc}</p>}
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h1 className="text-2xl font-bold text-white">Admin Team</h1>
                <p className="text-gray-400 text-sm">Manage admin users who can access this panel</p>
            </div>

            {/* Invite form - super_admin only */}
            {isSuperAdmin && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <UserPlus className="w-5 h-5 text-violet-400" />
                        <h2 className="text-base font-semibold text-white">Invite Admin</h2>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">Send an invitation to add a new admin user</p>
                    <form onSubmit={handleInvite} className="flex gap-3">
                        <div className="relative flex-1">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="email"
                                placeholder="admin@company.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                required
                                className="w-full h-10 pl-9 pr-3 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-violet-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSending}
                            className="h-10 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invite'}
                        </button>
                    </form>
                </div>
            )}

            {/* Admin users list */}
            <div className="bg-gray-800 rounded-xl border border-gray-700">
                <div className="px-6 py-4 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-400" />
                        <h2 className="text-base font-semibold text-white">Admin Users ({admins.length})</h2>
                    </div>
                </div>
                <div className="divide-y divide-gray-700">
                    {admins.map((a) => (
                        <div key={a.id} className="flex items-center justify-between px-6 py-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    a.role === 'super_admin'
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : 'bg-violet-500/20 text-violet-400'
                                }`}>
                                    {a.role === 'super_admin' ? <Crown className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{a.name || a.email}</p>
                                    <p className="text-xs text-gray-500 truncate">{a.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    a.role === 'super_admin'
                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                        : 'bg-violet-500/10 text-violet-400 border border-violet-500/30'
                                }`}>
                                    {a.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                                </span>
                                {a.is_active === false && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                                        Inactive
                                    </span>
                                )}
                                {a.last_login_at && (
                                    <span className="text-xs text-gray-500 hidden sm:inline">
                                        Last login: {new Date(a.last_login_at).toLocaleDateString()}
                                    </span>
                                )}
                                {isSuperAdmin && a.role !== 'super_admin' && a.id !== currentAdmin?.id && (
                                    <div className="flex gap-1 ml-2">
                                        <button
                                            onClick={() => handleToggleActive(a.id, a.is_active !== false)}
                                            className="text-xs px-2 py-1 rounded text-gray-400 hover:text-white hover:bg-gray-700"
                                        >
                                            {a.is_active !== false ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button
                                            onClick={() => handleRemoveAdmin(a.id, a.email)}
                                            className="text-xs px-2 py-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {admins.length === 0 && (
                        <p className="text-sm text-gray-500 py-8 text-center">No admin users found.</p>
                    )}
                </div>
            </div>

            {/* Pending invitations */}
            {invitations.length > 0 && (
                <div className="bg-gray-800 rounded-xl border border-gray-700">
                    <div className="px-6 py-4 border-b border-gray-700">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-gray-400" />
                            <h2 className="text-base font-semibold text-white">Pending Invitations ({invitations.length})</h2>
                        </div>
                    </div>
                    <div className="divide-y divide-gray-700">
                        {invitations.map((inv) => {
                            const expiresIn = Math.max(0, Math.ceil((new Date(inv.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                            return (
                                <div key={inv.id} className="flex items-center justify-between px-6 py-4">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{inv.email}</p>
                                        <p className="text-xs text-gray-500">
                                            Role: {inv.role} &middot; Expires in {expiresIn} day{expiresIn !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    {isSuperAdmin && (
                                        <button
                                            onClick={() => handleRevokeInvite(inv.id)}
                                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10"
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                            Revoke
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
