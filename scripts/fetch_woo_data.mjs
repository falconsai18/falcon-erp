import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WOO_SITE_URL = 'https://www.falconherbs.com';
const WC_CONSUMER_KEY = 'ck_88a99d5545e72992b39549aa579ed12b9c248353';
const WC_CONSUMER_SECRET = 'cs_3c804057f2b3dcbb9da0d9332fcfef3444f78a8a';

async function fetchProducts() {
  try {
    const auth = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');
    let allProducts = [];
    let page = 1;

    console.log('Fetching products from WooCommerce...');
    while (true) {
        const url = `${WOO_SITE_URL}/wp-json/wc/v3/products?per_page=100&page=${page}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const products = await response.json();
        
        if (products.length === 0) {
            break;
        }

        allProducts = allProducts.concat(products);
        console.log(`Fetched page ${page}, total products so far: ${allProducts.length}`);
        page++;
    }

    const simpleData = allProducts.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        price: p.price,
        regular_price: p.regular_price,
        sale_price: p.sale_price,
        stock_status: p.stock_status,
        stock_quantity: p.stock_quantity,
        categories: p.categories.map(c => c.name)
    }));
    
    fs.writeFileSync(path.join(__dirname, '..', 'real_products.json'), JSON.stringify(simpleData, null, 2));
    console.log('Successfully saved to real_products.json');
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

fetchProducts();
