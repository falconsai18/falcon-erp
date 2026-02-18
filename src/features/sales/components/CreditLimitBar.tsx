import { useState, useEffect } from 'react'
import { CreditCard } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn, formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface CreditStatus {
  creditLimit: number
  outstanding: number
  available: number
  overdue: number
  utilizationPercent: number
}

interface CreditLimitBarProps {
  customerId: string
  orderAmount?: number
}

export function CreditLimitBar({ customerId, orderAmount = 0 }: CreditLimitBarProps) {
  const [creditStatus, setCreditStatus] = useState<CreditStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (customerId) {
      loadCreditStatus()
    }
  }, [customerId])

  const loadCreditStatus = async () => {
    try {
      setLoading(true)
      
      const { data: customer } = await supabase
        .from('customers')
        .select('credit_limit, status')
        .eq('id', customerId)
        .maybeSingle()

      if (!customer) {
        setCreditStatus(null)
        return
      }

      const creditLimit = Number(customer.credit_limit) || 0

      const { data: invoices } = await supabase
        .from('invoices')
        .select('balance_amount, status')
        .eq('customer_id', customerId)
        .in('status', ['unpaid', 'partial', 'overdue'])

      const outstanding = invoices?.reduce(
        (sum, inv) => sum + (Number(inv.balance_amount) || 0), 0
      ) ?? 0

      const overdue = invoices?.filter(inv => inv.status === 'overdue').reduce(
        (sum, inv) => sum + (Number(inv.balance_amount) || 0), 0
      ) ?? 0

      const available = Math.max(0, creditLimit - outstanding)
      const utilizationPercent = creditLimit > 0 ? (outstanding / creditLimit) * 100 : 0

      setCreditStatus({
        creditLimit,
        outstanding,
        available,
        overdue,
        utilizationPercent,
      })
    } catch (error) {
      console.error('Failed to load credit status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="h-4 bg-dark-200 rounded w-1/2 mb-3" />
        <div className="h-2 bg-dark-200 rounded mb-3" />
      </div>
    )
  }

  if (!creditStatus) return null

  const { creditLimit, outstanding, available, overdue, utilizationPercent } = creditStatus
  
  const projectedOutstanding = outstanding + orderAmount
  const projectedUtilization = creditLimit > 0 ? (projectedOutstanding / creditLimit) * 100 : 0
  const willExceedLimit = projectedUtilization > 100

  let barColor = 'bg-emerald-500'
  let statusColor = 'text-emerald-400'
  let badgeVariant: 'success' | 'warning' | 'danger' = 'success'

  if (utilizationPercent >= 90 || willExceedLimit) {
    barColor = 'bg-red-500'
    statusColor = 'text-red-400'
    badgeVariant = 'danger'
  } else if (utilizationPercent >= 70) {
    barColor = 'bg-amber-500'
    statusColor = 'text-amber-400'
    badgeVariant = 'warning'
  }

  if (creditLimit === 0) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-500/10 flex items-center justify-center">
            <CreditCard size={20} className="text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">No Credit Limit</p>
            <p className="text-xs text-gray-400">Customer has no credit facility</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            utilizationPercent >= 90 ? 'bg-red-500/10' : utilizationPercent >= 70 ? 'bg-amber-500/10' : 'bg-emerald-500/10'
          )}>
            <CreditCard size={20} className={statusColor} />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Credit Status</p>
            <p className="text-xs text-gray-400">{utilizationPercent.toFixed(0)}% utilized</p>
          </div>
        </div>
        <Badge variant={badgeVariant}>
          {willExceedLimit ? 'BLOCKED' : utilizationPercent >= 90 ? 'CRITICAL' : utilizationPercent >= 70 ? 'WARNING' : 'HEALTHY'}
        </Badge>
      </div>

      <div className="h-3 bg-dark-300 rounded-full overflow-hidden flex mb-4">
        <div className={cn('h-full transition-all duration-500', barColor)} style={{ width: `${Math.min(utilizationPercent, 100)}%` }} />
        {orderAmount > 0 && (
          <div className={cn('h-full opacity-60 transition-all duration-500', willExceedLimit ? 'bg-red-400' : 'bg-blue-400')} style={{ width: `${Math.max(0, Math.min(projectedUtilization - utilizationPercent, 100 - utilizationPercent))}%` }} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 rounded-lg bg-dark-200/30">
          <p className="text-[10px] text-gray-400 uppercase">Credit Limit</p>
          <p className="text-sm font-semibold text-white">{formatCurrency(creditLimit)}</p>
        </div>
        <div className="p-2 rounded-lg bg-dark-200/30">
          <p className="text-[10px] text-gray-400 uppercase">Used</p>
          <p className={cn('text-sm font-semibold', utilizationPercent >= 90 ? 'text-red-400' : 'text-white')}>{formatCurrency(outstanding)}</p>
        </div>
        <div className="p-2 rounded-lg bg-dark-200/30">
          <p className="text-[10px] text-gray-400 uppercase">Available</p>
          <p className={cn('text-sm font-semibold', available < orderAmount ? 'text-red-400' : 'text-emerald-400')}>{formatCurrency(available)}</p>
        </div>
        <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/20">
          <p className="text-[10px] text-red-400 uppercase">Overdue</p>
          <p className="text-sm font-semibold text-red-400">{formatCurrency(overdue)}</p>
        </div>
      </div>

      {willExceedLimit && (
        <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400 text-center">Order will exceed credit limit by {formatCurrency(projectedOutstanding - creditLimit)}</p>
        </div>
      )}
    </div>
  )
}
