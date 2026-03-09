import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDatabase() {
  try {
    const productsPath = path.join(__dirname, '..', 'seed_products_editable.json');
    if (!fs.existsSync(productsPath)) {
      console.error("seed_products_editable.json not found!");
      return;
    }

    const rawData = fs.readFileSync(productsPath, 'utf8');
    const products = JSON.parse(rawData);

    console.log(`Starting to seed ${products.length} products to Supabase...`);

    let successCount = 0;
    let errorCount = 0;

    for (const p of products) {
      // Map JSON to expected database columns.
      // E.g., name, sku, category, unit_price, reorder_point
      const productPayload = {
        name: p.name,
        sku: p.sku,
        selling_price: Number(p.price) || 0,
        mrp: Number(p.regular_price) || 0,
        tax_rate: 0,
        reorder_point: 20,
        status: 'active'
      };

      const { data, error } = await supabase
        .from('products')
        .insert(productPayload)
        .select()
        .single();

      if (error) {
        console.error(`Error inserting product ${p.name}:`, error.message);
        errorCount++;
      } else {
        // Also add an initial inventory batch for the new product
        const { error: invError } = await supabase
            .from('inventory')
            .insert({
                product_id: data.id,
                batch_number: `BATCH-${Math.floor(Math.random() * 10000)}`,
                quantity: p.stock_quantity,
                available_quantity: p.stock_quantity,
                reserved_quantity: 0,
                unit_cost: Number(p.regular_price) || 0,
                status: 'available'
            });
            
        if (invError) {
             console.error(`Error setting inventory for ${p.name}:`, invError.message);
        } else {
             successCount++;
        }
      }
    }

    console.log(`Finished Seeding. Success: ${successCount}, Errors: ${errorCount}`);
  } catch (error) {
    console.error("Seeding crashed:", error);
  }
}

seedDatabase();
