import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: { persistSession: false }
})

async function restoreProducts() {
  console.log('🔄 RESTORING PRODUCTS...\n')
  
  // Read the JSON file
  const rawData = fs.readFileSync(join(__dirname, 'real_products_raw.json'), 'utf8')
  const data = JSON.parse(rawData)
  
  const products = data.products
  console.log(`📦 Found ${products.length} products in JSON\n`)
  
  // First, ensure we have a default category
  let defaultCategoryId = null
  const { data: existingCat } = await supabase
    .from('categories')
    .select('id')
    .eq('name', 'General')
    .single()
  
  if (existingCat) {
    defaultCategoryId = existingCat.id
    console.log('✅ Using existing "General" category')
  } else {
    const { data: newCat } = await supabase
      .from('categories')
      .insert([{ name: 'General', code: 'GEN', description: 'Default category' }])
      .select()
      .single()
    
    if (newCat) {
      defaultCategoryId = newCat.id
      console.log('✅ Created "General" category')
    }
  }
  
  // Process categories first
  const uniqueCategories = new Set()
  products.forEach(p => {
    if (p.categories && p.categories.length > 0) {
      p.categories.forEach(cat => {
        if (cat && cat.trim()) {
          uniqueCategories.add(cat.replace(/&amp;/g, '&').trim())
        }
      })
    }
  })
  
  console.log(`📋 Found ${uniqueCategories.size} unique categories`)
  
  // Insert categories
  const categoryMap = {}
  for (const catName of uniqueCategories) {
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('name', catName)
      .single()
    
    if (existing) {
      categoryMap[catName] = existing.id
    } else {
      const code = catName.substring(0, 3).toUpperCase()
      const { data: newCat, error } = await supabase
        .from('categories')
        .insert([{ name: catName, code: code, description: `${catName} category` }])
        .select()
        .single()
      
      if (newCat) {
        categoryMap[catName] = newCat.id
        console.log(`✅ Created category: ${catName}`)
      } else if (error) {
        console.log(`❌ Failed to create category ${catName}: ${error.message}`)
      }
    }
  }
  
  // Insert products
  let successCount = 0
  let failCount = 0
  
  for (const product of products) {
    try {
      // Generate SKU from name
      const sku = product.slug || `PROD-${product.id}`
      
      // Get price
      const sellingPrice = parseFloat(product.price) || 0
      const mrp = parseFloat(product.regular_price) || sellingPrice
      
      // Get category
      let categoryId = defaultCategoryId
      if (product.categories && product.categories.length > 0) {
        const firstCat = product.categories[0].replace(/&amp;/g, '&').trim()
        if (categoryMap[firstCat]) {
          categoryId = categoryMap[firstCat]
        }
      }
      
      // Prepare product data - minimal fields
      const productData = {
        name: product.name,
        sku: sku,
        category_id: categoryId,
        description: product.description ? product.description.replace(/<[^>]*>/g, '').substring(0, 500) : null,
        selling_price: sellingPrice,
        mrp: mrp,
        cost_price: sellingPrice * 0.6,
        status: product.status === 'publish' ? 'active' : 'inactive',
        unit_of_measure: 'piece',
        hsn_code: '3004',
      }
      
      const { error: insertError } = await supabase
        .from('products')
        .insert([productData])
      
      if (insertError) {
        if (insertError.message.includes('duplicate')) {
          console.log(`⚠️  Skipped (duplicate): ${product.name}`)
        } else {
          console.log(`❌ Failed: ${product.name} - ${insertError.message}`)
          failCount++
        }
      } else {
        console.log(`✅ Added: ${product.name}`)
        successCount++
      }
    } catch (err) {
      console.log(`❌ Error: ${product.name} - ${err.message}`)
      failCount++
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('🎉 RESTORE COMPLETE!')
  console.log(`✅ Success: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log('='.repeat(50))
}

restoreProducts().catch(err => {
  console.error('💥 FATAL ERROR:', err)
  process.exit(1)
})
