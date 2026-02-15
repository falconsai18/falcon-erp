import { supabase } from '@/lib/supabase'
import {
    fetchPaginated, createRecord, updateRecord, deleteRecord, generateNumber,
    type PaginationParams, type PaginatedResult,
} from './baseService'

export interface Invoice {
    id: string
    invoice_number: string
    sales_order_id: string | null
    customer_id: string
    invoice_date: string
    due_date: string | null
    status: string
    subtotal: number
    tax_amount: number
    discount_amount: number
    total_amount: number
    paid_amount: number
    balance_amount: number
    cgst_amount: number
    sgst_amount: number
    igst_amount: number
    place_of_supply: string | null
    eway_bill_number: string | null
    reverse_charge: boolean
    payment_method: string | null
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    customer_name?: string
    customer_phone?: string
    customer_gst?: string
    order_number?: string
    items?: InvoiceItem[]
}

export interface InvoiceItem {
    id?: string
    invoice_id?: string
    product_id: string
    description: string | null
    quantity: number
    unit_price: number
    discount_percent: number
    tax_rate: number
    tax_amount: number
    cgst_amount: number
    sgst_amount: number
    igst_amount: number
    total_amount: number
    hsn_code: string | null
    batch_number: string | null
    product_name?: string
    product_sku?: string
}

export interface InvoiceFormData {
    customer_id: string
    sales_order_id: string
    invoice_date: string
    due_date: string
    place_of_supply: string
    payment_method: string
    eway_bill_number: string
    reverse_charge: boolean
    notes: string
    items: InvoiceItem[]
}

export const EMPTY_INVOICE_FORM: InvoiceFormData = {
    customer_id: '',
    sales_order_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    place_of_supply: '',
    payment_method: '',
    eway_bill_number: '',
    reverse_charge: false,
    notes: '',
    items: [],
}

const SELLER_STATE = import.meta.env.VITE_SELLER_STATE || 'Maharashtra'

export function calculateInvoiceItem(item: InvoiceItem, placeOfSupply: string): InvoiceItem {
    const subtotal = item.quantity * item.unit_price
    const discountAmt = subtotal * (item.discount_percent / 100)
    const taxableAmount = subtotal - discountAmt
    const taxAmount = Math.round(taxableAmount * (item.tax_rate / 100) * 100) / 100
    const isInterstate = placeOfSupply && placeOfSupply !== SELLER_STATE

    let cgst = 0, sgst = 0, igst = 0
    if (isInterstate) {
        igst = taxAmount
    } else {
        cgst = Math.round(taxAmount / 2 * 100) / 100
        sgst = taxAmount - cgst
    }

    return {
        ...item,
        tax_amount: taxAmount,
        cgst_amount: cgst,
        sgst_amount: sgst,
        igst_amount: igst,
        total_amount: Math.round((taxableAmount + taxAmount) * 100) / 100,
    }
}

export function calculateInvoiceTotals(items: InvoiceItem[]) {
    return {
        subtotal: Math.round(items.reduce((s, i) => s + i.quantity * i.unit_price, 0) * 100) / 100,
        discount_amount: Math.round(items.reduce((s, i) => s + i.quantity * i.unit_price * i.discount_percent / 100, 0) * 100) / 100,
        tax_amount: Math.round(items.reduce((s, i) => s + i.tax_amount, 0) * 100) / 100,
        cgst_amount: Math.round(items.reduce((s, i) => s + i.cgst_amount, 0) * 100) / 100,
        sgst_amount: Math.round(items.reduce((s, i) => s + i.sgst_amount, 0) * 100) / 100,
        igst_amount: Math.round(items.reduce((s, i) => s + i.igst_amount, 0) * 100) / 100,
        total_amount: Math.round(items.reduce((s, i) => s + i.total_amount, 0) * 100) / 100,
    }
}

// ============ CRUD ============

export async function getInvoices(
    params: PaginationParams,
    filters?: { status?: string; search?: string }
): Promise<PaginatedResult<Invoice>> {
    const filterArr = []
    if (filters?.status && filters.status !== 'all') filterArr.push({ column: 'status', value: filters.status })

    const result = await fetchPaginated<Invoice>('invoices', params, {
        select: '*, customers(name, phone, gst_number), sales_orders(order_number)',
        filters: filterArr,
        search: filters?.search ? { columns: ['invoice_number'], query: filters.search } : undefined,
        orderBy: { column: 'created_at', ascending: false },
    })

    result.data = result.data.map((inv: any) => ({
        ...inv,
        customer_name: inv.customers?.name || '-',
        customer_phone: inv.customers?.phone || '-',
        customer_gst: inv.customers?.gst_number || '-',
        order_number: inv.sales_orders?.order_number || '-',
    }))

    return result
}

export async function getInvoiceById(id: string): Promise<Invoice> {
    const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(name, phone, gst_number, email), sales_orders(order_number), invoice_items(*, products(name, sku))')
        .eq('id', id)
        .single()

    if (error) throw error

    return {
        ...data,
        customer_name: data.customers?.name || '-',
        customer_phone: data.customers?.phone || '-',
        customer_gst: data.customers?.gst_number || '-',
        order_number: data.sales_orders?.order_number || '-',
        items: (data.invoice_items || []).map((item: any) => ({
            ...item,
            product_name: item.products?.name || '-',
            product_sku: item.products?.sku || '-',
        })),
    }
}

