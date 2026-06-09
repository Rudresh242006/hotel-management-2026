-- Migration: Support AC and Non-AC sections per floor
-- Run this in the Supabase SQL Editor

-- 1. Create floor_sections table
CREATE TABLE IF NOT EXISTS public.floor_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id uuid NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  is_ac boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(floor_id, is_ac)
);

-- 2. Enable Row Level Security (RLS) on floor_sections table
ALTER TABLE public.floor_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public all floor_sections" ON public.floor_sections;
CREATE POLICY "public all floor_sections" ON public.floor_sections FOR ALL USING (true) WITH CHECK (true);

-- 3. Enable Realtime for floor_sections table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'floor_sections'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.floor_sections;
    END IF;
END $$;

-- 4. Backfill existing floor sections from tables table
INSERT INTO public.floor_sections (floor_id, is_ac)
SELECT DISTINCT floor_id, is_ac 
FROM public.tables
WHERE floor_id IS NOT NULL
ON CONFLICT (floor_id, is_ac) DO NOTHING;
