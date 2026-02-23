/**
 * GET /api/v1/merchant/documents/:id — Generate a signed download URL for a merchant document
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

async function getAuthUser() {
    const supabase = createRouteHandlerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
}

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const supabase = getServiceClient();

        const { data: merchant, error: merchantError } = await supabase
            .from('merchants')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (merchantError || !merchant) {
            return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 });
        }

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
