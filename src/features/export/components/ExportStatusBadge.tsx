import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

type StatusColor = 'gray' | 'blue' | 'yellow' | 'orange' | 'purple' | 'green' | 'red'

const STATUS_COLORS: Record<string, StatusColor> = {
    DRAFT: 'gray',
    CONFIRMED: 'blue',
    IN_PRODUCTION: 'yellow',
    READY_TO_SHIP: 'orange',
    SHIPPED: 'purple',
    DELIVERED: 'green',
    CANCELLED: 'red',
    SENT: 'blue',
    PAYMENT_PENDING: 'yellow',
    PARTIALLY_PAID: 'orange',
    PAID: 'green',
    BOOKING_CONFIRMED: 'blue',
    CUSTOMS_CLEARED: 'yellow',
    LOADED: 'orange',
    IN_TRANSIT: 'purple',
    ARRIVED: 'blue',
    OVERDUE: 'red',
    PENDING: 'yellow',
    PARTIAL: 'orange',
    RECEIVED: 'green',
    NOT_STARTED: 'gray',
    IN_PROGRESS: 'yellow',
    READY: 'blue',
    SUBMITTED: 'green',
    NOT_REQUIRED: 'gray',
}

const COLOR_CLASSES: Record<StatusColor, string> = {
    gray: 'bg-gray-100 dark:bg-dark-300/50 text-gray-600 dark:text-dark-500 border-gray-300 dark:border-dark-300',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    yellow: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    red: 'bg-red-500/10 text-red-400 border-red-500/30',
}

function formatLabel(status: string): string {
    return status
        .split('_')
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' ')
}

interface ExportStatusBadgeProps {
    status: string
    className?: string
}

export function ExportStatusBadge({ status, className }: ExportStatusBadgeProps) {
    const color = STATUS_COLORS[status] ?? 'gray'
    const label = formatLabel(status)
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
                COLOR_CLASSES[color],
                className
            )}
        >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {label}
        </span>
    )
}
