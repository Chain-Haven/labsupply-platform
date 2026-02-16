import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function GET() {
    try {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('merchants')
            .select(`
                id, user_id, email, company_name, contact_email, phone,
                status, kyb_status, can_ship, billing_email,
                legal_opinion_letter_url,
                billing_name, billing_address_street, billing_address_city,
                billing_address_state, billing_address_zip,
                created_at, updated_at
            `)
            .in('kyb_status', ['in_progress', 'not_started'])
            .order('created_at', { ascending: true });

        if (error) {
            console.error('KYB review fetch error:', error);
            return NextResponse.json({ error: 'Failed to fetch KYB reviews' }, { status: 500 });
        }

        // Also get approved count for stats
        const { count: approvedCount } = await supabase
            .from('merchants')
            .select('id', { count: 'exact', head: true })
            .eq('kyb_status', 'approved');

        return NextResponse.json({
            data: data || [],
            stats: { approvedCount: approvedCount || 0 },
        });
    } catch (error) {
        console.error('KYB review API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const body = await request.json();
        const { merchantId, action, reason } = body;

        if (!merchantId || !action) {
            return NextResponse.json({ error: 'merchantId and action required' }, { status: 400 });
        }

        if (action !== 'approve' && action !== 'reject') {
            return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
        }

        // Get merchant
        const { data: merchant, error: fetchError } = await supabase
            .from('merchants')
            .select('id, company_name, email, billing_email, contact_email')
            .eq('id', merchantId)
            .single();

        if (fetchError || !merchant) {
            return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }

        if (action === 'approve') {
            const updates: Record<string, unknown> = {
                kyb_status: 'approved',
                status: 'approved',
                can_ship: true,
            };

            // Create Mercury customer on approval
            const mercuryToken = process.env.MERCURY_API_TOKEN;

            if (mercuryToken) {
                try {
                    const customerEmail = merchant.billing_email || merchant.contact_email || merchant.email;
                    const mercuryRes = await fetch('https://api.mercury.com/api/v1/ar/customers', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${mercuryToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            name: merchant.company_name || merchant.email,
                            email: customerEmail,
                        }),
                    });

                    if (mercuryRes.ok) {
                        const mercuryCustomer = await mercuryRes.json();
                        updates.mercury_customer_id = mercuryCustomer.id;
                        if (!merchant.billing_email) {
                            updates.billing_email = customerEmail;
                        }
                    } else {
                        console.error('Mercury customer creation failed:', await mercuryRes.text());
                    }
                } catch (err) {
                    console.error('Mercury customer creation error:', err);
                }
            }

            const { error: updateError } = await supabase
                .from('merchants')
                .update(updates)
                .eq('id', merchantId);

            if (updateError) {
                console.error('KYB approve error:', updateError);
                return NextResponse.json({ error: 'Failed to approve merchant' }, { status: 500 });
            }

            await supabase.from('audit_events').insert({
                action: 'kyb.approved',
                entity_type: 'merchant',
                entity_id: merchantId,
                metadata: { mercury_customer_created: !!updates.mercury_customer_id },
            });

            return NextResponse.json({ success: true, action: 'approved', mercury_customer_id: updates.mercury_customer_id || null });
        } else {
            // Reject
            const { error: updateError } = await supabase
                .from('merchants')
                .update({
                    kyb_status: 'rejected',
                    status: 'suspended',
                    can_ship: false,
                })
                .eq('id', merchantId);

            if (updateError) {
                console.error('KYB reject error:', updateError);
                return NextResponse.json({ error: 'Failed to reject merchant' }, { status: 500 });
            }

            await supabase.from('audit_events').insert({
                action: 'kyb.rejected',
                entity_type: 'merchant',
                entity_id: merchantId,
                metadata: { reason: reason || 'Not specified' },
            });

            return NextResponse.json({ success: true, action: 'rejected' });
        }
    } catch (error) {
        console.error('KYB review POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
