-- Fix: invited_by in invitations should be nullable and not require auth.users FK
-- Admin users may not have a linked auth.users record (e.g. backup session login)

ALTER TABLE public.invitations ALTER COLUMN invited_by DROP NOT NULL;
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_invited_by_fkey;
