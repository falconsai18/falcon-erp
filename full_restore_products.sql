-- FULL PRODUCT RESTORE SQL
-- Run this in Supabase SQL Editor
-- Generated: 2026-04-01T22:10:44.938Z

-- Step 1: Create categories
INSERT INTO categories (id, name, code, description, created_at) VALUES
  (gen_random_uuid(), 'Respiratory Care', 'RES', 'Respiratory Care category', now()),
  (gen_random_uuid(), 'Calm & Balance', 'CAL', 'Calm & Balance category', now()),
  (gen_random_uuid(), 'Joint & Muscle Wellness', 'JOI', 'Joint & Muscle Wellness category', now()),
  (gen_random_uuid(), 'Digestive Wellness', 'DIG', 'Digestive Wellness category', now()),
  (gen_random_uuid(), 'Immunity', 'IMM', 'Immunity category', now()),
  (gen_random_uuid(), 'Skin Care', 'SKI', 'Skin Care category', now()),
  (gen_random_uuid(), 'Weight Management', 'WEI', 'Weight Management category', now()),
  (gen_random_uuid(), 'Hair Care', 'HAI', 'Hair Care category', now()),
  (gen_random_uuid(), 'Liver Care', 'LIV', 'Liver Care category', now()),
  (gen_random_uuid(), 'Uncategorized', 'UNC', 'Uncategorized category', now()),
  (gen_random_uuid(), 'Cardiovascular Wellness', 'CAR', 'Cardiovascular Wellness category', now()),
  (gen_random_uuid(), 'Mukhwas', 'MUK', 'Mukhwas category', now()),
  (gen_random_uuid(), 'Face Packs', 'FAC', 'Face Packs category', now()),
  (gen_random_uuid(), 'Freshners', 'FRE', 'Freshners category', now()),
  (gen_random_uuid(), 'Hair Packs', 'HAI', 'Hair Packs category', now()),
  (gen_random_uuid(), 'Ayurvedic Roots', 'AYU', 'Ayurvedic Roots category', now()),
  (gen_random_uuid(), 'Wellness', 'WEL', 'Wellness category', now()),
  (gen_random_uuid(), 'Digestion', 'DIG', 'Digestion category', now()),
  (gen_random_uuid(), 'Herbal Powders', 'HER', 'Herbal Powders category', now()),
  (gen_random_uuid(), 'Milks and Dairies', 'MIL', 'Milks and Dairies category', now());

-- Step 2: Insert products
INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Anardana Goli Mouth Freshener – 180gm',
    'PROD-7683',
    'Anardana Goli Mouth Freshener is a unique blend of natural ingredients, featuring dried pomegranate seeds, carefully crafted into small, spherical candies. The anardana, with its distinctive zesty and',
    0, 0, 0,
    'inactive',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'GEN' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7683');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Vasaka Powder 100gm–For productive cough',
    'PROD-7807',
    '### Vasaka Powder – 100g | Traditional Ayurvedic Herb
Rooted in the ancient wisdom of Ayurveda, Vasaka Powder is prepared from the dried leaves of Adhatoda vasica, a herb long revered in traditional I',
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
    'Tulsi Powder 100gm – Supports Immune Wellness',
    'PROD-7803',
    '### Tulsi Powder – 100g | Pure, Sun-Dried Holy Basil for Daily Rituals
Experience the timeless essence of Tulsi — also known as Holy Basil — a revered herb in Ayurvedic tradition for centuries. Our 10',
    243, 270, 145.79999999999998,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'CAL' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7803');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Triphala Powder',
    'PROD-7800',
    'Triphala Powder – 100g | A Traditional Ayurvedic Blend of Three Sacred Fruits
