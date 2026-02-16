import { supabase } from '@/lib/supabase'
import {
    fetchPaginated, createRecord, updateRecord, deleteRecord, generateNumber,
    type PaginationParams, type PaginatedResult,
} from './baseService'

export interface QuotationItem {
    id?: string
    quotation_id?: string
    product_id: string
    quantity: number
    unit_price: number
    discount_percent: number
    tax_rate: number
    tax_amount: number
    total_amount: number
    product_name?: string
    product_sku?: string
}

export interface Quotation {
    id: string
    quotation_number: string
    customer_id: string
    quotation_date: string
    valid_until: string | null
    status: string  // draft, sent, accepted, rejected, expired, converted
    subtotal: number
    tax_amount: number
    discount_amount: number
    total_amount: number
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    customer_name?: string
    customer_phone?: string
    customer_gst?: string
    items?: QuotationItem[]
    item_count?: number
    sales_order_id?: string | null
}

export interface QuotationFormData {
    customer_id: string
    quotation_date: string
    valid_until: string
    notes: string
    items: QuotationItem[]
}

export const EMPTY_QUOTATION_FORM: QuotationFormData = {
    customer_id: '',
    quotation_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    items: [],
}

export const QUOTATION_STATUSES = [
    { value: 'draft', label: 'Draft', color: 'default' },
    { value: 'sent', label: 'Sent', color: 'info' },
    { value: 'accepted', label: 'Accepted', color: 'success' },
    { value: 'rejected', label: 'Rejected', color: 'danger' },
    { value: 'expired', label: 'Expired', color: 'warning' },
    { value: 'converted', label: 'Converted', color: 'purple' },
]

// ============ CALCULATIONS ============
export function calculateQuotationItem(item: QuotationItem): QuotationItem {
    const subtotal = item.quantity * item.unit_price
    const discountAmt = subtotal * (item.discount_percent / 100)
    const taxableAmount = subtotal - discountAmt
    const taxAmount = Math.round(taxableAmount * (item.tax_rate / 100) * 100) / 100
    const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100

    return { ...item, tax_amount: taxAmount, total_amount: totalAmount }
}

export function calculateQuotationTotals(items: QuotationItem[]) {
    const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0)
    const discountAmount = items.reduce((sum, i) => sum + (i.quantity * i.unit_price * i.discount_percent / 100), 0)
    const taxAmount = items.reduce((sum, i) => sum + i.tax_amount, 0)
    const totalAmount = items.reduce((sum, i) => sum + i.total_amount, 0)

    return {
        subtotal: Math.round(subtotal * 100) / 100,
        discount_amount: Math.round(discountAmount * 100) / 100,
        tax_amount: Math.round(taxAmount * 100) / 100,
        total_amount: Math.round(totalAmount * 100) / 100,
    }
}

// ============ CRUD ============
export async function getQuotations(
    params: PaginationParams,
    filters?: { status?: string; search?: string }
): Promise<PaginatedResult<Quotation>> {
    const filterArr = []
    if (filters?.status && filters.status !== 'all') filterArr.push({ column: 'status', value: filters.status })

    const result = await fetchPaginated<Quotation>('quotations', params, {
        select: '*, customers(name, phone, gst_number)',
        filters: filterArr,
        search: filters?.search ? { columns: ['quotation_number'], query: filters.search } : undefined,
        orderBy: { column: 'created_at', ascending: false },
    })

    result.data = result.data.map((q: any) => ({
        ...q,
        customer_name: q.customers?.name || '-',
        customer_phone: q.customers?.phone || '-',
        customer_gst: q.customers?.gst_number || '-',
    }))

    return result
}

export async function getQuotationById(id: string): Promise<Quotation> {
    const { data, error } = await supabase
        .from('quotations')
        .select('*, customers(name, phone, gst_number), quotation_items(*, products(name, sku))')
        .eq('id', id)
        .single()

    if (error) throw error

    return {
        ...data,
        customer_name: data.customers?.name || '-',
        customer_phone: data.customers?.phone || '-',
        customer_gst: data.customers?.gst_number || '-',
        items: (data.quotation_items || []).map((item: any) => ({
            ...item,
            product_name: item.products?.name || '-',
            product_sku: item.products?.sku || '-',
        })),
        item_count: data.quotation_items?.length || 0,
    }
}

