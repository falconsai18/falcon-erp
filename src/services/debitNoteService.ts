import { supabase } from '@/lib/supabase'
import {
    fetchPaginated, createRecord, updateRecord, deleteRecord, generateNumber,
    type PaginationParams, type PaginatedResult,
} from './baseService'

export interface DebitNoteItem {
    id?: string
    debit_note_id?: string
    raw_material_id: string | null
    product_id: string | null
    quantity: number
    unit_price: number
    tax_rate: number
    tax_amount: number
    total_amount: number
    material_name?: string
    product_name?: string
    material_code?: string
    product_sku?: string
    unit_of_measure?: string
}

export interface DebitNote {
    id: string
    debit_note_number: string
    purchase_order_id: string
    supplier_id: string
    issue_date: string
    reason: string
    subtotal: number
    tax_amount: number
    total_amount: number
    status: string  // draft, approved, cancelled
    created_by: string | null
    created_at: string
    po_number?: string
    supplier_name?: string
    supplier_phone?: string
    supplier_gst?: string
    items?: DebitNoteItem[]
    item_count?: number
}

export interface DebitNoteFormData {
    purchase_order_id: string
    issue_date: string
    reason: string
    items: DebitNoteItem[]
}

export const EMPTY_DN_FORM: DebitNoteFormData = {
    purchase_order_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    reason: '',
    items: [],
}

export const DN_STATUSES = [
    { value: 'draft', label: 'Draft', color: 'default' },
    { value: 'approved', label: 'Approved', color: 'success' },
    { value: 'cancelled', label: 'Cancelled', color: 'danger' },
]

// ============ CALCULATIONS ============
export function calculateDNItem(item: DebitNoteItem): DebitNoteItem {
    const subtotal = item.quantity * item.unit_price
    const taxAmount = Math.round(subtotal * (item.tax_rate / 100) * 100) / 100
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100

    return { ...item, tax_amount: taxAmount, total_amount: totalAmount }
}

export function calculateDNTotals(items: DebitNoteItem[]) {
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
export async function getDebitNotes(
    params: PaginationParams,
    filters?: { status?: string; search?: string }
): Promise<PaginatedResult<DebitNote>> {
    const filterArr = []
    if (filters?.status && filters.status !== 'all') filterArr.push({ column: 'status', value: filters.status })

    const result = await fetchPaginated<DebitNote>('debit_notes', params, {
        select: '*, purchase_orders(po_number, supplier_id), suppliers(name, phone, gst_number)',
        filters: filterArr,
        search: filters?.search ? { columns: ['debit_note_number'], query: filters.search } : undefined,
        orderBy: { column: 'created_at', ascending: false },
    })

    result.data = result.data.map((dn: any) => ({
        ...dn,
        po_number: dn.purchase_orders?.po_number || '-',
        supplier_id: dn.purchase_orders?.supplier_id || dn.supplier_id,
        supplier_name: dn.suppliers?.name || '-',
        supplier_phone: dn.suppliers?.phone || '-',
        supplier_gst: dn.suppliers?.gst_number || '-',
    }))

    return result
}

export async function getDebitNoteById(id: string): Promise<DebitNote> {
    const { data, error } = await supabase
        .from('debit_notes')
        .select('*, purchase_orders(po_number, supplier_id), suppliers(name, phone, gst_number), debit_note_items(*, raw_materials(name, code, unit_of_measure), products(name, sku))')
        .eq('id', id)
        .single()

    if (error) throw error

    return {
        ...data,
        po_number: data.purchase_orders?.po_number || '-',
        supplier_id: data.purchase_orders?.supplier_id || data.supplier_id,
        supplier_name: data.suppliers?.name || '-',
        supplier_phone: data.suppliers?.phone || '-',
        supplier_gst: data.suppliers?.gst_number || '-',
        items: (data.debit_note_items || []).map((item: any) => ({
            ...item,
            material_name: item.raw_materials?.name || null,
            material_code: item.raw_materials?.code || null,
            product_name: item.products?.name || null,
            product_sku: item.products?.sku || null,
            unit_of_measure: item.raw_materials?.unit_of_measure || item.products?.unit_of_measure || 'pcs',
        })),
        item_count: data.debit_note_items?.length || 0,
    }
}

export async function createDebitNote(data: DebitNoteFormData, userId?: string): Promise<DebitNote> {
    // Get PO details to get supplier_id
    const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select('supplier_id')
        .eq('id', data.purchase_order_id)
        .single()
    
    if (poError) throw poError

    // Generate debit note number
    const dnNumber = await generateNumber('debit_note')
    const totals = calculateDNTotals(data.items)

    // Create debit note
    const { data: dn, error: dnError } = await supabase
        .from('debit_notes')
        .insert({
            debit_note_number: dnNumber,
            purchase_order_id: data.purchase_order_id,
            supplier_id: po.supplier_id,
            issue_date: data.issue_date,
            reason: data.reason,
            status: 'draft',
            created_by: userId || null,
            ...totals,
        })
        .select()
        .single()

    if (dnError) throw dnError

    // Create debit note items
    if (data.items.length > 0) {
        const items = data.items.map(item => ({
            debit_note_id: dn.id,
            raw_material_id: item.raw_material_id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            tax_amount: item.tax_amount,
            total_amount: item.total_amount,
        }))

        const { error: itemsError } = await supabase
            .from('debit_note_items')
            .insert(items)

        if (itemsError) throw itemsError
    }

    return dn
}

export async function deleteDebitNote(id: string): Promise<void> {
    // Items auto-delete via CASCADE
    return deleteRecord('debit_notes', id)
}

export async function updateDebitNoteStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
        .from('debit_notes')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)

    if (error) throw error
}