Our Triphala Powder is a carefully balanced combination of three revered fruits: Amalaki (Emblica officinalis), Haritaki (',
    243, 270, 145.79999999999998,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'DIG' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7800');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Sitopaladi Powder 100gm – Supports Healthy Respiratory Function',
    'PROD-7797',
    'Sitopaladi Powder is a traditional herbal blend featuring cardamom, cinnamon, bamboo, long pepper, and sugar candy. This timeless formulation combines seven mountain herbs, carefully selected for thei',
    288, 340, 172.79999999999998,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'RES' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7797');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Shatavari Powder 100gm–To Hormonal Balance',
    'PROD-7794',
    '### Shatavari Powder 100gmRooted in ancient Ayurvedic wisdom, Shatavari (Asparagus racemosus) is a revered herb traditionally valued for its gentle, nourishing nature. Sourced from organic farms and c',
    333, 370, 199.79999999999998,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'IMM' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7794');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Safed Musli Powder 100gm – Supports Men''s Wellness Naturally',
    'PROD-7791',
    '### Safed Musli Powder – 100g | Traditional Ayurvedic Herb
Authentically sourced and finely ground, Falcon Herbs’ Safed Musli Powder is crafted from the dried roots of Chlorophytum borivilianum, a rev',
    459, 510, 275.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'IMM' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7791');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Rasayan Churan 100gm–Resistance of the body',
    'PROD-7788',
    'Rasayan Churan 100gm – A Traditional Ayurvedic Herbal Blend
Rooted in ancient Ayurvedic wisdom, Rasayan Churan is a carefully crafted herbal formulation, traditionally used as part of a holistic daily',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'JOI' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7788');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Punarnava Powder 100gm-For Positive Energy',
    'PROD-7785',
    '### Punarnava Powder – 100g | A Traditional Ayurvedic Herb
Punarnava (Boerhavia diffusa) is a herb with a long history in Ayurvedic tradition, known for its naturally bitter, cooling, and astringent p',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'IMM' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7785');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Pippali Powder 100gm–For Respiratory System',
    'PROD-7782',
    'Pippali Powder, a traditional Ayurvedic herb, is sourced with care and processed using time-honored methods. This fine powder is known for its warming, aromatic qualities and is often used as part of ',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'RES' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7782');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Neem Powder 100gm – Supports Healthy Blood Sugar Levels',
    'PROD-7778',
    'Falcon Herbs – Pure Neem Powder (100g) Traditional Ayurvedic Herb for Daily Rituals
Rooted in ancient wisdom, Neem Powder is derived from the leaves of the revered Azadirachta indica tree — a cornerst',
    252, 280, 151.2,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'SKI' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7778');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Licorice Powder 100gm – Promotes Gastric Wellness',
    'PROD-7775',
    'Licorice Powder, also known as Yashtimadhu, is a traditional Ayurvedic herb. The 100% Licorice Powder is rich in glycyrrhizin acid and has carminative properties. This natural powder can be a valuable',
    297, 330, 178.2,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'SKI' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7775');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'New Karela Powder 100gm – Helps to Weight Loss',
    'PROD-7772',
    'New Karela Powder 100gm – Pure Bitter Melon Powder for Daily Wellness
Rooted in ancient Ayurvedic tradition, Karela (Momordica charantia), known as the “bitter melon,” has long been valued for its dis',
    250, 300, 150,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'WEI' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7772');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'New Jatamansi Powder 100gm–For Skin & Hair Care',
    'PROD-7769',
    '### New Jatamansi Powder – 100gm | Traditional Ayurvedic Herb for Skin &amp; Hair Care
Rooted in ancient Ayurvedic tradition, Jatamansi (Nardostachys jatamansi) is a revered herb sourced from high-alt',
    225, 300, 135,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'SKI' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7769');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Jamun Seed Powder 100gm - Enhance Liver Function Naturally',
    'PROD-7765',
    'Jamun seed powder is a traditional herb known for its astringent properties. This powder may support the body''s natural processes, including those related to digestion and overall well-being. Jamun h',
    243, 270, 145.79999999999998,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'LIV' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7765');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'New Moringa Powder 100gm – Highly Nutritious',
    'PROD-7761',
    '### New Moringa Powder – 100gm | Pure, Traditional Ayurvedic Herb