export async function createQuotation(data: QuotationFormData, userId?: string): Promise<Quotation> {
    // Generate quotation number
    const quotationNumber = await generateNumber('quotation')
    const totals = calculateQuotationTotals(data.items)

    // Create quotation
    const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .insert({
            quotation_number: quotationNumber,
            customer_id: data.customer_id,
            quotation_date: data.quotation_date,
            valid_until: data.valid_until || null,
            status: 'draft',
            notes: data.notes || null,
            created_by: userId || null,
            ...totals,
        })
        .select()
        .single()

    if (quotationError) throw quotationError

    // Create line items
    if (data.items.length > 0) {
        const items = data.items.map(item => ({
            quotation_id: quotation.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent,
            tax_rate: item.tax_rate,
            tax_amount: item.tax_amount,
            total_amount: item.total_amount,
        }))

        const { error: itemsError } = await supabase
            .from('quotation_items')
            .insert(items)

        if (itemsError) throw itemsError
    }

    return quotation
}

export async function updateQuotation(id: string, data: QuotationFormData): Promise<Quotation> {
    const totals = calculateQuotationTotals(data.items)

    // Update quotation
    const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .update({
            customer_id: data.customer_id,
            quotation_date: data.quotation_date,
            valid_until: data.valid_until || null,
            notes: data.notes || null,
            ...totals,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

    if (quotationError) throw quotationError

    // Delete old items
    await supabase.from('quotation_items').delete().eq('quotation_id', id)

    // Create new items
    if (data.items.length > 0) {
        const items = data.items.map(item => ({
            quotation_id: id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent,
            tax_rate: item.tax_rate,
            tax_amount: item.tax_amount,
            total_amount: item.total_amount,
        }))

        const { error: itemsError } = await supabase
            .from('quotation_items')
            .insert(items)

        if (itemsError) throw itemsError
    }

    return quotation
}

export async function deleteQuotation(id: string): Promise<void> {
    // Items auto-delete via CASCADE
    return deleteRecord('quotations', id)
}

export async function updateQuotationStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
        .from('quotations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)

    if (error) throw error
}

// ============ CONVERT TO SALES ORDER ============
export async function convertToSalesOrder(quotationId: string, userId?: string): Promise<any> {
    // Fetch quotation with items
    const quotation = await getQuotationById(quotationId)

    if (quotation.status !== 'accepted') {
        throw new Error('Only accepted quotations can be converted to sales orders')
    }

    if (quotation.sales_order_id) {
        throw new Error('This quotation has already been converted')
    }

    // Generate sales order number
    const orderNumber = await generateNumber('sales_order')

    // Create sales order
    const { data: salesOrder, error: soError } = await supabase
        .from('sales_orders')
        .insert({
            order_number: orderNumber,
            customer_id: quotation.customer_id,
            order_date: new Date().toISOString().split('T')[0],
            delivery_date: null,
            status: 'draft',
            payment_status: 'unpaid',
            subtotal: quotation.subtotal,
            tax_amount: quotation.tax_amount,
            discount_amount: quotation.discount_amount,
            total_amount: quotation.total_amount,
            notes: quotation.notes || null,
            created_by: userId || null,
        })
        .select()
        .single()

    if (soError) throw soError

    // Create sales order items
    if (quotation.items && quotation.items.length > 0) {
        const items = quotation.items.map(item => ({
            sales_order_id: salesOrder.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent,
            tax_rate: item.tax_rate,
            tax_amount: item.tax_amount,
            total_amount: item.total_amount,
        }))

        const { error: itemsError } = await supabase
            .from('sales_order_items')
            .insert(items)

        if (itemsError) throw itemsError
    }

    // Update quotation status to converted
    await supabase
        .from('quotations')
        .update({ 
            status: 'converted', 
            sales_order_id: salesOrder.id,
            updated_at: new Date().toISOString() 
        })
        .eq('id', quotationId)

    return salesOrder
}

// ============ STATS ============
export async function getQuotationStats() {
    const { data, error } = await supabase.from('quotations').select('status, total_amount')
    if (error) throw error
    const quotations = data || []
    return {
        total: quotations.length,
        draft: quotations.filter(q => q.status === 'draft').length,
        sent: quotations.filter(q => q.status === 'sent').length,
        accepted: quotations.filter(q => q.status === 'accepted').length,
        rejected: quotations.filter(q => q.status === 'rejected').length,
        expired: quotations.filter(q => q.status === 'expired').length,
        converted: quotations.filter(q => q.status === 'converted').length,
        totalValue: quotations.reduce((sum, q) => sum + (q.total_amount || 0), 0),
    }
}
