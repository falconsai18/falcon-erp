import { supabase } from '@/lib/supabase'

export interface Notification {
    id: string
    user_id: string
    title: string
    message: string
    type: 'success' | 'warning' | 'error' | 'info'
    is_read: boolean
    link?: string
    created_at: string
}

export interface CreateNotificationParams {
    user_id: string
    title: string
    message: string
    type: 'success' | 'warning' | 'error' | 'info'
    link?: string
}

export async function getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) throw error
    return data || []
}

export async function getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

    if (error) throw error
    return count || 0
}

export async function markAsRead(id: string): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)

    if (error) throw error
}

export async function markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)

    if (error) throw error
}

export async function deleteNotification(id: string): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)

    if (error) throw error
}

/**
 * FIRE AND FORGET - Never await this function.
 * Silently catches all errors to prevent blocking main flow.
 */
export function createNotification(params: CreateNotificationParams): void {
    (async () => {
        try {
            const { error } = await supabase
                .from('notifications')
                .insert({
                    user_id: params.user_id,
                    title: params.title,
                    message: params.message,
                    type: params.type,
                    link: params.link,
                    is_read: false,
                    created_at: new Date().toISOString()
                })

            if (error) {
                console.warn('Notification Failed:', error.message)
            }
        } catch (err) {
            console.warn('Notification Error:', err)
        }
    })()
}
