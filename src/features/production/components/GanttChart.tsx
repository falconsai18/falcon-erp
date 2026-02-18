import { useState, useMemo } from 'react'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isWithinInterval, differenceInDays } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar, Clock, AlertCircle, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { WorkOrder } from '@/services/workOrderService'

interface GanttChartProps {
  orders: WorkOrder[]
  onOrderClick?: (orderId: string) => void
  loading?: boolean
}

type ViewMode = 'week' | 'month'

export function GanttChart({ orders, onOrderClick, loading }: GanttChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday start
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return eachDayOfInterval({ start, end })
    } else {
      // Month view - show 4 weeks
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = addDays(start, 27) // 4 weeks
      return eachDayOfInterval({ start, end })
    }
  }, [currentDate, viewMode])

  // Filter active orders (not completed, not cancelled)
  const activeOrders = useMemo(() => {
    return orders.filter(o => 
      o.status !== 'cancelled' && 
      (o.planned_start_date || o.actual_start_date)
    ).sort((a, b) => {
      // Sort by start date
      const dateA = new Date(a.actual_start_date || a.planned_start_date || 0)
      const dateB = new Date(b.actual_start_date || b.planned_start_date || 0)
      return dateA.getTime() - dateB.getTime()
    })
  }, [orders])

  // Calculate bar position and width
  const getBarStyle = (order: WorkOrder) => {
    const rangeStart = dateRange[0]
    const rangeEnd = dateRange[dateRange.length - 1]
    
    const startDate = new Date(order.actual_start_date || order.planned_start_date || rangeStart)
    const endDate = order.actual_end_date 
      ? new Date(order.actual_end_date)
      : order.planned_end_date 
        ? new Date(order.planned_end_date)
        : addDays(startDate, 7)

    // Calculate position
    const daysFromStart = Math.max(0, differenceInDays(startDate, rangeStart))
    const duration = Math.max(1, differenceInDays(endDate, startDate) + 1)
    
    const totalDays = dateRange.length
    const leftPercent = (daysFromStart / totalDays) * 100
    const widthPercent = (duration / totalDays) * 100

    return {
      left: `${leftPercent}%`,
      width: `${Math.min(widthPercent, 100 - leftPercent)}%`,
    }
  }

  // Determine bar color based on status
  const getBarColor = (order: WorkOrder) => {
    const today = new Date()
    const endDate = order.planned_end_date ? new Date(order.planned_end_date) : null
    const isDelayed = endDate && endDate < today && order.status !== 'completed'

    if (isDelayed) {
      return 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/30'
    }

    switch (order.status) {
      case 'completed':
        return 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/30'
      case 'in_progress':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/30'
      case 'planned':
      case 'material_issued':
        return 'bg-gradient-to-r from-gray-500 to-gray-600 shadow-gray-500/30'
      case 'quality_check':
        return 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-500/30'
      default:
        return 'bg-gradient-to-r from-purple-500 to-purple-600 shadow-purple-500/30'
    }
  }

  // Get status icon
  const getStatusIcon = (order: WorkOrder) => {
    const today = new Date()
    const endDate = order.planned_end_date ? new Date(order.planned_end_date) : null
    const isDelayed = endDate && endDate < today && order.status !== 'completed'

    if (isDelayed) return AlertCircle
    if (order.status === 'completed') return CheckCircle2
    if (order.status === 'in_progress') return Clock
    return Circle
  }

  // Calculate completion percentage
  const getCompletionPercent = (order: WorkOrder) => {
    if (order.status === 'completed') return 100
    if (!order.actual_quantity || !order.batch_size) return 0
    return Math.min(100, Math.round((order.actual_quantity / order.batch_size) * 100))
  }

  const navigatePrev = () => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, -7))
    } else {
      setCurrentDate(addDays(currentDate, -28))
    }
  }

  const navigateNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, 7))
    } else {
      setCurrentDate(addDays(currentDate, 28))
    }
  }

  const goToToday = () => setCurrentDate(new Date())

  if (loading) {
    return (
      <div className="glass-card p-6 space-y-4">
        <div className="h-8 bg-dark-200 rounded-lg animate-pulse w-1/3" />
        <div className="h-64 bg-dark-200 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-dark-300/30">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calendar size={18} className="text-purple-400" />
            Production Schedule
          </h3>
          <p className="text-xs text-dark-500 mt-0.5">
            {activeOrders.length} active work orders
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-dark-200/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                viewMode === 'week' 
                  ? 'bg-purple-500/20 text-purple-400' 
                  : 'text-dark-500 hover:text-white'
              )}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                viewMode === 'month' 
                  ? 'bg-purple-500/20 text-purple-400' 
                  : 'text-dark-500 hover:text-white'
              )}
            >
              Month
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={navigatePrev}
              className="p-1.5 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-dark-500 hover:text-white hover:bg-dark-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={navigateNext}
              className="p-1.5 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Date Header */}
          <div className="flex border-b border-dark-300/30">
            {/* Order Label Column */}
            <div className="w-48 flex-shrink-0 p-3 border-r border-dark-300/30 bg-dark-200/20">
              <p className="text-xs font-medium text-dark-500 uppercase tracking-wider">Work Order</p>
            </div>
            
            {/* Date Columns */}
            <div className="flex-1 flex">
              {dateRange.map((date, index) => {
                const isToday = isSameDay(date, new Date())
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                
                return (
                  <div
                    key={index}
                    className={cn(
                      'flex-1 min-w-[40px] py-2 text-center border-r border-dark-300/20 last:border-r-0',
                      isToday && 'bg-purple-500/10',
                      isWeekend && 'bg-dark-200/30'
                    )}
                  >
                    <p className={cn(
                      'text-[10px] font-medium',
                      isToday ? 'text-purple-400' : 'text-dark-500'
                    )}>
                      {format(date, 'EEE')}
                    </p>
                    <p className={cn(
                      'text-xs font-semibold mt-0.5',
                      isToday ? 'text-purple-400' : 'text-white'
                    )}>
                      {format(date, 'd')}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Orders */}
          <div className="divide-y divide-dark-300/20">
            {activeOrders.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-dark-500 text-sm">No active work orders for this period</p>
              </div>
            ) : (
              activeOrders.map((order) => {
                const barStyle = getBarStyle(order)
                const barColor = getBarColor(order)
                const StatusIcon = getStatusIcon(order)
                const completion = getCompletionPercent(order)
                const today = new Date()
                const endDate = order.planned_end_date ? new Date(order.planned_end_date) : null
                const isDelayed = endDate && endDate < today && order.status !== 'completed'

                return (
                  <div
                    key={order.id}
                    className="flex hover:bg-dark-200/20 transition-colors group"
                  >
                    {/* Order Info */}
                    <div className="w-48 flex-shrink-0 p-3 border-r border-dark-300/30">
                      <div className="flex items-center gap-2">
                        <StatusIcon 
                          size={14} 
                          className={cn(
                            isDelayed ? 'text-red-400' :
                            order.status === 'completed' ? 'text-emerald-400' :
                            order.status === 'in_progress' ? 'text-blue-400' :
                            'text-gray-400'
                          )} 
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">
                            {order.work_order_number}
                          </p>
                          <p className="text-[10px] text-dark-500 truncate">
                            {order.product_name}
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress bar under order name */}
                      {order.status === 'in_progress' && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1 bg-dark-300 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${completion}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-blue-400">{completion}%</span>
                        </div>
                      )}
                    </div>

                    {/* Timeline */}
                    <div className="flex-1 relative py-3 px-1">
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex">
                        {dateRange.map((_, i) => (
                          <div
                            key={i}
                            className="flex-1 border-r border-dark-300/10 last:border-r-0"
                          />
                        ))}
                      </div>

                      {/* Bar */}
                      <div
                        onClick={() => onOrderClick?.(order.id)}
                        className={cn(
                          'absolute h-7 rounded-lg cursor-pointer transition-all duration-300 hover:scale-y-110 hover:brightness-110 shadow-lg',
                          barColor
                        )}
                        style={{
                          left: barStyle.left,
                          width: barStyle.width,
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                        title={`${order.work_order_number} - ${order.product_name}`}
                      >
                        {/* Inner progress for in-progress orders */}
                        {order.status === 'in_progress' && (
                          <div 
                            className="h-full bg-white/20 rounded-lg"
                            style={{ width: `${completion}%` }}
                          />
                        )}
                        
                        {/* Delayed indicator */}
                        {isDelayed && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 p-4 border-t border-dark-300/30 bg-dark-200/10">
        <p className="text-xs text-dark-500">Legend:</p>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-500 to-blue-600" />
          <span className="text-[10px] text-dark-500">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-emerald-500 to-emerald-600" />
          <span className="text-[10px] text-dark-500">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-gray-500 to-gray-600" />
          <span className="text-[10px] text-dark-500">Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-red-500 to-red-600" />
          <span className="text-[10px] text-dark-500">Delayed</span>
        </div>
      </div>
    </div>
  )
}
