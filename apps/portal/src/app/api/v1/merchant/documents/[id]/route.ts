/**
 * GET /api/v1/merchant/documents/:id — Generate a signed download URL for a merchant document
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireMerchant, getServiceClient } from '@/lib/merchant-api-auth';

export const dynamic = 'force-dynamic';

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireMerchant();
        if (authResult instanceof NextResponse) return authResult;
        const { merchant } = authResult.data;

        const supabase = getServiceClient();

        const { data: doc, error: docError } = await supabase
            .from('merchant_documents')
            .select('id, storage_path, file_name')
            .eq('id', params.id)
            .eq('merchant_id', merchant.id)
            .single();

        if (docError || !doc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        const { data: signedUrlData, error: signError } = await supabase.storage
            .from('merchant-uploads')
            .createSignedUrl(doc.storage_path, 300);

        if (signError || !signedUrlData?.signedUrl) {
            console.error('Signed URL error:', signError);
            return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 });
        }

        return NextResponse.json({ data: { url: signedUrlData.signedUrl } });
    } catch (error) {
        console.error('Document download GET error:', error);
        return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 });
    }
}
