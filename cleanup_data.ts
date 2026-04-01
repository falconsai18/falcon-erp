import { supabase } from './src/lib/supabase'

async function cleanupData() {
  console.log('🧹 CLEANUP STARTING...\n')

  const tablesToDelete = [
    { name: 'invoice_payments', label: 'Invoice Payments' },
    { name: 'invoice_items', label: 'Invoice Items' },
    { name: 'invoices', label: 'Invoices' },
    { name: 'sales_order_items', label: 'Sales Order Items' },
    { name: 'sales_orders', label: 'Sales Orders' },
    { name: 'inventory_movements', label: 'Inventory Movements' },
    { name: 'inventory', label: 'Inventory' },
    { name: 'batches', label: 'Batches' },
    { name: 'formulations', label: 'Formulations' },
    { name: 'production_orders', label: 'Production Orders' },
    { name: 'raw_materials', label: 'Raw Materials' },
    { name: 'quality_checks', label: 'Quality Checks' },
    { name: 'grn', label: 'GRN' },
    { name: 'purchase_order_items', label: 'Purchase Order Items' },
    { name: 'purchase_orders', label: 'Purchase Orders' },
    { name: 'supplier_payments', label: 'Supplier Payments' },
    { name: 'credit_note_items', label: 'Credit Note Items' },
    { name: 'credit_notes', label: 'Credit Notes' },
    { name: 'debit_note_items', label: 'Debit Note Items' },
    { name: 'debit_notes', label: 'Debit Notes' },
    { name: 'delivery_challan_items', label: 'Challan Items' },
    { name: 'delivery_challans', label: 'Delivery Challans' },
    { name: 'quotation_items', label: 'Quotation Items' },
    { name: 'quotations', label: 'Quotations' },
    { name: 'export_order_items', label: 'Export Order Items' },
    { name: 'export_orders', label: 'Export Orders' },
    { name: 'export_invoices', label: 'Export Invoices' },
    { name: 'export_packing_items', label: 'Packing Items' },
    { name: 'export_packing_lists', label: 'Packing Lists' },
    { name: 'export_payments', label: 'Export Payments' },
    { name: 'export_shipments', label: 'Export Shipments' },
  ]

  // Delete in reverse order (child tables first)
  for (const table of tablesToDelete.reverse()) {
    try {
      const { error, count } = await supabase
        .from(table.name)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

      if (error) {
        console.log(`❌ ${table.label}: ${error.message}`)
      } else {
        console.log(`✅ ${table.label}: Deleted ${count || 0} records`)
      }
    } catch (err: any) {
      console.log(`❌ ${table.label}: ${err.message}`)
    }
  }

  console.log('\n🎉 CLEANUP COMPLETE!')
  console.log('\n📊 Remaining Data (Master):')
  
  // Check remaining master data
  const masterTables = [
    'products',
    'customers', 
    'suppliers',
    'categories',
    'brands',
    'inventory',
    'settings'
  ]
  
  for (const table of masterTables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    
    if (!error) {
      console.log(`  ${table}: ${count} records`)
    }
  }
}

cleanupData().catch(console.error)
