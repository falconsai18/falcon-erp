import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn, formatINR } from '@/lib/utils'

interface ForexGainLossProps {
    invoiceRate: number
    realizationRate: number
    receivedUsd: number
    gainLoss: number
    className?: string
}

export function ForexGainLoss({
    invoiceRate,
    realizationRate,
    receivedUsd,
    gainLoss,
    className,
}: ForexGainLossProps) {
    const isGain = gainLoss >= 0
    const percentChange =
        invoiceRate > 0
            ? (((realizationRate - invoiceRate) / invoiceRate) * 100).toFixed(2)
            : '0.00'

    return (
        <div className={cn('rounded-lg border p-4', className, isGain ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20')}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-500 dark:text-dark-500 uppercase tracking-wider">
                        Forex Gain/Loss
                    </p>
                    <p className={cn('text-xl font-bold mt-1', isGain ? 'text-emerald-400' : 'text-red-400')}>
                        {isGain ? (
                            <span className="flex items-center gap-1.5">
                                <TrendingUp size={18} /> +{formatINR(gainLoss)}
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5">
                                <TrendingDown size={18} /> {formatINR(gainLoss)}
                            </span>
                        )}
                    </p>
                </div>
                <div className="text-right text-xs text-gray-500 dark:text-dark-500">
                    <p>Invoice: ₹{invoiceRate.toFixed(4)}/USD</p>
                    <p>Realized: ₹{realizationRate.toFixed(4)}/USD</p>
                    <p className={cn('font-semibold mt-1', isGain ? 'text-emerald-400' : 'text-red-400')}>
                        {isGain ? '+' : ''}{percentChange}%
                    </p>
                </div>
            </div>
        </div>
    )
}
