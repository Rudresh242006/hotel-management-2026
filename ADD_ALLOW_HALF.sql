-- Migration to add allow_half field to menu_items table
-- Run this in Supabase SQL Editor if you already have the database set up

-- Add allow_half column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'menu_items' AND column_name = 'allow_half'
    ) THEN
        ALTER TABLE menu_items ADD COLUMN allow_half BOOLEAN DEFAULT false;
    END IF;
END $$;