Sourced from the revered Moringa oleifera plant, our New Moringa Powder is crafted using time-honored Ayurvedic principles. Gently dri',
    265, 300, 159,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'IMM' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7761');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Haritaki Powder 100gm – Supports Healthy Immunity',
    'PROD-7758',
    '### Haritaki Powder 100gm – Traditional Ayurvedic FormulationRooted in ancient Ayurvedic tradition, Haritaki Powder is made from the dried fruit of Terminalia chebula, revered for its properties in cl',
    243, 270, 145.79999999999998,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'IMM' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7758');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Gurmar Powder 100gm – Supports Healthy Blood Sugar',
    'PROD-7755',
    'Gurmar Powder is a traditional Ayurvedic herb known as "sugar destroyer" in Sanskrit. This powder has been used for centuries in Ayurvedic practices to support overall well-being. The unique propertie',
    234, 300, 140.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'IMM' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7755');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Giloy Powder 100gm – Supports Immunity &amp; Natural Detox',
    'PROD-7751',
    'New Giloy Powder 100g is a traditional Ayurvedic herbal supplement made from the Guduchi plant, also known as Giloy. This shrub has been used for centuries in Ayurvedic practices for its potential to ',
    220, 300, 132,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'IMM' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7751');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'New Dudhi Powder 100gm – Acts as Liver tonic',
    'PROD-7748',
    'New Dudhi Powder 100gm is a rich source of essential nutrients, including dietary fiber, vitamin C, riboflavin, zinc, thiamine, iron, magnesium, and manganese. Our Dudhi is organically grown in the pr',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'LIV' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7748');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Dashmool Powder 100gm – Supports Muscle and Joint Wellness',
    'PROD-7745',
    'Dashmool Powder – 100g | Traditional Ayurvedic Blend of Ten Roots
Dashamoola, meaning “ten roots” in Sanskrit, is a traditional Ayurvedic formulation composed of five roots from trees and five from sh',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'RES' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7745');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Brahmi Powder 100gm – Supports Healthy Memory &amp; Focus',
    'PROD-7742',
    'Brahmi Powder – 100gm
Rooted in ancient Ayurvedic tradition, Brahmi Powder is made from the finely ground leaves of Bacopa monnieri, a revered herb long cherished in holistic wellness practices. Sourc',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'CAL' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7742');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Bhringraj Powder 100gm – Supports Healthy Hair Growth',
    'PROD-7739',
    'Bhringraj Powder is an ancient herb native to India, revered for its traditional significance. The name Bhringraj translates to "Ruler of the hair", reflecting its historical importance. This herbal p',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'HAI' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7739');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Avipattikar Powder 100gm – Supports Digestive Comfort',
    'PROD-7735',
    'Avipattikar Powder is a traditional herbal blend featuring Triphala, Trikatu, and Trvrit (Nishottar). This unique combination of herbs is designed to support digestive well-being. The cooling properti',
    279, 310, 167.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'DIG' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7735');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Ashwagandha Powder 100gm – Supports Stress Relief &amp; Wellness',
    'PROD-7731',
    '### Falcon Herbs New Ashwagandha Powder – 100gm | Pure, Traditional Ayurvedic Herb
