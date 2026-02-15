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

// ============ GST INVOICE PDF ============
export async function generateInvoicePDF(invoiceId: string) {
    // Fetch invoice with items
    const { data: inv, error } = await supabase
        .from('invoices')
        .select(`
      *,
      customers(name, phone, email, gst_number, pan_number),
      sales_orders(order_number),
      invoice_items(*, products(name, sku, hsn_code, unit_of_measure))
    `)
        .eq('id', invoiceId)
        .single()

    if (error) throw error
    if (!inv) throw new Error('Invoice not found')

    // Fetch company info
    const company = await getCompanyInfo()

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 14
    let y = 15

    // ============ HEADER ============
    // Tax Invoice title
    doc.setFillColor(245, 158, 11) // amber-500
    doc.rect(0, 0, pageWidth, 32, 'F')

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('TAX INVOICE', margin, 15)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(inv.invoice_number, margin, 22)

    // Status badge
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    const statusText = (inv.status || 'draft').toUpperCase()
    const statusWidth = doc.getTextWidth(statusText) + 10
    let r = 239, g = 68, b = 0
    if (inv.status === 'paid') {
        r = 34; g = 197; b = 94
    } else if (inv.status === 'partial') {
        r = 234; g = 179; b = 8
    }
    doc.setFillColor(r, g, b)
    doc.roundedRect(pageWidth - margin - statusWidth, 8, statusWidth, 8, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7)
    doc.text(statusText, pageWidth - margin - statusWidth / 2, 13, { align: 'center' })

    // Invoice date / Due date on right
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`Date: ${formatDate(inv.invoice_date)}`, pageWidth - margin, 20, { align: 'right' })
    if (inv.due_date) {
        doc.text(`Due: ${formatDate(inv.due_date)}`, pageWidth - margin, 25, { align: 'right' })
    }
    if (inv.sales_orders?.order_number) {
        doc.text(`SO: ${inv.sales_orders.order_number}`, pageWidth - margin, 30, { align: 'right' })
    }

    y = 40

    // ============ SELLER & BUYER ============
    const colWidth = (pageWidth - margin * 2 - 10) / 2

    // Seller box
    doc.setFillColor(249, 250, 251)
    doc.roundedRect(margin, y, colWidth, 42, 2, 2, 'F')
    doc.setDrawColor(229, 231, 235)
    doc.roundedRect(margin, y, colWidth, 42, 2, 2, 'S')

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(107, 114, 128)
    doc.text('FROM', margin + 4, y + 6)

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.text(company?.name || 'Your Company', margin + 4, y + 13)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(75, 85, 99)
    let sellerY = y + 19
    if (company?.address_line1) { doc.text(company.address_line1, margin + 4, sellerY); sellerY += 4 }
    if (company?.city || company?.state) { doc.text(`${company?.city || ''}, ${company?.state || ''} ${company?.pincode || ''}`.trim(), margin + 4, sellerY); sellerY += 4 }
    if (company?.gst_number) { doc.text(`GSTIN: ${company.gst_number}`, margin + 4, sellerY); sellerY += 4 }
    if (company?.phone) { doc.text(`Phone: ${company.phone}`, margin + 4, sellerY); sellerY += 4 }

    // Buyer box
    const buyerX = margin + colWidth + 10
    doc.setFillColor(249, 250, 251)
    doc.roundedRect(buyerX, y, colWidth, 42, 2, 2, 'F')
    doc.setDrawColor(229, 231, 235)
    doc.roundedRect(buyerX, y, colWidth, 42, 2, 2, 'S')

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(107, 114, 128)
    doc.text('BILL TO', buyerX + 4, y + 6)

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.text(inv.customers?.name || 'Customer', buyerX + 4, y + 13)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(75, 85, 99)
    let buyerY = y + 19
    if (inv.customers?.phone) { doc.text(`Phone: ${inv.customers.phone}`, buyerX + 4, buyerY); buyerY += 4 }
    if (inv.customers?.email) { doc.text(`Email: ${inv.customers.email}`, buyerX + 4, buyerY); buyerY += 4 }
    if (inv.customers?.gst_number) { doc.text(`GSTIN: ${inv.customers.gst_number}`, buyerX + 4, buyerY); buyerY += 4 }
    if (inv.place_of_supply) { doc.text(`Place of Supply: ${inv.place_of_supply}`, buyerX + 4, buyerY); buyerY += 4 }

    y += 50

    // ============ ITEMS TABLE ============
    const items = inv.invoice_items || []
    const isInterstate = inv.igst_amount > 0

    const tableHeaders = isInterstate
        ? [['#', 'Product', 'HSN', 'Qty', 'Rate', 'Disc%', 'Taxable', 'IGST%', 'IGST', 'Total']]
        : [['#', 'Product', 'HSN', 'Qty', 'Rate', 'Disc%', 'Taxable', 'CGST', 'SGST', 'Total']]

    const tableData = items.map((item: any, idx: number) => {
        const subtotal = item.quantity * item.unit_price
        const discount = subtotal * (item.discount_percent || 0) / 100
        const taxable = subtotal - discount

        if (isInterstate) {
            return [
                idx + 1,
                item.products?.name || item.description || '-',
                item.hsn_code || item.products?.hsn_code || '-',
                item.quantity,
                `₹${item.unit_price.toFixed(2)}`,
                `${item.discount_percent || 0}%`,
                `₹${taxable.toFixed(2)}`,
                `${item.tax_rate || 0}%`,
                `₹${(item.igst_amount || 0).toFixed(2)}`,
                `₹${item.total_amount.toFixed(2)}`,
            ]
        } else {
            return [
                idx + 1,
                item.products?.name || item.description || '-',
                item.hsn_code || item.products?.hsn_code || '-',
                item.quantity,
                `₹${item.unit_price.toFixed(2)}`,
                `${item.discount_percent || 0}%`,
                `₹${taxable.toFixed(2)}`,
                `₹${(item.cgst_amount || 0).toFixed(2)}`,
                `₹${(item.sgst_amount || 0).toFixed(2)}`,
                `₹${item.total_amount.toFixed(2)}`,
            ]
        }
    })

    autoTable(doc, {
        startY: y,
        head: tableHeaders,
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [245, 158, 11],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 7,
            halign: 'center',
        },
        bodyStyles: {
            fontSize: 7,
            textColor: [55, 65, 81],
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 8 },
            1: { cellWidth: 40 },
            2: { halign: 'center', cellWidth: 16 },
            3: { halign: 'center', cellWidth: 12 },
            4: { halign: 'right', cellWidth: 18 },
            5: { halign: 'center', cellWidth: 12 },
            6: { halign: 'right', cellWidth: 20 },
            7: { halign: 'right', cellWidth: 16 },
            8: { halign: 'right', cellWidth: 16 },
            9: { halign: 'right', cellWidth: 22 },
        },
        margin: { left: margin, right: margin },
        didDrawPage: () => {
            // Footer on each page
            doc.setFontSize(7)
            doc.setTextColor(156, 163, 175)
            doc.text('Computer generated invoice', pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })
        },
    })

    // Get Y after table
    y = (doc as any).lastAutoTable.finalY + 8

    // ============ TOTALS SECTION ============
    const totalsX = pageWidth - margin - 80
    const totalsWidth = 80

    doc.setFillColor(249, 250, 251)
    doc.roundedRect(totalsX, y, totalsWidth, isInterstate ? 48 : 52, 2, 2, 'F')

    doc.setFontSize(8)
    doc.setTextColor(75, 85, 99)
    let tY = y + 7

    const addTotalRow = (label: string, value: string, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        if (bold) doc.setTextColor(0, 0, 0)
        else doc.setTextColor(75, 85, 99)
        doc.text(label, totalsX + 4, tY)
        doc.text(value, totalsX + totalsWidth - 4, tY, { align: 'right' })
        tY += 6
    }

    addTotalRow('Subtotal', `₹${(inv.subtotal || 0).toFixed(2)}`)
    if (inv.discount_amount > 0) addTotalRow('Discount', `-₹${(inv.discount_amount || 0).toFixed(2)}`)

    if (isInterstate) {
        addTotalRow('IGST', `₹${(inv.igst_amount || 0).toFixed(2)}`)
    } else {
        addTotalRow('CGST', `₹${(inv.cgst_amount || 0).toFixed(2)}`)
        addTotalRow('SGST', `₹${(inv.sgst_amount || 0).toFixed(2)}`)
    }

    // Separator line
    doc.setDrawColor(209, 213, 219)
    doc.line(totalsX + 4, tY - 3, totalsX + totalsWidth - 4, tY - 3)

    doc.setFontSize(10)
    addTotalRow('TOTAL', `₹${(inv.total_amount || 0).toFixed(2)}`, true)

    if (inv.paid_amount > 0) {
        doc.setFontSize(8)
        addTotalRow('Paid', `₹${(inv.paid_amount || 0).toFixed(2)}`)
        addTotalRow('Balance', `₹${(inv.balance_amount || 0).toFixed(2)}`, true)
    }

    // ============ AMOUNT IN WORDS ============
    y = (doc as any).lastAutoTable.finalY + 8
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(107, 114, 128)
    doc.text(`Amount in words: ${numberToWords(inv.total_amount)} Rupees Only`, margin, y + 4)

    // ============ BANK DETAILS ============
    const bankY = y + 12
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(107, 114, 128)
    doc.text('BANK DETAILS', margin, bankY)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(75, 85, 99)

    // Fetch bank details
    const { data: bank } = await supabase.from('bank_accounts').select('*').eq('is_default', true).limit(1).single()

    if (bank) {
        doc.text(`Bank: ${bank.bank_name || '-'}`, margin, bankY + 5)
        doc.text(`A/C: ${bank.account_number || '-'}`, margin, bankY + 9)
        doc.text(`IFSC: ${bank.ifsc_code || '-'}`, margin, bankY + 13)
        doc.text(`Branch: ${bank.branch || '-'}`, margin, bankY + 17)
    }

    // ============ NOTES ============
    if (inv.notes) {
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(107, 114, 128)
        doc.text(`Notes: ${inv.notes}`, margin, bankY + 24)
    }

    // ============ E-WAY BILL ============
    if (inv.eway_bill_number) {
        doc.setFontSize(7)
        doc.text(`E-Way Bill: ${inv.eway_bill_number}`, margin, bankY + 29)
    }

    // ============ INVOICE FOOTER (from settings) ============
    const { data: footerSetting } = await supabase.from('settings').select('value').eq('key', 'invoice_footer').single()
    if (footerSetting?.value) {
        const footerText = typeof footerSetting.value === 'string' ? footerSetting.value : String(footerSetting.value).replace(/^"|"$/g, '')
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(107, 114, 128)
        doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' })
    }

    // ============ SIGNATURE AREA ============
    doc.setDrawColor(209, 213, 219)
    doc.line(pageWidth - margin - 50, doc.internal.pageSize.getHeight() - 30, pageWidth - margin, doc.internal.pageSize.getHeight() - 30)
    doc.setFontSize(7)
    doc.setTextColor(107, 114, 128)
    doc.text('Authorized Signatory', pageWidth - margin - 25, doc.internal.pageSize.getHeight() - 25, { align: 'center' })

    // Save
    doc.save(`${inv.invoice_number}.pdf`)
    return true
}

// ============ NUMBER TO WORDS ============
function numberToWords(num: number): string {
    if (num === 0) return 'Zero'

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

    return convert(Math.floor(num))
}
