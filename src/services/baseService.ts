import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface PaginationParams {
    page: number
    pageSize: number
}

export interface PaginatedResult<T> {
    data: T[]
    count: number
    page: number
    pageSize: number
    totalPages: number
}

export async function fetchPaginated<T>(
    table: string,
    params: PaginationParams,
    options?: {
        select?: string
        filters?: { column: string; value: any }[]
        search?: { columns: string[]; query: string }
        orderBy?: { column: string; ascending?: boolean }
    }
): Promise<PaginatedResult<T>> {
    const { page, pageSize } = params
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
        .from(table)
        .select(options?.select || '*', { count: 'exact' })

    // Filters
    if (options?.filters) {
        for (const f of options.filters) {
            if (f.value !== 'all' && f.value !== '' && f.value !== null) {
                query = query.eq(f.column, f.value)
            }
        }
    }

    // Search
    if (options?.search?.query) {
        const searchConditions = options.search.columns
            .map(col => `${col}.ilike.%${options.search!.query}%`)
            .join(',')
        query = query.or(searchConditions)
    }

    // Order
    const orderCol = options?.orderBy?.column || 'created_at'
    const orderAsc = options?.orderBy?.ascending ?? false
    query = query.order(orderCol, { ascending: orderAsc })

    // Pagination
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
        console.error(`Fetch ${table} error:`, error)
        throw error
    }

    return {
        data: (data || []) as T[],
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
    }
}

export async function fetchById<T>(table: string, id: string, select?: string): Promise<T> {
    const { data, error } = await supabase
        .from(table)
        .select(select || '*')
        .eq('id', id)
        .single()

    if (error) throw error
    return data as T
}

export async function createRecord<T>(table: string, payload: Partial<T>): Promise<T> {
    const { data, error } = await supabase
        .from(table)
        .insert(payload)
        .select()
        .single()

    if (error) throw error
    return data as T
}

export async function updateRecord<T>(table: string, id: string, payload: Partial<T>): Promise<T> {
    const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as T
}

export async function deleteRecord(table: string, id: string): Promise<void> {
    const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)

    if (error) throw error
}

export async function generateNumber(entityType: string): Promise<string> {
    const { data, error } = await supabase.rpc('generate_next_number', {
        p_entity_type: entityType,
    })

    if (error) throw error
    return data as string
}
