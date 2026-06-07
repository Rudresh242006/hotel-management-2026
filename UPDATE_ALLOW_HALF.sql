-- Update existing menu items to enable half plate
-- Run this in Supabase SQL Editor after running the main setup script

-- Enable half for all items (you can customize this)
UPDATE menu_items SET allow_half = true WHERE allow_half IS NULL;

-- Or enable half only for specific items:
-- UPDATE menu_items SET allow_half = true WHERE name IN ('Paneer Tikka', 'Chicken Tikka', 'Butter Chicken', 'Naan', 'Roti', 'Coca Cola', 'Fresh Lime Soda');
