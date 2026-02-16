import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
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
            .from('api_keys')
            .select('id, name, prefix, permissions, created_at, last_used_at, revoked_at')
            .order('created_at', { ascending: false });

        if (error) {
            // api_keys table likely doesn't exist yet -- return empty
            console.warn('API keys fetch error (table may not exist):', error.code, error.message);
            return NextResponse.json({ data: [] });
        }

        return NextResponse.json({
            data: (data || []).map((k: Record<string, unknown>) => ({
                ...k,
                is_active: !k.revoked_at,
            })),
        });
    } catch (error) {
        console.error('API keys GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const supabase = getServiceClient();
        const body = await request.json();
        const { name, permissions } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name required' }, { status: 400 });
        }

        // Generate API key
        const rawKey = `lsk_${crypto.randomBytes(32).toString('hex')}`;
        const prefix = rawKey.slice(0, 12) + '...';
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

        const { data, error } = await supabase
            .from('api_keys')
            .insert({
                name,
                prefix,
                key_hash: keyHash,
                permissions: permissions || ['read'],
            })
            .select('id, name, prefix, permissions, created_at')
            .single();

        if (error) {
            if (error.code === '42P01') {
                return NextResponse.json({ error: 'API keys table not set up yet. Run the database migration first.' }, { status: 503 });
            }
            console.error('API key create error:', error);
            return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
        }

        await supabase.from('audit_events').insert({
            action: 'api_key.created',
            entity_type: 'api_key',
            entity_id: data.id,
            metadata: { name },
        }).then(() => {}, () => {});

        // Return the raw key ONCE (it can never be retrieved again)
        return NextResponse.json({
            data: { ...data, key: rawKey },
        });
    } catch (error) {
        console.error('API keys POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('api_keys')
            .update({ revoked_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            if (error.code === '42P01') {
                return NextResponse.json({ error: 'API keys table not set up yet.' }, { status: 503 });
            }
            console.error('API key revoke error:', error);
            return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
        }

        await supabase.from('audit_events').insert({
            action: 'api_key.revoked',
            entity_type: 'api_key',
            entity_id: id,
        }).then(() => {}, () => {});

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API keys DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
