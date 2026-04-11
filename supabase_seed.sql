-- Seed Script for Falcon ERP
BEGIN;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Anardana Goli Mouth Freshener – 180gm', 'SKU-5301', 0, 0, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-2778', 13, 0, 0, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Vasaka Powder 100gm–For productive cough', 'SKU-1624', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-7988', 47, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Tulsi Powder 100gm – Supports Immune Wellness', 'SKU-4245', 243, 270, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-3706', 11, 0, 270, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Triphala Powder', 'SKU-7970', 243, 270, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-809', 59, 0, 270, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Sitopaladi Powder 100gm – Supports Healthy Respiratory Function', 'SKU-5058', 288, 340, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-2158', 90, 0, 340, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Shatavari Powder 100gm–To Hormonal Balance', 'SKU-3928', 333, 370, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-760', 12, 0, 370, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Safed Musli Powder 100gm – Supports Men''s Wellness Naturally', 'SKU-1169', 459, 510, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-5702', 47, 0, 510, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Rasayan Churan 100gm–Resistance of the body', 'SKU-3785', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-2614', 84, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Punarnava Powder 100gm-For Positive Energy', 'SKU-2942', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-3479', 32, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Pippali Powder 100gm–For Respiratory System', 'SKU-2117', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-7736', 85, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Neem Powder 100gm – Supports Healthy Blood Sugar Levels', 'SKU-4519', 252, 280, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-1758', 91, 0, 280, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Licorice Powder 100gm – Promotes Gastric Wellness', 'SKU-4017', 297, 330, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-8714', 41, 0, 330, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('New Karela Powder 100gm – Helps to Weight Loss', 'SKU-7784', 250, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-7004', 34, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('New Jatamansi Powder 100gm–For Skin & Hair Care', 'SKU-9305', 225, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-2881', 50, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Jamun Seed Powder 100gm - Enhance Liver Function Naturally', 'SKU-1240', 243, 270, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-3807', 66, 0, 270, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('New Moringa Powder 100gm – Highly Nutritious', 'SKU-5855', 265, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-3509', 107, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Haritaki Powder 100gm – Supports Healthy Immunity', 'SKU-5811', 243, 270, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-3414', 84, 0, 270, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Gurmar Powder 100gm – Supports Healthy Blood Sugar', 'SKU-9649', 234, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-7559', 22, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Giloy Powder 100gm – Supports Immunity & Natural Detox', 'SKU-3786', 220, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-8645', 65, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('New Dudhi Powder 100gm – Acts as Liver tonic', 'SKU-246', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-503', 74, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Dashmool Powder 100gm – Supports Muscle and Joint Wellness', 'SKU-3215', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-8666', 16, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Brahmi Powder 100gm – Supports Healthy Memory & Focus', 'SKU-9753', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-8810', 94, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Bhringraj Powder 100gm – Supports Healthy Hair Growth', 'SKU-2667', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-2884', 32, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Avipattikar Powder 100gm – Supports Digestive Comfort', 'SKU-6697', 279, 310, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-1002', 105, 0, 310, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Ashwagandha Powder 100gm – Supports Stress Relief & Wellness', 'SKU-5562', 288, 320, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-8124', 63, 0, 320, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Arjuna Powder 100gm – Supports Healthy Lipid Levels', 'SKU-2891', 252, 280, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-4159', 65, 0, 280, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Amla Powder 100gm – Supports Hair Growth & Wellness', 'SKU-3027', 254, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-2149', 10, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('New Tini Mini Goli Mouth Freshener – 180gm', 'SKU-8516', 234, 260, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-3532', 50, 0, 260, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('The New Ilu Ilu Mouth Freshener -180gm', 'SKU-8243', 212, 250, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-160', 76, 0, 250, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Shahi Gulab Mouth Freshener - 180gm Pack', 'SKU-7207', 234, 260, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-535', 10, 0, 260, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Rim Jhim Mix Mouth Freshener – 180gm', 'SKU-6856', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-5886', 20, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Punjabi Mix Mouth Freshener – 180gm', 'SKU-5986', 234, 260, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-1642', 93, 0, 260, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Mumbaiya Mix Mouth Freshener-180gm', 'SKU-7879', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-9115', 28, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Kesari Saunf Mouth Fresheners – 180gm', 'SKU-2202', 234, 260, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-3703', 94, 0, 260, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Hing Peda Mouth Freshener – 180gm', 'SKU-2819', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-5507', 12, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Green Flavored Mix 180gm – Mouth Freshners, Mukhwas', 'SKU-3412', 234, 260, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-2709', 85, 0, 260, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Dry Dates Mouth Freshener – 180gm', 'SKU-4226', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-9969', 34, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Lemon Peel Herbal 100g Face Pack', 'SKU-6917', 225, 250, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-7680', 98, 0, 250, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Chandan Mix Mouth Freshener – 180gm', 'SKU-9356', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-3266', 75, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Anardana Goli Mouth Freshener – 180gm', 'SKU-1105', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-6182', 44, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('6 Color Mix Mouth Freshener – 180gm', 'SKU-5353', 234, 260, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-2885', 80, 0, 260, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Paan Masala Mouth Freshener – 180gm', 'SKU-5310', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-6163', 49, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('New Meetha Paan Mouth Freshener -180gm', 'SKU-5488', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-471', 61, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Mughlai Paan Mouth Freshener – 180gm', 'SKU-6029', 279, 310, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-1030', 29, 0, 310, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Elaichi Paan Mouth Freshener – 180gm', 'SKU-4524', 279, 310, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-6608', 39, 0, 310, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Dry Green Paan Mouth Freshener -180gm', 'SKU-5703', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-6175', 10, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Calcutta Paan Mouth Freshener – 180gm', 'SKU-6791', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-299', 77, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Banarasi Paan Mouth Freshener -180gm', 'SKU-2188', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-2269', 53, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Shikakai Powder Herbal 100g Hair Pack', 'SKU-8433', 225, 250, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-8099', 82, 0, 250, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Reetha Herbal 100g Hair Pack', 'SKU-9643', 225, 250, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-5467', 102, 0, 250, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Mehandi Powder Herbal100g  Hair Pack', 'SKU-300', 207, 230, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-8957', 77, 0, 230, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Amla Powder Herbal 100g Hair Pack', 'SKU-7676', 225, 250, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-6560', 86, 0, 250, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Turmeric Powder Herbal 100g Face Pack Remedies acne, blemishes, black heads and dark spots', 'SKU-2304', 225, 250, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-2733', 77, 0, 250, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Sandal Powder Herbal 100g Face Pack deep cleans skin by removing dead cells', 'SKU-3995', 252, 280, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-4564', 49, 0, 280, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Rose Petals Herbal 100g Face Pack Helps to Removes dead cells, dirt and unclogs pores', 'SKU-6269', 225, 250, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-5464', 105, 0, 250, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Orange Peel Herbal 100gm Face Pack', 'SKU-40', 224, 250, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-6290', 109, 0, 250, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Multani Mitti 100g Face Pack', 'SKU-4759', 198, 220, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-8257', 59, 0, 220, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Sugset – Paneer Dodi Phool 175g – Traditional Ayurvedic Herb Blend for Everyday Wellness', 'SKU-5024', 344, 430, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-9397', 150, 0, 430, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Sugset Ashwagandha Tea Powder 200g – Traditional Ayurvedic Blend for Daily Wellness', 'SKU-2376', 400, 500, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-8125', 150, 0, 500, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Valerian Root 100gm | Supports Restful Sleep & Relaxation', 'SKU-2985', 234, 260, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-2620', 150, 0, 260, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Rose Petals (Gulab Patti) – 60g | Pure, Natural Dried Petals for Culinary & Aromatic Use

This version is compliant with Ayurvedic marketing guidelines — no disease or structure/function claims, while remaining SEO-friendly with keywords like “Rose Petals,” “Gulab Patti,” and “dried petals” that users commonly search for. It highlights purity, form, and traditional uses (culinary and aromatic) without overstepping regulatory boundaries.', 'SKU-7238', 234, 260, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-9543', 150, 0, 260, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Tulsi Leaves 70gm – Organic Herbal Immunity Wellness', 'SKU-8002', 234, 260, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-4090', 149, 0, 260, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Turmeric Powder 100g - Traditional Ayurvedic Herb', 'SKU-7333', 234, 260, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-3216', 150, 0, 260, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Shikakai Pods 100gm | Supports Healthy Hair & Reduces Hair Fall', 'SKU-1168', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-1030', 150, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Senna Leaves 70gm | Pure Ayurvedic Herb', 'SKU-7433', 234, 260, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-3054', 150, 0, 260, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Naagkesar 100gm | Traditional Ayurvedic Herb for Wellness', 'SKU-1768', 297, 330, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-9997', 150, 0, 330, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Mulethi Sticks 100gm | Traditional Throat & Respiratory Wellness Herb', 'SKU-7849', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-2871', 150, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Neem Leaves 70gm | Rich in Natural Anti-bacterial Properties', 'SKU-9680', 234, 260, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-7009', 150, 0, 260, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Methi Dana 200gm | Supports Digestive Wellness & Appetite', 'SKU-6958', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-6827', 150, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Moringa Seeds 100gm | Supports Liver Wellness & Healthy Digestion', 'SKU-4600', 234, 260, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-5183', 149, 0, 260, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Long Pepper Whole 100gm | Supports Digestive Comfort & Wellness', 'SKU-2412', 270, 300, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-152', 150, 0, 300, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Kamarkas Raw Herb 200gm | Traditional Ayurvedic Wellness Herb', 'SKU-3626', 324, 360, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-7326', 150, 0, 360, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Kalonji 200gm | Traditional Seed for Immunity & Wellness', 'SKU-6130', 324, 360, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-3791', 150, 0, 360, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Kaali Jeeri (Black Cumin) 200gm – Traditional Ayurvedic Herb for Daily Use', 'SKU-1368', 324, 360, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-4300', 150, 0, 360, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Haritaki Dried Whole 200 gm | Good for Digestion | Detox body and helps Nervous System', 'SKU-2331', 252, 280, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-6924', 150, 0, 280, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Guduchi (Tinospora Cordifolia) 100gm | Organic Immunity Wellness Herb', 'SKU-709', 234, 260, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-5435', 150, 0, 260, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Ginger Whole 100gm | Traditional Digestive & Wellness Herb', 'SKU-101', 234, 260, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-1578', 150, 0, 260, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Dry Amla 100gm | Supports Hair & Digestive Wellness', 'SKU-8125', 252, 280, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-7712', 150, 0, 280, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Organic Dry Dates 200gm | Supports Bone Health & Skin Wellness', 'SKU-9788', 279, 310, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-9079', 150, 0, 310, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Black Harde (Haritaki) 100gm | Supports Immunity & Scalp Wellness', 'SKU-9969', 288, 320, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-4897', 150, 0, 320, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Calendula Flowers 70gms | Helpful for Skin and Skin related problems', 'SKU-5002', 220, 260, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-518', 150, 0, 260, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Banafsha Leaves 30gm | Traditional Ayurvedic Herb for Wellness', 'SKU-9366', 279, 310, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-5604', 149, 0, 310, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Arnica Flowers Whole 70gm | Traditional Topical Wellness Herb', 'SKU-9537', 234, 260, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-9820', 150, 0, 260, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Arjuna Bark 100gm | Traditional Heart Wellness Herb', 'SKU-1531', 216, 240, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-2033', 150, 0, 240, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Aritha Soap Nut 100gm | Natural Hair Wellness & Anti-Dandruff Herb', 'SKU-520', 203, 220, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-8807', 146, 0, 220, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Alsi Flax Seeds 200gm | High Fiber Seed for Digestive Wellness', 'SKU-7106', 207, 230, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-9511', 150, 0, 230, 'available' FROM new_product;

WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('Ashwagandha Root Whole 100gm | Traditional Ayurvedic Wellness Herb', 'SKU-3996', 252, 280, 0, 20, 'active')
  RETURNING id
)
INSERT INTO inventory (product_id, batch_number, quantity, reserved_quantity, unit_cost, status)
SELECT id, 'BATCH-8681', 150, 0, 280, 'available' FROM new_product;

COMMIT;
