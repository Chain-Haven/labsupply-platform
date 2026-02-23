import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function GET() {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('merchants')
            .select(`
                id, user_id, email, contact_email, company_name, phone,
                status, kyb_status, can_ship,
                legal_opinion_letter_url,
                billing_name, billing_email, billing_address_street, billing_address_city,
                billing_address_state, billing_address_zip,
                selected_package_id,
                service_packages(slug, name, price_cents),
                created_at, updated_at
            `)
            .in('kyb_status', ['in_progress', 'not_started'])
            .order('created_at', { ascending: true });

        if (error) {
            console.warn('KYB review fetch error:', error.code, error.message);
            return NextResponse.json({ data: [], stats: { approvedCount: 0 } });
        }

        // Also get approved count for stats
        const { count: approvedCount } = await supabase
            .from('merchants')
            .select('id', { count: 'exact', head: true })
            .eq('kyb_status', 'approved');

        // Fetch KYB documents for all pending merchants
        const userIds = (data || []).map((m: { user_id: string }) => m.user_id).filter(Boolean);
        let kybDocuments: Record<string, unknown>[] = [];
        if (userIds.length > 0) {
            const { data: docs } = await supabase
                .from('kyb_documents')
                .select('id, user_id, document_type, file_name, storage_path, mime_type, status, created_at')
                .in('user_id', userIds);
            kybDocuments = docs || [];
        }

        // Generate signed URLs for each document
        const docsWithUrls: Array<Record<string, unknown>> = await Promise.all(
            kybDocuments.map(async (doc: Record<string, unknown>) => {
                const { data: signedUrl } = await supabase.storage
                    .from('merchant-uploads')
                    .createSignedUrl(doc.storage_path as string, 3600);
                return { ...doc, signed_url: signedUrl?.signedUrl || null };
            })
        );

        // Group documents by user_id
        const docsByUser: Record<string, Array<Record<string, unknown>>> = {};
        for (const doc of docsWithUrls) {
            const uid = doc.user_id as string;
            if (!docsByUser[uid]) docsByUser[uid] = [];
            docsByUser[uid].push(doc);
        }

        const enrichedData = (data || []).map((merchant: Record<string, unknown>) => ({
            ...merchant,
            kyb_documents: docsByUser[merchant.user_id as string] || [],
        }));

        return NextResponse.json({
            data: enrichedData,
            stats: { approvedCount: approvedCount || 0 },
        });
    } catch (error) {
        console.error('KYB review API error:', error);
        return NextResponse.json({ error: 'Failed to load merchant reviews. Please refresh and try again.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();
        const body = await request.json();
        const { merchantId, action, reason } = body;

        if (!merchantId || !action) {
            return NextResponse.json({ error: 'merchantId and action required' }, { status: 400 });
        }

        if (action !== 'approve' && action !== 'reject') {
            return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
        }

        const { data: merchant, error: fetchError } = await supabase
            .from('merchants')
            .select('id, company_name, email, selected_package_id')
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
                    const customerEmail = merchant.email;
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
                        // mercury_customer_id column may not exist yet; ignore update errors
                        updates.mercury_customer_id = mercuryCustomer.id;
                    } else {
                        console.error('Mercury customer creation failed:', await mercuryRes.text());
                    }
                } catch (err) {
                    console.error('Mercury customer creation error:', err);
                }
            }

            // Try update with all fields; if mercury_customer_id column doesn't exist, retry without it
            let { error: updateError } = await supabase
                .from('merchants')
                .update(updates)
                .eq('id', merchantId);

            if (updateError && (updateError.code === '42703' || updateError.message?.includes('column'))) {
                // Column doesn't exist yet; remove Mercury fields and retry
                const safeUpdates = { kyb_status: updates.kyb_status, status: updates.status, can_ship: updates.can_ship };
                const retryResult = await supabase.from('merchants').update(safeUpdates).eq('id', merchantId);
                updateError = retryResult.error;
            }

            if (updateError) {
                console.error('KYB approve error:', updateError);
                return NextResponse.json({ error: 'Failed to approve merchant. The database update was rejected — please try again or check the merchant status.' }, { status: 500 });
            }

            // Audit log -- ignore if table doesn't exist
            await supabase.from('audit_events').insert({
                action: 'kyb.approved',
                entity_type: 'merchant',
                entity_id: merchantId,
                metadata: { mercury_customer_created: !!updates.mercury_customer_id },
            }).then(() => {}, () => {});

            // Auto-invoice for paid package if merchant selected one
            let packageInvoiceCreated = false;
            if (merchant.selected_package_id && updates.mercury_customer_id && mercuryToken) {
                try {
                    const { data: pkg } = await supabase
                        .from('service_packages')
                        .select('id, name, price_cents, slug')
                        .eq('id', merchant.selected_package_id)
                        .single();

                    if (pkg && pkg.price_cents > 0) {
                        const mercuryAccountId = process.env.MERCURY_ACCOUNT_ID || '';
                        const dueDate = new Date();
                        dueDate.setDate(dueDate.getDate() + 14);
                        const dueDateStr = dueDate.toISOString().split('T')[0];
                        const invoiceDateStr = new Date().toISOString().split('T')[0];
                        const amountDollars = (pkg.price_cents / 100).toFixed(2);

                        const invoiceRes = await fetch('https://api.mercury.com/api/v1/ar/invoices', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${mercuryToken}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                customerId: updates.mercury_customer_id,
                                dueDate: dueDateStr,
                                invoiceDate: invoiceDateStr,
                                lineItems: [{
                                    name: `${pkg.name} Package — ${merchant.company_name || merchant.email}`,
                                    unitPrice: amountDollars,
                                    quantity: 1,
                                }],
                                ccEmails: [],
                                payerMemo: `Service package: ${pkg.name}. Pay via ACH to activate your package.`,
                                sendEmailOption: 'SendNow',
                                creditCardEnabled: false,
                                achDebitEnabled: true,
                                useRealAccountNumber: false,
                                destinationAccountId: mercuryAccountId,
                            }),
                        });

                        if (invoiceRes.ok) {
                            const invoice = await invoiceRes.json();
                            await supabase.from('merchant_packages').upsert({
                                merchant_id: merchantId,
                                package_id: pkg.id,
                                status: 'invoiced',
                                mercury_invoice_id: invoice.id,
                                amount_cents: pkg.price_cents,
                            }, { onConflict: 'merchant_id,package_id' }).then(() => {}, () => {});

                            await supabase.from('mercury_invoices').insert({
                                merchant_id: merchantId,
                                mercury_invoice_id: invoice.id,
                                mercury_invoice_number: invoice.invoiceNumber,
                                mercury_slug: invoice.slug,
                                amount_cents: pkg.price_cents,
                                status: 'Unpaid',
                                due_date: dueDateStr,
                            }).then(() => {}, () => {});

                            packageInvoiceCreated = true;
                        } else {
                            console.error('Package invoice creation failed:', await invoiceRes.text());
                        }
                    }
                } catch (err) {
                    console.error('Package invoice error:', err);
                }
            }

            return NextResponse.json({
                success: true,
                action: 'approved',
                mercury_customer_id: updates.mercury_customer_id || null,
                package_invoice_created: packageInvoiceCreated,
            });
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
                return NextResponse.json({ error: 'Failed to reject merchant. The database update was rejected — please try again or check the merchant status.' }, { status: 500 });
            }

            await supabase.from('audit_events').insert({
                action: 'kyb.rejected',
                entity_type: 'merchant',
                entity_id: merchantId,
                metadata: { reason: reason || 'Not specified' },
            }).then(() => {}, () => {});

            return NextResponse.json({ success: true, action: 'rejected' });
        }
    } catch (error) {
        console.error('KYB review POST error:', error);
        return NextResponse.json({ error: 'Failed to process KYB review due to an unexpected error. Please try again.' }, { status: 500 });
    }
}