Rooted in centuries-old Ayurvedic tradition, Falcon Herbs Ashwagandha Powder is made from 100% pure, sun-dried Withan',
    288, 320, 172.79999999999998,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'IMM' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7731');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Arjuna Powder 100gm – Supports Healthy Lipid Levels',
    'PROD-7728',
    'Arjuna Powder is a traditional Ayurvedic herb known for its potential to support overall well-being. This ancient plant has been used for centuries in Ayurvedic practices to promote a sense of calm an',
    252, 280, 151.2,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'CAR' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7728');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Amla Powder 100gm – Supports Hair Growth &amp; Wellness',
    'PROD-7725',
    'Amla Powder 100gm is a traditional Ayurvedic herb known for its rich nutritional profile and potential to support overall wellness. This powder is derived from the fruit of the Amla tree, which has be',
    254, 300, 152.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'HAI' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7725');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'New Tini Mini Goli Mouth Freshener – 180gm',
    'PROD-7722',
    'New Tini Mini Goli Mouth Freshener is a unique blend of herbs and essential oils, carefully crafted to provide a refreshing experience. This petite, spherical delight is perfect for use after meals or',
    234, 260, 140.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'MUK' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7722');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'The New Ilu Ilu Mouth Freshener -180gm',
    'PROD-7718',
    'Ilu Ilu Mouth Freshener is a delightful confectionery inspired by the essence of tamarind, a tropical fruit with a rich history and widespread cultivation across India and Southeast Asia. The creation',
    212, 250, 127.19999999999999,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'MUK' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7718');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Shahi Gulab Mouth Freshener - 180gm Pack',
    'PROD-7715',
    'Shahi Gulab Mouth Freshener is a traditional Indian-inspired blend, featuring the captivating essence of rose water. This delightful formulation combines rose water essence with a selection of complem',
    234, 260, 140.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'MUK' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7715');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Rim Jhim Mix Mouth Freshener – 180gm',
    'PROD-7712',
    'Rim Jhim Mix Mouth Freshener is a delightful blend of flavors, inspired by the vibrant street food culture of India. This mix is a sensory experience, combining sweet, tangy, spicy, and savory element',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'MUK' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7712');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Punjabi Mix Mouth Freshener – 180gm',
    'PROD-7709',
    'Punjabi Mix Mouth Freshener is a traditional Indian blend of seeds, nuts, and handpicked ingredients, carefully crafted to create a unique and refreshing experience. This exquisite mix combines the fl',
    234, 260, 140.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'MUK' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7709');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Mumbaiya Mix Mouth Freshener-180gm',
    'PROD-7706',
    'Mumbaiya Mix Mouth Freshener – 180g | A Taste of Mumbai’s Street SoulSavor the vibrant essence of Mumbai’s iconic street corners with Mumbaiya Mix Mouth Freshener — a thoughtfully curated blend of nat',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'MUK' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7706');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Kesari Saunf Mouth Fresheners – 180gm',
    'PROD-7703',
    'Kesari Saunf Mouth Fresheners are a traditional Indian blend of natural ingredients, featuring saunf (fennel seeds) and kesar (saffron). This unique combination brings together the sweetness of saunf ',
    234, 260, 140.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'MUK' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7703');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Hing Peda Mouth Freshener – 180gm',
    'PROD-7700',
    'Introducing Hing Peda Mouth Freshener, a traditional Indian confectionary delight featuring a blend of natural components, including the distinctive essence of hing and sugar. This timeless treat offe',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'MUK' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7700');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Green Flavored Mix 180gm – Mouth Freshners, Mukhwas',
    'PROD-7695',
    'Green Flavored Mix is a thoughtful blend of natural ingredients, offering a delightful green, herbal flavor experience. This mix is designed to provide a refreshing sensation, perfect for use after me',
    234, 260, 140.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'MUK' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7695');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Dry Dates Mouth Freshener – 180gm',
    'PROD-7691',
    'Dry Dates Mouth Freshener is a traditional Indian oral refreshment, crafted from the essence of dry dates, a fruit native to the Middle East and North Africa. This unique blend combines seeds, nuts, a',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'MUK' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7691');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Lemon Peel Herbal 100g Face Pack',
    'PROD-7690',
    'Lemon Peel Herbal 100g Face Pack
