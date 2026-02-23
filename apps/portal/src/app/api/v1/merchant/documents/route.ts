/**
 * Merchant Document Upload/List/Delete API
 * GET    - List documents for the authenticated merchant
 * POST   - Upload a new document to Supabase storage
 * DELETE - Remove a document from storage and DB
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const VALID_DOC_TYPES = [
    'coa',
    'businessLicense',
    'taxExemptCertificate',
    'researchCredentials',
    'complianceDoc',
    'other',
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
];

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

async function resolveMerchant(userId: string) {
    const { data, error } = await getServiceClient()
        .from('merchants')
        .select('id')
        .eq('user_id', userId)
        .single();
    if (error || !data) return null;
    return data;
}

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const merchant = await resolveMerchant(user.id);
        if (!merchant) {
            return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 });
        }

        const { data, error } = await getServiceClient()
            .from('merchant_documents')
            .select('id, merchant_id, document_type, file_name, storage_path, file_size_bytes, mime_type, status, created_at')
            .eq('merchant_id', merchant.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Merchant documents fetch error:', error);
            return NextResponse.json({ data: [] });
        }

        return NextResponse.json({ data: data || [] });
    } catch (error) {
        console.error('Merchant documents GET error:', error);
        return NextResponse.json({ error: 'Failed to load documents' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const merchant = await resolveMerchant(user.id);
        if (!merchant) {
            return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const documentType = formData.get('document_type') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!documentType || !VALID_DOC_TYPES.includes(documentType as typeof VALID_DOC_TYPES[number])) {
            return NextResponse.json({
                error: `Invalid document type "${documentType}". Must be one of: ${VALID_DOC_TYPES.join(', ')}`,
            }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({
                error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum file size is 10MB.`,
            }, { status: 400 });
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json({
                error: `File type "${file.type}" is not supported. Please upload a PDF, JPEG, or PNG file.`,
            }, { status: 400 });
        }

        const supabase = getServiceClient();
        const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
        const storagePath = `${merchant.id}/documents/${documentType}_${Date.now()}.${ext}`;
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        const { error: uploadError } = await supabase.storage
            .from('merchant-uploads')
            .upload(storagePath, fileBuffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return NextResponse.json({
                error: 'Failed to upload file to storage. Please try again or use a smaller file.',
            }, { status: 500 });
        }

        const { data: doc, error: dbError } = await supabase
            .from('merchant_documents')
            .insert({
                merchant_id: merchant.id,
                user_id: user.id,
                document_type: documentType,
                file_name: file.name,
                storage_path: storagePath,
                file_size_bytes: file.size,
                mime_type: file.type,
                status: 'uploaded',
            })
            .select('id, merchant_id, document_type, file_name, storage_path, file_size_bytes, mime_type, status, created_at')
            .single();

        if (dbError) {
            console.error('Merchant document DB error:', dbError);
            return NextResponse.json({
                error: 'File was uploaded but failed to save the record. Please try uploading again.',
            }, { status: 500 });
        }

        return NextResponse.json({ data: doc }, { status: 201 });
    } catch (error) {
        console.error('Merchant documents POST error:', error);
        return NextResponse.json({ error: 'Document upload failed unexpectedly' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const merchant = await resolveMerchant(user.id);
        if (!merchant) {
            return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 });
        }

        const { document_id } = await request.json();
        if (!document_id) {
            return NextResponse.json({ error: 'document_id is required' }, { status: 400 });
        }

        const supabase = getServiceClient();

        const { data: doc, error: fetchError } = await supabase
            .from('merchant_documents')
            .select('id, storage_path')
            .eq('id', document_id)
            .eq('merchant_id', merchant.id)
            .single();

        if (fetchError || !doc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        await supabase.storage
            .from('merchant-uploads')
            .remove([doc.storage_path]);

        const { error: deleteError } = await supabase
            .from('merchant_documents')
            .delete()
            .eq('id', doc.id);

        if (deleteError) {
            console.error('Merchant document delete error:', deleteError);
            return NextResponse.json({ error: 'Failed to delete document record' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Merchant documents DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }
}
