import { useEffect, useState } from 'react'
import { Factory, CheckCircle, AlertTriangle, Trash2, TrendingDown, TrendingUp, Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { getTodayScrapCost, getThisMonthScrapCost, type ScrapStats } from '@/services/scrapService'
import type { WorkOrder } from '@/services/workOrderService'

interface ProductionKPIsProps {
  orders: WorkOrder[]
  loading?: boolean
}

export function ProductionKPIs({ orders, loading }: ProductionKPIsProps) {
  const [todayScrapCost, setTodayScrapCost] = useState(0)
  const [monthScrapCost, setMonthScrapCost] = useState(0)
  const [scrapLoading, setScrapLoading] = useState(true)

  useEffect(() => {
    loadScrapStats()
  }, [])

  const loadScrapStats = async () => {
    try {
      setScrapLoading(true)
      const [today, month] = await Promise.all([
        getTodayScrapCost(),
        getThisMonthScrapCost(),
      ])
      setTodayScrapCost(today)
      setMonthScrapCost(month)
    } catch (error) {
      console.error('Failed to load scrap stats:', error)
    } finally {
      setScrapLoading(false)
    }
  }

  // Calculate KPIs
  const activeOrders = orders.filter(o => 
    ['planned', 'material_issued', 'in_progress', 'quality_check'].includes(o.status)
  ).length

  const completedToday = orders.filter(o => {
    if (o.status !== 'completed' || !o.actual_end_date) return false
    const today = new Date().toISOString().split('T')[0]
    return o.actual_end_date?.startsWith(today)
  }).length

  const today = new Date().toISOString().split('T')[0]
  const delayedOrders = orders.filter(o => {
    if (o.status === 'completed' || o.status === 'cancelled') return false
    if (!o.planned_end_date) return false
    return new Date(o.planned_end_date) < new Date(today)
  }).length

  const kpiData = [
    {
      label: 'Active Orders',
      value: activeOrders,
      icon: Factory,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      trend: null,
      subtitle: 'In production',
    },
    {
      label: 'Completed Today',
      value: completedToday,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      trend: null,
      subtitle: 'Finished today',
    },
    {
      label: 'Delayed Orders',
      value: delayedOrders,
      icon: AlertTriangle,
      color: delayedOrders > 0 ? 'text-red-400' : 'text-dark-500',
      bgColor: delayedOrders > 0 ? 'bg-red-500/10' : 'bg-dark-200/50',
      trend: null,
      subtitle: 'Past due date',
      alert: delayedOrders > 0,
    },
    {
      label: 'Scrap Cost (Month)',
      value: scrapLoading ? '...' : formatCurrency(monthScrapCost),
      rawValue: monthScrapCost,
      icon: Trash2,
      color: monthScrapCost > 0 ? 'text-amber-400' : 'text-dark-500',
      bgColor: monthScrapCost > 0 ? 'bg-amber-500/10' : 'bg-dark-200/50',
      trend: todayScrapCost > 0 ? { value: `+${formatCurrency(todayScrapCost)} today`, up: false } : null,
      subtitle: 'Total waste cost',
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="h-8 w-8 bg-dark-200 rounded-lg mb-3" />
            <div className="h-6 bg-dark-200 rounded w-16 mb-2" />
            <div className="h-3 bg-dark-200 rounded w-24" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiData.map((kpi) => (
        <Card
          key={kpi.label}
          className={cn(
            'glass-card p-4 relative overflow-hidden transition-all duration-300 hover:scale-[1.02]',
            kpi.alert && 'border-red-500/30 ring-1 ring-red-500/20'
          )}
        >
          {/* Background gradient decoration */}
          <div className={cn(
            'absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-20 blur-2xl',
            kpi.bgColor
          )} />
          
          {/* Icon */}
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center mb-3 relative z-10',
            kpi.bgColor
          )}>
            <kpi.icon className={cn('w-5 h-5', kpi.color)} />
          </div>

          {/* Value */}
          <div className="relative z-10">
            <p className={cn('text-2xl font-bold', kpi.color)}>
              {kpi.rawValue !== undefined && kpi.rawValue === 0 && !scrapLoading ? (
                <span className="text-dark-500">₹0</span>
              ) : (
                kpi.value
              )}
            </p>
            <p className="text-xs text-dark-500 mt-0.5">{kpi.label}</p>
            
            {/* Trend indicator */}
            {kpi.trend && (
              <div className="flex items-center gap-1 mt-1.5">
                {kpi.trend.up ? (
                  <TrendingUp size={12} className="text-emerald-400" />
                ) : (
                  <TrendingDown size={12} className="text-red-400" />
                )}
                <span className={cn(
                  'text-[10px] font-medium',
                  kpi.trend.up ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {kpi.trend.value}
                </span>
              </div>
            )}
            
            {!kpi.trend && kpi.subtitle && (
              <p className="text-[10px] text-dark-600 mt-1">{kpi.subtitle}</p>
            )}
          </div>

          {/* Alert indicator for delayed orders */}
          {kpi.alert && (
            <div className="absolute top-3 right-3">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

// Compact version for detail panels
export function ProductionKPIsCompact({ orders, loading }: ProductionKPIsProps) {
  const activeOrders = orders.filter(o => 
    ['planned', 'material_issued', 'in_progress', 'quality_check'].includes(o.status)
  ).length

  const completedToday = orders.filter(o => {
    if (o.status !== 'completed' || !o.actual_end_date) return false
    const today = new Date().toISOString().split('T')[0]
    return o.actual_end_date?.startsWith(today)
  }).length

  const today = new Date().toISOString().split('T')[0]
  const delayedOrders = orders.filter(o => {
    if (o.status === 'completed' || o.status === 'cancelled') return false
    if (!o.planned_end_date) return false
    return new Date(o.planned_end_date) < new Date(today)
  }).length

  if (loading) {
    return (
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-24 bg-dark-200 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <Factory size={14} className="text-blue-400" />
        <div>
          <p className="text-xs font-semibold text-blue-400">{activeOrders}</p>
          <p className="text-[10px] text-blue-400/70">Active</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <CheckCircle size={14} className="text-emerald-400" />
        <div>
          <p className="text-xs font-semibold text-emerald-400">{completedToday}</p>
          <p className="text-[10px] text-emerald-400/70">Done Today</p>
        </div>
      </div>
      
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border',
        delayedOrders > 0 
          ? 'bg-red-500/10 border-red-500/20' 
          : 'bg-dark-200/50 border-dark-300/30'
      )}>
        <Clock size={14} className={delayedOrders > 0 ? 'text-red-400' : 'text-dark-500'} />
        <div>
          <p className={cn('text-xs font-semibold', delayedOrders > 0 ? 'text-red-400' : 'text-dark-500')}>
            {delayedOrders}
          </p>
          <p className={cn('text-[10px]', delayedOrders > 0 ? 'text-red-400/70' : 'text-dark-600')}>
            Delayed
          </p>
        </div>
      </div>
    </div>
  )
}
