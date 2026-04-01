
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function clearManufacturingData() {
  console.log('🗑️ CLEARING MANUFACTURING DATA (Correct Order)...')
  
  const tables = [
    'quality_checks',
    'production_order_items',
    'production_orders',
    'formulation_items',
    'formulations',
    'inventory_movements',
    'batches',
    'inventory'
  ]

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) {
        console.error(`❌ Error clearing ${table}:`, error.message)
      } else {
        console.log(`✅ Cleared ${table}`)
      }
    } catch (e) {
      console.error(`❌ Fatal error on ${table}:`, e.message)
    }
  }
}

clearManufacturingData()
