import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    Search, Filter, Calendar as CalendarIcon,
    User as UserIcon, Activity, ChevronRight, ChevronDown,
    FileText, ShoppingCart, Truck, Package, RotateCcw,
    CheckCircle, AlertCircle, XCircle, Info, FileStack
} from 'lucide-react'
import { format, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/shared/PageHeader'
import { usePermission } from '@/hooks/usePermission'
import { fetchAuditLogs, type AuditLog, type AuditLog as AuditLogType } from '@/services/auditService'
import { getUsers, type User } from '@/services/userService'
import { toast } from 'sonner'

// Helper to format date relative to now
const formatRelativeTime = (date: string) => {
    const d = new Date(date)
    return format(d, 'h:mm a')
}

// Map actions to human readable text and colors
const getActionConfig = (action: string) => {
    const parts = action.split('.')
    const entity = parts[0]
    const act = parts[1]

    let color = 'text-gray-500 bg-gray-100 dark:bg-dark-200 dark:text-gray-400'
    let icon = Activity
    let label = action

    // Determine Color
    if (['create', 'created', 'received', 'approved'].some(s => act.includes(s))) {
        color = 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400'
        icon = CheckCircle
    } else if (['update', 'updated', 'changed', 'adjusted'].some(s => act.includes(s))) {
        color = 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400'
        icon = RotateCcw
    } else if (['delete', 'deleted', 'cancelled', 'deactivated'].some(s => act.includes(s))) {
        color = 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400'
        icon = XCircle
    } else if (['login', 'logout'].includes(act)) {
        color = 'text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400'
        icon = UserIcon
    }

    // Determine Icon based on Entity
    if (entity.includes('sales') || entity.includes('order')) icon = ShoppingCart
    if (entity.includes('invoice')) icon = FileText
    if (entity.includes('purchase') || entity.includes('grn')) icon = Truck
    if (entity.includes('user')) icon = UserIcon
    if (entity.includes('product') || entity.includes('stock')) icon = Package

    // Human Readable Label
    const entityLabel = entity.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    const actionLabel = act.replace('_', ' ')

    return { color, icon, text: `${actionLabel} ${entityLabel}` }
}

export default function AuditLogsPage() {
    const { can } = usePermission()
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [users, setUsers] = useState<User[]>([])

    // Filters
    const [userId, setUserId] = useState<string>('all')
    const [entityType, setEntityType] = useState<string>('all')
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week')

    // Pagination
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const pageSize = 50

    useEffect(() => {
        loadUsers()
    }, [])

    useEffect(() => {
        loadLogs(true)
    }, [userId, entityType, dateRange])

    const loadUsers = async () => {
        try {
            const result = await getUsers()
            setUsers(result || [])
        } catch (error) {
            console.error('Failed to load users', error)
        }
    }

    const loadLogs = async (reset = false) => {
        try {
            setLoading(true)
            const currentPage = reset ? 1 : page

            let dateFrom
            const now = new Date()
            if (dateRange === 'today') dateFrom = new Date(now.setHours(0, 0, 0, 0)).toISOString()
            else if (dateRange === 'week') {
                const d = new Date()
                d.setDate(d.getDate() - 7)
                dateFrom = d.toISOString()
            }
            else if (dateRange === 'month') {
                const d = new Date()
                d.setDate(d.getDate() - 30)
                dateFrom = d.toISOString()
            }

            const result = await fetchAuditLogs({
                page: currentPage,
                pageSize,
                user_id: userId,
                entity_type: entityType,
                date_from: dateFrom
            })

            if (reset) {
                setLogs(result.data || [])
                setPage(2)
            } else {
                setLogs(prev => [...prev, ...(result.data || [])])
                setPage(prev => prev + 1)
            }

            setHasMore(result.data.length === pageSize)
        } catch (error) {
            toast.error('Failed to load audit logs')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    // Group logs by date
    const groupedLogs = useMemo(() => {
        const groups: Record<string, AuditLog[]> = {
            'Today': [],
            'Yesterday': [],
            'This Week': [],
            'Older': []
        }

        logs.forEach(log => {
            const date = parseISO(log.created_at)
            if (isToday(date)) groups['Today'].push(log)
            else if (isYesterday(date)) groups['Yesterday'].push(log)
            else if (isThisWeek(date)) groups['This Week'].push(log)
            else groups['Older'].push(log)
        })

        return groups
    }, [logs])

    if (!can('read', 'audit_logs')) {
        return (
            <div className="flex h-[80vh] items-center justify-center text-gray-500">
                Access Denied
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Audit Logs"
                description="Complete system activity trail"
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => loadLogs(true)}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                }
            />

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-wrap gap-4">
                    <div className="w-full md:w-64">
                        <label className="text-xs font-medium text-gray-500 mb-1 block">User</label>
                        <select
                            className="w-full p-2 rounded-lg border border-gray-200 dark:border-dark-300 bg-transparent text-sm"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                        >
                            <option value="all">All Users</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.full_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-40">
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Entity Type</label>
                        <select
                            className="w-full p-2 rounded-lg border border-gray-200 dark:border-dark-300 bg-transparent text-sm"
                            value={entityType}
                            onChange={(e) => setEntityType(e.target.value)}
                        >
                            <option value="all">All Entities</option>
                            <option value="sales_order">Sales Order</option>
                            <option value="invoice">Invoice</option>
                            <option value="purchase_order">Purchase Order</option>
                            <option value="user">User</option>
                            <option value="product">Product</option>
                        </select>
                    </div>

                    <div className="w-40">
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Time Range</label>
                        <select
                            className="w-full p-2 rounded-lg border border-gray-200 dark:border-dark-300 bg-transparent text-sm"
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as any)}
                        >
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Timeline */}
            <div className="space-y-8 max-w-4xl mx-auto">
                {Object.entries(groupedLogs).map(([group, groupLogs]) => (
                    groupLogs.length > 0 && (
                        <div key={group} className="relative">
                            <div className="sticky top-20 z-10 mb-4 ml-12">
                                <span className="px-3 py-1 bg-gray-100 dark:bg-dark-200 rounded-full text-xs font-medium text-gray-500 border border-gray-200 dark:border-dark-300">
                                    {group}
                                </span>
                            </div>

                            <div className="space-y-6 relative before:absolute before:left-6 before:top-2 before:bottom-0 before:w-0.5 before:bg-gray-200 dark:before:bg-dark-300">
                                {groupLogs.map((log) => (
                                    <TimelineItem key={log.id} log={log} />
                                ))}
                            </div>
                        </div>
                    )
                ))}

                {logs.length === 0 && !loading && (
                    <div className="text-center py-20 text-gray-500">
                        <FileStack className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No activity recorded yet</p>
                    </div>
                )}

                {hasMore && logs.length > 0 && (
                    <div className="text-center py-4 pl-12">
                        <Button
                            variant="secondary"
                            onClick={() => loadLogs()}
                            disabled={loading}
                        >
                            {loading ? 'Loading...' : 'Load More Activity'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}

function TimelineItem({ log }: { log: AuditLog }) {
    const [expanded, setExpanded] = useState(false)
    const config = getActionConfig(log.action)
    const Icon = config.icon

    return (
        <div className="relative pl-12 group">
            {/* Connector Dot */}
            <div className={`absolute left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-dark-50 z-10 ${config.color.split(' ')[1]}`} /> {/* simplified color extraction for bg */}

            <div className={`p-4 rounded-xl border border-gray-100 dark:border-dark-300/50 bg-white dark:bg-dark-100/50 hover:bg-white dark:hover:bg-dark-100 transition-all ${expanded ? 'shadow-md scale-[1.01]' : 'shadow-sm'}`}>
                <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpanded(!expanded)}
                >
                    <div className="flex gap-3">
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 text-xs font-bold flex-shrink-0">
                            {log.users?.full_name?.[0]?.toUpperCase() || 'S'}
                        </div>

                        <div>
                            <div className="flex items-center gap-2 flex-wrap text-sm">
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    {log.users?.full_name || 'System'}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                    {config.text}
                                </span>
                                {log.entity_id && (
                                    <span className="font-mono text-xs bg-gray-100 dark:bg-dark-200 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                                        {log.details?.order_number || log.details?.invoice_number || log.details?.po_number || log.entity_id.split('-')[0]}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${config.color}`}>
                                    {log.action}
                                </span>
                                <span className="text-xs text-gray-400">
                                    • {formatRelativeTime(log.created_at)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="text-gray-400">
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                </div>

                {/* Expanded Details */}
                {expanded && log.details && Object.keys(log.details).length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-300 text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {Object.entries(log.details).map(([key, value]) => (
                                <div key={key} className="flex flex-col">
                                    <span className="text-[10px] uppercase text-gray-400 font-medium tracking-wide">
                                        {key.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-gray-700 dark:text-gray-200 font-mono text-xs">
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
