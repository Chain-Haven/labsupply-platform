/**
 * POST /api/v1/auth/accept-invite - Accept a team invitation
 * GET  /api/v1/auth/accept-invite?token=... - Fetch invitation details (public, for registration page)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
        return NextResponse.json({ error: 'Missing token parameter.' }, { status: 400 });
    }

    const serviceClient = getServiceClient();
    const { data: invitation } = await serviceClient
        .from('invitations')
        .select('id, scope, email, role, status, expires_at, merchant_id')
        .eq('token', token)
        .single();

    if (!invitation) {
        return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
        return NextResponse.json({ error: `This invitation has already been ${invitation.status}.` }, { status: 410 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
        await serviceClient.from('invitations').update({ status: 'expired' }).eq('id', invitation.id);
        return NextResponse.json({ error: 'This invitation has expired.' }, { status: 410 });
    }

    let merchantName: string | null = null;
    if (invitation.scope === 'merchant' && invitation.merchant_id) {
        const { data: merchant } = await serviceClient
            .from('merchants')
            .select('company_name')
            .eq('id', invitation.merchant_id)
            .single();
        merchantName = merchant?.company_name ?? null;
    }

    return NextResponse.json({
        email: invitation.email,
        role: invitation.role,
        scope: invitation.scope,
        merchant_name: merchantName,
    });
}

export async function POST(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
        return NextResponse.json({ error: 'Missing token parameter.' }, { status: 400 });
    }

    const serviceClient = getServiceClient();

    // Fetch invitation
    const { data: invitation } = await serviceClient
        .from('invitations')
        .select('*')
        .eq('token', token)
        .single();

    if (!invitation) {
        return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
        return NextResponse.json({ error: `This invitation has already been ${invitation.status}.` }, { status: 410 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
        await serviceClient.from('invitations').update({ status: 'expired' }).eq('id', invitation.id);
        return NextResponse.json({ error: 'This invitation has expired.' }, { status: 410 });
    }

    // Check if user is authenticated
    const supabase = createRouteHandlerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Not logged in: redirect to register with the invite token
        return NextResponse.json({
            redirect: `/register?invite=${token}`,
            message: 'Please create an account or log in to accept this invitation.',
        }, { status: 200 });
    }

    // Verify the authenticated user's email matches the invitation
    const userEmail = user.email?.toLowerCase().trim();
    if (userEmail !== invitation.email.toLowerCase().trim()) {
        return NextResponse.json(
            { error: `This invitation was sent to ${invitation.email}. Please log in with that email address.` },
            { status: 403 }
        );
    }

    // Accept the invitation based on scope
    if (invitation.scope === 'merchant') {
        // Check if already a member
        const { data: existingMember } = await serviceClient
            .from('merchant_users')
            .select('id')
            .eq('merchant_id', invitation.merchant_id)
            .eq('user_id', user.id)
            .maybeSingle();

        if (!existingMember) {
            const { error: insertError } = await serviceClient
                .from('merchant_users')
                .insert({
                    merchant_id: invitation.merchant_id,
                    user_id: user.id,
                    role: invitation.role,
                    email: invitation.email,
                    invited_by: invitation.invited_by,
                    invited_at: new Date().toISOString(),
                });

            if (insertError) {
                console.error('Error inserting merchant_user:', insertError);
                return NextResponse.json({ error: 'Failed to add you to the team.' }, { status: 500 });
            }
        }
    } else if (invitation.scope === 'admin') {
        // Check if already an admin
        const { data: existingAdmin } = await serviceClient
            .from('admin_users')
            .select('id')
            .eq('email', invitation.email)
            .maybeSingle();

        if (existingAdmin) {
            // Link user_id if not set
            if (!existingAdmin.id || existingAdmin.id !== user.id) {
                await serviceClient
                    .from('admin_users')
                    .update({ user_id: user.id })
                    .eq('email', invitation.email);
            }
        } else {
            const { error: insertError } = await serviceClient
                .from('admin_users')
                .insert({
                    email: invitation.email,
                    name: user.user_metadata?.name || user.email || '',
                    role: invitation.role,
                    user_id: user.id,
                    invited_by: invitation.invited_by,
                    invited_at: new Date().toISOString(),
                    is_active: true,
                });

            if (insertError) {
                console.error('Error inserting admin_user:', insertError);
                return NextResponse.json({ error: 'Failed to add you as an admin.' }, { status: 500 });
            }
        }
    }

    // Mark invitation as accepted
    await serviceClient
        .from('invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

    // Audit
    await serviceClient.from('audit_events').insert({
        actor_user_id: user.id,
        merchant_id: invitation.merchant_id || undefined,
        action: 'team.invite_accepted',
        entity_type: 'invitation',
        entity_id: invitation.id,
        new_values: { email: invitation.email, role: invitation.role, scope: invitation.scope },
    }).then(() => {}, () => {});

    return NextResponse.json({
        success: true,
        scope: invitation.scope,
        message: invitation.scope === 'merchant'
            ? 'You have been added to the team!'
            : 'You have been added as an admin!',
    });
}
