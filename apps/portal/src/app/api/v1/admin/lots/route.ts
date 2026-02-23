import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';

export const dynamic = 'force-dynamic';

const MAX_COA_SIZE = 10 * 1024 * 1024; // 10MB

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('product_id');

        if (!productId) {
            return NextResponse.json({ error: 'product_id query parameter is required' }, { status: 400 });
        }

        const { data: lots, error } = await supabase
            .from('lots')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Lots fetch error:', error);
            return NextResponse.json({ error: 'Failed to fetch lots' }, { status: 500 });
        }

        return NextResponse.json({ data: lots || [] });
    } catch (error) {
        console.error('Lots GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch lots. Please try again.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();
        const formData = await request.formData();

        const productId = formData.get('product_id') as string | null;
        const lotCode = formData.get('lot_code') as string | null;
        const manufacturedAt = formData.get('manufactured_at') as string | null;
        const expiresAt = formData.get('expires_at') as string | null;
        const quantityRaw = formData.get('quantity') as string | null;
        const notes = formData.get('notes') as string | null;
        const coaFile = formData.get('coa') as File | null;

        if (!productId || !lotCode) {
            return NextResponse.json(
                { error: 'product_id and lot_code are required' },
                { status: 400 },
            );
        }

        const { data: product, error: productErr } = await supabase
            .from('products')
            .select('id')
            .eq('id', productId)
            .single();

        if (productErr || !product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        let coaStoragePath: string | null = null;

        if (coaFile && coaFile.size > 0) {
            if (coaFile.type !== 'application/pdf') {
                return NextResponse.json(
                    { error: 'COA must be a PDF file' },
                    { status: 400 },
                );
            }
            if (coaFile.size > MAX_COA_SIZE) {
                return NextResponse.json(
                    { error: 'COA file must be 10MB or smaller' },
                    { status: 400 },
                );
            }

            const storagePath = `${productId}/${lotCode}.pdf`;
            const buffer = Buffer.from(await coaFile.arrayBuffer());

            const { error: uploadErr } = await supabase.storage
                .from('lot-coas')
                .upload(storagePath, buffer, {
                    contentType: 'application/pdf',
                    upsert: true,
                });

            if (uploadErr) {
                console.error('COA upload error:', uploadErr);
                return NextResponse.json(
                    { error: 'Failed to upload COA file' },
                    { status: 500 },
                );
            }

            coaStoragePath = storagePath;
        }

        const lotQuantity = quantityRaw ? Number(quantityRaw) : 0;

        const { data: lot, error: insertErr } = await supabase
            .from('lots')
            .insert({
                product_id: productId,
                lot_code: lotCode,
                coa_storage_path: coaStoragePath,
                manufactured_at: manufacturedAt || null,
                expires_at: expiresAt || null,
                quantity: lotQuantity || null,
                notes: notes || null,
            })
            .select()
            .single();

        if (insertErr) {
            console.error('Lot insert error:', insertErr);
            return NextResponse.json(
                { error: 'Failed to create lot. Check for duplicate lot codes.' },
                { status: 500 },
            );
        }

        // Add the lot quantity to the product's inventory on_hand
        if (lotQuantity > 0) {
            const { data: inv } = await supabase
                .from('inventory')
                .select('id, on_hand')
                .eq('product_id', productId)
                .single();

            if (inv) {
                await supabase.from('inventory')
                    .update({ on_hand: inv.on_hand + lotQuantity })
                    .eq('id', inv.id);
            } else {
                await supabase.from('inventory').insert({
                    product_id: productId,
                    on_hand: lotQuantity,
                    reserved: 0,
                    incoming: 0,
                    reorder_point: 10,
                });
            }

            await supabase.from('audit_events').insert({
                action: 'inventory.lot_added',
                entity_type: 'lot',
                entity_id: lot.id,
                metadata: { product_id: productId, lot_code: lotCode, quantity: lotQuantity },
            }).then(() => {}, () => {});
        }

        return NextResponse.json({ data: lot }, { status: 201 });
    } catch (error) {
        console.error('Lots POST error:', error);
        return NextResponse.json({ error: 'Failed to create lot. Please try again.' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
        }

        const { data: lot, error: fetchErr } = await supabase
            .from('lots')
            .select('id, product_id, quantity, coa_storage_path')
            .eq('id', id)
            .single();

        if (fetchErr || !lot) {
            return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
        }

        if (lot.coa_storage_path) {
            const { error: removeErr } = await supabase.storage
                .from('lot-coas')
                .remove([lot.coa_storage_path]);

            if (removeErr) {
                console.error('COA storage removal error:', removeErr);
            }
        }

        // Subtract remaining lot quantity from inventory before deleting
        if (lot.quantity && lot.quantity > 0 && lot.product_id) {
            const { data: inv } = await supabase
                .from('inventory')
                .select('id, on_hand')
                .eq('product_id', lot.product_id)
                .single();

            if (inv) {
                const newOnHand = Math.max(0, inv.on_hand - lot.quantity);
                await supabase.from('inventory')
                    .update({ on_hand: newOnHand })
                    .eq('id', inv.id);
            }
        }

        const { error: deleteErr } = await supabase
            .from('lots')
            .delete()
            .eq('id', id);

        if (deleteErr) {
            console.error('Lot delete error:', deleteErr);
            return NextResponse.json({ error: 'Failed to delete lot' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Lots DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete lot. Please try again.' }, { status: 500 });
    }
}
