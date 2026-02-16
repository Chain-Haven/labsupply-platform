'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

// Super admin email - configurable via env var
const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'info@chainhaven.co';

// Admin user type from database
export interface AdminUser {
    id: string;
    user_id: string;
    email: string;
    name: string;
    role: 'super_admin' | 'admin';
    created_at: string;
    created_by?: string;
}

// Backup session type (for backup code authentication)
interface BackupSession {
    email: string;
    role: 'super_admin' | 'admin';
    expiresAt: string;
}

interface AdminAuthContextType {
    user: User | null;
    session: Session | null;
    currentAdmin: AdminUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isSuperAdmin: boolean;
    adminUsers: AdminUser[];
    backupSession: BackupSession | null;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    loginWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    addAdminUser: (email: string, name: string) => Promise<{ success: boolean; error?: string }>;
    removeAdminUser: (id: string) => Promise<boolean>;
    refreshAdminUsers: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
    const [backupSession, setBackupSession] = useState<BackupSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const supabase = createBrowserClient();

    // Check if user is an admin and fetch admin data
    const checkAndSetAdmin = async (authUser: User | null) => {
        if (!authUser) {
            setCurrentAdmin(null);
            setAdminUsers([]);
            return false;
        }

        const email = authUser.email?.toLowerCase() || '';

        // Check if user is in admin_users table
        const { data: adminData, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('email', email)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error checking admin status:', error);
        }

        // If user is the super admin but not in table, create their record
        if (!adminData && email === SUPER_ADMIN_EMAIL) {
            const { data: newAdmin, error: insertError } = await supabase
                .from('admin_users')
                .insert({
                    user_id: authUser.id,
                    email: email,
                    name: 'ChainHaven Admin',
                    role: 'super_admin',
                })
                .select()
                .single();

            if (!insertError && newAdmin) {
                setCurrentAdmin(newAdmin);
                await refreshAdminUsers();
                return true;
            }
        }

        if (adminData) {
            setCurrentAdmin(adminData);
            await refreshAdminUsers();
            return true;
        }

        // User is authenticated but not an admin
        setCurrentAdmin(null);
        return false;
    };

