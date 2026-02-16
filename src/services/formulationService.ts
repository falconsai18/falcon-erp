import { supabase } from '@/lib/supabase'
import {
    fetchPaginated, deleteRecord, generateNumber,
    type PaginationParams, type PaginatedResult,
} from './baseService'

export interface Formulation {
    id: string
    formulation_number: string
    name: string
    product_id: string | null
    version: number
    description: string | null
    yield_quantity: number | null
    yield_unit: string | null
    status: 'draft' | 'approved' | 'obsolete'
    approved_by: string | null
    approved_at: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    product_name?: string
    product_sku?: string
    ingredient_count?: number
    step_count?: number
}

export interface FormulationIngredient {
    id: string
    formulation_id: string
    raw_material_id: string
    quantity: number
    unit: string
    percentage: number | null
    sequence_order: number
    notes: string | null
    created_at: string
    material_name?: string
    material_code?: string
}

export interface FormulationProcessStep {
    id: string
    formulation_id: string
    step_number: number
    title: string
    description: string | null
    duration_minutes: number | null
    temperature_min: number | null
    temperature_max: number | null
    humidity_min: number | null
    humidity_max: number | null
    equipment_needed: string | null
    safety_notes: string | null
    created_at: string
}

export interface FormulationFormData {
    name: string
    product_id: string
    description: string
    yield_quantity: number
    yield_unit: string
}

export interface IngredientFormData {
    raw_material_id: string
    quantity: number
    unit: string
    percentage: number
    sequence_order: number
    notes: string
}

export interface StepFormData {
    step_number: number
    title: string
    description: string
    duration_minutes: number
    temperature_min: number
    temperature_max: number
    humidity_min: number
    humidity_max: number
    equipment_needed: string
    safety_notes: string
}

export const EMPTY_FORM: FormulationFormData = {
    name: '',
    product_id: '',
    description: '',
    yield_quantity: 0,
    yield_unit: 'kg',
}

export const EMPTY_INGREDIENT_FORM: IngredientFormData = {
    raw_material_id: '',
    quantity: 0,
    unit: 'kg',
    percentage: 0,
    sequence_order: 0,
    notes: '',
}

export const EMPTY_STEP_FORM: StepFormData = {
    step_number: 1,
    title: '',
    description: '',
    duration_minutes: 0,
    temperature_min: 0,
    temperature_max: 0,
    humidity_min: 0,
    humidity_max: 0,
    equipment_needed: '',
    safety_notes: '',
}

// ============ FORMULATIONS ============

export async function getFormulations(
    params: PaginationParams,
    filters?: { status?: string; search?: string }
): Promise<PaginatedResult<Formulation>> {
    const filterArr: { column: string; value: string }[] = []
    if (filters?.status && filters.status !== 'all') {
        filterArr.push({ column: 'status', value: filters.status })
    }

    const result = await fetchPaginated<Formulation>('formulations', params, {
        select: '*, products(name, sku)',
        filters: filterArr,
        search: filters?.search ? { columns: ['formulation_number', 'name'], query: filters.search } : undefined,
        orderBy: { column: 'created_at', ascending: false },
    })

    // Get ingredient and step counts
    const formulationIds = result.data.map(f => f.id)
    if (formulationIds.length > 0) {
        const { data: ingredientCounts } = await supabase
            .from('formulation_ingredients')
            .select('formulation_id')
            .in('formulation_id', formulationIds)

        const { data: stepCounts } = await supabase
            .from('formulation_process_steps')
            .select('formulation_id')
            .in('formulation_id', formulationIds)

        const ingredientMap = new Map<string, number>()
        ingredientCounts?.forEach((item: any) => {
            const current = ingredientMap.get(item.formulation_id) || 0
            ingredientMap.set(item.formulation_id, current + 1)
        })

        const stepMap = new Map<string, number>()
        stepCounts?.forEach((item: any) => {
            const current = stepMap.get(item.formulation_id) || 0
            stepMap.set(item.formulation_id, current + 1)
        })

        result.data = result.data.map(f => ({
            ...f,
            product_name: (f as any).products?.name || '-',
            product_sku: (f as any).products?.sku || '-',
            ingredient_count: ingredientMap.get(f.id) || 0,
            step_count: stepMap.get(f.id) || 0,
        }))
    }

    return result
}

export async function getFormulationById(id: string): Promise<Formulation> {
    const { data, error } = await supabase
        .from('formulations')
        .select('*, products(name, sku)')
        .eq('id', id)
        .single()

    if (error) throw error

    return {
        ...data,
        product_name: data.products?.name || '-',
        product_sku: data.products?.sku || '-',
    }
}

export async function createFormulation(data: FormulationFormData, userId?: string): Promise<Formulation> {
    const formulationNumber = await generateNumber('formulation')

    const formulationData = {
        formulation_number: formulationNumber,
        name: data.name,
        product_id: data.product_id || null,
        version: 1,
        description: data.description || null,
        yield_quantity: data.yield_quantity || null,
        yield_unit: data.yield_unit || null,
        status: 'draft',
        created_by: userId || null,
    }

    const { data: formulation, error } = await supabase
        .from('formulations')
        .insert(formulationData)
        .select()
        .single()

    if (error) throw error
    return formulation
}

