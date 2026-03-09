import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const rawPath = path.join(__dirname, '..', 'real_products_raw.json');
  const rawData = fs.readFileSync(rawPath, 'utf8');
  let data = JSON.parse(rawData);
  
  const products = data.products || [];

  const formatted = products.map((p, idx) => ({
    id: p.id || idx,
    name: p.name,
    sku: p.sku || `SKU-${Math.floor(Math.random() * 10000)}`,
    price: p.price || "0",
    regular_price: p.regular_price || "0",
    stock_quantity: p.stock_quantity || Math.floor(Math.random() * 100) + 10,
    categories: Array.isArray(p.categories) ? p.categories.map(c => c.name) : []
  }));

  const outPath = path.join(__dirname, '..', 'seed_products_editable.json');
  fs.writeFileSync(outPath, JSON.stringify(formatted, null, 2));
  console.log(`Successfully formatted ${formatted.length} products to seed_products_editable.json`);
} catch(e) {
  console.error("Error processing products:", e);
}
