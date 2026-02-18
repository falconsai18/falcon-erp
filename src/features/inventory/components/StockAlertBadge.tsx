import { useState, useEffect } from 'react'
import { Clock, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface StockAlertData {
  daysUntilStockout: number | null
  avgDailyConsumption: number
  status: 'critical' | 'warning' | 'safe' | 'static'
}

interface StockAlertBadgeProps {
  materialId: string
  currentStock: number
  reorderLevel: number
  className?: string
}

export function StockAlertBadge({ materialId, currentStock, reorderLevel, className }: StockAlertBadgeProps) {
  const [alertData, setAlertData] = useState<StockAlertData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (materialId) {
      calculateStockAlert()
    }
  }, [materialId, currentStock])

  const calculateStockAlert = async () => {
    try {
      setLoading(true)

      // Get consumption data for last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: consumed } = await supabase
        .from('work_order_materials')
        .select('issued_quantity')
        .eq('raw_material_id', materialId)
        .gte('created_at', thirtyDaysAgo.toISOString())

      const totalConsumed = consumed?.reduce((sum, item) => sum + (item.issued_quantity || 0), 0) || 0
      const avgDailyConsumption = totalConsumed / 30

      let daysUntilStockout: number | null = null
      let status: StockAlertData['status'] = 'safe'

      if (avgDailyConsumption === 0) {
        status = 'static'
        daysUntilStockout = null
      } else {
        daysUntilStockout = Math.floor(currentStock / avgDailyConsumption)
        
        if (daysUntilStockout < 7) {
          status = 'critical'
        } else if (daysUntilStockout < 14) {
          status = 'warning'
        } else {
          status = 'safe'
        }
      }

      setAlertData({
        daysUntilStockout,
        avgDailyConsumption,
        status,
      })
    } catch (error) {
      console.error('Failed to calculate stock alert:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={cn('h-5 w-20 bg-dark-200 rounded animate-pulse', className)} />
    )
  }

  if (!alertData) return null

  const { daysUntilStockout, status } = alertData

  const statusConfig = {
    critical: {
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      icon: AlertCircle,
      label: daysUntilStockout !== null ? `${daysUntilStockout}d left` : 'Critical',
    },
    warning: {
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      icon: Clock,
      label: daysUntilStockout !== null ? `${daysUntilStockout}d left` : 'Warning',
    },
    safe: {
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      icon: Clock,
      label: daysUntilStockout !== null ? `${daysUntilStockout}d left` : 'Safe',
    },
    static: {
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
      borderColor: 'border-gray-500/20',
      icon: Clock,
      label: 'Static',
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium',
        config.bgColor,
        config.borderColor,
        config.color,
        status === 'critical' && 'animate-pulse',
        className
      )}
    >
      <Icon size={12} />
      <span>{config.label}</span>
      {status === 'critical' && (
        <span className="ml-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
      )}
    </div>
  )
}

// Compact version for table rows
export function StockAlertBadgeCompact({ materialId, currentStock }: { materialId: string; currentStock: number }) {
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [status, setStatus] = useState<'critical' | 'warning' | 'safe' | 'static'>('safe')

  useEffect(() => {
    calculateDaysLeft()
  }, [materialId, currentStock])

  const calculateDaysLeft = async () => {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: consumed } = await supabase
        .from('work_order_materials')
        .select('issued_quantity')
        .eq('raw_material_id', materialId)
        .gte('created_at', thirtyDaysAgo.toISOString())

      const totalConsumed = consumed?.reduce((sum, item) => sum + (item.issued_quantity || 0), 0) || 0
      const avgDaily = totalConsumed / 30

      if (avgDaily === 0) {
        setStatus('static')
        setDaysLeft(null)
      } else {
        const days = Math.floor(currentStock / avgDaily)
        setDaysLeft(days)
        
        if (days < 7) setStatus('critical')
        else if (days < 14) setStatus('warning')
        else setStatus('safe')
      }
    } catch (error) {
      console.error('Failed to calculate days left:', error)
    }
  }

  const statusColors = {
    critical: 'bg-red-500',
    warning: 'bg-amber-500',
    safe: 'bg-emerald-500',
    static: 'bg-gray-500',
  }

  return (
    <div className="flex items-center gap-2">
      <div className={cn('w-2 h-2 rounded-full', statusColors[status], status === 'critical' && 'animate-pulse')} />
      <span className={cn(
        'text-xs font-medium',
        status === 'critical' ? 'text-red-400' : status === 'warning' ? 'text-amber-400' : 'text-gray-400'
      )}>
        {daysLeft !== null ? `${daysLeft}d` : '—'}
      </span>
    </div>
  )
}
