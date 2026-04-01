import { supabase } from './src/lib/supabase'

async function checkData() {
  console.log('=== CHECKING TEST DATA ===\n')

  const tables = [
    'formulations',
    'production_orders',
    'raw_materials',
    'quality_checks',
    'grn',
    'purchase_orders',
    'supplier_payments',
    'credit_notes',
    'debit_notes',
    'delivery_challans',
    'quotations',
    'inventory',
    'batches',
    'sales_orders',
    'invoices',
    'customers',
    'products'
  ]

  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`${table}: ERROR - ${error.message}`)
    } else {
      console.log(`${table}: ${count} records`)
    }
  }

  console.log('\n=== DONE ===')
}

checkData().catch(console.error)
