import { supabase } from '@/lib/supabase'
import {
    fetchPaginated, createRecord, updateRecord, deleteRecord, generateNumber,
    type PaginationParams, type PaginatedResult,
} from './baseService'

export interface CreditNoteItem {
    id?: string
    credit_note_id?: string
    product_id: string
    quantity: number
    unit_price: number
    tax_rate: number
    tax_amount: number
    total_amount: number
    return_to_inventory: boolean
    batch_number: string
    product_name?: string
    product_sku?: string
}

export interface CreditNote {
    id: string
    credit_note_number: string
    invoice_id: string
    customer_id: string
    issue_date: string
    reason: string
    subtotal: number
    tax_amount: number
    total_amount: number
    status: string  // draft, approved, cancelled
    created_by: string | null
    created_at: string
    invoice_number?: string
    customer_name?: string
    customer_phone?: string
    customer_gst?: string
    items?: CreditNoteItem[]
    item_count?: number
}

export interface CreditNoteFormData {
    invoice_id: string
    issue_date: string
    reason: string
    items: CreditNoteItem[]
}

export const EMPTY_CN_FORM: CreditNoteFormData = {
    invoice_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    reason: '',
    items: [],
}

export const CN_STATUSES = [
    { value: 'draft', label: 'Draft', color: 'default' },
    { value: 'approved', label: 'Approved', color: 'success' },
    { value: 'cancelled', label: 'Cancelled', color: 'danger' },
]

// ============ CALCULATIONS ============
export function calculateCNItem(item: CreditNoteItem): CreditNoteItem {
    const subtotal = item.quantity * item.unit_price
    const taxAmount = Math.round(subtotal * (item.tax_rate / 100) * 100) / 100
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100

    return { ...item, tax_amount: taxAmount, total_amount: totalAmount }
}

export function calculateCNTotals(items: CreditNoteItem[]) {
    const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0)
    const taxAmount = items.reduce((sum, i) => sum + i.tax_amount, 0)
    const totalAmount = items.reduce((sum, i) => sum + i.total_amount, 0)

    return {
        subtotal: Math.round(subtotal * 100) / 100,
        tax_amount: Math.round(taxAmount * 100) / 100,
        total_amount: Math.round(totalAmount * 100) / 100,
    }
}

// ============ CRUD ============
export async function getCreditNotes(
    params: PaginationParams,
    filters?: { status?: string; search?: string }
): Promise<PaginatedResult<CreditNote>> {
    const filterArr = []
    if (filters?.status && filters.status !== 'all') filterArr.push({ column: 'status', value: filters.status })

    const result = await fetchPaginated<CreditNote>('credit_notes', params, {
        select: '*, invoices(invoice_number, customer_id), customers(name, phone, gst_number)',
        filters: filterArr,
        search: filters?.search ? { columns: ['credit_note_number'], query: filters.search } : undefined,
        orderBy: { column: 'created_at', ascending: false },
    })

    result.data = result.data.map((cn: any) => ({
        ...cn,
        invoice_number: cn.invoices?.invoice_number || '-',
        customer_id: cn.invoices?.customer_id || cn.customer_id,
        customer_name: cn.customers?.name || '-',
        customer_phone: cn.customers?.phone || '-',
        customer_gst: cn.customers?.gst_number || '-',
    }))

    return result
}

export async function getCreditNoteById(id: string): Promise<CreditNote> {
    const { data, error } = await supabase
        .from('credit_notes')
        .select('*, invoices(invoice_number, customer_id), customers(name, phone, gst_number), credit_note_items(*, products(name, sku))')
        .eq('id', id)
        .single()

    if (error) throw error

    return {
        ...data,
        invoice_number: data.invoices?.invoice_number || '-',
        customer_id: data.invoices?.customer_id || data.customer_id,
        customer_name: data.customers?.name || '-',
        customer_phone: data.customers?.phone || '-',
        customer_gst: data.customers?.gst_number || '-',
        items: (data.credit_note_items || []).map((item: any) => ({
            ...item,
            product_name: item.products?.name || '-',
            product_sku: item.products?.sku || '-',
        })),
        item_count: data.credit_note_items?.length || 0,
    }
}

export async function createCreditNote(data: CreditNoteFormData, userId?: string): Promise<CreditNote> {
    // Get invoice details to get customer_id
    const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .select('customer_id')
        .eq('id', data.invoice_id)
        .single()
    
    if (invError) throw invError

    // Generate credit note number
    const cnNumber = await generateNumber('credit_note')
    const totals = calculateCNTotals(data.items)

    // Create credit note
    const { data: cn, error: cnError } = await supabase
        .from('credit_notes')
        .insert({
            credit_note_number: cnNumber,
            invoice_id: data.invoice_id,
            customer_id: invoice.customer_id,
            issue_date: data.issue_date,
            reason: data.reason,
            status: 'draft',
            created_by: userId || null,
            ...totals,
        })
        .select()
        .single()

    if (cnError) throw cnError

    // Create credit note items
    if (data.items.length > 0) {
        const items = data.items.map(item => ({
            credit_note_id: cn.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            tax_amount: item.tax_amount,
            total_amount: item.total_amount,
            return_to_inventory: item.return_to_inventory,
            batch_number: item.batch_number || null,
        }))

        const { error: itemsError } = await supabase
            .from('credit_note_items')
            .insert(items)

        if (itemsError) throw itemsError
    }

    return cn
}

