import { useState, useEffect } from 'react'
import { Zap, Turtle, Archive, Activity } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

type VelocityType = 'fast' | 'slow' | 'dead' | 'normal'

interface VelocityData {
  type: VelocityType
  consumptionRate: number
  totalConsumed: number
}

interface VelocityBadgeProps {
  materialId: string
  currentStock: number
  className?: string
  showLabel?: boolean
}

export function VelocityBadge({ materialId, currentStock, className, showLabel = true }: VelocityBadgeProps) {
  const [velocity, setVelocity] = useState<VelocityData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (materialId) {
      calculateVelocity()
    }
  }, [materialId, currentStock])

  const calculateVelocity = async () => {
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

      // Get additions from GRN in last 30 days
      const { data: added } = await supabase
        .from('grn_items')
        .select('accepted_quantity')
        .eq('raw_material_id', materialId)
        .gte('created_at', thirtyDaysAgo.toISOString())

      const totalConsumed = consumed?.reduce((sum, item) => sum + (item.issued_quantity || 0), 0) || 0
      const totalAdded = added?.reduce((sum, item) => sum + (item.accepted_quantity || 0), 0) || 0

      // Calculate initial stock 30 days ago
      const initialStock = currentStock + totalConsumed - totalAdded

      let type: VelocityType = 'normal'
      let consumptionRate = 0

      if (totalConsumed === 0) {
        // Check if there's been any consumption in last 60 days
        const sixtyDaysAgo = new Date()
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
        
        const { data: sixtyDayConsumption } = await supabase
          .from('work_order_materials')
          .select('issued_quantity')
          .eq('raw_material_id', materialId)
          .gte('created_at', sixtyDaysAgo.toISOString())

        const totalSixtyDayConsumption = sixtyDayConsumption?.reduce((sum, item) => sum + (item.issued_quantity || 0), 0) || 0
        
        if (totalSixtyDayConsumption === 0) {
          type = 'dead'
        } else {
          type = 'slow'
        }
      } else {
        consumptionRate = initialStock > 0 ? totalConsumed / initialStock : 0
        
        if (consumptionRate > 0.7) {
          type = 'fast'
        } else if (consumptionRate < 0.1) {
          type = 'slow'
        } else {
          type = 'normal'
        }
      }

      setVelocity({
        type,
        consumptionRate,
        totalConsumed,
      })
    } catch (error) {
      console.error('Failed to calculate velocity:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={cn('h-5 w-16 bg-dark-200 rounded animate-pulse', className)} />
    )
  }

  if (!velocity) return null

  const { type, consumptionRate } = velocity

  const velocityConfig = {
    fast: {
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      icon: Zap,
      label: 'Fast',
      description: 'High turnover',
    },
    normal: {
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      icon: Activity,
      label: 'Normal',
      description: 'Steady movement',
    },
    slow: {
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      icon: Turtle,
      label: 'Slow',
      description: 'Low movement',
    },
    dead: {
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
      borderColor: 'border-gray-500/20',
      icon: Archive,
      label: 'Dead',
      description: 'No movement',
    },
  }

  const config = velocityConfig[type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium',
        config.bgColor,
        config.borderColor,
        config.color,
        className
      )}
      title={`${config.description} (${(consumptionRate * 100).toFixed(0)}% consumed)`}
    >
      <Icon size={12} />
      {showLabel && <span>{config.label}</span>}
    </div>
  )
}

// Simple dot version for compact tables
export function VelocityDot({ materialId, currentStock }: { materialId: string; currentStock: number }) {
  const [type, setType] = useState<VelocityType>('normal')

  useEffect(() => {
    calculateType()
  }, [materialId, currentStock])

  const calculateType = async () => {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: consumed } = await supabase
        .from('work_order_materials')
        .select('issued_quantity')
        .eq('raw_material_id', materialId)
        .gte('created_at', thirtyDaysAgo.toISOString())

      const totalConsumed = consumed?.reduce((sum, item) => sum + (item.issued_quantity || 0), 0) || 0

      if (totalConsumed === 0) {
        setType('dead')
        return
      }

      const { data: added } = await supabase
        .from('grn_items')
        .select('accepted_quantity')
        .eq('raw_material_id', materialId)
        .gte('created_at', thirtyDaysAgo.toISOString())

      const totalAdded = added?.reduce((sum, item) => sum + (item.accepted_quantity || 0), 0) || 0
      const initialStock = currentStock + totalConsumed - totalAdded
      const rate = initialStock > 0 ? totalConsumed / initialStock : 0

      if (rate > 0.7) setType('fast')
      else if (rate < 0.1) setType('slow')
      else setType('normal')
    } catch (error) {
      console.error('Failed to calculate velocity type:', error)
    }
  }

  const colors = {
    fast: 'bg-emerald-500',
    normal: 'bg-blue-500',
    slow: 'bg-amber-500',
    dead: 'bg-gray-500',
  }

  return (
    <div
      className={cn('w-2 h-2 rounded-full', colors[type])}
      title={`Velocity: ${type}`}
    />
  )
}
