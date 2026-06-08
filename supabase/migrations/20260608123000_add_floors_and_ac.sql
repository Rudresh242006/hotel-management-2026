-- Migration: Support Multiple Floors and AC/Non-AC classification
-- Run this script in the Supabase SQL Editor

-- 1. Create floors table
CREATE TABLE IF NOT EXISTS public.floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security (RLS) on floors table
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public all floors" ON public.floors;
CREATE POLICY "public all floors" ON public.floors FOR ALL USING (true) WITH CHECK (true);

-- 3. Enable Realtime for floors table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'floors'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.floors;
    END IF;
END $$;

-- 4. Insert default Ground Floor
INSERT INTO public.floors (id, name, code)
VALUES ('00000000-0000-0000-0000-000000000001', 'Ground Floor', 'GF')
ON CONFLICT (name) DO NOTHING;

-- 5. Modify tables table: Add floor_id and is_ac columns
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS floor_id uuid REFERENCES public.floors(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS is_ac boolean NOT NULL DEFAULT false;

-- Drop default value constraint from floor_id so newly added tables are not automatically defaulted to Ground Floor in future inserts
ALTER TABLE public.tables ALTER COLUMN floor_id DROP DEFAULT;

-- Set existing tables floor_id to Ground Floor if they are null
UPDATE public.tables SET floor_id = '00000000-0000-0000-0000-000000000001' WHERE floor_id IS NULL;

-- 6. Modify tables constraints: Drop global unique constraint on table_number and add composite unique constraint
ALTER TABLE public.tables DROP CONSTRAINT IF EXISTS tables_table_number_key;
ALTER TABLE public.tables ADD CONSTRAINT tables_floor_ac_number_key UNIQUE (floor_id, is_ac, table_number);
