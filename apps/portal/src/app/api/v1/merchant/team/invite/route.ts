/**
 * POST /api/v1/merchant/team/invite - Send a team invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireMerchantRole, getServiceClient } from '@/lib/merchant-api-auth';
import { sendInvitationEmail } from '@/lib/email-templates';
import { logNonCritical } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireMerchantRole('MERCHANT_ADMIN');
        if (authResult instanceof NextResponse) return authResult;
        const { merchant, role: callerRole, userId } = authResult.data;

        const rateCheck = await checkRateLimit(`invite:merchant:${userId}`, 10, 60 * 60 * 1000);
        if (!rateCheck.allowed) {
            return NextResponse.json(
                { error: 'Too many invitations. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.retryAfterMs || 60000) / 1000)) } }
            );
        }

        const body = await request.json();
        const email = (body.email || '').toLowerCase().trim();
        const inviteRole = body.role || 'MERCHANT_USER';

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
        }

        const validRoles = ['MERCHANT_ADMIN', 'MERCHANT_USER'];
        if (!validRoles.includes(inviteRole)) {
            return NextResponse.json({ error: 'Invalid role specified.' }, { status: 400 });
        }

        // MERCHANT_ADMIN can only invite MERCHANT_USER
        if (callerRole === 'MERCHANT_ADMIN' && inviteRole !== 'MERCHANT_USER') {
            return NextResponse.json(
                { error: 'Admins can only invite users with the User role.' },
                { status: 403 }
            );
        }

        const serviceClient = getServiceClient();

        // Check for existing member with this email
        const { data: existingMember } = await serviceClient
            .from('merchant_users')
            .select('id')
            .eq('merchant_id', merchant.id)
            .eq('email', email)
            .maybeSingle();

        if (existingMember) {
            return NextResponse.json({ error: 'This email is already a team member.' }, { status: 409 });
        }

        // Check for existing pending invitation
        const { data: existingInvite } = await serviceClient
            .from('invitations')
            .select('id')
            .eq('merchant_id', merchant.id)
            .eq('email', email)
            .eq('status', 'pending')
            .maybeSingle();

        if (existingInvite) {
            return NextResponse.json({ error: 'An invitation is already pending for this email.' }, { status: 409 });
        }

        const { data: invitation, error: insertError } = await serviceClient
            .from('invitations')
            .insert({
                scope: 'merchant',
                merchant_id: merchant.id,
                email,
                role: inviteRole,
                invited_by: userId,
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error creating invitation:', insertError);
            return NextResponse.json({ error: 'Failed to create invitation.' }, { status: 500 });
        }

        // Send invitation email (non-blocking)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.peptidetech.co';
        const acceptUrl = `${appUrl}/auth/accept-invite?token=${invitation.token}`;

        sendInvitationEmail({
            recipientEmail: email,
            inviterName: merchant.company_name || merchant.email,
            scope: 'merchant',
            merchantName: merchant.company_name || undefined,
            role: inviteRole,
            acceptUrl,
        }).catch(err => console.error('Failed to send invitation email:', err));

        // Audit log
        logNonCritical(serviceClient.from('audit_events').insert({
            actor_user_id: userId,
            merchant_id: merchant.id,
            action: 'team.invite_sent',
            entity_type: 'invitation',
            entity_id: invitation.id,
            new_values: { email, role: inviteRole },
        }), 'audit:team.invite_sent');

        return NextResponse.json(invitation, { status: 201 });
    } catch (err) {
        console.error('Error in POST /api/v1/merchant/team/invite:', err);
        return NextResponse.json({ error: 'Failed to send invitation.' }, { status: 500 });
    }
}
