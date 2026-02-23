/**
 * KYB Document Upload/List API
 * GET  - List documents uploaded by the authenticated user
 * POST - Upload a new KYB document to Supabase storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const VALID_DOC_TYPES = [
    'businessLicense',
    'articlesOfIncorporation',
    'taxExemptCertificate',
    'researchCredentials',
    'governmentId',
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

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated. Please log in to view your documents.' }, { status: 401 });
        }

        const supabase = getServiceClient();
        const { data, error } = await supabase
            .from('kyb_documents')
            .select('id, document_type, file_name, storage_path, file_size_bytes, mime_type, status, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('KYB documents fetch error:', error);
            return NextResponse.json({ data: [] });
        }

        return NextResponse.json({ data: data || [] });
    } catch (error) {
        console.error('KYB documents GET error:', error);
        return NextResponse.json({ error: 'Failed to load documents. Please refresh and try again.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated. Please log in to upload documents.' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const documentType = formData.get('document_type') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided. Please select a file to upload.' }, { status: 400 });
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
        const storagePath = `${user.id}/kyb/${documentType}.${ext}`;

        const fileBuffer = Buffer.from(await file.arrayBuffer());

        const { error: deleteError } = await supabase.storage
            .from('merchant-uploads')
            .remove([storagePath]);

        if (deleteError) {
            // File may not exist yet — that's fine
        }

        const { error: uploadError } = await supabase.storage
            .from('merchant-uploads')
            .upload(storagePath, fileBuffer, {
                contentType: file.type,
                upsert: true,
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return NextResponse.json({
                error: 'Failed to upload file to storage. Please try again or use a smaller file.',
            }, { status: 500 });
        }

        const { data: doc, error: dbError } = await supabase
            .from('kyb_documents')
            .upsert(
                {
                    user_id: user.id,
                    document_type: documentType,
                    file_name: file.name,
                    storage_path: storagePath,
                    file_size_bytes: file.size,
                    mime_type: file.type,
                    status: 'pending',
                },
                { onConflict: 'user_id,document_type' }
            )
            .select('id, document_type, file_name, storage_path, file_size_bytes, mime_type, status, created_at')
            .single();

        if (dbError) {
            console.error('KYB document DB error:', dbError);
            return NextResponse.json({
                error: 'File was uploaded but failed to save the record. Please try uploading again.',
            }, { status: 500 });
        }

        return NextResponse.json({ data: doc }, { status: 201 });
    } catch (error) {
        console.error('KYB documents POST error:', error);
        return NextResponse.json({ error: 'Document upload failed unexpectedly. Please try again.' }, { status: 500 });
    }
}
