import { supabase } from '@/lib/supabase'
import {
    fetchPaginated, createRecord,
    type PaginationParams, type PaginatedResult,
} from './baseService'

export interface InventoryItem {
    id: string
    product_id: string
    batch_number: string | null
    manufacturing_date: string | null
    expiry_date: string | null
    quantity: number
    reserved_quantity: number
    available_quantity: number
    unit_cost: number
    warehouse_location: string | null
    warehouse_id: string | null
    status: string
    created_at: string
    updated_at: string
    product_name?: string
    product_sku?: string
    days_to_expiry?: number | null
    products?: {
        name: string
        sku: string
        reorder_point?: number
    }
}

export interface StockMovement {
    id: string
    product_id: string
    batch_number: string | null
    movement_type: string
    quantity: number
    reference_type: string | null
    reference_id: string | null
    notes: string | null
    created_by: string | null
    created_at: string
    product_name?: string
    product_sku?: string
}

export interface AddStockFormData {
    product_id: string
    batch_number: string
    manufacturing_date: string
    expiry_date: string
    quantity: number
    unit_cost: number
    warehouse_location: string
    notes: string
}

export const EMPTY_STOCK_FORM: AddStockFormData = {
    product_id: '',
    batch_number: '',
    manufacturing_date: '',
    expiry_date: '',
    quantity: 0,
    unit_cost: 0,
    warehouse_location: '',
    notes: '',
}

// ============ FETCH ============

export async function getInventory(
    params: PaginationParams,
    filters?: { status?: string; search?: string; expiringDays?: number; lowStock?: boolean }
): Promise<PaginatedResult<InventoryItem>> {
    const filterArr = []
    if (filters?.status && filters.status !== 'all') filterArr.push({ column: 'status', value: filters.status })

    const result = await fetchPaginated<InventoryItem>('inventory', params, {
        select: '*, products(name, sku, reorder_point)',
        filters: filterArr,
        orderBy: { column: 'expiry_date', ascending: true },
    })

    const today = new Date()
    result.data = result.data.map((item: any) => {
        const daysToExpiry = item.expiry_date
            ? Math.ceil((new Date(item.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            : null

        return {
            ...item,
            product_name: item.products?.name || '-',
            product_sku: item.products?.sku || '-',
            days_to_expiry: daysToExpiry,
        }
    })

    // Client-side filters
    if (filters?.search) {
        const q = filters.search.toLowerCase()
        result.data = result.data.filter(i =>
            i.product_name?.toLowerCase().includes(q) ||
            i.product_sku?.toLowerCase().includes(q) ||
            i.batch_number?.toLowerCase().includes(q)
        )
    }

    if (filters?.expiringDays) {
        const days = filters.expiringDays
        result.data = result.data.filter(i =>
            i.days_to_expiry != null && i.days_to_expiry >= 0 && i.days_to_expiry <= days
        )
    }

    if (filters?.lowStock) {
        result.data = result.data.filter((i: any) =>
            i.available_quantity <= (i.products?.reorder_point || 0)
        )
    }

    return result
}

export async function getStockMovements(
    params: PaginationParams,
    filters?: { productId?: string; type?: string }
): Promise<PaginatedResult<StockMovement>> {
    const filterArr = []
    if (filters?.productId) filterArr.push({ column: 'product_id', value: filters.productId })
    if (filters?.type && filters.type !== 'all') filterArr.push({ column: 'movement_type', value: filters.type })

    const result = await fetchPaginated<StockMovement>('inventory_movements', params, {
        select: '*, products(name, sku)',
        filters: filterArr,
        orderBy: { column: 'created_at', ascending: false },
    })

    result.data = result.data.map((m: any) => ({
        ...m,
        product_name: m.products?.name || '-',
        product_sku: m.products?.sku || '-',
    }))

    return result
}

// ============ STOCK OPERATIONS ============

export async function addStock(data: AddStockFormData, userId?: string): Promise<void> {
    // Check if batch exists for this product
    const { data: existing } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('product_id', data.product_id)
        .eq('batch_number', data.batch_number)
        .single()

    if (existing) {
        // Update existing batch
        const { error } = await supabase
            .from('inventory')
            .update({
                quantity: existing.quantity + Number(data.quantity),
                unit_cost: Number(data.unit_cost),
                updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
        if (error) throw error
    } else {
        // Create new batch
        const { error } = await supabase
            .from('inventory')
            .insert({
                product_id: data.product_id,
                batch_number: data.batch_number || null,
                manufacturing_date: data.manufacturing_date || null,
                expiry_date: data.expiry_date || null,
                quantity: Number(data.quantity),
                reserved_quantity: 0,
                unit_cost: Number(data.unit_cost),
                warehouse_location: data.warehouse_location || null,
                status: 'available',
            })
        if (error) throw error
    }

    // Log movement
    await supabase.from('inventory_movements').insert({
        product_id: data.product_id,
        batch_number: data.batch_number || null,
        movement_type: 'in',
        quantity: Number(data.quantity),
        reference_type: 'manual',
        notes: data.notes || 'Manual stock addition',
        created_by: userId || null,
    })
}

export async function adjustStock(
    inventoryId: string,
    productId: string,
    newQuantity: number,
    reason: string,
    userId?: string
): Promise<void> {
    const { data: current } = await supabase
        .from('inventory')
        .select('quantity, batch_number')
        .eq('id', inventoryId)
        .single()

    if (!current) throw new Error('Inventory record not found')

    const diff = newQuantity - current.quantity

    const { error } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', inventoryId)

    if (error) throw error

    await supabase.from('inventory_movements').insert({
        product_id: productId,
        batch_number: current.batch_number,
        movement_type: 'adjustment',
        quantity: diff,
        reference_type: 'adjustment',
        notes: reason || 'Stock adjustment',
        created_by: userId || null,
    })
}

// ============ STATS ============

export async function getInventoryStats() {
    const { data, error } = await supabase
        .from('inventory')
        .select('quantity, reserved_quantity, available_quantity, unit_cost, expiry_date, status, products(reorder_point)')

    if (error) throw error
    const items = data || []
    const today = new Date()

    return {
        totalBatches: items.length,
        totalQuantity: items.reduce((s, i) => s + (i.quantity || 0), 0),
        totalValue: items.reduce((s, i) => s + ((i.quantity || 0) * (i.unit_cost || 0)), 0),
        lowStock: items.filter((i: any) => (i.available_quantity || 0) <= (i.products?.reorder_point || 0)).length,
        expiring30: items.filter(i => {
            if (!i.expiry_date) return false
            const days = Math.ceil((new Date(i.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            return days >= 0 && days <= 30
        }).length,
        expiring90: items.filter(i => {
            if (!i.expiry_date) return false
            const days = Math.ceil((new Date(i.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            return days >= 0 && days <= 90
        }).length,
        expired: items.filter(i => {
            if (!i.expiry_date) return false
            return new Date(i.expiry_date) < today
        }).length,
    }
}
