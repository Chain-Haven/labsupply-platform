/**
 * Shared helpers for order status transitions and history tracking.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { isValidStatusTransition, ORDER_STATUS_TRANSITIONS } from '@whitelabel-peptides/shared';

/**
 * Validate and perform an order status transition. Throws if the transition
 * is not allowed by the ORDER_STATUS_TRANSITIONS graph.
 */
export async function transitionOrderStatus(
    supabase: SupabaseClient,
    orderId: string,
    fromStatus: string,
    toStatus: string,
    opts?: {
        changedBy?: string;
        notes?: string;
        extraUpdates?: Record<string, unknown>;
    }
): Promise<void> {
    if (!isValidStatusTransition(fromStatus, toStatus)) {
        const allowed = ORDER_STATUS_TRANSITIONS[fromStatus] ?? [];
        throw new Error(
            `Invalid status transition: ${fromStatus} -> ${toStatus}. Allowed: [${allowed.join(', ')}]`
        );
    }

    const updates: Record<string, unknown> = {
        status: toStatus,
        ...opts?.extraUpdates,
    };

    const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .eq('status', fromStatus); // optimistic lock on current status

    if (error) {
        throw new Error(`Failed to transition order ${orderId}: ${error.message}`);
    }

    await recordStatusChange(supabase, orderId, fromStatus, toStatus, opts?.changedBy, opts?.notes);
}

/**
 * Record a status change in order_status_history for audit trail.
 * Fire-and-forget: errors are logged but do not propagate.
 */
export async function recordStatusChange(
    supabase: SupabaseClient,
    orderId: string,
    fromStatus: string | null,
    toStatus: string,
    changedBy?: string,
    notes?: string
): Promise<void> {
    await supabase
        .from('order_status_history')
        .insert({
            order_id: orderId,
            from_status: fromStatus,
            to_status: toStatus,
            changed_by: changedBy || null,
            notes: notes || null,
        })
        .then(
            () => {},
            (err) => console.error('Failed to record status change:', err)
        );
}

/**
 * Valid shipment status transitions.
 */
const SHIPMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
    PENDING: ['LABEL_CREATED', 'IN_TRANSIT', 'FAILED'],
    LABEL_CREATED: ['PICKED_UP', 'IN_TRANSIT', 'FAILED'],
    PICKED_UP: ['IN_TRANSIT'],
    IN_TRANSIT: ['DELIVERED', 'FAILED', 'RETURNED'],
    DELIVERED: ['RETURNED'],
    FAILED: ['PENDING'],
    RETURNED: [],
};

export function isValidShipmentTransition(from: string, to: string): boolean {
    const allowed = SHIPMENT_STATUS_TRANSITIONS[from];
    return allowed?.includes(to) ?? false;
}
