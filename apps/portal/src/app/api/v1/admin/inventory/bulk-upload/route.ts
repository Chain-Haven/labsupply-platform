/**
 * POST /api/v1/admin/inventory/bulk-upload
 * Accepts a CSV file, validates each row, and creates products + inventory records.
 * Returns per-row results so the admin can see what succeeded/failed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-api-auth';
import { logNonCritical } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const MAX_ROWS = 500;
const SKU_REGEX = /^[A-Za-z0-9\-_]+$/;

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

interface CsvRow {
    sku: string;
    name: string;
    description?: string;
    category?: string;
    price_dollars: string;
    initial_stock?: string;
    low_stock_threshold?: string;
    weight_grams?: string;
    min_order_qty?: string;
    max_order_qty?: string;
    active?: string;
    requires_coa?: string;
    tags?: string;
}

interface RowResult {
    row: number;
    sku: string;
    success: boolean;
    error?: string;
}

function parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    fields.push(current.trim());
    return fields;
}

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) return { headers: [], rows: [] };

    const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        const row: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = values[j] || '';
        }
        rows.push(row);
    }

    return { headers, rows };
}

function validateRow(row: Record<string, string>, rowIndex: number): { valid: boolean; parsed?: CsvRow; error?: string } {
    const sku = (row['sku'] || '').trim();
    if (!sku) return { valid: false, error: 'SKU is required' };
    if (sku.length > 50) return { valid: false, error: 'SKU must be 50 characters or less' };
    if (!SKU_REGEX.test(sku)) return { valid: false, error: 'SKU can only contain letters, numbers, hyphens, and underscores' };

    const name = (row['name'] || '').trim();
    if (!name) return { valid: false, error: 'Name is required' };
    if (name.length > 255) return { valid: false, error: 'Name must be 255 characters or less' };

    const priceStr = (row['price_dollars'] || row['price'] || row['cost_dollars'] || row['cost'] || '').trim();
    if (!priceStr) return { valid: false, error: 'Price is required (use price_dollars column)' };
    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) return { valid: false, error: `Invalid price "${priceStr}" — must be a non-negative number` };

    const stockStr = (row['initial_stock'] || row['stock'] || row['on_hand'] || '').trim();
    if (stockStr && (isNaN(parseInt(stockStr, 10)) || parseInt(stockStr, 10) < 0)) {
        return { valid: false, error: `Invalid initial stock "${stockStr}" — must be a non-negative integer` };
    }

    const thresholdStr = (row['low_stock_threshold'] || row['reorder_point'] || '').trim();
    if (thresholdStr && (isNaN(parseInt(thresholdStr, 10)) || parseInt(thresholdStr, 10) < 0)) {
        return { valid: false, error: `Invalid low stock threshold "${thresholdStr}" — must be a non-negative integer` };
    }

    const weightStr = (row['weight_grams'] || row['weight'] || '').trim();
    if (weightStr && (isNaN(parseInt(weightStr, 10)) || parseInt(weightStr, 10) <= 0)) {
        return { valid: false, error: `Invalid weight "${weightStr}" — must be a positive integer (grams)` };
    }

    const minQtyStr = (row['min_order_qty'] || '').trim();
    if (minQtyStr && (isNaN(parseInt(minQtyStr, 10)) || parseInt(minQtyStr, 10) < 1)) {
        return { valid: false, error: `Invalid min order qty "${minQtyStr}" — must be at least 1` };
    }

    const maxQtyStr = (row['max_order_qty'] || '').trim();
    if (maxQtyStr && (isNaN(parseInt(maxQtyStr, 10)) || parseInt(maxQtyStr, 10) < 1)) {
        return { valid: false, error: `Invalid max order qty "${maxQtyStr}" — must be at least 1` };
    }

    return {
        valid: true,
        parsed: {
            sku,
            name,
            description: (row['description'] || '').trim() || undefined,
            category: (row['category'] || '').trim() || undefined,
            price_dollars: priceStr,
            initial_stock: stockStr || undefined,
            low_stock_threshold: thresholdStr || undefined,
            weight_grams: weightStr || undefined,
            min_order_qty: minQtyStr || undefined,
            max_order_qty: maxQtyStr || undefined,
            active: (row['active'] || '').trim().toLowerCase() || undefined,
            requires_coa: (row['requires_coa'] || '').trim().toLowerCase() || undefined,
            tags: (row['tags'] || '').trim() || undefined,
        },
    };
}

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult instanceof NextResponse) return authResult;

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No CSV file provided. Please select a file to upload.' }, { status: 400 });
        }

        if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
            return NextResponse.json({ error: 'File must be a CSV file (.csv).' }, { status: 400 });
        }

        const text = await file.text();
        const { headers, rows } = parseCsv(text);

        if (headers.length === 0 || rows.length === 0) {
            return NextResponse.json({
                error: 'CSV file is empty or has no data rows. Ensure the file has a header row and at least one data row.',
            }, { status: 400 });
        }

        if (!headers.includes('sku') || !headers.includes('name')) {
            return NextResponse.json({
                error: `CSV must include "sku" and "name" columns. Found columns: ${headers.join(', ')}. Download the template for the correct format.`,
            }, { status: 400 });
        }

        if (rows.length > MAX_ROWS) {
            return NextResponse.json({
                error: `CSV contains ${rows.length} rows, but the maximum is ${MAX_ROWS}. Please split into smaller files.`,
            }, { status: 400 });
        }

        const supabase = getServiceClient();
        const results: RowResult[] = [];
        let created = 0;
        let failed = 0;

        for (let i = 0; i < rows.length; i++) {
            const { valid, parsed, error: validationError } = validateRow(rows[i], i);

            if (!valid || !parsed) {
                results.push({ row: i + 2, sku: rows[i]['sku'] || '?', success: false, error: validationError });
                failed++;
                continue;
            }

            const costCents = Math.round(parseFloat(parsed.price_dollars) * 100);
            const isActive = parsed.active ? !['false', '0', 'no', 'inactive'].includes(parsed.active) : true;
            const requiresCoa = parsed.requires_coa ? ['true', '1', 'yes'].includes(parsed.requires_coa) : false;
            const tags = parsed.tags ? parsed.tags.split(';').map(t => t.trim()).filter(Boolean) : undefined;

            const { data: product, error: insertError } = await supabase
                .from('products')
                .upsert(
                    {
                        sku: parsed.sku.toUpperCase(),
                        name: parsed.name,
                        description: parsed.description || null,
                        category: parsed.category || null,
                        cost_cents: costCents,
                        active: isActive,
                        requires_coa: requiresCoa,
                        weight_grams: parsed.weight_grams ? parseInt(parsed.weight_grams, 10) : null,
                        min_order_qty: parsed.min_order_qty ? parseInt(parsed.min_order_qty, 10) : 1,
                        max_order_qty: parsed.max_order_qty ? parseInt(parsed.max_order_qty, 10) : null,
                        tags: tags || null,
                    },
                    { onConflict: 'sku' }
                )
                .select('id')
                .single();

            if (insertError || !product) {
                results.push({
                    row: i + 2,
                    sku: parsed.sku,
                    success: false,
                    error: insertError?.message || 'Database insert failed',
                });
                failed++;
                continue;
            }

            const initialStock = parsed.initial_stock ? parseInt(parsed.initial_stock, 10) : 0;
            const reorderPoint = parsed.low_stock_threshold ? parseInt(parsed.low_stock_threshold, 10) : 10;

            await supabase
                .from('inventory')
                .upsert(
                    {
                        product_id: product.id,
                        on_hand: initialStock,
                        reorder_point: reorderPoint,
                    },
                    { onConflict: 'product_id' }
                );

            results.push({ row: i + 2, sku: parsed.sku, success: true });
            created++;
        }

        logNonCritical(supabase.from('audit_events').insert({
            action: 'inventory.bulk_upload',
            entity_type: 'product',
            entity_id: null,
            metadata: { file_name: file.name, total_rows: rows.length, created, failed },
        }), 'audit:inventory.bulk_upload');

        return NextResponse.json({
            summary: { total: rows.length, created, failed },
            results,
        });
    } catch (error) {
        console.error('Bulk upload error:', error);
        return NextResponse.json({
            error: 'Bulk upload failed unexpectedly. No products were created — please try again.',
        }, { status: 500 });
    }
}
