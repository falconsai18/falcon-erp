import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn, formatUSD, formatINR } from '@/lib/utils'
import { ForexGainLoss } from './ForexGainLoss'
import type { ExportPayment, ExportInvoice } from '../types/export.types'

interface PaymentTrackerProps {
    expectedUsd: number
    payments: ExportPayment[]
    invoice?: ExportInvoice | null
    onAddPayment: () => void
}

export function PaymentTracker({
    expectedUsd,
    payments,
    invoice,
    onAddPayment,
}: PaymentTrackerProps) {
    const receivedUsd = payments.reduce((s, p) => s + p.received_amount_usd, 0)
    const pendingUsd = expectedUsd - receivedUsd
    const percent = expectedUsd > 0 ? Math.round((receivedUsd / expectedUsd) * 100) : 0
    const totalForexGainLoss = payments.reduce((s, p) => s + (p.forex_gain_loss || 0), 0)

    return (
        <div className="space-y-6">
            <div>
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500 dark:text-dark-500">
                        Received {formatUSD(receivedUsd)} / Expected {formatUSD(expectedUsd)}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">{percent}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-dark-300 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                </div>
            </div>

            <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Payment History</h3>
                <Button size="sm" onClick={onAddPayment} icon={<Plus size={14} />}>
                    Record Payment
                </Button>
            </div>

            {payments.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-dark-500 py-4">
                    No payments received yet
                </p>
            ) : (
                <div className="border border-gray-200 dark:border-dark-300 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-dark-200">
                                <th className="px-4 py-2 text-left">Date</th>
                                <th className="px-4 py-2 text-left">Amount USD</th>
                                <th className="px-4 py-2 text-left">Rate</th>
                                <th className="px-4 py-2 text-left">Realized INR</th>
                                <th className="px-4 py-2 text-left">Forex G/L</th>
                                <th className="px-4 py-2 text-left">Bank Ref</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((p) => (
                                <tr key={p.id} className="border-t border-gray-200 dark:border-dark-300">
                                    <td className="px-4 py-2">
                                        {new Date(p.payment_date).toLocaleDateString('en-IN')}
                                    </td>
                                    <td className="px-4 py-2 font-mono">{formatUSD(p.received_amount_usd)}</td>
                                    <td className="px-4 py-2">₹{p.bank_realization_rate?.toFixed(4)}</td>
                                    <td className="px-4 py-2 font-mono">{formatINR(p.realized_amount_inr)}</td>
                                    <td
                                        className={cn(
                                            'px-4 py-2 font-mono',
                                            (p.forex_gain_loss || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                                        )}
                                    >
                                        {(p.forex_gain_loss || 0) >= 0 ? '+' : ''}
                                        {formatINR(p.forex_gain_loss || 0)}
                                    </td>
                                    <td className="px-4 py-2">{p.bank_reference || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {payments.length > 0 && invoice && (
                <ForexGainLoss
                    invoiceRate={invoice.exchange_rate}
                    realizationRate={
                        payments.reduce((s, p) => s + p.received_amount_usd * p.bank_realization_rate, 0) /
                        (payments.reduce((s, p) => s + p.received_amount_usd, 0) || 1)
                    }
                    receivedUsd={receivedUsd}
                    gainLoss={totalForexGainLoss}
                />
            )}
        </div>
    )
}
