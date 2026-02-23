import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.protonmail.ch';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'cs@peptidetech.co';

/**
 * POST /api/v1/auth/send-otp
 * Generate and send an 8-digit OTP code to a registered user's email.
 * Works for both merchant and admin users.
 */
export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Check if email belongs to a known user (merchant or admin)
        const [{ data: merchant }, { data: admin }] = await Promise.all([
            supabase.from('merchants').select('id').eq('email', normalizedEmail).maybeSingle(),
            supabase.from('admin_users').select('id').eq('email', normalizedEmail).maybeSingle(),
        ]);

        if (!merchant && !admin) {
            // Uniform response to avoid email enumeration
            return NextResponse.json({
                success: true,
                message: 'If this email is registered, a login code will be sent.',
            });
        }

        // Rate limiting: max 3 codes per email per 15 minutes
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { count: recentCount } = await supabase
            .from('admin_login_codes')
            .select('id', { count: 'exact', head: true })
            .eq('email', normalizedEmail)
            .gte('created_at', fifteenMinAgo)
            .not('code', 'like', 'session:%');

        if ((recentCount || 0) >= 3) {
            return NextResponse.json({
                success: true,
                message: 'If this email is registered, a login code will be sent.',
            });
        }

        // Generate 8-digit code using crypto
        const { randomInt } = await import('crypto');
        const code = randomInt(10000000, 99999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Delete existing unused codes for this email
        await supabase
            .from('admin_login_codes')
            .delete()
            .eq('email', normalizedEmail)
            .eq('used', false)
            .not('code', 'like', 'session:%');

        // Store the new code
        const { error: insertError } = await supabase
            .from('admin_login_codes')
            .insert({
                email: normalizedEmail,
                code: code,
                expires_at: expiresAt.toISOString(),
            });

        if (insertError) {
            console.error('Error storing OTP code:', insertError);
            return NextResponse.json({ error: 'Failed to generate login code. The database may be temporarily unavailable — please try again.' }, { status: 500 });
        }

        // Send email
        if (SMTP_USER && SMTP_PASS) {
            try {
                const transporter = nodemailer.createTransport({
                    host: SMTP_HOST,
                    port: SMTP_PORT,
                    secure: false,
                    auth: { user: SMTP_USER, pass: SMTP_PASS },
                    tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
                });

                await transporter.sendMail({
                    from: `"WhiteLabel Peptides" <${SMTP_FROM}>`,
                    to: normalizedEmail,
                    subject: 'Your Login Code',
                    text: `Your 8-digit login code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you did not request this code, please ignore this email.\n\nWhiteLabel Peptides`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #333;">Your Login Code</h2>
                            <p>Use the code below to sign in to your WhiteLabel Peptides account:</p>
                            <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                                <h1 style="font-size: 36px; letter-spacing: 6px; color: #7c3aed; font-family: monospace; margin: 0;">${code}</h1>
                            </div>
                            <p style="color: #666;">This code expires in <strong>10 minutes</strong>.</p>
                            <p style="color: #999; font-size: 12px;">If you did not request this code, please ignore this email.</p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                            <p style="color: #999; font-size: 12px;">WhiteLabel Peptides</p>
                        </div>
                    `,
                });
            } catch (emailError) {
                console.error('SMTP email error:', emailError);
                return NextResponse.json({
                    success: true,
                    message: 'Code generated but email delivery failed. Please contact support.',
                    emailError: true,
                });
            }
        } else {
            console.warn('SMTP not configured. OTP stored in database only.');
            return NextResponse.json({
                success: true,
                message: 'Code generated. Email delivery not configured.',
                smtpNotConfigured: true,
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Login code sent to email.',
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        return NextResponse.json({ error: 'Failed to send login code email. Verify your email address is correct and try again.' }, { status: 500 });
    }
}