Experience the revitalizing properties of lemon peel in our Lemon Peel Herbal Face Pack. This unique blend is designed to help support skin that looks and feels its be',
    225, 250, 135,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'FAC' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7690');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Chandan Mix Mouth Freshener – 180gm',
    'PROD-7687',
    'Introducing Chandan Mix Mouth Freshener, a traditional Indian oral refreshment crafted from natural elements, featuring sandalwood. This timeless blend is rooted in Indian tradition and brings togethe',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'MUK' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7687');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Anardana Goli Mouth Freshener – 180gm',
    'PROD-7684',
    'Anardana Goli Mouth Freshener is a unique blend of natural ingredients, featuring dried pomegranate seeds, carefully crafted into small, spherical candies. The zesty and citrusy essence of anardana is',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'MUK' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7684');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    '6 Color Mix Mouth Freshener – 180gm',
    'PROD-7680',
    'Mast 6 Color Mix Mouth Freshener is a unique blend of natural ingredients, offering a vibrant spectrum of colors including red, orange, yellow, green, blue, and purple. This product is designed to pro',
    234, 260, 140.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'MUK' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7680');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Paan Masala Mouth Freshener – 180gm',
    'PROD-7676',
    'Paan Masala Mouth Freshener is a traditional blend of finely ground ingredients, including betel leaf, areca nut, and various spices and flavorings. This unique formulation is designed to be chewed, a',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'FRE' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7676');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'New Meetha Paan Mouth Freshener -180gm',
    'PROD-7672',
    'New Meetha Paan Mouth Freshener is a traditional Indian blend of sweet and savory ingredients, carefully crafted to provide a unique and refreshing experience. This mouth freshener is typically made w',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'FRE' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7672');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Mughlai Paan Mouth Freshener – 180gm',
    'PROD-7669',
    'Mughlai Paan Mouth Freshener is a unique blend inspired by the rich flavors of Mughlai cuisine. This traditional concoction, often enjoyed after meals, has been reimagined in the form of a mouth fresh',
    279, 310, 167.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'FRE' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7669');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Elaichi Paan Mouth Freshener – 180gm',
    'PROD-7666',
    'Elaichi Paan Mouth Freshener is a captivating blend of traditional Indian spices and ingredients, featuring the distinctive flavor of cardamom. This unique creation combines an assortment of seeds, nu',
    279, 310, 167.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'FRE' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7666');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Dry Green Paan Mouth Freshener -180gm',
    'PROD-7662',
    'Dry Green Paan Mouth Freshener is a traditional Indian mouth refreshment made from dried betel leaves, carefully transformed into a fine powder. This unique blend combines sweet and savory ingredients',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'FRE' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7662');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Calcutta Paan Mouth Freshener – 180gm',
    'PROD-7659',
    'Calcutta Paan Mouth Freshener is a traditional post-meal treat, meticulously crafted from a blend of betel leaves, areca nut, and an assortment of spices and flavorings. This finely ground offering is',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'FRE' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7659');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Banarasi Paan Mouth Freshener -180gm',
    'PROD-7656',
    'Indulge in the rich flavor of Banarasi Paan Mouth Freshener, a traditional blend of betel leaf, areca nut, and aromatic spices. This finely ground mukhwas is inspired by the classic paan of Varanasi, ',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'FRE' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7656');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Shikakai Powder Herbal 100g Hair Pack',
    'PROD-7651',
    'Shikakai Powder is derived from the pod-like fruit of the Acacia Concinna tree, grown in the warm, dry plains of central India. This traditional herbal powder can be used as a natural hair care. To us',
    225, 250, 135,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'HAI' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7651');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Reetha Herbal 100g Hair Pack',
    'PROD-7645',
    'Reetha Herbal 100g Hair Pack is a thoughtful blend of natural ingredients, featuring Reetha, also known as soapnut, which is valued for its gentle and nourishing properties. This herbal hair pack comb',
    225, 250, 135,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'HAI' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7645');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Mehandi Powder Herbal100g  Hair Pack',
    'PROD-7640',
    'Mehandi Powder is a traditional Ayurvedic herb used to promote hair beauty. This natural ingredient has been used for centuries to enhance the appearance of hair, feet, palm, and nails. When used as a',
    207, 230, 124.19999999999999,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'HAI' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7640');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Amla Powder Herbal 100g Hair Pack',
    'PROD-7635',
    'Amla Powder is a traditional Ayurvedic ingredient that has been used for centuries to support hair care routines. The Amla fruit, also known as Indian gooseberry, is rich in nutrients and is believed ',
    225, 250, 135,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'HAI' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7635');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Turmeric Powder Herbal 100g Face Pack Remedies acne, blemishes, black heads and dark spots',
    'PROD-7625',
    'Turmeric Powder Herbal Face Pack – 100g | Traditional Ayurvedic Skincare Ritual
