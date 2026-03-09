import { cn } from '@/lib/utils'

interface LUTStatusBadgeProps {
    arn: string
    validTill: string
    className?: string
}

export function LUTStatusBadge({ arn, validTill, className }: LUTStatusBadgeProps) {
    const now = new Date()
    const till = new Date(validTill)
    const daysRemaining = Math.ceil((till.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

    const status: 'valid' | 'warning' | 'expired' =
        daysRemaining > 30 ? 'valid' : daysRemaining > 0 ? 'warning' : 'expired'

    const statusConfig = {
        valid: {
            bg: 'bg-emerald-500/10 border-emerald-500/30',
            text: 'text-emerald-400',
            label: `${daysRemaining} days remaining`,
        },
        warning: {
            bg: 'bg-amber-500/10 border-amber-500/30',
            text: 'text-amber-400',
            label: `${daysRemaining} days remaining`,
        },
        expired: {
            bg: 'bg-red-500/10 border-red-500/30',
            text: 'text-red-400',
            label: 'Expired',
        },
    }

    const config = statusConfig[status]

    return (
        <div className={cn('rounded-lg border p-3', config.bg, className)}>
            <p className="text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">
                LUT ARN
            </p>
            <p className="text-sm font-mono text-gray-900 dark:text-white mt-0.5 break-all">
                {arn}
            </p>
            <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500 dark:text-dark-500">
                    Valid till: {new Date(validTill).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <span className={cn('text-xs font-semibold', config.text)}>
                    {config.label}
                </span>
            </div>
        </div>
    )
}