export async function deleteCreditNote(id: string): Promise<void> {
    // Items auto-delete via CASCADE
    return deleteRecord('credit_notes', id)
}

export async function updateCreditNoteStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
        .from('credit_notes')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)

    if (error) throw error
}

// ============ APPROVE CREDIT NOTE ============
export async function approveCreditNote(id: string, userId?: string): Promise<void> {
    const cn = await getCreditNoteById(id)
    
    if (cn.status !== 'draft') {
        throw new Error('Only draft credit notes can be approved')
    }

    // Update credit note status
    const { error: cnError } = await supabase
        .from('credit_notes')
        .update({ 
            status: 'approved', 
            updated_at: new Date().toISOString() 
        })
        .eq('id', id)

    if (cnError) throw cnError

    // Process items - return to inventory if requested
    for (const item of cn.items || []) {
        if (item.return_to_inventory && item.quantity > 0) {
            // Check if inventory record exists
            const { data: existingInv, error: invCheckError } = await supabase
                .from('inventory')
                .select('id, quantity')
                .eq('product_id', item.product_id)
                .eq('batch_number', item.batch_number || 'DEFAULT')
                .maybeSingle()

            if (existingInv) {
                // Update existing
                await supabase
                    .from('inventory')
                    .update({ 
                        quantity: existingInv.quantity + item.quantity,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingInv.id)
            } else {
                // Create new inventory record
                await supabase
                    .from('inventory')
                    .insert({
                        product_id: item.product_id,
                        quantity: item.quantity,
                        batch_number: item.batch_number || null,
                        status: 'available',
                    })
            }

            // Create inventory movement
            await supabase
                .from('inventory_movements')
                .insert({
                    product_id: item.product_id,
                    movement_type: 'credit_note_return',
                    quantity: item.quantity,
                    reference_type: 'credit_note',
                    reference_id: id,
                    notes: `Credit Note ${cn.credit_note_number} - ${item.batch_number || 'No batch'}`,
                    created_by: userId || null,
                })
        }
    }

    // Update invoice amounts
    const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .select('paid_amount, total_amount, balance_amount, status')
        .eq('id', cn.invoice_id)
        .single()

    if (invError) throw invError

    const newPaidAmount = (invoice.paid_amount || 0) - cn.total_amount
    const newBalanceAmount = (invoice.total_amount || 0) - newPaidAmount
    
    // Determine new status
    let newStatus = invoice.status
    if (newBalanceAmount <= 0) {
        newStatus = 'paid'
    } else if (newPaidAmount > 0) {
        newStatus = 'partial'
    } else {
        newStatus = 'unpaid'
    }

    await supabase
        .from('invoices')
        .update({ 
            paid_amount: Math.max(0, newPaidAmount),
            balance_amount: Math.max(0, newBalanceAmount),
            status: newStatus,
            updated_at: new Date().toISOString()
        })
        .eq('id', cn.invoice_id)
}

// ============ GET ELIGIBLE INVOICES ============
export async function getInvoicesForCreditNote(): Promise<{ id: string; invoice_number: string; customer_name: string; total_amount: number; paid_amount: number }[]> {
    const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, customers(name), total_amount, paid_amount')
        .in('status', ['paid', 'partial'])
        .order('created_at', { ascending: false })

    if (error) throw error

    return (data || [])
        .filter((inv: any) => inv.customers)
        .map((inv: any) => ({
            id: inv.id,
            invoice_number: inv.invoice_number,
            customer_name: inv.customers?.name || '-',
            total_amount: inv.total_amount,
            paid_amount: inv.paid_amount || 0,
        }))
}

// ============ GET INVOICE ITEMS FOR CN ============
export async function getInvoiceItemsForCN(invoiceId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('invoice_items')
        .select('*, products(name, sku)')
        .eq('invoice_id', invoiceId)

    if (error) throw error

    return (data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.products?.name || '-',
        product_sku: item.products?.sku || '-',
        max_quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        hsn_code: item.hsn_code,
        batch_number: item.batch_number,
    }))
}

// ============ STATS ============
export async function getCreditNoteStats() {
    const { data, error } = await supabase.from('credit_notes').select('status, total_amount')
    if (error) throw error
    const creditNotes = data || []
    return {
        total: creditNotes.length,
        draft: creditNotes.filter(cn => cn.status === 'draft').length,
        approved: creditNotes.filter(cn => cn.status === 'approved').length,
        cancelled: creditNotes.filter(cn => cn.status === 'cancelled').length,
        totalValue: creditNotes.reduce((sum, cn) => sum + (cn.total_amount || 0), 0),
    }
}
