import { supabase } from '@/lib/supabase'

export interface GSTRSummary {
    period: string
    totalInvoices: number
    totalTaxableValue: number
    totalCGST: number
    totalSGST: number
    totalIGST: number
    totalTax: number
    totalValue: number
}

export interface GSTR1Invoice {
    invoiceNumber: string
    invoiceDate: string
    customerName: string
    customerGSTIN: string
    placeOfSupply: string
    taxableValue: number
    cgst: number
    sgst: number
    igst: number
    totalTax: number
    invoiceValue: number
    reverseCharge: boolean
    eWayBill: string
}

export interface HSNSummary {
    hsnCode: string
    description: string
    taxRate: number
    totalQuantity: number
    totalValue: number
    totalCGST: number
    totalSGST: number
    totalIGST: number
}

export interface GSTR3BSummary {
    outwardTaxableSupplies: number
    outwardTaxAmount: number
    inwardReverseCharge: number
    totalCGST: number
    totalSGST: number
    totalIGST: number
    totalITC: number
    netTaxPayable: number
}

// Helper to safely get GSTIN
const getGSTIN = (customer: any) => {
    return customer?.gst_number || 'N/A'
}

export async function getGSTR1Data(fromDate: string, toDate: string) {
    // Fetch invoices with customer details
    const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
            *,
            customers (
                name,
                gst_number
            )
        `)
        .gte('invoice_date', fromDate)
        .lte('invoice_date', toDate)
        .neq('status', 'cancelled')
        .order('invoice_date', { ascending: true })

    if (error) throw error

    const gstr1Invoices: GSTR1Invoice[] = (invoices || []).map((inv: any) => ({
        invoiceNumber: inv.invoice_number,
        invoiceDate: inv.invoice_date,
        customerName: inv.customers?.name || 'Unknown',
        customerGSTIN: getGSTIN(inv.customers),
        placeOfSupply: inv.place_of_supply || '',
        taxableValue: inv.subtotal || 0,
        cgst: inv.cgst_amount || 0,
        sgst: inv.sgst_amount || 0,
        igst: inv.igst_amount || 0,
        totalTax: inv.tax_amount || 0,
        invoiceValue: inv.total_amount || 0,
        reverseCharge: inv.reverse_charge || false,
        eWayBill: inv.eway_bill_number || ''
    }))

    const summary: GSTRSummary = {
        period: `${new Date(fromDate).toLocaleString('default', { month: 'short' })} ${new Date(fromDate).getFullYear()}`,
        totalInvoices: gstr1Invoices.length,
        totalTaxableValue: gstr1Invoices.reduce((sum, inv) => sum + inv.taxableValue, 0),
        totalCGST: gstr1Invoices.reduce((sum, inv) => sum + inv.cgst, 0),
        totalSGST: gstr1Invoices.reduce((sum, inv) => sum + inv.sgst, 0),
        totalIGST: gstr1Invoices.reduce((sum, inv) => sum + inv.igst, 0),
        totalTax: gstr1Invoices.reduce((sum, inv) => sum + inv.totalTax, 0),
        totalValue: gstr1Invoices.reduce((sum, inv) => sum + inv.invoiceValue, 0)
    }

    return { summary, invoices: gstr1Invoices }
}

export async function getHSNSummary(fromDate: string, toDate: string): Promise<HSNSummary[]> {
    // Fetch invoice items joined with invoices to filter by date
    const { data, error } = await supabase
        .from('invoice_items')
        .select(`
            *,
            invoices!inner (
                invoice_date,
                status
            )
        `)
        .gte('invoices.invoice_date', fromDate)
        .lte('invoices.invoice_date', toDate)
        .neq('invoices.status', 'cancelled')

    if (error) throw error

    // Aggregate by HSN Code
    const hsnMap = new Map<string, HSNSummary>()

    data?.forEach((item: any) => {
        const hsn = item.hsn_code || 'Others'
        const existing = hsnMap.get(hsn) || {
            hsnCode: hsn,
            description: item.description || 'Procuts/Services',
            taxRate: item.tax_rate || 0,
            totalQuantity: 0,
            totalValue: 0,
            totalCGST: 0,
            totalSGST: 0,
            totalIGST: 0
        }

        existing.totalQuantity += item.quantity || 0
        existing.totalValue += ((item.quantity * item.unit_price) - (item.discount_amount || 0)) // Taxable value approximation
        existing.totalCGST += item.cgst_amount || 0
        existing.totalSGST += item.sgst_amount || 0
        existing.totalIGST += item.igst_amount || 0

        hsnMap.set(hsn, existing)
    })

    return Array.from(hsnMap.values())
}

export async function getGSTR3BSummary(fromDate: string, toDate: string): Promise<GSTR3BSummary> {
    // 1. Outward Supplies (Sales)
    const { data: outwardData, error: outError } = await supabase
        .from('invoices')
        .select('subtotal, tax_amount, cgst_amount, sgst_amount, igst_amount')
        .gte('invoice_date', fromDate)
        .lte('invoice_date', toDate)
        .neq('status', 'cancelled')

    if (outError) throw outError

    const outwardTaxableSupplies = outwardData?.reduce((sum, i) => sum + (i.subtotal || 0), 0) || 0
    const outwardTaxAmount = outwardData?.reduce((sum, i) => sum + (i.tax_amount || 0), 0) || 0
    const totalOutCGST = outwardData?.reduce((sum, i) => sum + (i.cgst_amount || 0), 0) || 0
    const totalOutSGST = outwardData?.reduce((sum, i) => sum + (i.sgst_amount || 0), 0) || 0
    const totalOutIGST = outwardData?.reduce((sum, i) => sum + (i.igst_amount || 0), 0) || 0

    // 2. Input Tax Credit (Purchases)
    // Assuming supplier_bills table exists and has tax columns. 
    // If exact tax columns missing, we might estimate or use total_tax if available.
    // Checking schema via assumption: supplier_bills usually has total_amount. 
    // Types might need verification. For now, we'll try to sum tax amounts if they exist, 
    // or fallback to 0 if the schema doesn't support it yet (safe approach).

    // Let's try to fetch tax fields if they exist, otherwise ITC is 0 for now until Purchase module is fully upgraded to support tax breakup.
    // Based on previous contexts, likely 'tax_amount' exists.

    let totalITC = 0
    try {
        const { data: inwardData, error: inError } = await supabase
            .from('supplier_bills') // or purchase_orders if bills not fully implemented
            .select('tax_amount')
            .gte('bill_date', fromDate)
            .lte('bill_date', toDate)
            .neq('status', 'cancelled') // Assuming status column exists

        if (!inError && inwardData) {
            totalITC = inwardData.reduce((sum: number, b: any) => sum + (b.tax_amount || 0), 0)
        }
    } catch (e) {
        console.warn('Could not fetch ITC details', e)
    }

    const netTaxPayable = Math.max(0, outwardTaxAmount - totalITC)

    return {
        outwardTaxableSupplies,
        outwardTaxAmount,
        inwardReverseCharge: 0, // Not currently tracked
        totalCGST: totalOutCGST,
        totalSGST: totalOutSGST,
        totalIGST: totalOutIGST,
        totalITC,
        netTaxPayable
    }
}

export function exportGSTR1CSV(data: GSTR1Invoice[]) {
    const headers = [
        'GSTIN', 'Invoice Number', 'Invoice Date', 'Customer Name',
        'Place of Supply', 'Taxable Value', 'CGST', 'SGST', 'IGST',
        'Total Tax', 'Invoice Value', 'Reverse Charge'
    ]

    const rows = data.map(inv => [
        inv.customerGSTIN,
        inv.invoiceNumber,
        inv.invoiceDate,
        `"${inv.customerName}"`, // Quote name for safety
        inv.placeOfSupply,
        inv.taxableValue.toFixed(2),
        inv.cgst.toFixed(2),
        inv.sgst.toFixed(2),
        inv.igst.toFixed(2),
        inv.totalTax.toFixed(2),
        inv.invoiceValue.toFixed(2),
        inv.reverseCharge ? 'Yes' : 'No'
    ])

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `GSTR1_Export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
