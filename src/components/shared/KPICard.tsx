import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface KPICardProps {
    title: string
    value: number
    change?: number
    icon: React.ReactNode
    color: string
    bgColor: string
    format?: 'currency' | 'number' | 'percent'
}

export function KPICard({ title, value, change, icon, color, bgColor, format = 'number' }: KPICardProps) {
    const formattedValue = format === 'currency'
        ? formatCurrency(value)
        : format === 'percent'
            ? `${value}%`
            : value.toLocaleString('en-IN')

    return (
        <div className="glass-card p-5 hover:border-dark-200 transition-all duration-300">
            <div className="flex items-start justify-between">
                <div className="space-y-3">
                    <p className="text-sm text-dark-500 font-medium">{title}</p>
                    <p className="text-2xl font-bold text-white">{formattedValue}</p>
                    {change !== undefined && (
                        <div className="flex items-center gap-1.5">
                            {change >= 0 ? (
                                <ArrowUpRight size={14} className="text-emerald-400" />
                            ) : (
                                <ArrowDownRight size={14} className="text-red-400" />
                            )}
                            <span className={cn('text-xs font-semibold', change >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                                {Math.abs(change)}%
                            </span>
                            <span className="text-xs text-dark-600">vs last month</span>
                        </div>
                    )}
                </div>
                <div className={cn('p-3 rounded-xl', bgColor)}>
                    {icon}
                </div>
            </div>
        </div>
    )
}