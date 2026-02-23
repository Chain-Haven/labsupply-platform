/**
 * POST /api/v1/admin/team/invite - Send an admin invitation (super_admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';
import { sendInvitationEmail } from '@/lib/email-templates';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;
        const { admin } = authResult;

        if (admin.role !== 'super_admin') {
            return NextResponse.json({ error: 'Only super admins can invite new admins.' }, { status: 403 });
        }

        const rateCheck = checkRateLimit(`invite:admin:${admin.email}`, 10, 60 * 60 * 1000);
        if (!rateCheck.allowed) {
            return NextResponse.json(
                { error: 'Too many invitations. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.retryAfterMs || 60000) / 1000)) } }
            );
        }

        const body = await request.json();
        const email = (body.email || '').toLowerCase().trim();
        const inviteRole = body.role || 'admin';

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
        }

        if (!['admin'].includes(inviteRole)) {
            return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
        }

        const serviceClient = getServiceClient();

        // Check for existing admin with this email
        const { data: existingAdmin } = await serviceClient
            .from('admin_users')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (existingAdmin) {
            return NextResponse.json({ error: 'This email is already an admin.' }, { status: 409 });
        }

        // Check for existing pending invitation
        const { data: existingInvite } = await serviceClient
            .from('invitations')
            .select('id')
            .eq('email', email)
            .eq('scope', 'admin')
            .eq('status', 'pending')
            .maybeSingle();

        if (existingInvite) {
            return NextResponse.json({ error: 'An invitation is already pending for this email.' }, { status: 409 });
        }

        // Resolve the super admin's auth user_id for invited_by
        let invitedByUserId = admin.id;
        if (admin.id === 'backup-session') {
            const { data: adminRecord } = await serviceClient
                .from('admin_users')
                .select('user_id')
                .eq('email', admin.email)
                .single();
            invitedByUserId = adminRecord?.user_id || admin.id;
        }

        const { data: invitation, error: insertError } = await serviceClient
            .from('invitations')
            .insert({
                scope: 'admin',
                merchant_id: null,
                email,
                role: inviteRole,
                invited_by: invitedByUserId,
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error creating admin invitation:', insertError);
            return NextResponse.json({ error: 'Failed to create invitation.' }, { status: 500 });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.peptidetech.co';
        const acceptUrl = `${appUrl}/auth/accept-invite?token=${invitation.token}`;

        sendInvitationEmail({
            recipientEmail: email,
            inviterName: admin.email,
            scope: 'admin',
            role: inviteRole,
            acceptUrl,
        }).catch(err => console.error('Failed to send admin invitation email:', err));

        await serviceClient.from('audit_events').insert({
            actor_user_id: invitedByUserId,
            action: 'admin_team.invite_sent',
            entity_type: 'invitation',
            entity_id: invitation.id,
            new_values: { email, role: inviteRole },
        }).then(() => {}, () => {});

        return NextResponse.json(invitation, { status: 201 });
    } catch (err) {
        console.error('Error in POST /api/v1/admin/team/invite:', err);
        return NextResponse.json({ error: 'Failed to send invitation.' }, { status: 500 });
    }
}
