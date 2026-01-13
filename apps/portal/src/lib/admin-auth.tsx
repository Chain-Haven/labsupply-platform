'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Super admin email - only this user can access admin initially
const SUPER_ADMIN_EMAIL = 'info@chainhaven.co';

// Admin user type
export interface AdminUser {
    id: string;
    email: string;
    name: string;
    role: 'super_admin' | 'admin';
    createdAt: string;
    createdBy?: string;
}

// Initial admin users (super admin only)
const initialAdminUsers: AdminUser[] = [
    {
        id: 'super_admin_1',
        email: SUPER_ADMIN_EMAIL,
        name: 'ChainHaven Admin',
        role: 'super_admin',
        createdAt: new Date().toISOString(),
    }
];

interface AdminAuthContextType {
    currentAdmin: AdminUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isSuperAdmin: boolean;
    adminUsers: AdminUser[];
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    addAdminUser: (email: string, name: string) => Promise<boolean>;
    removeAdminUser: (id: string) => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() => {
        // Load from localStorage if available
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('labsupply_admin_users');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch {
                    return initialAdminUsers;
                }
            }
        }
        return initialAdminUsers;
    });

    // Check for existing session on mount
    useEffect(() => {
        const savedSession = localStorage.getItem('labsupply_admin_session');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                // Verify this admin still exists in the users list
                const adminExists = adminUsers.find(u => u.email === session.email);
                if (adminExists) {
                    setCurrentAdmin(adminExists);
                } else {
                    localStorage.removeItem('labsupply_admin_session');
                }
            } catch {
                localStorage.removeItem('labsupply_admin_session');
            }
        }
        setIsLoading(false);
    }, [adminUsers]);

    // Save admin users to localStorage whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('labsupply_admin_users', JSON.stringify(adminUsers));
        }
    }, [adminUsers]);

    const login = async (email: string, password: string): Promise<boolean> => {
        // Note: In production, this should validate against a real auth system
        // For demo purposes, we check if the email is in the admin users list
        const normalizedEmail = email.toLowerCase().trim();

        const adminUser = adminUsers.find(u => u.email.toLowerCase() === normalizedEmail);

        if (!adminUser) {
            return false;
        }

        // In production, verify password here
        // For demo, we accept any password for authorized admins
        if (password.length < 1) {
            return false;
        }

        setCurrentAdmin(adminUser);
        localStorage.setItem('labsupply_admin_session', JSON.stringify({
            email: adminUser.email,
            loginTime: new Date().toISOString()
        }));

        return true;
    };

    const logout = () => {
        setCurrentAdmin(null);
        localStorage.removeItem('labsupply_admin_session');
    };

    const addAdminUser = async (email: string, name: string): Promise<boolean> => {
        // Only super admin can add users
        if (!currentAdmin || currentAdmin.role !== 'super_admin') {
            return false;
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user already exists
        if (adminUsers.some(u => u.email.toLowerCase() === normalizedEmail)) {
            return false;
        }

        const newAdmin: AdminUser = {
            id: `admin_${Date.now()}`,
            email: normalizedEmail,
            name,
            role: 'admin',
            createdAt: new Date().toISOString(),
            createdBy: currentAdmin.email,
        };

        setAdminUsers(prev => [...prev, newAdmin]);
        return true;
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

        setAdminUsers(prev => prev.filter(u => u.id !== id));
        return true;
    };

    return (
        <AdminAuthContext.Provider value={{
            currentAdmin,
            isAuthenticated: !!currentAdmin,
            isLoading,
            isSuperAdmin: currentAdmin?.role === 'super_admin',
            adminUsers,
            login,
            logout,
            addAdminUser,
            removeAdminUser,
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
