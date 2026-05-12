
-- Tables
CREATE TABLE public.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number int NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'free' CHECK (status IN ('free','occupied'))
);

CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('Starters','Main Course','Beverages','Desserts')),
  price numeric(10,2) NOT NULL,
  is_available boolean NOT NULL DEFAULT true
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'placed' CHECK (status IN ('placed','in_kitchen','preparing','ready','billed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id),
  quantity int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS - permissive (internal staff app, no auth)
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public all" ON public.tables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.order_items FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER TABLE public.tables REPLICA IDENTITY FULL;
ALTER TABLE public.menu_items REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- Seed tables 1-10
INSERT INTO public.tables (table_number) SELECT generate_series(1,10);

-- Seed menu
INSERT INTO public.menu_items (name, category, price) VALUES
('Spring Rolls','Starters', 6.50),
('Garlic Bread','Starters', 5.00),
('Chicken Wings','Starters', 8.00),
('Margherita Pizza','Main Course', 12.00),
('Grilled Salmon','Main Course', 18.50),
('Beef Burger','Main Course', 14.00),
('Pasta Alfredo','Main Course', 13.00),
('Coke','Beverages', 3.00),
('Fresh Lime Soda','Beverages', 4.00),
('Iced Tea','Beverages', 3.50),
('Chocolate Lava Cake','Desserts', 7.00),
('Cheesecake','Desserts', 6.50),
('Ice Cream','Desserts', 5.00);
