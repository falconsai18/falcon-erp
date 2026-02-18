import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useOnClickOutside } from '@/hooks/useOnClickOutside'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
    getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification,
    type Notification
} from '@/services/notificationService'
import { cn, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export function NotificationBell() {
    const { user } = useAuthStore()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useOnClickOutside(containerRef, () => setIsOpen(false))

    // Initial Load & Realtime Subscription
    useEffect(() => {
        if (!user) return

        fetchData()

        const channel = supabase
            .channel('notifications-changes')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                setNotifications(prev => [payload.new as Notification, ...prev])
                setUnreadCount(prev => prev + 1)
                toast.info('New Notification: ' + (payload.new as any).title)
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [user?.id])

    const fetchData = async () => {
        if (!user) return
        try {
            const [data, count] = await Promise.all([
                getNotifications(user.id),
                getUnreadCount(user.id)
            ])
            setNotifications(data)
            setUnreadCount(count)
        } catch (error) {
            console.error('Failed to fetch notifications', error)
        }
    }

    const handleMarkAsRead = async (id: string, link?: string) => {
        try {
            await markAsRead(id)
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (error) {
            console.error(error)
        }
    }

    const handleMarkAllRead = async () => {
        if (!user) return
        try {
            await markAllAsRead(user.id)
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
            setUnreadCount(0)
            toast.success('All notifications marked as read')
        } catch (error) {
            toast.error('Failed to update notifications')
        }
    }

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        try {
            await deleteNotification(id)
            setNotifications(prev => prev.filter(n => n.id !== id))
            // If it was unread, decrement count
            const notif = notifications.find(n => n.id === id)
            if (notif && !notif.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1))
            }
        } catch (error) {
            toast.error('Failed to delete notification')
        }
    }

    const toggleOpen = () => {
        setIsOpen(!isOpen)
        if (!isOpen && user) {
            getNotifications(user.id).then(setNotifications)
        }
    }

    const getBorderColor = (type: string) => {
        switch (type) {
            case 'success': return 'border-l-green-500'
            case 'warning': return 'border-l-yellow-500'
            case 'error': return 'border-l-red-500'
            default: return 'border-l-blue-500'
        }
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                onClick={toggleOpen}
            >
                <Bell size={20} className={cn(unreadCount > 0 && "animate-pulse text-brand-500")} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-dark-100" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-dark-100 rounded-xl shadow-xl border border-gray-100 dark:border-dark-300 z-50 overflow-hidden backdrop-blur-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-dark-300 bg-gray-50/50 dark:bg-dark-200/50">
                        <h3 className="font-semibold text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                            >
                                <Check size={12} /> Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {loading ? (
                            <div className="p-4 space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-16 bg-gray-100 dark:bg-dark-200 rounded animate-pulse" />
                                ))}
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-8 text-center text-gray-500">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">All caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-dark-300">
                                {notifications.map(n => (
                                    <div
                                        key={n.id}
                                        className={cn(
                                            "relative group p-3 hover:bg-gray-50 dark:hover:bg-dark-200/50 transition-colors border-l-4",
                                            getBorderColor(n.type),
                                            n.is_read ? "opacity-75" : "bg-blue-50/30 dark:bg-blue-900/10"
                                        )}
                                    >
                                        <div className="flex justify-between items-start gap-3">
                                            <Link
                                                to={n.link || '#'}
                                                className="flex-1"
                                                onClick={() => handleMarkAsRead(n.id)}
                                            >
                                                <p className={cn("text-xs font-medium mb-0.5", !n.is_read && "text-black dark:text-white font-bold")}>
                                                    {n.title}
                                                </p>
                                                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                                    {n.message}
                                                </p>
                                                <span className="text-[10px] text-gray-400 mt-1 block">
                                                    {formatDate(n.created_at)}
                                                </span>
                                            </Link>

                                            <button
                                                onClick={(e) => handleDelete(e, n.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>

                                        {!n.is_read && (
                                            <div className="absolute top-3 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-2 border-t border-gray-100 dark:border-dark-300 bg-gray-50/50 dark:bg-dark-200/50 text-center">
                        <button
                            onClick={fetchData}
                            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
