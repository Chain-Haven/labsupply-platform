import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Mark as dynamic
export const dynamic = 'force-dynamic';

// Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// SMTP Configuration (loaded from environment variables for security)
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.protonmail.ch';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'cs@peptidetech.co';

// Super admin email (hardcoded as primary fallback)
const SUPER_ADMIN_EMAIL = 'info@chainhaven.co';

/**
 * POST /api/v1/admin/send-backup-code
 * Generate and send an 8-digit backup code to verified admin email
 * Only super admin (info@chainhaven.co) or invited admins can receive codes
 */
export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase();
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Check if email is super admin (always allowed)
        const isSuperAdmin = normalizedEmail === SUPER_ADMIN_EMAIL;

        if (!isSuperAdmin) {
            // Check if email is an invited admin in the database
            const { data: adminUser, error: adminError } = await supabase
                .from('admin_users')
                .select()
                .eq('email', normalizedEmail)
                .eq('is_active', true)
                .single();

            if (adminError || !adminUser) {
                return NextResponse.json({
                    error: 'This email is not authorized. Only registered admins can receive backup codes.'
                }, { status: 403 });
            }
        }

        // Generate 8-digit code
        const code = Math.floor(10000000 + Math.random() * 90000000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Delete any existing unused codes for this email
        await supabase
            .from('admin_login_codes')
            .delete()
            .eq('email', normalizedEmail)
            .eq('used', false);

        // Insert new code
        const { error: insertError } = await supabase
            .from('admin_login_codes')
            .insert({
                email: normalizedEmail,
                code: code,
                expires_at: expiresAt.toISOString(),
            });

        if (insertError) {
            console.error('Error storing admin code:', insertError);
            return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
        }

        // Send email via Proton SMTP
        if (SMTP_USER && SMTP_PASS) {
            try {
                // Create transporter with TLS
                const transporter = nodemailer.createTransport({
                    host: SMTP_HOST,
                    port: SMTP_PORT,
                    secure: false, // Use STARTTLS
                    auth: {
                        user: SMTP_USER,
                        pass: SMTP_PASS,
                    },
                    tls: {
                        rejectUnauthorized: true,
                        minVersion: 'TLSv1.2',
                    },
                });

                // Send email
                await transporter.sendMail({
                    from: `"LabSupply Admin" <${SMTP_FROM}>`,
                    to: normalizedEmail,
                    subject: 'Your Admin Login Code',
                    text: `Your 8-digit backup login code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you did not request this code, please ignore this email.\n\nLabSupply Admin Portal`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #333;">Admin Login Code</h2>
                            <p>Your 8-digit backup login code is:</p>
                            <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                                <h1 style="font-size: 36px; letter-spacing: 6px; color: #7c3aed; font-family: monospace; margin: 0;">${code}</h1>
                            </div>
                            <p style="color: #666;">This code expires in <strong>10 minutes</strong>.</p>
                            <p style="color: #999; font-size: 12px;">If you did not request this code, please ignore this email.</p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                            <p style="color: #999; font-size: 12px;">LabSupply Admin Portal</p>
                        </div>
                    `,
                });

                // Email sent successfully
            } catch (emailError) {
                console.error('SMTP email error:', emailError);
                return NextResponse.json({
                    success: true,
                    message: 'Code generated but email delivery failed. Please contact support.',
                    emailError: true,
                });
            }
        } else {
            console.warn('SMTP credentials not configured. Code stored in database only.');
            return NextResponse.json({
                success: true,
                message: 'Code generated. Email delivery not configured - please contact support.',
                smtpNotConfigured: true,
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Backup code sent to email',
        });
    } catch (error) {
        console.error('Send backup code error:', error);
        return NextResponse.json({ error: 'Failed to send backup code' }, { status: 500 });
    }
}
