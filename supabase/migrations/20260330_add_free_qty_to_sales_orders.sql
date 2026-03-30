-- Add free_qty column to sales_order_items table
-- Add default_free_qty column to products table
-- Date: 30-Mar-2026

BEGIN;

-- Add default_free_qty to products table (default 0)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS default_free_qty INTEGER DEFAULT 0;

-- Add free_qty to sales_order_items table (default 0)
ALTER TABLE sales_order_items 
ADD COLUMN IF NOT EXISTS free_qty INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN products.default_free_qty IS 'Default free quantity to pre-fill when adding product to sales order';
COMMENT ON COLUMN sales_order_items.free_qty IS 'Free quantity given with the order (does not affect pricing)';

COMMIT;