Infused with pure, sun-dried turmeric root and natural Multani Mitti (Fuller’s Earth), this traditional Ayurvedic face p',
    225, 250, 135,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'FAC' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7625');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Sandal Powder Herbal 100g Face Pack deep cleans skin by removing dead cells',
    'PROD-7620',
    'Sandal Powder Herbal 100g Face Pack is a traditional Ayurvedic blend of natural ingredients. This face pack is designed to help maintain healthy, balanced skin. The powder can be mixed with water to c',
    252, 280, 151.2,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'SKI' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7620');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Rose Petals Herbal 100g Face Pack Helps to Removes dead cells, dirt and unclogs pores',
    'PROD-7615',
    'Falcon Herbs'' Rose Petals Herbal 100g Face Pack is a thoughtful blend of natural ingredients, including rose petals and multani. This face pack is designed to support skin wellness, promoting a balan',
    225, 250, 135,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'FAC' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7615');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Orange Peel Herbal 100gm Face Pack',
    'PROD-7610',
    'Orange Peel Herbal 100g Face Pack is a natural, pure, and safe product that may be used to support skin health. This face pack can be used to create a paste that may help cleanse the skin when massage',
    224, 250, 134.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'FAC' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7610');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Multani Mitti 100g Face Pack',
    'PROD-7605',
    'Multani Mitti 100g Face Pack is a natural, earthy substance that can be used to create a paste for application on the face. To use, mix with plain water or rose water to create a paste. This face pack',
    198, 220, 118.8,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'FAC' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7605');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Sugset – Paneer Dodi Phool 175g – Traditional Ayurvedic Herb Blend for Everyday Wellness',
    'PROD-7558',
    'Sugset – Paneer Dodi Phool 175g is a traditional Ayurvedic herb blend rooted in the timeless wisdom of Ayurveda. This carefully curated blend features hand-harvested flowers from the pristine slopes o',
    344, 430, 206.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7558');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Sugset Ashwagandha Tea Powder 200g – Traditional Ayurvedic Blend for Daily Wellness',
    'PROD-7551',
    '### Sugset Ashwagandha Tea Powder – 200g | A Traditional Ayurvedic Blend for Mindful Moments
Rooted in the timeless wisdom of Ayurveda, Sugset Ashwagandha Tea Powder is a pure, hand-harvested blend of',
    400, 500, 240,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'WEL' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7551');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Valerian Root 100gm | Supports Restful Sleep &amp; Relaxation',
    'PROD-7534',
    '### Valerian Root 100gm | Pure, Wild-Harvested Ayurvedic Herb for Daily Wellness
Rooted in tradition, Valerian Root (Valeriana officinalis) is a revered herb in ancient healing systems, valued for its',
    234, 260, 140.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7534');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Rose Petals (Gulab Patti) – 60g | Pure, Natural Dried Petals for Culinary &amp; Aromatic Use

This version is compliant with Ayurvedic marketing guidelines — no disease or structure/function claims, while remaining SEO-friendly with keywords like “Rose Petals,” “Gulab Patti,” and “dried petals” that users commonly search for. It highlights purity, form, and traditional uses (culinary and aromatic) without overstepping regulatory boundaries.',
    'PROD-7527',
    '### Rose Petals (Gulab Patti) – 60g | Pure, Natural Dried Petals for Culinary &amp; Aromatic Use
Immerse yourself in the quiet elegance of Rose Petals (Gulab Patti) — carefully hand-harvested and gent',
    234, 260, 140.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7527');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Tulsi Leaves 70gm – Organic Herbal Immunity Wellness',
    'PROD-7512',
    '### Organic Tulsi Leaves – 70g | Pure, Sun-Dried &amp; Hand-Selected
Experience the traditional essence of Ocimum sanctum, also known as Tulsi. This herb has been a part of Indian culture for centurie',
    234, 260, 140.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7512');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Turmeric Powder 100g - Traditional Ayurvedic Herb',
    'PROD-7510',
    '### Turmeric Powder 100g - Traditional Ayurvedic Herb
Falcon Herbs Turmeric Powder is a traditional Ayurvedic preparation crafted with organic turmeric root, reflecting centuries of Ayurvedic practice',
    234, 260, 140.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7510');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Shikakai Pods 100gm | Supports Healthy Hair &amp; Reduces Hair Fall',
    'PROD-7506',
    'Discover the traditional secret to vibrant hair with our Pure Shikakai Pods. Harvested from the finest sources, these natural wonders have been used for centuries in Ayurvedic traditions to support ha',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7506');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Senna Leaves 70gm | Pure Ayurvedic Herb',
    'PROD-7493',
    'Discover the natural goodness of Senna Leaves, a traditional herbal remedy known for its gentle and effective properties. Our Organic Senna Leaves are carefully harvested from premium sources to ensur',
    234, 260, 140.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7493');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Naagkesar 100gm | Traditional Ayurvedic Herb for Wellness',
    'PROD-7486',
    'Falcon Herbs Naagkesar (Mesua ferrea) – 100g Pure Powder
