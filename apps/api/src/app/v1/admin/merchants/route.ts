import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AdminAuthResult } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

// Validation schemas
const listQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),
    search: z.string().optional(),
    kyb_status: z.enum(['pending', 'in_review', 'approved', 'rejected', 'more_info_requested', 'all']).default('all'),
    account_type: z.string().optional(),
    sort_by: z.enum(['company_name', 'created_at', 'kyb_status']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * GET /v1/admin/merchants
 * List all merchants with filtering
 */
async function handleGet(request: NextRequest, auth: AdminAuthResult) {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);

    const query = listQuerySchema.parse(params);
    const offset = (query.page - 1) * query.limit;

    let dbQuery = getSupabaseAdmin()
        .from('merchants')
        .select('*, stores:stores(count)', { count: 'exact' });

    // Apply filters
    if (query.search) {
        dbQuery = dbQuery.or(`company_name.ilike.%${query.search}%,contact_email.ilike.%${query.search}%`);
    }

    if (query.kyb_status !== 'all') {
        dbQuery = dbQuery.eq('kyb_status', query.kyb_status);
    }

    if (query.account_type) {
        dbQuery = dbQuery.eq('account_type', query.account_type);
    }

    // Apply sorting
    dbQuery = dbQuery.order(query.sort_by, { ascending: query.sort_order === 'asc' });

    // Apply pagination
    dbQuery = dbQuery.range(offset, offset + query.limit - 1);

    const { data: merchants, error, count } = await dbQuery;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get status counts
    const statusCounts = await Promise.all([
        getSupabaseAdmin().from('merchants').select('*', { count: 'exact', head: true }).eq('kyb_status', 'pending'),
        getSupabaseAdmin().from('merchants').select('*', { count: 'exact', head: true }).eq('kyb_status', 'in_review'),
        getSupabaseAdmin().from('merchants').select('*', { count: 'exact', head: true }).eq('kyb_status', 'approved'),
        getSupabaseAdmin().from('merchants').select('*', { count: 'exact', head: true }).eq('kyb_status', 'rejected'),
    ]);

    return NextResponse.json({
        merchants,
        pagination: {
            page: query.page,
            limit: query.limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / query.limit),
        },
        summary: {
            total: count || 0,
            pending: statusCounts[0].count || 0,
            in_review: statusCounts[1].count || 0,
            approved: statusCounts[2].count || 0,
            rejected: statusCounts[3].count || 0,
        },
    });
}

export const GET = withAdminAuth(handleGet, { requiredPermission: 'merchants' });
