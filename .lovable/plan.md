# Fix: Allow custom menu categories

## Root cause

The database table `menu_items` has a CHECK constraint:

```
CHECK (category = ANY (ARRAY['Starters', 'Main Course', 'Beverages', 'Desserts']))
```

So when you try to add an item with category like `meals`, `Salads`, `Soups`, etc., Postgres rejects it with:

> new row for relation "menu_items" violates check constraint "menu_items_category_check"

The frontend code is fine — the database is the blocker.

## Plan

1. **Migration** — drop `menu_items_category_check` constraint so any category text is allowed. (Keep `category NOT NULL` so empty values still fail.)
2. No frontend changes needed. The existing "Add Category" flow in the Menu Item Manager will then work for any custom name.

## Notes

- This removes the whitelist entirely. If you'd rather keep validation but allow editing the allowed list, that would need a separate `categories` table — let me know if you want that instead. The simpler fix above matches what the UI already promises ("add any category like Starters, Main Course, etc.").
