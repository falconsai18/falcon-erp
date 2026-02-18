import { supabase } from '@/lib/supabase'
import {
    fetchPaginated,
    type PaginationParams, type PaginatedResult
} from './baseService'

export const AUDIT_ACTIONS = {
    // Auth
    LOGIN: 'user.login',
    LOGOUT: 'user.logout',

    // Users
    USER_CREATED: 'user.created',
    USER_ROLE_CHANGED: 'user.role_changed',
    USER_DEACTIVATED: 'user.deactivated',
    USER_ACTIVATED: 'user.activated',

    // Sales
    SO_CREATED: 'sales_order.created',
    SO_UPDATED: 'sales_order.updated',
    INVOICE_CREATED: 'invoice.created',
    INVOICE_CANCELLED: 'invoice.cancelled',
    PAYMENT_RECEIVED: 'payment.received',

    // Purchase
    PO_CREATED: 'purchase_order.created',
    PO_APPROVED: 'purchase_order.approved',
    GRN_CREATED: 'grn.created',
    BILL_CREATED: 'supplier_bill.created',
    PAYMENT_MADE: 'payment.made',

    // Inventory
    PRODUCT_CREATED: 'product.created',
    STOCK_ADJUSTED: 'stock.adjusted',
    BATCH_CREATED: 'batch.created',

    // Production
    WORK_ORDER_CREATED: 'work_order.created',
    WORK_ORDER_COMPLETED: 'work_order.completed',
    WORK_ORDER_SCRAP_RECORDED: 'work_order.scrap_recorded',
    WORK_ORDER_SCRAP_DELETED: 'work_order.scrap_deleted',
}

export interface AuditLog {
    id: string
    user_id: string | null
    action: string
    entity_type: string
    entity_id: string | null
    details: Record<string, any> | null
    ip_address: string | null
    created_at: string
    // Joins
    users?: {
        full_name: string
        email: string
        avatar_url: string | null
    }
}

interface LogActivityParams {
    action: string
    entity_type: string
    entity_id?: string
    details?: Record<string, unknown>
}

/**
 * FIRE AND FORGET - Never await this function.
 * Silently catches all errors to prevent blocking main flow.
 */
export function logActivity({ action, entity_type, entity_id, details }: LogActivityParams): void {
    // Determine user_id from session if possible, but don't block
    // We'll perform the async operation in a detached promise
    (async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const userId = session?.user?.id

            // We can't reliably get IP in client-side JS without external service
            // So we leave it null or let RLS/Triggers handle it if possible

            const { error } = await supabase.from('activity_log').insert({
                user_id: userId || null,
                action,
                entity_type,
                entity_id: entity_id || null,
                details: details || {},
                created_at: new Date().toISOString()
            })

            if (error) {
                console.warn('Audit Log Failed:', error.message)
            }
        } catch (err) {
            console.warn('Audit Log Error:', err)
        }
    })()
}

export async function fetchAuditLogs(
    params: PaginationParams & {
        entity_type?: string,
        user_id?: string,
        date_from?: string,
        date_to?: string
    }
): Promise<PaginatedResult<AuditLog>> {
    const { page, pageSize } = params
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
        .from('activity_log')
        .select(`
            *,
            users (
                full_name,
                email,
                avatar_url
            )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

    if (params.entity_type && params.entity_type !== 'all') {
        query = query.eq('entity_type', params.entity_type)
    }

    if (params.user_id && params.user_id !== 'all') {
        query = query.eq('user_id', params.user_id)
    }

    if (params.date_from) {
        query = query.gte('created_at', params.date_from)
    }

    if (params.date_to) {
        // Add one day to include the end date fully
        const endDate = new Date(params.date_to)
        endDate.setDate(endDate.getDate() + 1)
        query = query.lt('created_at', endDate.toISOString())
    }

    const { data, error, count } = await query.range(from, to)

    if (error) throw error

    return {
        data: (data as any[]) || [],
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
    }
}
