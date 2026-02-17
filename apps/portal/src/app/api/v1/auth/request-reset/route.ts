/**
 * POST /api/v1/auth/request-reset
 *
 * Server-side password reset that BYPASSES PKCE entirely.
 * Uses Supabase admin.generateLink to get an email_otp code,
 * then sends a custom email with a link containing the email + otp.
 * The reset page verifies via supabase.auth.verifyOtp({ email, token, type })
 * which is a direct API call — no PKCE, no code exchange, no cookies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.protonmail.ch';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'cs@peptidetech.co';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Generate a recovery link via admin API — gives us the OTP code
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: normalizedEmail,
        });

        if (linkError || !linkData) {
            console.error('generateLink error:', linkError?.message);
            // Don't reveal whether the email exists
            return NextResponse.json({
                success: true,
                message: 'If this email is registered, a reset link will be sent.',
            });
        }

        // Get the OTP code — this is what verifyOtp({ email, token, type }) needs
        const otp = linkData.properties?.email_otp;

        if (!otp) {
            console.error('No email_otp in generateLink response. Properties:', JSON.stringify(linkData.properties));
            return NextResponse.json({
                success: true,
                message: 'If this email is registered, a reset link will be sent.',
            });
        }

        // Always use the production domain
        const origin = 'https://whitelabel.peptidetech.co';
        const resetUrl = `${origin}/auth/reset-password?email=${encodeURIComponent(normalizedEmail)}&token=${encodeURIComponent(otp)}`;

        // Send the email
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
                    subject: 'Reset Your Password - WhiteLabel Peptides',
                    text: `You requested a password reset for your WhiteLabel Peptides account.\n\nClick the link below to set a new password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you did not request this, please ignore this email.\n\nWhiteLabel Peptides`,
                    html: `
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #333; margin-bottom: 16px;">Reset Your Password</h2>
                            <p style="color: #555; line-height: 1.6;">
                                You requested a password reset for your WhiteLabel Peptides account.
                                Click the button below to set a new password.
                            </p>
                            <div style="text-align: center; margin: 32px 0;">
                                <a href="${resetUrl}"
                                   style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                    Reset Password
                                </a>
                            </div>
                            <p style="color: #999; font-size: 13px; line-height: 1.5;">
                                This link expires in 1 hour. If the button doesn't work, copy and paste this URL:
                            </p>
                            <p style="color: #7c3aed; font-size: 12px; word-break: break-all;">
                                ${resetUrl}
                            </p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
                            <p style="color: #999; font-size: 12px;">
                                If you did not request this reset, please ignore this email.
                            </p>
                            <p style="color: #bbb; font-size: 11px;">WhiteLabel Peptides</p>
                        </div>
                    `,
                });
            } catch (emailError) {
                console.error('SMTP email error:', emailError);
                return NextResponse.json({ error: 'Failed to send reset email. Please try again.' }, { status: 500 });
            }
        } else {
            console.warn('SMTP not configured.');
        }

        return NextResponse.json({
            success: true,
            message: 'If this email is registered, a reset link will be sent.',
        });
    } catch (error) {
        console.error('Request reset error:', error);
        return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 });
    }
}
