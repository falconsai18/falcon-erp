import { supabase } from '@/lib/supabase'
import {
    fetchPaginated, createRecord, updateRecord, deleteRecord,
    type PaginationParams, type PaginatedResult,
} from './baseService'

export interface RawMaterial {
    id: string
    name: string
    code: string | null
    description: string | null
    category: string | null
    unit_of_measure: string
    current_stock: number
    min_stock_level: number
    reorder_point: number
    unit_cost: number
    supplier_id: string | null
    shelf_life_days: number | null
    storage_conditions: string | null
    status: string
    created_at: string
    updated_at: string
    supplier_name?: string
}

export interface RawMaterialFormData {
    name: string
    code: string
    description: string
    category: string
    unit_of_measure: string
    current_stock: number
    min_stock_level: number
    reorder_point: number
    unit_cost: number
    supplier_id: string
    shelf_life_days: number
    storage_conditions: string
    status: string
}

export const EMPTY_RAWMATERIAL_FORM: RawMaterialFormData = {
    name: '',
    code: '',
    description: '',
    category: '',
    unit_of_measure: 'KG',
    current_stock: 0,
    min_stock_level: 0,
    reorder_point: 0,
    unit_cost: 0,
    supplier_id: '',
    shelf_life_days: 365,
    storage_conditions: '',
    status: 'active',
}

const RM_CATEGORIES = [
    'Herbs', 'Roots', 'Seeds', 'Leaves', 'Bark', 'Flowers',
    'Minerals', 'Oils', 'Excipients', 'Packaging', 'Other',
]

export { RM_CATEGORIES }

export async function getRawMaterials(
    params: PaginationParams,
    filters?: { status?: string; category?: string; search?: string; lowStock?: boolean }
): Promise<PaginatedResult<RawMaterial>> {
    const filterArr = []
    if (filters?.status && filters.status !== 'all') filterArr.push({ column: 'status', value: filters.status })
    if (filters?.category && filters.category !== 'all') filterArr.push({ column: 'category', value: filters.category })

    const result = await fetchPaginated<RawMaterial>('raw_materials', params, {
        select: '*, suppliers(name)',
        filters: filterArr,
        search: filters?.search ? { columns: ['name', 'code', 'category'], query: filters.search } : undefined,
        orderBy: { column: 'created_at', ascending: false },
    })

    result.data = result.data.map((rm: any) => ({
        ...rm,
        supplier_name: rm.suppliers?.name || '-',
    }))

    if (filters?.lowStock) {
        result.data = result.data.filter(rm => rm.current_stock <= rm.reorder_point)
    }

    return result
}

export async function createRawMaterial(data: RawMaterialFormData): Promise<RawMaterial> {
    const payload: any = {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase() || null,
        description: data.description.trim() || null,
        category: data.category || null,
        unit_of_measure: data.unit_of_measure,
        current_stock: Number(data.current_stock),
        min_stock_level: Number(data.min_stock_level),
        reorder_point: Number(data.reorder_point),
        unit_cost: Number(data.unit_cost),
        shelf_life_days: Number(data.shelf_life_days) || null,
        storage_conditions: data.storage_conditions.trim() || null,
        status: data.status,
    }
    if (data.supplier_id) payload.supplier_id = data.supplier_id
    return createRecord<RawMaterial>('raw_materials', payload)
}

export async function updateRawMaterial(id: string, data: RawMaterialFormData): Promise<RawMaterial> {
    const payload: any = {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase() || null,
        description: data.description.trim() || null,
        category: data.category || null,
        unit_of_measure: data.unit_of_measure,
        current_stock: Number(data.current_stock),
        min_stock_level: Number(data.min_stock_level),
        reorder_point: Number(data.reorder_point),
        unit_cost: Number(data.unit_cost),
        shelf_life_days: Number(data.shelf_life_days) || null,
        storage_conditions: data.storage_conditions.trim() || null,
        status: data.status,
        updated_at: new Date().toISOString(),
    }
    if (data.supplier_id) payload.supplier_id = data.supplier_id
    else payload.supplier_id = null
    return updateRecord<RawMaterial>('raw_materials', id, payload)
}

export async function deleteRawMaterial(id: string): Promise<void> {
    return deleteRecord('raw_materials', id)
}

export async function getRawMaterialStats() {
    const { data, error } = await supabase.from('raw_materials').select('status, current_stock, reorder_point, unit_cost')
    if (error) throw error
    const items = data || []
    return {
        total: items.length,
        active: items.filter(i => i.status === 'active').length,
        lowStock: items.filter(i => i.current_stock <= i.reorder_point).length,
        totalValue: items.reduce((sum, i) => sum + (i.current_stock * i.unit_cost), 0),
    }
}
