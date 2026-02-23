'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Users,
    Mail,
    UserPlus,
    Loader2,
    Trash2,
    Clock,
    ShieldCheck,
    Crown,
    UserCircle,
    XCircle,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useMerchantAuth, type MerchantRole } from '@/lib/merchant-auth';

interface TeamMember {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: MerchantRole;
    is_active: boolean;
    created_at: string;
}

interface PendingInvitation {
    id: string;
    email: string;
    role: string;
    expires_at: string;
    created_at: string;
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Crown; color: string }> = {
    MERCHANT_OWNER: { label: 'Owner', icon: Crown, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    MERCHANT_ADMIN: { label: 'Admin', icon: ShieldCheck, color: 'text-violet-600 bg-violet-50 border-violet-200' },
    MERCHANT_USER: { label: 'User', icon: UserCircle, color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

export default function TeamTab() {
    const { merchantRole } = useMerchantAuth();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<string>('MERCHANT_USER');
    const [isSending, setIsSending] = useState(false);

    const canManage = merchantRole === 'MERCHANT_OWNER' || merchantRole === 'MERCHANT_ADMIN';
    const isOwner = merchantRole === 'MERCHANT_OWNER';

    const fetchTeam = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/merchant/team', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setMembers(data.members || []);
                setInvitations(data.invitations || []);
            }
        } catch {
            toast({ title: 'Error', description: 'Failed to load team data.', variant: 'destructive' });
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
            const res = await fetch('/api/v1/merchant/team/invite', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast({ title: 'Error', description: data.error || 'Failed to send invitation.', variant: 'destructive' });
                return;
            }
            toast({ title: 'Invitation sent', description: `Invitation sent to ${inviteEmail}.` });
            setInviteEmail('');
            fetchTeam();
        } catch {
            toast({ title: 'Error', description: 'Failed to send invitation.', variant: 'destructive' });
        } finally {
            setIsSending(false);
        }
    };

    const handleRevokeInvite = async (id: string) => {
        try {
            const res = await fetch(`/api/v1/merchant/team/invite/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (res.ok) {
                toast({ title: 'Invitation revoked' });
                fetchTeam();
            } else {
                const data = await res.json();
                toast({ title: 'Error', description: data.error, variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Failed to revoke invitation.', variant: 'destructive' });
        }
    };

    const handleRemoveMember = async (id: string, email: string) => {
        if (!confirm(`Remove ${email} from the team? They will lose access immediately.`)) return;
        try {
            const res = await fetch(`/api/v1/merchant/team/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (res.ok) {
                toast({ title: 'Member removed', description: `${email} has been removed from the team.` });
                fetchTeam();
            } else {
                const data = await res.json();
                toast({ title: 'Error', description: data.error, variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Failed to remove member.', variant: 'destructive' });
        }
    };

    const handleUpdateRole = async (id: string, newRole: string) => {
        try {
            const res = await fetch(`/api/v1/merchant/team/${id}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });
            if (res.ok) {
                toast({ title: 'Role updated' });
                fetchTeam();
            } else {
                const data = await res.json();
                toast({ title: 'Error', description: data.error, variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Failed to update role.', variant: 'destructive' });
        }
    };

    const handleToggleActive = async (id: string, currentlyActive: boolean) => {
        try {
            const res = await fetch(`/api/v1/merchant/team/${id}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentlyActive }),
            });
            if (res.ok) {
                toast({ title: currentlyActive ? 'Member deactivated' : 'Member reactivated' });
                fetchTeam();
            } else {
                const data = await res.json();
                toast({ title: 'Error', description: data.error, variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Failed to update member.', variant: 'destructive' });
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-600 mx-auto" />
                    <p className="text-sm text-gray-500 mt-2">Loading team...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Invite form */}
            {canManage && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <UserPlus className="w-5 h-5" />
                            Invite Team Member
                        </CardTitle>
                        <CardDescription>
                            Send an invitation to add someone to your team
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    type="email"
                                    placeholder="colleague@company.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="pl-9"
                                    required
                                />
                            </div>
                            <select
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value)}
                                className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                            >
                                {isOwner && <option value="MERCHANT_ADMIN">Admin</option>}
                                <option value="MERCHANT_USER">User</option>
                            </select>
                            <Button type="submit" disabled={isSending} className="bg-violet-600 hover:bg-violet-700">
                                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invite'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Team members */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="w-5 h-5" />
                        Team Members ({members.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {members.map((member) => {
                            const cfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.MERCHANT_USER;
                            const RoleIcon = cfg.icon;
                            const canModify =
                                member.role !== 'MERCHANT_OWNER' &&
                                canManage &&
                                (isOwner || member.role === 'MERCHANT_USER');

                            return (
                                <div key={member.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cfg.color} border`}>
                                            <RoleIcon className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {member.first_name || member.last_name
                                                    ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                                                    : member.email}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.color}`}>
                                            {cfg.label}
                                        </span>
                                        {!member.is_active && (
                                            <span className="text-xs px-2 py-0.5 rounded-full border text-red-600 bg-red-50 border-red-200">
                                                Inactive
                                            </span>
                                        )}
                                        {canModify && (
                                            <div className="flex gap-1 ml-2">
                                                {isOwner && member.role === 'MERCHANT_USER' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleUpdateRole(member.id, 'MERCHANT_ADMIN')}
                                                        title="Promote to Admin"
                                                        className="h-7 px-2 text-xs"
                                                    >
                                                        Promote
                                                    </Button>
                                                )}
                                                {isOwner && member.role === 'MERCHANT_ADMIN' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleUpdateRole(member.id, 'MERCHANT_USER')}
                                                        title="Demote to User"
                                                        className="h-7 px-2 text-xs"
                                                    >
                                                        Demote
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggleActive(member.id, member.is_active)}
                                                    className="h-7 px-2 text-xs"
                                                >
                                                    {member.is_active ? 'Deactivate' : 'Activate'}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveMember(member.id, member.email)}
                                                    className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {members.length === 0 && (
                            <p className="text-sm text-gray-500 py-4 text-center">No team members yet.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Pending invitations */}
            {invitations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Clock className="w-5 h-5" />
                            Pending Invitations ({invitations.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {invitations.map((inv) => {
                                const expiresIn = Math.max(0, Math.ceil((new Date(inv.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                                return (
                                    <div key={inv.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{inv.email}</p>
                                            <p className="text-xs text-gray-500">
                                                {inv.role.replace('MERCHANT_', '')} &middot; Expires in {expiresIn} day{expiresIn !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        {canManage && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRevokeInvite(inv.id)}
                                                className="text-red-600 hover:text-red-700 h-7 px-2"
                                            >
                                                <XCircle className="w-3.5 h-3.5 mr-1" />
                                                Revoke
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
