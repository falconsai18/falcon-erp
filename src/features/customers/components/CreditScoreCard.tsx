import { useState, useEffect } from 'react'
import {
    calculateCreditScore, applyRecommendedLimit,
    type CreditScoreResult
} from '@/services/creditScoringService'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreditScoreCardProps {
    customerId: string
    customerName: string
}

export function CreditScoreCard({ customerId, customerName }: CreditScoreCardProps) {
    const [scoreData, setScoreData] = useState<CreditScoreResult | null>(null)
    const [loading, setLoading] = useState(true)
    const [upgrading, setUpgrading] = useState(false)

    useEffect(() => {
        loadScore()
    }, [customerId])

    const loadScore = async () => {
        try {
            setLoading(true)
            const data = await calculateCreditScore(customerId)
            setScoreData(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleApplyLimit = async () => {
        if (!scoreData) return
        if (!confirm(`Update credit limit to ${formatCurrency(scoreData.recommendedLimit)} for ${customerName}?`)) return

        try {
            setUpgrading(true)
            await applyRecommendedLimit(customerId, scoreData.recommendedLimit)
            toast.success('Credit limit updated!')
            loadScore() // Refresh
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setUpgrading(false)
        }
    }

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-400'
        if (score >= 50) return 'text-amber-400'
        return 'text-red-400'
    }

    const getRiskBadge = (cat: string) => {
        switch (cat) {
            case 'low': return <Badge variant="success">Low Risk</Badge>
            case 'medium': return <Badge variant="warning">Medium Risk</Badge>
            case 'high': return <Badge variant="danger">High Risk</Badge>
            default: return <Badge variant="default">No Data</Badge>
        }
    }

    if (loading) return (
        <div className="glass-card p-6 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-dark-200 rounded w-1/3 mb-4" />
            <div className="h-24 bg-gray-200 dark:bg-dark-200 rounded" />
        </div>
    )

    if (!scoreData) return null

    const { totalScore, riskCategory, recommendedLimit, currentLimit, breakdown } = scoreData

    return (
        <div className="glass-card p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="text-blue-400" size={20} />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Credit Intelligence</h3>
                </div>
                {getRiskBadge(riskCategory)}
            </div>

            {/* Score & Limit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <div className="flex items-end gap-2 mb-2">
                        <span className={cn("text-4xl font-bold", getScoreColor(totalScore))}>{totalScore}</span>
                        <span className="text-gray-500 dark:text-dark-500 mb-1">/ 100</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 bg-gray-100 dark:bg-dark-300 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full transition-all duration-1000 ease-out",
                                totalScore >= 80 ? 'bg-emerald-500' :
                                    totalScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            )}
                            style={{ width: `${totalScore}%` }}
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-200/50 rounded-lg border border-gray-100 dark:border-dark-300/30">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-dark-500">Recommended Limit</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(recommendedLimit)}</p>
                        </div>
                        {recommendedLimit > currentLimit && (
                            <Button size="sm" onClick={handleApplyLimit} isLoading={upgrading}>
                                Apply
                            </Button>
                        )}
                    </div>
                    <div className="flex justify-between px-1">
                        <p className="text-xs text-gray-500 dark:text-dark-500">Current Limit</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(currentLimit)}</p>
                    </div>
                </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-dark-300">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Score Breakdown</p>

                {[
                    { label: 'Payment History', score: breakdown.paymentHistory.score, max: 40, sub: `${breakdown.paymentHistory.avgDaysToPay} days avg` },
                    { label: 'Order Volume', score: breakdown.orderVolume.score, max: 30, sub: `Last 6m: ${formatCurrency(breakdown.orderVolume.totalLast6Months)}` },
                    { label: 'Relationship Age', score: breakdown.relationshipAge.score, max: 20, sub: `${breakdown.relationshipAge.monthsActive} months` },
                    { label: 'Default History', score: breakdown.defaultHistory.score, max: 10, sub: `${breakdown.defaultHistory.overdueCount} overdue` },
                ].map(item => (
                    <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600 dark:text-dark-400">{item.label}</span>
                            <span className="text-gray-900 dark:text-white font-mono">{item.score}/{item.max}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-dark-300 rounded-full overflow-hidden mb-0.5">
                            <div
                                className="h-full bg-blue-500"
                                style={{ width: `${(item.score / item.max) * 100}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-dark-600 text-right">{item.sub}</p>
                    </div>
                ))}
            </div>

            <p className="text-[10px] text-gray-400 text-center">
                Last calculated: {new Date(scoreData.lastCalculated || '').toLocaleTimeString()}
            </p>
        </div>
    )
}