    // Check for backup session from cookie
    const checkBackupSession = async (): Promise<BackupSession | null> => {
        try {
            const response = await fetch('/api/v1/admin/validate-backup-session', {
                method: 'GET',
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                if (data.valid && data.email) {
                    return {
                        email: data.email,
                        role: data.email.toLowerCase() === SUPER_ADMIN_EMAIL ? 'super_admin' : 'admin',
                        expiresAt: data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    };
                }
            }
        } catch (error) {
            console.error('Error checking backup session:', error);
        }
        return null;
    };

    // Fetch all admin users (only for super admin)
    const refreshAdminUsers = async () => {
        const { data, error } = await supabase
            .from('admin_users')
            .select('*')
            .order('created_at', { ascending: true });

        if (!error && data) {
            setAdminUsers(data);
        }
    };

    // Initialize auth state
    useEffect(() => {
        const initAuth = async () => {
            setIsLoading(true);

            // First, check for Supabase session
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            setSession(currentSession);
            setUser(currentSession?.user || null);

            if (currentSession?.user) {
                await checkAndSetAdmin(currentSession.user);
                setIsLoading(false);
                return;
            }

            // If no Supabase session, check for backup session cookie
            const backupSessionData = await checkBackupSession();
            if (backupSessionData) {
                setBackupSession(backupSessionData);
                // Create a synthetic admin user for the backup session
                const syntheticAdmin: AdminUser = {
                    id: 'backup-session',
                    user_id: 'backup-session',
                    email: backupSessionData.email,
                    name: backupSessionData.email.toLowerCase() === SUPER_ADMIN_EMAIL ? 'ChainHaven Admin' : 'Admin',
                    role: backupSessionData.role,
                    created_at: new Date().toISOString(),
                };
                setCurrentAdmin(syntheticAdmin);
                await refreshAdminUsers();
            }

            setIsLoading(false);
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            setSession(newSession);
            setUser(newSession?.user || null);

            if (newSession?.user) {
                await checkAndSetAdmin(newSession.user);
            } else {
                setCurrentAdmin(null);
                setAdminUsers([]);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        const normalizedEmail = email.toLowerCase().trim();

        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        if (!data.user) {
            return { success: false, error: 'Login failed' };
        }

        // Check if user is an admin
        const isAdmin = await checkAndSetAdmin(data.user);

        if (!isAdmin) {
            // Sign out if not an admin
            await supabase.auth.signOut();
            return { success: false, error: 'You do not have admin access. Contact your administrator.' };
        }

        return { success: true };
    };

    const loginWithMagicLink = async (email: string): Promise<{ success: boolean; error?: string }> => {
        const normalizedEmail = email.toLowerCase().trim();

        // Verify email is in admin_users table before sending magic link
        const { data: adminData, error: checkError } = await supabase
            .from('admin_users')
            .select('id')
            .eq('email', normalizedEmail)
            .single();

        if (checkError || !adminData) {
            if (normalizedEmail !== SUPER_ADMIN_EMAIL) {
                return { success: false, error: 'This email is not authorized for admin access.' };
            }
        }

        const { error } = await supabase.auth.signInWithOtp({
            email: normalizedEmail,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin`,
            },
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    };

    const logout = async () => {
        await supabase.auth.signOut();
        // Also clear backup session cookie if exists
        if (backupSession) {
            try {
                await fetch('/api/v1/admin/logout-backup-session', {
                    method: 'POST',
                    credentials: 'include',
                });
            } catch (error) {
                console.error('Error clearing backup session:', error);
            }
        }
        setUser(null);
        setSession(null);
        setCurrentAdmin(null);
        setAdminUsers([]);
        setBackupSession(null);
    };

    const addAdminUser = async (email: string, name: string): Promise<{ success: boolean; error?: string }> => {
        // Only super admin can add users
        if (!currentAdmin || currentAdmin.role !== 'super_admin') {
            return { success: false, error: 'Only super admin can add users' };
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user already exists as admin
        const { data: existing } = await supabase
            .from('admin_users')
            .select('id')
            .eq('email', normalizedEmail)
            .single();

        if (existing) {
            return { success: false, error: 'This email is already an admin' };
        }

        // Create the admin user record (they will need to sign up separately)
        const { error } = await supabase
            .from('admin_users')
            .insert({
                user_id: null, // Will be linked when they sign up
                email: normalizedEmail,
                name,
                role: 'admin',
                created_by: currentAdmin.email,
            });

        if (error) {
            console.error('Error adding admin:', error);
            return { success: false, error: error.message };
        }

        await refreshAdminUsers();
        return { success: true };
    };

    const removeAdminUser = async (id: string): Promise<boolean> => {
        // Only super admin can remove users
        if (!currentAdmin || currentAdmin.role !== 'super_admin') {
            return false;
        }

        // Cannot remove super admin
        const userToRemove = adminUsers.find(u => u.id === id);
        if (!userToRemove || userToRemove.role === 'super_admin') {
            return false;
        }

        const { error } = await supabase
            .from('admin_users')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error removing admin:', error);
            return false;
        }

        await refreshAdminUsers();
        return true;
    };

    return (
        <AdminAuthContext.Provider value={{
            user,
            session,
            currentAdmin,
            isAuthenticated: !!currentAdmin,
            isLoading,
            isSuperAdmin: currentAdmin?.role === 'super_admin',
            adminUsers,
            backupSession,
            login,
            loginWithMagicLink,
            logout,
            addAdminUser,
            removeAdminUser,
            refreshAdminUsers,
        }}>
            {children}
        </AdminAuthContext.Provider>
    );
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);
    if (context === undefined) {
        throw new Error('useAdminAuth must be used within an AdminAuthProvider');
    }
    return context;
}

export { SUPER_ADMIN_EMAIL };
