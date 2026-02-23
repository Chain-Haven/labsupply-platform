/**
 * Admin Testing Labs API
 * GET   - List all testing labs
 * POST  - Create a new testing lab
 * PATCH - Update a testing lab (pass id in body)
 * DELETE - Soft-delete a testing lab (pass id in body)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';
import { z } from 'zod';

const createTestingLabSchema = z.object({
    name: z.string().min(1).max(255),
    email: z.string().email(),
    phone: z.string().max(30).optional(),
    address: z.record(z.unknown()).optional(),
    is_default: z.boolean().default(false),
});

const updateTestingLabSchema = createTestingLabSchema.partial();

function validateInput<T extends z.ZodSchema>(schema: T, input: unknown) {
    const result = schema.safeParse(input);
    if (result.success) return { success: true as const, data: result.data as z.infer<T> };
    return { success: false as const, errors: result.error };
}

function formatZodErrors(error: z.ZodError) {
    const formatted: Record<string, string[]> = {};
    for (const issue of error.issues) {
        const path = issue.path.join('.');
        if (!formatted[path]) formatted[path] = [];
        formatted[path].push(issue.message);
    }
    return formatted;
}

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
            .from('testing_labs')
            .select('*')
            .order('is_default', { ascending: false })
            .order('name', { ascending: true });

        if (error) {
            console.error('Testing labs fetch error:', error);
            return NextResponse.json({ error: 'Failed to load testing labs from the database. Please refresh and try again.' }, { status: 500 });
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Testing labs GET error:', error);
        return NextResponse.json({ error: 'Testing labs service encountered an unexpected error. Please try again.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const body = await request.json();
        const validation = validateInput(createTestingLabSchema, body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: formatZodErrors(validation.errors) },
                { status: 400 }
            );
        }

        const supabase = getServiceClient();

        // If setting as default, unset existing defaults first
        if (validation.data.is_default) {
            await supabase
                .from('testing_labs')
                .update({ is_default: false })
                .eq('is_default', true);
        }

        const { data, error } = await supabase
            .from('testing_labs')
            .insert(validation.data)
            .select()
            .single();

        if (error) {
            console.error('Testing lab create error:', error);
            return NextResponse.json({ error: 'Failed to create testing lab. A lab with this name or email may already exist.' }, { status: 500 });
        }

        return NextResponse.json({ data }, { status: 201 });
    } catch (error) {
        console.error('Testing labs POST error:', error);
        return NextResponse.json({ error: 'Testing labs service encountered an unexpected error. Please try again.' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing lab id' }, { status: 400 });
        }

        const validation = validateInput(updateTestingLabSchema, updates);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: formatZodErrors(validation.errors) },
                { status: 400 }
            );
        }

        const supabase = getServiceClient();

        // If setting as default, unset existing defaults first
        if (validation.data.is_default) {
            await supabase
                .from('testing_labs')
                .update({ is_default: false })
                .eq('is_default', true);
        }

        const { data, error } = await supabase
            .from('testing_labs')
            .update(validation.data)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Testing lab update error:', error);
            return NextResponse.json({ error: 'Failed to update testing lab. Verify the data is valid and try again.' }, { status: 500 });
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Testing labs PATCH error:', error);
        return NextResponse.json({ error: 'Testing labs service encountered an unexpected error. Please try again.' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing lab id' }, { status: 400 });
        }

        const supabase = getServiceClient();

        // Soft-delete: set active = false
        const { data, error } = await supabase
            .from('testing_labs')
            .update({ active: false })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Testing lab delete error:', error);
            return NextResponse.json({ error: 'Failed to delete testing lab. It may have active testing orders associated with it.' }, { status: 500 });
        }

        return NextResponse.json({ data, message: 'Testing lab deactivated' });
    } catch (error) {
        console.error('Testing labs DELETE error:', error);
        return NextResponse.json({ error: 'Testing labs service encountered an unexpected error. Please try again.' }, { status: 500 });
    }
}
