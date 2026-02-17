'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { CANONICAL_ORIGIN } from '@/lib/constants';
import { User, Session } from '@supabase/supabase-js';

// Merchant type from database
export interface Merchant {
    id: string;
    user_id: string;
    email: string;
    company_name: string | null;
    website_url: string | null;
    phone: string | null;
    status: 'pending' | 'approved' | 'suspended';
    kyb_status: 'not_started' | 'in_progress' | 'approved' | 'rejected';
    wallet_balance_cents: number;
    billing_email: string | null;
    mercury_customer_id: string | null;
    low_balance_threshold_cents: number;
    target_balance_cents: number;
    created_at: string;
    updated_at: string;
}

interface MerchantAuthContextType {
    user: User | null;
    session: Session | null;
    merchant: Merchant | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    loginWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
    verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
    verifySignupOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
    register: (email: string, password: string, companyName?: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    updateMerchant: (data: Partial<Merchant>) => Promise<{ success: boolean; error?: string }>;
    refreshMerchant: () => Promise<void>;
}

const MerchantAuthContext = createContext<MerchantAuthContextType | undefined>(undefined);

export function MerchantAuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [merchant, setMerchant] = useState<Merchant | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const supabase = createBrowserClient();

    // Fetch merchant profile via server API (avoids client-side RLS issues)
    const fetchMerchant = async (_userId: string) => {
        try {
            const res = await fetch('/api/v1/merchant/me', { credentials: 'include' });
            if (!res.ok) {
                console.error('Error fetching merchant: status', res.status);
                return null;
            }
            const data = await res.json();
            if (data.error) {
                console.error('Error fetching merchant:', data.error);
                return null;
            }
            return data as Merchant;
        } catch (err) {
            console.error('Error in fetchMerchant:', err);
            return null;
        }
    };