export async function createInvoiceFromSO(salesOrderId: string, placeOfSupply: string, userId?: string): Promise<Invoice> {
    // Fetch SO with items
    const { data: so, error: soError } = await supabase
        .from('sales_orders')
        .select('*, sales_order_items(*, products(name, sku, hsn_code))')
        .eq('id', salesOrderId)
        .single()

    if (soError) throw soError

    const invoiceNumber = await generateNumber('invoice')
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    const items: InvoiceItem[] = (so.sales_order_items || []).map((soItem: any) => {
        return calculateInvoiceItem({
            product_id: soItem.product_id,
            description: null,
            quantity: soItem.quantity,
            unit_price: soItem.unit_price,
            discount_percent: soItem.discount_percent || 0,
            tax_rate: soItem.tax_rate || 12,
            tax_amount: 0,
            cgst_amount: 0,
            sgst_amount: 0,
            igst_amount: 0,
            total_amount: 0,
            hsn_code: soItem.products?.hsn_code || null,
            batch_number: null,
            product_name: soItem.products?.name,
            product_sku: soItem.products?.sku,
        }, placeOfSupply)
    })

    const totals = calculateInvoiceTotals(items)

    // Create invoice
    const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .insert({
            invoice_number: invoiceNumber,
            sales_order_id: salesOrderId,
            customer_id: so.customer_id,
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
            status: 'draft',
            place_of_supply: placeOfSupply || SELLER_STATE,
            reverse_charge: false,
            paid_amount: 0,
            balance_amount: totals.total_amount,
            created_by: userId || null,
            ...totals,
        })
        .select()
        .single()

    if (invError) throw invError

    // Create items
    const invItems = items.map(item => ({
        invoice_id: invoice.id,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        cgst_amount: item.cgst_amount,
        sgst_amount: item.sgst_amount,
        igst_amount: item.igst_amount,
        total_amount: item.total_amount,
        hsn_code: item.hsn_code,
        batch_number: item.batch_number,
    }))

    const { error: itemsError } = await supabase.from('invoice_items').insert(invItems)
    if (itemsError) throw itemsError

    return invoice
}

export async function updateInvoiceStatus(id: string, status: string): Promise<void> {
    const update: any = { status, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('invoices').update(update).eq('id', id)
    if (error) throw error
}

export async function recordPayment(
    invoiceId: string,
    amount: number,
    paymentMethod: string = 'cash',
    referenceNumber?: string
): Promise<void> {
    // Get invoice details
    const { data: inv } = await supabase
        .from('invoices')
        .select('paid_amount, total_amount, customer_id, invoice_number')
        .eq('id', invoiceId)
        .single()

    if (!inv) throw new Error('Invoice not found')

    // Generate payment number
    const paymentNumber = await generateNumber('payment')

    // Insert into payments table
    const { error: payError } = await supabase.from('payments').insert({
        payment_number: paymentNumber,
        payment_type: 'received',
        customer_id: inv.customer_id,
        invoice_id: invoiceId,
        amount: amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
        reference_number: referenceNumber || null,
        notes: `Payment for ${inv.invoice_number}`,
        status: 'completed',
    })

    if (payError) throw payError

    // Update invoice amounts
    const newPaid = (inv.paid_amount || 0) + amount
    const balance = inv.total_amount - newPaid
    const status = balance <= 0 ? 'paid' : 'partial'

    const { error } = await supabase.from('invoices').update({
        paid_amount: newPaid,
        balance_amount: Math.max(balance, 0),
        status,
        updated_at: new Date().toISOString(),
    }).eq('id', invoiceId)

    if (error) throw error
}

export async function deleteInvoice(id: string): Promise<void> {
    return deleteRecord('invoices', id)
}

export async function getInvoiceStats() {
    const { data, error } = await supabase.from('invoices').select('status, total_amount, paid_amount, balance_amount')
    if (error) throw error
    const invoices = data || []
    return {
        total: invoices.length,
        draft: invoices.filter(i => i.status === 'draft').length,
        sent: invoices.filter(i => i.status === 'sent').length,
        paid: invoices.filter(i => i.status === 'paid').length,
        overdue: invoices.filter(i => i.status === 'overdue').length,
        totalValue: invoices.reduce((s, i) => s + (i.total_amount || 0), 0),
        totalPaid: invoices.reduce((s, i) => s + (i.paid_amount || 0), 0),
        totalPending: invoices.reduce((s, i) => s + (i.balance_amount || 0), 0),
    }
}

// Get confirmed sales orders that don't have invoices yet
export async function getUnbilledSalesOrders(): Promise<any[]> {
    const { data, error } = await supabase
        .from('sales_orders')
        .select('id, order_number, customer_id, total_amount, customers(name)')
        .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])
        .order('created_at', { ascending: false })

    if (error) throw error

    // Filter out orders that already have invoices
    const { data: invoicedOrders } = await supabase
        .from('invoices')
        .select('sales_order_id')
        .not('sales_order_id', 'is', null)

    const invoicedIds = new Set((invoicedOrders || []).map((i: any) => i.sales_order_id))
    return (data || []).filter((so: any) => !invoicedIds.has(so.id)).map((so: any) => ({
        ...so,
        customer_name: so.customers?.name || '-',
    }))
}
