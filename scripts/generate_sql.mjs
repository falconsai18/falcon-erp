import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const productsPath = path.join(__dirname, '..', 'seed_products_editable.json');
  const rawData = fs.readFileSync(productsPath, 'utf8');
  const products = JSON.parse(rawData);

  let sql = `-- Seed Script for Falcon Super Gold ERP\n`;
  sql += `BEGIN;\n\n`;

  for (const p of products) {
    const id = `gen_random_uuid()`;
    
    // Clean strings for SQL
    const safeName = p.name.replace(/'/g, "''");
    const safeSku = p.sku.replace(/'/g, "''");
    
    const sellingPrice = Number(p.price) || 0;
    const mrp = Number(p.regular_price) || 0;
    const stock = Number(p.stock_quantity) || 0;
    
    // Product insert
    sql += `WITH new_product AS (
  INSERT INTO products (name, sku, selling_price, mrp, tax_rate, reorder_point, status)
  VALUES ('${safeName}', '${safeSku}', ${sellingPrice}, ${mrp}, 0, 20, 'active')
  RETURNING id
)\n`;

    // Inventory insert
    const safeBatch = `BATCH-${Math.floor(Math.random() * 10000)}`;
    sql += `INSERT INTO inventory (product_id, batch_number, quantity, available_quantity, reserved_quantity, unit_cost, status)
SELECT id, '${safeBatch}', ${stock}, ${stock}, 0, ${mrp}, 'available' FROM new_product;\n\n`;

  }

  sql += `COMMIT;\n`;

  const outPath = path.join(__dirname, '..', 'supabase_seed.sql');
  fs.writeFileSync(outPath, sql);
  console.log(`Generated SQL for ${products.length} products to supabase_seed.sql`);
} catch(e) {
  console.error("Error generating SQL:", e);
}