    // Initialize auth state
    useEffect(() => {
        const initAuth = async () => {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();

                if (currentSession?.user) {
                    setUser(currentSession.user);
                    setSession(currentSession);
                    const merchantData = await fetchMerchant(currentSession.user.id);
                    setMerchant(merchantData);
                }
            } catch (err) {
                console.error('Error initializing auth:', err);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                if (newSession?.user) {
                    setUser(newSession.user);
                    setSession(newSession);
                    const merchantData = await fetchMerchant(newSession.user.id);
                    setMerchant(merchantData);
                } else {
                    setUser(null);
                    setSession(null);
                    setMerchant(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // Login function
    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                return { success: false, error: error.message };
            }

            if (data.user) {
                let merchantData = await fetchMerchant(data.user.id);

                // Auto-create merchant profile if user registered but profile wasn't created yet
                if (!merchantData) {
                    const companyName = data.user.user_metadata?.company_name || '';
                    try {
                        const res = await fetch('/api/v1/merchant/me', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ companyName }),
                        });
                        if (res.ok) {
                            merchantData = await fetchMerchant(data.user.id);
                        }
                    } catch (profileErr) {
                        console.error('Error auto-creating merchant profile:', profileErr);
                    }
                }

                if (!merchantData) {
                    return { success: false, error: 'Unable to create merchant profile. Please contact support.' };
                }
                setMerchant(merchantData);
            }

            return { success: true };
        } catch (err) {
            return { success: false, error: 'An unexpected error occurred' };
        }
    };

    // Send OTP code via custom 8-digit system (calls /api/v1/auth/send-otp)
    const loginWithMagicLink = async (email: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const normalizedEmail = email.toLowerCase().trim();

            const res = await fetch('/api/v1/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: normalizedEmail }),
            });

            const data = await res.json();

            if (!res.ok) {
                return { success: false, error: data.error || 'Failed to send code.' };
            }

            // SMTP not configured on the server — surface to user
            if (data.smtpNotConfigured) {
                return {
                    success: false,
                    error: 'Email delivery is not currently available. Please use password login or contact support.',
                };
            }

            if (data.emailError) {
                return {
                    success: false,
                    error: 'Failed to deliver the code to your email. Please try again or use password login.',
                };
            }

            return { success: true };
        } catch (err) {
            return { success: false, error: 'An unexpected error occurred' };
        }
    };

    // Verify the 8-digit OTP code via custom server system, then establish Supabase session
    const verifyOtp = async (email: string, token: string): Promise<{ success: boolean; error?: string }> => {
        try {
            // Step 1: Verify the 8-digit code — server checks DB and returns a token_hash
            const res = await fetch('/api/v1/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase().trim(), code: token }),
            });

            const verifyData = await res.json();

            if (!res.ok) {
                return { success: false, error: verifyData.error || 'Invalid or expired code.' };
            }

            const tokenHash = verifyData.token_hash;
            if (!tokenHash) {
                return { success: false, error: 'Verification failed. Please try again.' };
            }

            // Step 2: Exchange token_hash for a live Supabase session
            const { data, error } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: 'magiclink',
            });

            if (error) {
                return { success: false, error: error.message };
            }

            if (data.user) {
                let merchantData = await fetchMerchant(data.user.id);

                // Auto-create merchant profile if it doesn't exist
                if (!merchantData) {
                    const companyName = data.user.user_metadata?.company_name || '';
                    try {
                        const profileRes = await fetch('/api/v1/merchant/me', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ companyName }),
                        });
                        if (profileRes.ok) {
                            merchantData = await fetchMerchant(data.user.id);
                        }
                    } catch (profileErr) {
                        console.error('Error auto-creating merchant profile:', profileErr);
                    }
                }

                if (!merchantData) {
                    return { success: false, error: 'Unable to find or create your account. Please register first.' };
                }
                setMerchant(merchantData);
            }

            return { success: true };
        } catch (err) {
            return { success: false, error: 'Failed to verify code. Please try again.' };
        }
    };

    // Verify OTP code for email confirmation after signup
    const verifySignupOtp = async (email: string, token: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email: email.toLowerCase().trim(),
                token,
                type: 'signup',
            });

            if (error) {
                return { success: false, error: error.message };
            }

            if (data.user) {
                // Read company name from user metadata (stored during signUp)
                const companyName = data.user.user_metadata?.company_name || '';

                // Create merchant profile now that the session is established
                try {
                    const res = await fetch('/api/v1/merchant/me', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ companyName }),
                    });
                    if (!res.ok) {
                        console.error('Error ensuring merchant profile: status', res.status);
                    }
                } catch (profileErr) {
                    console.error('Error ensuring merchant profile:', profileErr);
                }

                const merchantData = await fetchMerchant(data.user.id);
                setMerchant(merchantData);
            }

            return { success: true };
        } catch (err) {
            return { success: false, error: 'Failed to verify code. Please try again.' };
        }
    };

    // Register function
    const register = async (
        email: string,
        password: string,
        companyName?: string
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            // Sign up the user — store companyName in user metadata
            // so it's available after email confirmation
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${CANONICAL_ORIGIN}/auth/confirm?next=/dashboard`,
                    data: {
                        company_name: companyName || '',
                    },
                }
            });

            if (error) {
                return { success: false, error: error.message };
            }

            // Profile creation happens after email verification (verifySignupOtp or auth/confirm)
            // because the session isn't fully established until then.
            if (data.session && data.user) {
                // If auto-confirm is on (no email verification required), create profile now
                try {
                    const res = await fetch('/api/v1/merchant/me', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ companyName }),
                    });
                    if (!res.ok) {
                        console.error('Error creating merchant profile: status', res.status);
                    }
                    const merchantData = await fetchMerchant(data.user.id);
                    setMerchant(merchantData);
                } catch (profileErr) {
                    console.error('Error creating merchant profile:', profileErr);
                }
            }

            return { success: true };
        } catch (err) {
            return { success: false, error: 'An unexpected error occurred' };
        }
    };

    // Logout function
    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setMerchant(null);
    };

    // Update merchant profile via server API
    const updateMerchant = async (data: Partial<Merchant>): Promise<{ success: boolean; error?: string }> => {
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const res = await fetch('/api/v1/merchant/me', {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                return { success: false, error: body.error || 'Failed to update profile' };
            }

            const updatedMerchant = await res.json();
            setMerchant(updatedMerchant as Merchant);

            return { success: true };
        } catch (err) {
            return { success: false, error: 'An unexpected error occurred' };
        }
    };

    // Refresh merchant data
    const refreshMerchant = async () => {
        if (user) {
            const merchantData = await fetchMerchant(user.id);
            setMerchant(merchantData);
        }
    };

    const value: MerchantAuthContextType = {
        user,
        session,
        merchant,
        isAuthenticated: !!user && !!merchant,
        isLoading,
        login,
        loginWithMagicLink,
        verifyOtp,
        verifySignupOtp,
        register,
        logout,
        updateMerchant,
        refreshMerchant,
    };

    return (
        <MerchantAuthContext.Provider value={value}>
            {children}
        </MerchantAuthContext.Provider>
    );
}

export function useMerchantAuth() {
    const context = useContext(MerchantAuthContext);
    if (context === undefined) {
        throw new Error('useMerchantAuth must be used within a MerchantAuthProvider');
    }
    return context;
}
