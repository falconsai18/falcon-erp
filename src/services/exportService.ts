import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { saveAs } from 'file-saver'
import { supabase } from '@/lib/supabase'
import { getCompanyInfo } from './settingsService'
import { formatCurrency, formatDate } from '@/lib/utils'

// ============ CSV EXPORT (Generic) ============
export function exportToCSV(data: any[], columns: { key: string; label: string }[], filename: string) {
    if (!data.length) return

    const header = columns.map(c => c.label).join(',')
    const rows = data.map(row =>
        columns.map(c => {
            let val = row[c.key]
            if (val === null || val === undefined) val = ''
            // Escape commas and quotes
            val = String(val).replace(/"/g, '""')
            if (String(val).includes(',') || String(val).includes('"') || String(val).includes('\n')) {
                val = `"${val}"`
            }
            return val
        }).join(',')
    )

    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
}

// ============ SALES ORDERS EXPORT ============
export async function exportSalesOrders() {
    const { data, error } = await supabase
        .from('sales_orders')
        .select('*, customers(name)')
        .order('created_at', { ascending: false })

    if (error) throw error

    const rows = (data || []).map((o: any) => ({
        order_number: o.order_number,
        customer: o.customers?.name || '-',
        order_date: formatDate(o.order_date),
        delivery_date: o.delivery_date ? formatDate(o.delivery_date) : '-',
        status: o.status,
        payment_status: o.payment_status,
        subtotal: o.subtotal,
        tax: o.tax_amount,
        total: o.total_amount,
    }))

    exportToCSV(rows, [
        { key: 'order_number', label: 'Order #' },
        { key: 'customer', label: 'Customer' },
        { key: 'order_date', label: 'Order Date' },
        { key: 'delivery_date', label: 'Delivery Date' },
        { key: 'status', label: 'Status' },
        { key: 'payment_status', label: 'Payment Status' },
        { key: 'subtotal', label: 'Subtotal' },
        { key: 'tax', label: 'Tax' },
        { key: 'total', label: 'Total' },
    ], 'sales_orders')
}

// ============ INVOICES EXPORT ============
export async function exportInvoices() {
    const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .order('created_at', { ascending: false })

    if (error) throw error

    const rows = (data || []).map((i: any) => ({
        invoice_number: i.invoice_number,
        customer: i.customers?.name || '-',
        invoice_date: formatDate(i.invoice_date),
        due_date: i.due_date ? formatDate(i.due_date) : '-',
        status: i.status,
        subtotal: i.subtotal,
        cgst: i.cgst_amount,
        sgst: i.sgst_amount,
        igst: i.igst_amount,
        total: i.total_amount,
        paid: i.paid_amount,
        balance: i.balance_amount,
    }))

    exportToCSV(rows, [
        { key: 'invoice_number', label: 'Invoice #' },
        { key: 'customer', label: 'Customer' },
        { key: 'invoice_date', label: 'Invoice Date' },
        { key: 'due_date', label: 'Due Date' },
        { key: 'status', label: 'Status' },
        { key: 'subtotal', label: 'Subtotal' },
        { key: 'cgst', label: 'CGST' },
        { key: 'sgst', label: 'SGST' },
        { key: 'igst', label: 'IGST' },
        { key: 'total', label: 'Total' },
        { key: 'paid', label: 'Paid' },
        { key: 'balance', label: 'Balance' },
    ], 'invoices')
}

// ============ REPORTS EXPORT ============
export async function exportSingleReport(reportType: string, reportName: string, data: any) {
  if (!data) throw new Error('No report data to export')
  
  const timestamp = new Date().toISOString().split('T')[0]

  const exportMap: Record<string, Record<string, () => void>> = {
    sales: {
      'sales_summary': () => exportToCSV([{
        total_orders: data.totalOrders || 0,
        total_revenue: data.totalRevenue || 0,
        avg_order_value: data.avgOrderValue || 0,
      }], [
        { key: 'total_orders', label: 'Total Orders' },
        { key: 'total_revenue', label: 'Total Revenue (₹)' },
        { key: 'avg_order_value', label: 'Avg Order Value (₹)' },
      ], `sales_summary_${timestamp}`),

      'top_products': () => {
        if (!data.topProducts?.length) throw new Error('No product data available')
        exportToCSV(data.topProducts, [
          { key: 'name', label: 'Product' },
          { key: 'quantity', label: 'Quantity Sold' },
          { key: 'revenue', label: 'Revenue (₹)' },
        ], `sales_top_products_${timestamp}`)
      },

      'top_customers': () => {
        if (!data.topCustomers?.length) throw new Error('No customer data available')
        exportToCSV(data.topCustomers, [
          { key: 'name', label: 'Customer' },
          { key: 'orders', label: 'Total Orders' },
          { key: 'revenue', label: 'Revenue (₹)' },
        ], `sales_top_customers_${timestamp}`)
      },

      'monthly_revenue': () => {
        if (!data.monthlyRevenue?.length) throw new Error('No monthly data available')
        exportToCSV(data.monthlyRevenue, [
          { key: 'month', label: 'Month' },
          { key: 'revenue', label: 'Revenue (₹)' },
          { key: 'orders', label: 'Orders' },
        ], `sales_monthly_revenue_${timestamp}`)
      },

      'status_breakdown': () => {
        if (!data.statusBreakdown?.length) throw new Error('No status data available')
        exportToCSV(data.statusBreakdown, [
          { key: 'status', label: 'Order Status' },
          { key: 'count', label: 'Count' },
        ], `sales_status_breakdown_${timestamp}`)
      },

      'payment_breakdown': () => {
        if (!data.paymentBreakdown?.length) throw new Error('No payment data available')
        exportToCSV(data.paymentBreakdown, [
          { key: 'status', label: 'Payment Status' },
          { key: 'count', label: 'Count' },
        ], `sales_payment_breakdown_${timestamp}`)
      },

      'all': () => {
        if (data.topProducts?.length) exportMap.sales.top_products()
        if (data.topCustomers?.length) exportMap.sales.top_customers()
        if (data.monthlyRevenue?.length) exportMap.sales.monthly_revenue()
        if (data.statusBreakdown?.length) exportMap.sales.status_breakdown()
        if (data.paymentBreakdown?.length) exportMap.sales.payment_breakdown()
        exportMap.sales.sales_summary()
      },
    },

    inventory: {
      'inventory_summary': () => exportToCSV([{
        total_products: data.totalProducts || 0,
        total_value: data.totalValue || 0,
        low_stock_count: data.lowStockItems?.length || 0,
        expiring_count: data.expiringItems?.length || 0,
      }], [
        { key: 'total_products', label: 'Total Products' },
        { key: 'total_value', label: 'Stock Value (₹)' },
        { key: 'low_stock_count', label: 'Low Stock Items' },
        { key: 'expiring_count', label: 'Expiring Items' },
      ], `inventory_summary_${timestamp}`),

      'low_stock': () => {
        if (!data.lowStockItems?.length) throw new Error('No low stock items')
        exportToCSV(data.lowStockItems, [
          { key: 'name', label: 'Product' },
          { key: 'sku', label: 'SKU' },
          { key: 'available', label: 'Available Qty' },
          { key: 'reorder', label: 'Reorder Point' },
        ], `inventory_low_stock_${timestamp}`)
      },

      'expiring_items': () => {
        if (!data.expiringItems?.length) throw new Error('No expiring items')
        exportToCSV(data.expiringItems, [
          { key: 'name', label: 'Product' },
          { key: 'batch', label: 'Batch No' },
          { key: 'expiry', label: 'Expiry Date' },
          { key: 'days', label: 'Days Remaining' },
          { key: 'quantity', label: 'Quantity' },
        ], `inventory_expiring_${timestamp}`)
      },

      'category_breakdown': () => {
        if (!data.categoryBreakdown?.length) throw new Error('No category data')
        exportToCSV(data.categoryBreakdown, [
          { key: 'category', label: 'Category' },
          { key: 'count', label: 'Products' },
          { key: 'value', label: 'Value (₹)' },
        ], `inventory_categories_${timestamp}`)
      },

      'all': () => {
        if (data.lowStockItems?.length) exportMap.inventory.low_stock()
        if (data.expiringItems?.length) exportMap.inventory.expiring_items()
        if (data.categoryBreakdown?.length) exportMap.inventory.category_breakdown()
        exportMap.inventory.inventory_summary()
      },
    },

    financial: {
      'financial_summary': () => exportToCSV([{
        total_invoiced: data.totalInvoiced || 0,
        total_paid: data.totalPaid || 0,
        total_pending: data.totalPending || 0,
        total_purchases: data.totalPurchases || 0,
        gross_profit: data.grossProfit || 0,
      }], [
        { key: 'total_invoiced', label: 'Total Invoiced (₹)' },
        { key: 'total_paid', label: 'Total Paid (₹)' },
        { key: 'total_pending', label: 'Pending (₹)' },
        { key: 'total_purchases', label: 'Purchases (₹)' },
        { key: 'gross_profit', label: 'Gross Profit (₹)' },
      ], `financial_summary_${timestamp}`),

      'invoice_aging': () => {
        if (!data.invoiceAging?.length) throw new Error('No aging data')
        exportToCSV(data.invoiceAging, [
          { key: 'range', label: 'Aging Range' },
          { key: 'count', label: 'Invoices' },
          { key: 'amount', label: 'Amount (₹)' },
        ], `financial_aging_${timestamp}`)
      },

      'monthly_income_expense': () => {
        if (!data.monthlyInOut?.length) throw new Error('No monthly data')
        exportToCSV(data.monthlyInOut, [
          { key: 'month', label: 'Month' },
          { key: 'income', label: 'Income (₹)' },
          { key: 'expense', label: 'Expense (₹)' },
        ], `financial_monthly_${timestamp}`)
      },

      'all': () => {
        if (data.invoiceAging?.length) exportMap.financial.invoice_aging()
        if (data.monthlyInOut?.length) exportMap.financial.monthly_income_expense()
        exportMap.financial.financial_summary()
      },
    },

    production: {
      'production_summary': () => exportToCSV([{
        total_orders: data.totalOrders || 0,
        completed: data.completed || 0,
        total_produced: data.totalProduced || 0,
        efficiency: `${data.efficiency || 0}%`,
      }], [
        { key: 'total_orders', label: 'Total Orders' },
        { key: 'completed', label: 'Completed' },
        { key: 'total_produced', label: 'Total Produced' },
        { key: 'efficiency', label: 'Efficiency' },
      ], `production_summary_${timestamp}`),

      'material_usage': () => {
        if (!data.materialUsage?.length) throw new Error('No material data')
        exportToCSV(data.materialUsage, [
          { key: 'name', label: 'Material' },
          { key: 'planned', label: 'Planned Qty' },
          { key: 'actual', label: 'Actual Qty' },
          { key: 'unit', label: 'Unit' },
        ], `production_materials_${timestamp}`)
      },

      'all': () => {
        if (data.materialUsage?.length) exportMap.production.material_usage()
        exportMap.production.production_summary()
      },
    },
  }

  const tabExports = exportMap[reportType]
  if (!tabExports) throw new Error(`Unknown report type: ${reportType}`)

  const exportFn = tabExports[reportName]
  if (!exportFn) throw new Error(`Unknown report: ${reportName}`)

  exportFn()
}

// ============ GST INVOICE PDF (HTML-based, same design as print) ============
export async function generateInvoicePDF(invoiceId: string) {
    try {
        // Fetch invoice with items
        const { data: invoice, error } = await supabase
            .from('invoices')
            .select(`
                *,
                customers(name, phone, email, gst_number, pan_number, address_line1, city, state, pincode),
                sales_orders(order_number),
                invoice_items(*, products(name, sku, hsn_code, unit_of_measure))
            `)
            .eq('id', invoiceId)
            .single()

        if (error) throw error
        if (!invoice) throw new Error('Invoice not found')

        // Fetch company info
        const company = await getCompanyInfo()

        // Fetch bank details
        const { data: bank } = await supabase
            .from('bank_accounts')
            .select('*')
            .eq('is_default', true)
            .limit(1)
            .maybeSingle()

        // Fetch Terms & Conditions
        const { data: termsSetting } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'invoice_terms_conditions')
            .maybeSingle()

        const termsStr = termsSetting?.value || "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is not made within the due date.\n3. Subject to jurisdiction."
        const termsHtml = termsStr.split('\n').map((line: string) => `${line}`).join('<br />')

        // Generate Invoice Data
        const customer = invoice.customers
        const items = invoice.invoice_items || []
        const isInterstate = (invoice.igst_amount || 0) > 0

        // Build items table rows
        let itemsHtml = ''
        items.forEach((item: any, index: number) => {
            const product = item.products
            const productName = product?.name || '-'
            const productWithWeight = item.weight_grams && item.weight_grams > 0
                ? `${productName} (${item.weight_grams}g)`
                : productName
            const qtyDisplay = item.free_qty > 0 ? `${item.quantity}+${item.free_qty}` : `${item.quantity}`
            const subtotal = item.quantity * item.unit_price
            const discount = subtotal * (item.discount_percent || 0) / 100
            const taxable = subtotal - discount

            if (isInterstate) {
                itemsHtml += `
                <tr>
                    <td style="text-align: center; padding: 4px 2px; border: 1px solid #d1d5db;">${index + 1}</td>
                    <td style="padding: 4px 2px; border: 1px solid #d1d5db;"><b>${productWithWeight}</b></td>
                    <td style="text-align: center; padding: 4px 2px; border: 1px solid #d1d5db;">${item.hsn_code || product?.hsn_code || '-'}</td>
                    <td style="text-align: center; padding: 4px 2px; border: 1px solid #d1d5db;">${item.batch_number || ''}</td>
                    <td style="text-align: center; padding: 4px 2px; border: 1px solid #d1d5db;">${qtyDisplay}</td>
                    <td style="text-align: right; padding: 4px 2px; border: 1px solid #d1d5db;">Rs. ${item.unit_price.toFixed(2)}</td>
                    <td style="text-align: center; padding: 4px 2px; border: 1px solid #d1d5db;">${item.discount_percent || 0}%</td>
                    <td style="text-align: right; padding: 4px 2px; border: 1px solid #d1d5db;">Rs. ${taxable.toFixed(2)}</td>
                    <td style="text-align: center; padding: 4px 2px; border: 1px solid #d1d5db;">${item.tax_rate || 0}%</td>
                    <td style="text-align: right; padding: 4px 2px; border: 1px solid #d1d5db;">Rs. ${(item.igst_amount || 0).toFixed(2)}</td>
                    <td style="text-align: right; padding: 4px 2px; border: 1px solid #d1d5db;">Rs. ${item.total_amount.toFixed(2)}</td>
                </tr>
                `
            } else {
                itemsHtml += `
                <tr>
                    <td style="text-align: center; padding: 4px 2px; border: 1px solid #d1d5db;">${index + 1}</td>
                    <td style="padding: 4px 2px; border: 1px solid #d1d5db;"><b>${productWithWeight}</b></td>
                    <td style="text-align: center; padding: 4px 2px; border: 1px solid #d1d5db;">${item.hsn_code || product?.hsn_code || '-'}</td>
                    <td style="text-align: center; padding: 4px 2px; border: 1px solid #d1d5db;">${item.batch_number || ''}</td>
                    <td style="text-align: center; padding: 4px 2px; border: 1px solid #d1d5db;">${qtyDisplay}</td>
                    <td style="text-align: right; padding: 4px 2px; border: 1px solid #d1d5db;">Rs. ${item.unit_price.toFixed(2)}</td>
                    <td style="text-align: center; padding: 4px 2px; border: 1px solid #d1d5db;">${item.discount_percent || 0}%</td>
                    <td style="text-align: right; padding: 4px 2px; border: 1px solid #d1d5db;">Rs. ${taxable.toFixed(2)}</td>
                    <td style="text-align: right; padding: 4px 2px; border: 1px solid #d1d5db;">Rs. ${(item.cgst_amount || 0).toFixed(2)}</td>
                    <td style="text-align: right; padding: 4px 2px; border: 1px solid #d1d5db;">Rs. ${(item.sgst_amount || 0).toFixed(2)}</td>
                    <td style="text-align: right; padding: 4px 2px; border: 1px solid #d1d5db;">Rs. ${item.total_amount.toFixed(2)}</td>
                </tr>
                `
            }
        })

        const roundOffValue = invoice.round_off || 0
        const roundOffSign = roundOffValue > 0 ? '+' : roundOffValue < 0 ? '-' : ''
        const roundOffText = `${roundOffSign}Rs. ${Math.abs(roundOffValue).toFixed(2)}`

        const invoiceTitle = 'PROFORMA INVOICE'

        // HTML Content with PDF-optimized styles
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Invoice #${invoice.invoice_number}</title>
            <style>
                * { margin: 0; padding: 0; }
                body { font-family: Arial; font-size: 10px; color: #000; line-height: 1.3; }
                .header { margin-bottom: 10px; }
                .company { font-weight: bold; font-size: 12px; }
                .address { font-size: 9px; margin: 2px 0; }
                .title { font-size: 13px; font-weight: bold; border: 2px solid #000; display: inline-block; padding: 3px 10px; margin: 5px 0; }
                .invoice-info { float: right; text-align: right; font-size: 9px; margin-top: 5px; }
                .section { margin: 8px 0; clear: both; }
                table { width: 100%; border-collapse: collapse; margin: 5px 0; }
                td, th { border: 1px solid #999; padding: 4px; text-align: left; font-size: 9px; }
                th { background-color: #ddd; font-weight: bold; }
                .center { text-align: center; }
                .right { text-align: right; }
                .label { font-weight: bold; }
                .total-row { background-color: #ddd; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company">${company?.name || 'Your Company'}</div>
                <div class="address">${company?.address_line1 || ''}</div>
                <div class="address">${company?.city || ''} ${company?.state || ''} ${company?.pincode || ''}</div>
                <div class="address"><b>GSTIN:</b> ${company?.gst_number || ''}</div>
                <div class="address"><b>Phone:</b> ${company?.phone || ''}</div>
                
                <div class="invoice-info">
                    <div class="title">${invoiceTitle}</div>
                    <div><b>Inv No:</b> ${invoice.invoice_number}</div>
                    <div><b>Date:</b> ${formatDate(invoice.invoice_date)}</div>
                    ${invoice.due_date ? `<div><b>Due:</b> ${formatDate(invoice.due_date)}</div>` : ''}
                </div>
            </div>

            <div class="section" style="clear: both;">
                <div><b>Bill To: ${customer?.name || 'Customer'}</b></div>
                <div>${customer?.address_line1 || ''}</div>
                <div>${customer?.city || ''}, ${customer?.state || ''} ${customer?.pincode || ''}</div>
                <div><b>GSTIN:</b> ${customer?.gst_number || '-'}</div>
                <div><b>Place:</b> ${invoice.place_of_supply || '-'}</div>
            </div>

            <table>
                <tr>
                    <th class="center" style="width: 5%;">Sr</th>
                    <th style="width: 30%;">Product</th>
                    <th class="center" style="width: 8%;">HSN</th>
                    <th class="center" style="width: 8%;">Qty</th>
                    <th class="right" style="width: 12%;">Rate</th>
                    <th class="right" style="width: 12%;">Taxable</th>
                    ${isInterstate ? `<th class="right" style="width: 10%;">IGST</th>` : `<th class="right" style="width: 5%;">CGST</th><th class="right" style="width: 5%;">SGST</th>`}
                    <th class="right" style="width: 12%;">Total</th>
                </tr>
                ${itemsHtml}
            </table>

            <table style="width: 100%; margin-top: 5px;">
                <tr><td class="label" style="width: 70%; border: none;"><b>Amount in Words:</b></td><td style="border: none; font-style: italic;">Rupees ${numberToWords(Math.round(invoice.total_amount))} Only</td></tr>
            </table>

            <table style="width: 100%; margin-top: 5px; font-size: 9px;">
                <tr><th>HSN</th><th>Taxable</th><th>Rate</th><th>Tax Amt</th></tr>
                ${items.map((item: any) => `<tr><td>${item.hsn_code || item.products?.hsn_code || '-'}</td><td class="right">Rs. ${(((item.quantity * item.unit_price) - (item.quantity * item.unit_price * (item.discount_percent || 0) / 100))).toFixed(2)}</td><td class="center">${item.tax_rate || 0}%</td><td class="right">Rs. ${(isInterstate ? (item.igst_amount || 0) : (item.cgst_amount || 0) + (item.sgst_amount || 0)).toFixed(2)}</td></tr>`).join('')}
            </table>

            <table style="width: 50%; margin-left: 50%; margin-top: 5px; font-size: 9px;">
                <tr><td class="label">Subtotal:</td><td class="right">Rs. ${(invoice.subtotal || 0).toFixed(2)}</td></tr>
                ${invoice.discount_amount > 0 ? `<tr><td class="label">Discount:</td><td class="right">-Rs. ${(invoice.discount_amount || 0).toFixed(2)}</td></tr>` : ''}
                <tr><td class="label">Taxable:</td><td class="right">Rs. ${((invoice.subtotal || 0) - (invoice.discount_amount || 0)).toFixed(2)}</td></tr>
                ${isInterstate ? `<tr><td class="label">IGST:</td><td class="right">Rs. ${(invoice.igst_amount || 0).toFixed(2)}</td></tr>` : `<tr><td class="label">CGST:</td><td class="right">Rs. ${(invoice.cgst_amount || 0).toFixed(2)}</td></tr><tr><td class="label">SGST:</td><td class="right">Rs. ${(invoice.sgst_amount || 0).toFixed(2)}</td></tr>`}
                <tr><td class="label">Rounding:</td><td class="right">${roundOffText}</td></tr>
                <tr class="total-row"><td class="label" style="border-color: #000; font-size: 11px;"><b>TOTAL:</b></td><td class="right" style="border-color: #000; font-size: 11px;"><b>Rs. ${(invoice.total_amount || 0).toFixed(2)}</b></td></tr>
            </table>

            ${bank ? `
            <div class="section" style="font-size: 9px;">
                <b>BANK DETAILS:</b><br/>
                <b>Bank:</b> ${bank.bank_name || '-'} | <b>A/C:</b> ${bank.account_number || '-'} | <b>IFSC:</b> ${bank.ifsc_code || '-'}
            </div>
            ` : ''}

            <div class="section" style="font-size: 9px;">
                <b>Terms:</b> ${termsHtml}
            </div>

            <div style="text-align: center; margin-top: 15px; font-weight: bold;">
                Thank you for your business!
            </div>
        </body>
        </html>
        `

        // ============================================
        // RENDER INVOICE - EXACT SAME AS PRINT
        // ============================================

        const renderInvoice = () => `
            <div class="invoice-container">
                <!-- TOP HEADER WITH COMPANY INFO & INVOICE TITLE -->
                <table class="header-table" style="width: 100%; margin-bottom: 12px;">
                    <tr>
                        <td width="60%" class="company-section">
                            <div class="company-name-header">${company?.name || 'Your Company'}</div>
                            <div class="company-address">
                                ${company?.address_line1 ? company.address_line1 : ''}
                                ${company?.city ? '<br/>' + company.city : ''}${company?.state ? ', ' + company.state : ''}${company?.pincode ? ' - ' + company.pincode : ''}
                            </div>
                            <div class="company-credentials">
                                ${company?.gst_number ? `<b>GSTIN: ${company.gst_number}</b>` : ''}
                                ${company?.phone ? ` | <b>Phone:</b> ${company.phone}` : ''}
                                ${company?.email ? ` | <b>Email:</b> ${company.email}` : ''}
                            </div>
                        </td>
                        <td width="40%" style="text-align: right; vertical-align: top;">
                            <div style="text-align: right; margin-bottom: 4px;">
                                <span style="font-size: 7px;">ORIGINAL [ ]  DUPLICATE [ ]  TRIPLICATE [ ]</span>
                            </div>
                            <div class="title-box-large">${invoiceTitle}</div>
                            <table class="invoice-info-table" style="width: 100%; float: right; margin-top: 4px; font-size: 9px;">
                                <tr>
                                    <td style="text-align: right; padding: 2px 0;"><b>Invoice No:</b></td>
                                    <td style="text-align: right; padding: 2px 4px;">${invoice.invoice_number}</td>
                                </tr>
                                <tr>
                                    <td style="text-align: right; padding: 2px 0;"><b>Date:</b></td>
                                    <td style="text-align: right; padding: 2px 4px;">${formatDate(invoice.invoice_date)}</td>
                                </tr>
                                ${invoice.due_date ? `<tr><td style="text-align: right; padding: 2px 0;"><b>Due Date:</b></td><td style="text-align: right; padding: 2px 4px;">${formatDate(invoice.due_date)}</td></tr>` : ''}
                            </table>
                        </td>
                    </tr>
                </table>

                <!-- SEPARATOR LINE -->
                <hr class="separator" />

                <!-- BILL TO & DETAILS SECTION -->
                <table class="bill-details-table" style="width: 100%; margin-bottom: 12px;">
                    <tr>
                        <td width="50%" class="bill-to-section">
                            <div class="section-title">Bill To:</div>
                            <div class="customer-name">${customer?.name || 'Customer'}</div>
                            <div class="customer-address">
                                ${customer?.address_line1 ? customer.address_line1 + '<br/>' : ''}
                                ${[customer?.city, customer?.state].filter(Boolean).join(', ')}${customer?.pincode ? '<br/>' + customer.pincode : ''}${customer?.phone ? '<br/>Phone: ' + customer.phone : ''}
                            </div>
                            ${customer?.gst_number ? `<div><b>GSTIN: ${customer.gst_number}</b></div>` : '<div><b>GSTIN:</b> -</div>'}
                        </td>
                        <td width="50%" class="bill-details-right">
                            <table class="additional-details" style="width: 100%; font-size: 9px;">
                                <tr>
                                    <td style="padding: 2px 0;"><b>Place of Supply:</b></td>
                                    <td style="padding: 2px 4px; text-align: right;">${invoice.place_of_supply || '-'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0;"><b>Reverse Charge:</b></td>
                                    <td style="padding: 2px 4px; text-align: right;">No</td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0;"><b>Vehicle No:</b></td>
                                    <td style="padding: 2px 4px; text-align: right;">-</td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0;"><b>Transport Mode:</b></td>
                                    <td style="padding: 2px 4px; text-align: right;">-</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <!-- ITEMS TABLE SECTION -->
                <table class="items-table">
                    <thead>
                        <tr>
                            <th class="col-sr">Sr</th>
                            <th class="col-desc">Description</th>
                            <th class="col-hsn">HSN/SAC</th>
                            <th class="col-batch">Batch</th>
                            <th class="col-qty">Qty</th>
                            <th class="col-rate">Rate</th>
                            <th class="col-disc">Disc%</th>
                            <th class="col-taxable">Taxable</th>
                            ${isInterstate ? `<th class="col-gst">IGST%</th><th class="col-amount">IGST</th>` : `<th class="col-gst">GST%</th><th class="col-cgst">CGST</th><th class="col-sgst">SGST</th>`}
                            <th class="col-total">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <!-- AMOUNT IN WORDS & HSN SUMMARY & TOTALS LAYOUT -->
                <table class="summary-layout" style="width: 100%; margin-top: 6px; margin-bottom: 8px;">
                    <tr>
                        <!-- LEFT: Amount in Words -->
                        <td width="40%" class="amount-words-box">
                            <div><b>Amount in Words:</b></div>
                            <div style="font-style: italic; margin-top: 2px;">Rupees ${numberToWords(Math.round(invoice.total_amount))} Only</div>
                        </td>

                        <!-- MIDDLE: HSN Summary -->
                        <td width="30%" class="hsn-summary-box">
                            <table class="hsn-table">
                                <thead>
                                    <tr>
                                        <th>HSN/SAC</th>
                                        <th>Taxable Value</th>
                                        ${isInterstate ? '<th>IGST Rate</th><th>IGST Amount</th>' : '<th>GST Rate</th><th>GST Amount</th>'}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${items.map((item: any) => `
                                        <tr>
                                            <td>${item.hsn_code || item.products?.hsn_code || '-'}</td>
                                            <td style="text-align: right;">Rs. ${((item.quantity * item.unit_price) - (item.quantity * item.unit_price * (item.discount_percent || 0) / 100)).toFixed(2)}</td>
                                            <td style="text-align: center;">${item.tax_rate || 0}%</td>
                                            <td style="text-align: right;">Rs. ${(isInterstate ? (item.igst_amount || 0) : (item.cgst_amount || 0) + (item.sgst_amount || 0)).toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </td>

                        <!-- RIGHT: Totals Box -->
                        <td width="30%" class="totals-box">
                            <table class="totals-table">
                                <tr>
                                    <td class="label">Subtotal:</td>
                                    <td class="value">Rs. ${(invoice.subtotal || 0).toFixed(2)}</td>
                                </tr>
                                ${invoice.discount_amount > 0 ? `<tr><td class="label">Discount:</td><td class="value">-Rs. ${(invoice.discount_amount || 0).toFixed(2)}</td></tr>` : ''}
                                <tr>
                                    <td class="label">Taxable Value:</td>
                                    <td class="value">Rs. ${((invoice.subtotal || 0) - (invoice.discount_amount || 0)).toFixed(2)}</td>
                                </tr>
                                ${isInterstate ? `<tr><td class="label">IGST:</td><td class="value">Rs. ${(invoice.igst_amount || 0).toFixed(2)}</td></tr>` : `
                                    <tr><td class="label">CGST:</td><td class="value">Rs. ${(invoice.cgst_amount || 0).toFixed(2)}</td></tr>
                                    <tr><td class="label">SGST:</td><td class="value">Rs. ${(invoice.sgst_amount || 0).toFixed(2)}</td></tr>
                                `}
                                <tr>
                                    <td class="label">Round Off:</td>
                                    <td class="value">${roundOffText}</td>
                                </tr>
                                <tr class="grand-total">
                                    <td class="label"><b>Grand Total:</b></td>
                                    <td class="value"><b>Rs. ${(invoice.total_amount || 0).toFixed(2)}</b></td>
                                </tr>
                                ${invoice.paid_amount > 0 ? `
                                    <tr><td class="label">Paid:</td><td class="value">Rs. ${(invoice.paid_amount || 0).toFixed(2)}</td></tr>
                                    <tr class="balance-row"><td class="label"><b>Balance:</b></td><td class="value"><b>Rs. ${(invoice.balance_amount || 0).toFixed(2)}</b></td></tr>
                                ` : ''}
                            </table>
                        </td>
                    </tr>
                </table>

                <!-- SEPARATOR LINE -->
                <hr class="separator" />

                <!-- SEPARATOR LINE -->
                <hr class="separator" />

                <!-- BANK DETAILS SECTION -->
                ${bank ? `
                <table style="width: 100%; margin-bottom: 8px; font-size: 8px;">
                    <tr>
                        <td width="50%">
                            <div style="font-weight: bold; margin-bottom: 2px;">BANK DETAILS:</div>
                            <div>Bank: ${bank.bank_name || '-'}</div>
                            <div>Account #: <b>${bank.account_number || '-'}</b></div>
                            <div>IFSC: ${bank.ifsc_code || '-'}</div>
                            <div>Branch: ${bank.branch || '-'}</div>
                        </td>
                    </tr>
                </table>
                ` : ''}

                <!-- SEPARATOR LINE -->
                <hr class="separator" />

                <!-- TERMS & SIGNATURE SECTION -->
                <table class="footer-layout" style="width: 100%; margin-top: 8px;">
                    <tr>
                        <td width="65%" class="terms-section">
                            <div style="font-size: 8px; line-height: 1.5;">
                                <b>Terms & Conditions:</b><br/>
                                ${termsHtml}
                            </div>
                        </td>
                        <td width="35%" class="signature-section">
                            <div style="text-align: center; padding-top: 20px;">
                                <div style="border-top: 1px solid #4b5563; width: 70%; margin: 0 auto 3px; min-height: 35px;"></div>
                                <div style="font-size: 8px;">For ${company?.name || 'Your Company'}</div>
                                <div style="font-size: 8px; margin-top: 8px;"><b>Authorized Signatory</b></div>
                            </div>
                        </td>
                    </tr>
                </table>

                <!-- FOOTER: Thank You -->
                <div style="text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid #4b5563;">
                    <div style="font-size: 10px; font-weight: bold;">Thank you for your business!</div>
                </div>
            </div>
        `

        const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice #${invoice.invoice_number}</title>
            <style>
                @media print {
                    @page { 
                        margin: 0;
                        size: A4;
                    }
                    * {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                    }
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Segoe UI', 'Arial', 'Helvetica', sans-serif;
                    font-size: 9px;
                    color: #1f2937;
                    background: #f9fafb;
                    line-height: 1.4;
                }

                .invoice-container {
                    width: 210mm;
                    height: auto;
                    margin: 0 auto;
                    padding: 12mm;
                    background: #fff;
                }

                /* HEADER TABLE - Company & Invoice Title */
                .header-table { margin-bottom: 8px; }
                .company-section { vertical-align: top; }
                .company-name-header { font-size: 11px; font-weight: bold; color: #1f2937; margin-bottom: 2px; }
                .company-address { font-size: 8px; color: #4b5563; line-height: 1.3; margin-bottom: 2px; }
                .company-credentials { font-size: 7px; color: #4b5563; }
                .title-box-large { border: 2px solid #1f2937; padding: 4px 12px; font-size: 14px; font-weight: bold; color: #1f2937; display: inline-block; background: #fff; margin-bottom: 4px; }
                .invoice-info-table { margin-top: 4px; font-size: 9px; color: #1f2937; }
                .invoice-info-table td { padding: 2px 4px; }
                .separator { border: none; border-top: 1px solid #d1d5db; margin: 8px 0; height: 0; }
                .bill-details-table { font-size: 9px; }
                .bill-to-section { vertical-align: top; }
                .section-title { font-weight: bold; margin-bottom: 3px; color: #1f2937; }
                .customer-name { font-weight: bold; font-size: 10px; margin-bottom: 2px; color: #1f2937; }
                .customer-address { font-size: 8px; color: #4b5563; line-height: 1.3; margin-bottom: 2px; }
                .bill-details-right { vertical-align: top; padding-left: 12px; }
                .additional-details { border: 1px solid #d1d5db; border-collapse: collapse; }
                .additional-details tr td { padding: 4px 6px; border-bottom: 1px solid #d1d5db; font-size: 8px; }
                .additional-details tr:last-child td { border-bottom: none; }
                .items-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 8px; }
                .items-table thead { background-color: #e5e7eb; border: 1px solid #9ca3af; }
                .items-table th { border: 1px solid #9ca3af; padding: 4px 2px; text-align: center; font-weight: bold; color: #1f2937; font-size: 7px; line-height: 1.2; }
                .items-table tbody tr { border: 1px solid #d1d5db; }
                .items-table td { border: 1px solid #d1d5db; padding: 4px 2px; text-align: left; color: #374151; }
                .col-sr { width: 4%; text-align: center; } .col-desc { width: 25%; } .col-hsn { width: 8%; text-align: center; } .col-batch { width: 7%; text-align: center; } .col-qty { width: 5%; text-align: center; } .col-rate { width: 8%; text-align: right; } .col-disc { width: 5%; text-align: center; } .col-taxable { width: 9%; text-align: right; } .col-gst { width: 5%; text-align: center; } .col-amount { width: 7%; text-align: right; } .col-cgst { width: 6%; text-align: right; } .col-sgst { width: 6%; text-align: right; } .col-total { width: 8%; text-align: right; }
                .summary-layout { font-size: 8px; }
                .amount-words-box { vertical-align: top; padding-right: 8px; font-style: italic; color: #4b5563; line-height: 1.4; }
                .hsn-summary-box { vertical-align: top; padding: 0 6px; }
                .hsn-table { width: 100%; border-collapse: collapse; font-size: 7px; border: 1px solid #d1d5db; }
                .hsn-table thead { background-color: #f3f4f6; border-bottom: 1px solid #d1d5db; }
                .hsn-table th { padding: 3px 2px; text-align: center; font-weight: bold; color: #1f2937; border-right: 1px solid #d1d5db; }
                .hsn-table th:last-child { border-right: none; }
                .hsn-table td { padding: 3px 2px; text-align: right; border-right: 1px solid #d1d5db; border-bottom: 1px solid #d1d5db; color: #4b5563; }
                .hsn-table td:first-child { text-align: center; }
                .hsn-table tr:last-child td { border-bottom: none; }
                .hsn-table tbody tr:nth-child(even) { background-color: #f9fafb; }
                .totals-box { vertical-align: top; padding-left: 8px; }
                .totals-table { width: 100%; font-size: 8px; border: 1px solid #d1d5db; border-collapse: collapse; background: #f3f4f6; }
                .totals-table tr { border-bottom: 1px solid #d1d5db; }
                .totals-table tr:last-child { border-bottom: none; }
                .totals-table tr:nth-child(even) { background-color: #f9fafb; }
                .totals-table td { padding: 4px 6px; color: #4b5563; }
                .totals-table .label { text-align: left; width: 65%; }
                .totals-table .value { text-align: right; width: 35%; color: #1f2937; font-weight: 500; }
                .grand-total { background-color: #e5e7eb !important; font-weight: bold; }
                .grand-total td { color: #1f2937; font-weight: bold; font-size: 9px; }
                .balance-row { background-color: #fef3c7 !important; }
                .balance-row td { font-weight: bold; color: #1f2937; }
                .footer-layout { margin-top: 12px; font-size: 8px; }
                .terms-section { vertical-align: top; padding-right: 12px; color: #4b5563; line-height: 1.4; }
                .terms-section b { color: #1f2937; }
                .signature-section { vertical-align: top; text-align: center; font-size: 8px; color: #4b5563; }
                .signature-section div { color: #1f2937; }
            </style>
        </head>
        <body>
            ${renderInvoice()}
        </body>
        </html>
        `
        // Create blob and download - guaranteed perfect quality
        const blob = new Blob([printContent], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        
        const link = document.createElement('a')
        link.href = url
        link.download = `PROFORMA_INVOICE_${invoice.invoice_number}.html`
        link.click()
        
        URL.revokeObjectURL(url)

    } catch (err: any) {
        console.error('Invoice PDF Error:', err)
        throw err
    }
}

// ============ NUMBER TO WORDS ============
export function numberToWords(num: number): string {
    if (num === 0 || isNaN(num) || (num as any) === null || (num as any) === undefined) return 'Zero'

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

    const numStr = Math.floor(num).toString()
    const len = numStr.length

    if (len <= 0) return ''

    // Indian numbering system
    const convert = (n: number): string => {
        if (n === 0) return ''
        if (n < 20) return ones[n]
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '')
        if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
        if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
        return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
    }

    const result = convert(Math.floor(num))
    return result.trim().replace(/\s+/g, ' ')
}
