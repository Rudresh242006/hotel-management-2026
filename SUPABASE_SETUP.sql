-- Hotel Manager Database Setup for Supabase
-- Run this in Supabase SQL Editor
-- This script is idempotent - can be run multiple times safely

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'occupied'))
);

CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  is_available BOOLEAN DEFAULT true
);

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

-- Add half_quantity column to order_items if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'half_quantity'
    ) THEN
        ALTER TABLE order_items ADD COLUMN half_quantity INTEGER DEFAULT 0;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'in_kitchen', 'preparing', 'ready', 'billed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 1 CHECK (quantity > 0),
  half_quantity INTEGER DEFAULT 0 CHECK (half_quantity >= 0),
  status TEXT NOT NULL DEFAULT 'in_kitchen' CHECK (status IN ('in_kitchen', 'preparing', 'ready')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);

-- Enable Row Level Security
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Allow all on tables" ON tables;
DROP POLICY IF EXISTS "Allow all on menu_items" ON menu_items;
DROP POLICY IF EXISTS "Allow all on orders" ON orders;
DROP POLICY IF EXISTS "Allow all on order_items" ON order_items;

-- Create RLS policies (allow all operations for demo purposes)
-- For production, you should restrict these based on authentication
CREATE POLICY "Allow all on tables" ON tables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on menu_items" ON menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for all tables (ignore if already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'tables'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE tables;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'menu_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
    END IF;
END $$;

-- Insert sample data (only if tables are empty)
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM tables) = 0 THEN
        INSERT INTO tables (table_number, status) VALUES
        (1, 'free'),
        (2, 'free'),
        (3, 'free'),
        (4, 'free'),
        (5, 'free');
    END IF;
    
    IF (SELECT COUNT(*) FROM menu_items) = 0 THEN
        INSERT INTO menu_items (name, category, price, is_available, allow_half) VALUES
        ('Paneer Tikka', 'Starters', 250, true, true),
        ('Chicken Tikka', 'Starters', 280, true, true),
        ('Veg Soup', 'Starters', 120, true, false),
        ('Butter Chicken', 'Main Course', 350, true, true),
        ('Paneer Butter Masala', 'Main Course', 280, true, true),
        ('Dal Makhani', 'Main Course', 220, true, true),
        ('Naan', 'Main Course', 40, true, true),
        ('Roti', 'Main Course', 25, true, true),
        ('Coca Cola', 'Beverages', 60, true, true),
        ('Fresh Lime Soda', 'Beverages', 50, true, true),
        ('Mango Lassi', 'Beverages', 80, true, false),
        ('Gulab Jamun', 'Desserts', 90, true, true),
        ('Rasgulla', 'Desserts', 80, true, true),
        ('Ice Cream', 'Desserts', 100, true, true);
    END IF;
END $$;