Authentically sourced from the fragrant flowers of the Mesua ferrea tree, our Naagkesar powder is traditionally valued in Ayurvedic practices f',
    297, 330, 178.2,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7486');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Mulethi Sticks 100gm | Traditional Throat &amp; Respiratory Wellness Herb',
    'PROD-7479',
    'Aayurvedaa Mulethi Sticks – 100g are hand-harvested, sun-dried licorice root sticks, traditionally used in Ayurveda for their natural sweetness and soothing qualities. Sourced from premium farms, thes',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7479');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Neem Leaves 70gm | Rich in Natural Anti-bacterial Properties',
    'PROD-7478',
    'Falcon Herbs presents 70g of pure, sun-dried Neem leaves — carefully harvested and air-dried to preserve their natural integrity. Sourced from trusted Ayurvedic groves, these leaves are a time-honored',
    234, 260, 140.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7478');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Methi Dana 200gm | Supports Digestive Wellness &amp; Appetite',
    'PROD-7448',
    'Falcon Herbs Methi Dana (Fenugreek Seeds) is a premium-quality, sun-dried Ayurvedic herb traditionally valued in holistic wellness practices. Sourced from ethically farmed fields and carefully cleaned',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7448');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Moringa Seeds 100gm | Supports Liver Wellness &amp; Healthy Digestion',
    'PROD-7444',
    'Falcon Herbs Moringa Seeds – 100g | Pure Drumstick Seeds for Traditional Use
Experience the quiet wisdom of nature with Falcon Herbs Moringa Seeds — hand-harvested from sun-drenched drumstick pods of ',
    234, 260, 140.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7444');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Long Pepper Whole 100gm | Supports Digestive Comfort &amp; Wellness',
    'PROD-7435',
    'Falcon Herbs Whole Long Pepper (Pippali) is a premium, sun-dried, hand-selected spice rooted in ancient Ayurvedic tradition. Sourced from ethically cultivated farms, this whole long pepper retains its',
    270, 300, 162,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7435');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Kamarkas Raw Herb 200gm | Traditional Ayurvedic Wellness Herb',
    'PROD-7433',
    '### Kamarkas Raw Herb – 200g | Traditional Ayurvedic Herb for Daily Wellness
Rooted in ancient Ayurvedic tradition, Kamarkas (also known as Anogeissus latifolia or Dhawada) is a time-honored herb valu',
    324, 360, 194.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7433');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Kalonji 200gm | Traditional Seed for Immunity &amp; Wellness',
    'PROD-7341',
    'Experience the distinct flavor and potential benefits of Raw Kalonji, also known as Nigella Seeds. Our premium Kalonji is sourced from high-quality producers, making it a great addition to your culina',
    324, 360, 194.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7341');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Kaali Jeeri (Black Cumin) 200gm – Traditional Ayurvedic Herb for Daily Use',
    'PROD-7339',
    'Kaali Jeeri (Black Cumin) – 200gm | Traditional Ayurvedic Herb for Daily UseRooted in centuries of Ayurvedic tradition, Kaali Jeeri — also known as Black Cumin — is a cherished herb known for its deep',
    324, 360, 194.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7339');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Haritaki Dried Whole 200 gm | Good for Digestion | Detox body and helps Nervous System',
    'PROD-7324',
    'Haritaki Dried Whole – 200 gm | Ancient Ayurvedic Tradition, Sourced with Care
Rooted in the timeless wisdom of Ayurveda, Haritaki (Terminalia chebula) is revered as one of the three fruits in the sac',
    252, 280, 151.2,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7324');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Guduchi (Tinospora Cordifolia) 100gm | Organic Immunity Wellness Herb',
    'PROD-7323',
    'Guduchi, also known as Tinospora Cordifolia, is a revered herb in Ayurveda. Our premium Guduchi is sourced from the finest botanical gardens, ensuring a high-quality product. This herb has been tradit',
    234, 260, 140.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7323');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Ginger Whole 100gm | Traditional Digestive &amp; Wellness Herb',
    'PROD-7312',
    'Experience the warmth and depth of whole ginger root in a convenient, dried form. This natural and aromatic spice is perfect for adding flavor to your favorite recipes, from baked goods like muffins a',
    234, 260, 140.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7312');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Dry Amla 100gm | Supports Hair &amp; Digestive Wellness',
    'PROD-7309',
    'Organic Dry Amla – 100g | Traditional Indian Gooseberry for Daily Wellness
