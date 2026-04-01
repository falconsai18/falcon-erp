import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env file
dotenv.config({ path: join(__dirname, '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✓ Found' : '✗ Missing')
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Found' : '✗ Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: { persistSession: false }
})

async function cleanupData() {
  console.log('🧹 CLEANUP STARTING...\n')
  console.log('📡 Connecting to:', supabaseUrl)

  const tablesToDelete = [
    // Export module first (foreign keys)
    { name: 'export_order_items', label: 'Export Order Items' },
    { name: 'export_orders', label: 'Export Orders' },
    { name: 'export_payments', label: 'Export Payments' },
    { name: 'export_shipments', label: 'Export Shipments' },
    { name: 'export_packing_items', label: 'Packing Items' },
    { name: 'export_packing_lists', label: 'Packing Lists' },
    { name: 'export_invoices', label: 'Export Invoices' },
    
    // Sales & Invoices
    { name: 'payments', label: 'Invoices/Sales Payments' },
    { name: 'invoice_items', label: 'Invoice Items' },
    { name: 'invoices', label: 'Invoices' },
    { name: 'sales_order_items', label: 'Sales Order Items' },
    { name: 'sales_orders', label: 'Sales Orders' },
    
    // Inventory
    { name: 'inventory_movements', label: 'Inventory Movements' },
    { name: 'inventory', label: 'Inventory' },
    { name: 'batches', label: 'Batches' },
    
    // Production
    { name: 'formulations', label: 'Formulations' },
    { name: 'production_orders', label: 'Production Orders' },
    
    // Purchase
    { name: 'grn', label: 'GRN' },
    { name: 'purchase_order_items', label: 'Purchase Order Items' },
    { name: 'purchase_orders', label: 'Purchase Orders' },
    { name: 'supplier_payments', label: 'Supplier Payments' },
    
    // Raw Materials
    { name: 'raw_materials', label: 'Raw Materials' },
    
    // Quality
    { name: 'quality_checks', label: 'Quality Checks' },
    
    // Other documents
    { name: 'credit_note_items', label: 'Credit Note Items' },
    { name: 'credit_notes', label: 'Credit Notes' },
    { name: 'debit_note_items', label: 'Debit Note Items' },
    { name: 'debit_notes', label: 'Debit Notes' },
    { name: 'delivery_challan_items', label: 'Challan Items' },
    { name: 'delivery_challans', label: 'Delivery Challans' },
    { name: 'quotation_items', label: 'Quotation Items' },
    { name: 'quotations', label: 'Quotations' },
  ]

  let successCount = 0
  let failCount = 0

  for (const table of tablesToDelete) {
    try {
      console.log(`⏳ Deleting ${table.label}...`)
      
      // Try delete all
      const { error, count } = await supabase
        .from(table.name)
        .delete({ count: 'estimated' })
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) {
        // Check if table exists
        if (error.message.includes('does not exist') || error.code === '42P01') {
          console.log(`⚠️  ${table.label}: Table does not exist`)
          successCount++
        } else {
          console.log(`❌ ${table.label}: ${error.message}`)
          failCount++
        }
      } else {
        console.log(`✅ ${table.label}: Deleted`)
        successCount++
      }
    } catch (err) {
      console.log(`❌ ${table.label}: ${err.message}`)
      failCount++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`🎉 CLEANUP COMPLETE!`)
  console.log(`✅ Success: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log('='.repeat(50))
  
  console.log('\n📊 Remaining Master Data:')
  
  const masterTables = [
    'products',
    'customers', 
    'suppliers',
    'categories',
    'brands',
    'tax_rates',
    'units_of_measure',
    'settings',
    'companies',
    'bank_accounts'
  ]
  
  for (const table of masterTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (!error) {
        const count = data?.length || 0
        console.log(`  ${table}: ${count} records`)
      } else {
        console.log(`  ${table}: ERROR`)
      }
    } catch (e) {
      console.log(`  ${table}: ERROR`)
    }
  }
}

cleanupData().catch(err => {
  console.error('💥 FATAL ERROR:', err)
  process.exit(1)
})