export async function updateFormulation(id: string, data: FormulationFormData): Promise<void> {
    const updateData = {
        name: data.name,
        product_id: data.product_id || null,
        description: data.description || null,
        yield_quantity: data.yield_quantity || null,
        yield_unit: data.yield_unit || null,
        updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('formulations').update(updateData).eq('id', id)
    if (error) throw error
}

export async function deleteFormulation(id: string): Promise<void> {
    return deleteRecord('formulations', id)
}

export async function updateFormulationStatus(id: string, status: 'draft' | 'approved' | 'obsolete', userId?: string): Promise<void> {
    const update: any = { status, updated_at: new Date().toISOString() }
    
    if (status === 'approved') {
        update.approved_by = userId || null
        update.approved_at = new Date().toISOString()
    }

    const { error } = await supabase.from('formulations').update(update).eq('id', id)
    if (error) throw error
}

export async function getFormulationStats() {
    const { data, error } = await supabase.from('formulations').select('status')
    if (error) throw error

    const formulations = data || []
    return {
        total: formulations.length,
        draft: formulations.filter(f => f.status === 'draft').length,
        approved: formulations.filter(f => f.status === 'approved').length,
        obsolete: formulations.filter(f => f.status === 'obsolete').length,
    }
}

// ============ INGREDIENTS ============

export async function getFormulationIngredients(formulationId: string): Promise<FormulationIngredient[]> {
    const { data, error } = await supabase
        .from('formulation_ingredients')
        .select('*, raw_materials(name, code)')
        .eq('formulation_id', formulationId)
        .order('sequence_order', { ascending: true })

    if (error) throw error

    return (data || []).map((item: any) => ({
        ...item,
        material_name: item.raw_materials?.name || '-',
        material_code: item.raw_materials?.code || '-',
    }))
}

export async function addIngredient(formulationId: string, data: IngredientFormData): Promise<void> {
    const { error } = await supabase.from('formulation_ingredients').insert({
        formulation_id: formulationId,
        raw_material_id: data.raw_material_id,
        quantity: data.quantity,
        unit: data.unit,
        percentage: data.percentage || null,
        sequence_order: data.sequence_order,
        notes: data.notes || null,
    })

    if (error) throw error
}

export async function updateIngredient(ingredientId: string, data: IngredientFormData): Promise<void> {
    const { error } = await supabase.from('formulation_ingredients').update({
        raw_material_id: data.raw_material_id,
        quantity: data.quantity,
        unit: data.unit,
        percentage: data.percentage || null,
        sequence_order: data.sequence_order,
        notes: data.notes || null,
    }).eq('id', ingredientId)

    if (error) throw error
}

export async function deleteIngredient(ingredientId: string): Promise<void> {
    const { error } = await supabase.from('formulation_ingredients').delete().eq('id', ingredientId)
    if (error) throw error
}

// ============ PROCESS STEPS ============

export async function getFormulationSteps(formulationId: string): Promise<FormulationProcessStep[]> {
    const { data, error } = await supabase
        .from('formulation_process_steps')
        .select('*')
        .eq('formulation_id', formulationId)
        .order('step_number', { ascending: true })

    if (error) throw error
    return data || []
}

export async function addStep(formulationId: string, data: StepFormData): Promise<void> {
    const { error } = await supabase.from('formulation_process_steps').insert({
        formulation_id: formulationId,
        step_number: data.step_number,
        title: data.title,
        description: data.description || null,
        duration_minutes: data.duration_minutes || null,
        temperature_min: data.temperature_min || null,
        temperature_max: data.temperature_max || null,
        humidity_min: data.humidity_min || null,
        humidity_max: data.humidity_max || null,
        equipment_needed: data.equipment_needed || null,
        safety_notes: data.safety_notes || null,
    })

    if (error) throw error
}

export async function updateStep(stepId: string, data: StepFormData): Promise<void> {
    const { error } = await supabase.from('formulation_process_steps').update({
        step_number: data.step_number,
        title: data.title,
        description: data.description || null,
        duration_minutes: data.duration_minutes || null,
        temperature_min: data.temperature_min || null,
        temperature_max: data.temperature_max || null,
        humidity_min: data.humidity_min || null,
        humidity_max: data.humidity_max || null,
        equipment_needed: data.equipment_needed || null,
        safety_notes: data.safety_notes || null,
    }).eq('id', stepId)

    if (error) throw error
}

export async function deleteStep(stepId: string): Promise<void> {
    const { error } = await supabase.from('formulation_process_steps').delete().eq('id', stepId)
    if (error) throw error
}

// ============ DROPDOWN DATA ============

export async function getRawMaterialsForDropdown(): Promise<{ id: string; name: string; code: string }[]> {
    const { data, error } = await supabase
        .from('raw_materials')
        .select('id, name, code')
        .order('name')

    if (error) throw error
    return data || []
}

export async function getProductsForDropdown(): Promise<{ id: string; name: string; sku: string }[]> {
    const { data, error } = await supabase
        .from('products')
        .select('id, name, sku')
        .order('name')

    if (error) throw error
    return data || []
}