Experience the timeless essence of Phyllanthus emblica—known in Ayurveda as Amla—in its pure, sun-dried form. Sourced from or',
    252, 280, 151.2,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7309');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Organic Dry Dates 200gm | Supports Bone Health &amp; Skin Wellness',
    'PROD-7292',
    'Experience the timeless sweetness of nature with Falcon Herbs’ Organic Dry Dates — hand-harvested, sun-dried, and certified organic. Sourced from pristine farms, these dates are a cherished gift from ',
    279, 310, 167.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7292');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Black Harde (Haritaki) 100gm | Supports Immunity &amp; Scalp Wellness',
    'PROD-7285',
    'Aayurvedaa Black Harde is a premium, traditionally prepared fruit of the Terminalia chebula plant, carefully harvested and sun-dried to preserve its natural essence. In Ayurvedic practice, Harde has l',
    288, 320, 172.79999999999998,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7285');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Calendula Flowers 70gms | Helpful for Skin and Skin related problems',
    'PROD-7278',
    '### Calendula Flowers – 70g | Pure, Sun-Dried Petals for Traditional Use
Experience the gentle beauty of 100% Authentic Calendula Flowers, carefully hand-harvested and sun-dried to preserve their natu',
    220, 260, 132,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7278');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Banafsha Leaves 30gm | Traditional Ayurvedic Herb for Wellness',
    'PROD-7211',
    'Banafsha Leaves, a natural treasure, are sourced from pristine landscapes to promote overall wellness. These leaves are a testament to purity and quality, offering a holistic approach to supporting va',
    279, 310, 167.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7211');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Arnica Flowers Whole 70gm | Traditional Topical Wellness Herb',
    'PROD-7204',
    'Arnica Flowers, a natural and traditional herb, has been used for centuries in Ayurvedic practices. Our premium quality Arnica Flowers are carefully harvested and dried to preserve their natural prope',
    234, 260, 140.4,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7204');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Arjuna Bark 100gm | Traditional Heart Wellness Herb',
    'PROD-7176',
    'Arjuna Bark, derived from the Terminalia arjuna tree, is a botanical treasure renowned for its traditional use in supporting overall well-being. The bark of this tree has been valued for its potential',
    216, 240, 129.6,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7176');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Aritha Soap Nut 100gm | Natural Hair Wellness &amp; Anti-Dandruff Herb',
    'PROD-7141',
    'Aritha Soap Nut, also known as Reetha or Arishtak in Ayurveda, is a natural plant product rich in saponins and other compounds. It has been traditionally used to support overall well-being. The saponi',
    203, 220, 121.8,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7141');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Alsi Flax Seeds 200gm | High Fiber Seed for Digestive Wellness',
    'PROD-7134',
    'Falcon Herbs'' Alsi Flax Seeds are a rich source of dietary fiber and plant nutrients, traditionally used as part of balanced diets to support overall wellness and nutritional support. Our Alsi Flax S',
    207, 230, 124.19999999999999,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7134');

INSERT INTO products (id, name, sku, description, selling_price, mrp, cost_price, status, unit_of_measure, hsn_code, category_id, created_at) 
SELECT 
    gen_random_uuid(),
    'Ashwagandha Root Whole 100gm | Traditional Ayurvedic Wellness Herb',
    'PROD-7068',
    'Ashwagandha Root Whole – 100 gm | Traditional Ayurvedic Herb
Rooted in the ancient wisdom of Ayurveda, Ashwagandha (Withania somnifera) has been traditionally valued for its deep connection to balance',
    252, 280, 151.2,
    'active',
    'piece',
    '3004',
    (SELECT id FROM categories WHERE code = 'AYU' LIMIT 1),
    now()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'PROD-7068');

-- DONE! 87 products restored.