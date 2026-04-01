
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkMfgCounts() {
  const tables = ['production_orders', 'production_order_items', 'formulations', 'formulation_items', 'batches', 'quality_checks']
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    if (error) {
      console.error(`❌ Error on ${table}:`, error.message)
    } else {
      console.log(`📊 ${table}: ${count} records`)
    }
  }
}
checkMfgCounts()