// ============ APPROVE DEBIT NOTE ============
export async function approveDebitNote(id: string, userId?: string): Promise<void> {
    const dn = await getDebitNoteById(id)
    
    if (dn.status !== 'draft') {
        throw new Error('Only draft debit notes can be approved')
    }

    // Update debit note status
    const { error: dnError } = await supabase
        .from('debit_notes')
        .update({ 
            status: 'approved', 
            updated_at: new Date().toISOString() 
        })
        .eq('id', id)

    if (dnError) throw dnError

    // Process items - deduct from inventory/raw materials
    for (const item of dn.items || []) {
        // Deduct from raw_materials for raw materials
        if (item.raw_material_id && item.quantity > 0) {
            const { data: rm, error: rmError } = await supabase
                .from('raw_materials')
                .select('current_stock')
                .eq('id', item.raw_material_id)
                .single()

            if (rmError) throw rmError

            const newStock = Math.max(0, (rm.current_stock || 0) - item.quantity)
            
            await supabase
                .from('raw_materials')
                .update({ 
                    current_stock: newStock,
                    updated_at: new Date().toISOString()
                })
                .eq('id', item.raw_material_id)

            // Create inventory movement
            await supabase
                .from('inventory_movements')
                .insert({
                    raw_material_id: item.raw_material_id,
                    movement_type: 'debit_note_return',
                    quantity: -item.quantity,
                    reference_type: 'debit_note',
                    reference_id: id,
                    notes: `Debit Note ${dn.debit_note_number} - Returned to supplier`,
                    created_by: userId || null,
                })
        }

        // Deduct from inventory for products
        if (item.product_id && item.quantity > 0) {
            // Find inventory record
            const { data: invRecords, error: invError } = await supabase
                .from('inventory')
                .select('id, quantity')
                .eq('product_id', item.product_id)
                .order('created_at', { ascending: false })
                .limit(1)

            if (invError) throw invError

            if (invRecords && invRecords.length > 0) {
                const inv = invRecords[0]
                const newQty = Math.max(0, inv.quantity - item.quantity)
                
                await supabase
                    .from('inventory')
                    .update({ 
                        quantity: newQty,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', inv.id)
            }

            // Create inventory movement
            await supabase
                .from('inventory_movements')
                .insert({
                    product_id: item.product_id,
                    movement_type: 'debit_note_return',
                    quantity: -item.quantity,
                    reference_type: 'debit_note',
                    reference_id: id,
                    notes: `Debit Note ${dn.debit_note_number} - Returned to supplier`,
                    created_by: userId || null,
                })
        }
    }
}

// ============ GET ELIGIBLE PURCHASE ORDERS ============
export async function getPurchaseOrdersForDN(): Promise<{ id: string; po_number: string; supplier_name: string; total_amount: number }[]> {
    const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, po_number, suppliers(name), total_amount')
        .in('status', ['received', 'partial'])
        .order('created_at', { ascending: false })

    if (error) throw error

    return (data || [])
        .filter((po: any) => po.suppliers)
        .map((po: any) => ({
            id: po.id,
            po_number: po.po_number,
            supplier_name: po.suppliers?.name || '-',
            total_amount: po.total_amount,
        }))
}

// ============ GET PO ITEMS FOR DN ============
export async function getPOItemsForDN(poId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*, raw_materials(name, code, unit_of_measure, current_stock), products(name, sku, unit_of_measure)')
        .eq('purchase_order_id', poId)

    if (error) throw error

    return (data || []).map((item: any) => ({
        id: item.id,
        raw_material_id: item.raw_material_id,
        product_id: item.product_id,
        material_name: item.raw_materials?.name || null,
        material_code: item.raw_materials?.code || null,
        product_name: item.products?.name || null,
        product_sku: item.products?.sku || null,
        ordered_quantity: item.quantity,
        received_quantity: item.received_quantity || 0,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        unit_of_measure: item.raw_materials?.unit_of_measure || item.products?.unit_of_measure || 'pcs',
        current_stock: item.raw_materials?.current_stock || 0,
    }))
}

// ============ STATS ============
export async function getDebitNoteStats() {
    const { data, error } = await supabase.from('debit_notes').select('status, total_amount')
    if (error) throw error
    const debitNotes = data || []
    return {
        total: debitNotes.length,
        draft: debitNotes.filter(dn => dn.status === 'draft').length,
        approved: debitNotes.filter(dn => dn.status === 'approved').length,
        cancelled: debitNotes.filter(dn => dn.status === 'cancelled').length,
        totalValue: debitNotes.reduce((sum, dn) => sum + (dn.total_amount || 0), 0),
    }
}
