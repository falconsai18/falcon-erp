import { LucideIcon } from 'lucide-react'
import { cn, formatUSD, formatINR } from '@/lib/utils'

interface ExportKPICardProps {
    icon: LucideIcon
    title: string
    value: string | number
    subtitle?: string
    trend?: number
    color: string
    format?: 'usd' | 'inr' | 'number'
}

export function ExportKPICard({
    icon: Icon,
    title,
    value,
    subtitle,
    trend,
    color,
    format = 'number',
}: ExportKPICardProps) {
    const formattedValue =
        format === 'usd'
            ? (typeof value === 'number' ? formatUSD(value) : value)
            : format === 'inr'
              ? (typeof value === 'number' ? formatINR(value) : value)
              : typeof value === 'number'
                ? value.toLocaleString('en-IN')
                : value

    return (
        <div className="glass-card p-5 hover:border-gray-200 dark:hover:border-dark-200 transition-all duration-300">
            <div className="flex items-start justify-between">
                <div className="space-y-3">
                    <p className="text-sm text-gray-500 dark:text-dark-500 font-medium">{title}</p>
                    <p className={cn('text-2xl font-bold text-gray-900 dark:text-white', color)}>
                        {formattedValue}
                    </p>
                    {subtitle && (
                        <p className="text-xs text-gray-500 dark:text-dark-500">{subtitle}</p>
                    )}
                    {trend !== undefined && (
                        <div className="flex items-center gap-1.5">
                            <span
                                className={cn(
                                    'text-xs font-semibold',
                                    trend >= 0 ? 'text-emerald-400' : 'text-red-400'
                                )}
                            >
                                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                            </span>
                            <span className="text-xs text-gray-400 dark:text-dark-600">vs last month</span>
                        </div>
                    )}
                </div>
                <div className={cn(
                    'p-3 rounded-xl',
                    color.includes('blue') && 'bg-blue-500/10',
                    color.includes('emerald') && 'bg-emerald-500/10',
                    color.includes('amber') && 'bg-amber-500/10',
                    color.includes('red') && 'bg-red-500/10',
                    color.includes('purple') && 'bg-purple-500/10',
                    color.includes('gray') && 'bg-gray-500/10'
                )}>
                    <Icon size={22} className={color} />
                </div>
            </div>
        </div>
    )
}
