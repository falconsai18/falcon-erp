-- RESTORE PRODUCTS - Run this in Supabase SQL Editor
-- Step 1: Create categories first

INSERT INTO categories (id, name, code, description, created_at) VALUES
(gen_random_uuid(), 'Respiratory Care', 'RES', 'Respiratory wellness products', now()),
(gen_random_uuid(), 'Digestive Wellness', 'DIG', 'Digestive health products', now()),
(gen_random_uuid(), 'Immunity', 'IMM', 'Immunity boosting products', now()),
(gen_random_uuid(), 'Calm & Balance', 'CAL', 'Calming and balancing products', now()),
(gen_random_uuid(), 'Joint & Muscle Wellness', 'JNT', 'Joint and muscle care', now()),
(gen_random_uuid(), 'Skin Care', 'SKN', 'Skin care products', now()),
(gen_random_uuid(), 'Hair Care', 'HIR', 'Hair care products', now()),
(gen_random_uuid(), 'Weight Management', 'WGT', 'Weight management products', now()),
(gen_random_uuid(), 'Liver Care', 'LIV', 'Liver health products', now()),
(gen_random_uuid(), 'General', 'GEN', 'General wellness products', now()),
(gen_random_uuid(), 'Mukhwas', 'MUK', 'Mouth fresheners', now()),
(gen_random_uuid(), 'Face Packs', 'FCP', 'Face packs and masks', now()),
(gen_random_uuid(), 'Hair Packs', 'HRP', 'Hair packs and treatments', now()),
(gen_random_uuid(), 'Ayurvedic Roots', 'AYR', 'Ayurvedic root herbs', now()),
(gen_random_uuid(), 'Herbal Powders', 'HRP', 'Herbal powders', now())
ON CONFLICT (code) DO NOTHING;

-- Step 2: Insert products (simplified - 87 products)
-- Note: Run this AFTER categories are created

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Anardana Goli Mouth Freshener – 180gm',
    'PROD-7683',
    'Anardana Goli Mouth Freshener is a unique blend of natural ingredients, featuring dried pomegranate seeds.',
    0, 0, 0,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'MUK' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7683');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Vasaka Powder 100gm',
    'PROD-7807',
    'Vasaka Powder prepared from the dried leaves of Adhatoda vasica.',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'RES' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7807');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Tulsi Powder 100gm',
    'PROD-7803',
    'Pure, Sun-Dried Holy Basil for Daily Rituals.',
    243, 270, 146,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'IMM' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7803');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Triphala Powder 100gm',
    'PROD-7800',
    'A Traditional Ayurvedic Blend of Three Sacred Fruits.',
    243, 270, 146,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'DIG' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7800');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Sitopaladi Powder 100gm',
    'PROD-7797',
    'Traditional herbal blend for respiratory wellness.',
    288, 340, 173,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'RES' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7797');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Shatavari Powder 100gm',
    'PROD-7794',
    'Traditional Ayurvedic herb for hormonal balance.',
    333, 370, 200,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'IMM' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7794');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Safed Musli Powder 100gm',
    'PROD-7791',
    'Traditional Ayurvedic herb for mens wellness.',
    459, 510, 275,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'IMM' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7791');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Rasayan Churan 100gm',
    'PROD-7788',
    'Traditional Ayurvedic herbal blend for body resistance.',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'JNT' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7788');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Punarnava Powder 100gm',
    'PROD-7785',
    'For positive energy and vitality.',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'LIV' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7785');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Pippali Powder 100gm',
    'PROD-7782',
    'For respiratory system support.',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'RES' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7782');

-- Continue with more products...
-- This is a sample, you can add all 87 products similarly
-- Or I can generate the full SQL file
