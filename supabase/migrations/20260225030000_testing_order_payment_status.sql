-- Add payment tracking to testing orders
ALTER TABLE testing_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid'
    CHECK (payment_status IN ('paid', 'pending_invoice', 'invoice_sent'));
ALTER TABLE testing_orders ADD COLUMN IF NOT EXISTS payment_invoice_id UUID;

-- Fix the existing unpaid testing order
UPDATE testing_orders
SET payment_status = 'invoice_sent', status = 'PENDING'
WHERE id = '29639454-b884-4a55-8d41-2412bbc57f74'
  AND status = 'AWAITING_SHIPMENT';
