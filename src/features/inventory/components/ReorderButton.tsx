import { useState, useEffect } from 'react'
import { ShoppingCart, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import type { RawMaterial } from '@/services/rawMaterialService'

interface ReorderSuggestion {
  suggestedQty: number
  avgMonthlyConsumption: number
  daysUntilStockout: number | null
  isUrgent: boolean
}

interface ReorderButtonProps {
  material: RawMaterial
  onReorder?: () => void
  showDetails?: boolean
}

export function ReorderButton({ material, onReorder, showDetails = true }: ReorderButtonProps) {
  const navigate = useNavigate()
  const [suggestion, setSuggestion] = useState<ReorderSuggestion | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    calculateReorderSuggestion()
  }, [material.id, material.current_stock])

  const calculateReorderSuggestion = async () => {
    try {
      setLoading(true)

      // Get consumption for last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: consumed } = await supabase
        .from('work_order_materials')
        .select('issued_quantity')
        .eq('raw_material_id', material.id)
        .gte('created_at', thirtyDaysAgo.toISOString())

      const totalConsumed30Days = consumed?.reduce((sum, item) => sum + (item.issued_quantity || 0), 0) || 0
      const avgDailyConsumption = totalConsumed30Days / 30
      const avgMonthlyConsumption = totalConsumed30Days

      // Calculate days until stockout
      let daysUntilStockout: number | null = null
      if (avgDailyConsumption > 0) {
        daysUntilStockout = Math.floor(material.current_stock / avgDailyConsumption)
      }

      // Calculate suggested quantity (2 months supply minus current stock)
      let suggestedQty = 0
      if (avgMonthlyConsumption > 0) {
        suggestedQty = Math.max(0, Math.ceil(avgMonthlyConsumption * 2 - material.current_stock))
      } else {
        // If no consumption history, suggest reorder_point amount
        suggestedQty = Math.max(0, material.reorder_point - material.current_stock)
      }

      // Check if urgent (less than 14 days or below reorder point)
      const isUrgent = (daysUntilStockout !== null && daysUntilStockout < 14) || 
                       material.current_stock <= material.reorder_point

      setSuggestion({
        suggestedQty,
        avgMonthlyConsumption,
        daysUntilStockout,
        isUrgent,
      })
    } catch (error) {
      console.error('Failed to calculate reorder suggestion:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReorder = async () => {
    if (!suggestion || suggestion.suggestedQty <= 0) {
      toast.error('No reorder needed or calculation failed')
      return
    }

    try {
      setIsCreating(true)

      toast.success(`Preparing PO for ${material.name}`, {
        description: `Suggested qty: ${suggestion.suggestedQty} ${material.unit_of_measure}`,
      })

      onReorder?.()

      // Navigate to purchase page with pre-fill params
      const params = new URLSearchParams({
        material_id: material.id,
        quantity: suggestion.suggestedQty.toString(),
        material_name: material.name,
        cost: material.unit_cost.toString(),
        unit: material.unit_of_measure,
      })
      
      navigate(`/purchase?${params.toString()}`)
    } catch (error: any) {
      toast.error('Failed to initiate reorder: ' + error.message)
    } finally {
      setIsCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="h-8 w-24 bg-dark-200 rounded animate-pulse" />
    )
  }

  if (!suggestion) return null

  // Don't show if stock is healthy and no reorder needed
  if (!suggestion.isUrgent && suggestion.suggestedQty <= 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Stock Healthy
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {showDetails && (
        <div className="p-3 rounded-lg bg-dark-200/30 border border-dark-300/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Days Until Stockout</span>
            <span className={cn(
              'text-sm font-semibold',
              suggestion.daysUntilStockout !== null && suggestion.daysUntilStockout < 7 
                ? 'text-red-400' 
                : suggestion.daysUntilStockout !== null && suggestion.daysUntilStockout < 14
                  ? 'text-amber-400'
                  : 'text-emerald-400'
            )}>
              {suggestion.daysUntilStockout !== null ? `${suggestion.daysUntilStockout} days` : 'Static'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Suggested Qty</span>
            <span className="text-sm font-semibold text-white">
              {suggestion.suggestedQty} {material.unit_of_measure}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-400">Est. Cost</span>
            <span className="text-sm font-semibold text-emerald-400">
              {formatCurrency(suggestion.suggestedQty * material.unit_cost)}
            </span>
          </div>
        </div>
      )}

      <Button
        size="sm"
        variant={suggestion.isUrgent ? 'danger' : 'secondary'}
        onClick={handleReorder}
        isLoading={isCreating}
        icon={isCreating ? <Loader2 size={14} /> : <ShoppingCart size={14} />}
        className="w-full"
      >
        {suggestion.isUrgent ? 'Reorder Now (Urgent)' : 'Reorder'}
      </Button>

      {suggestion.isUrgent && (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle size={12} />
          <span>Stock critically low</span>
        </div>
      )}
    </div>
  )
}

// Compact version for table rows
export function ReorderButtonCompact({ material }: { material: RawMaterial }) {
  const navigate = useNavigate()
  const [isUrgent, setIsUrgent] = useState(false)
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUrgency()
  }, [material.id, material.current_stock])

  const checkUrgency = async () => {
    try {
      setLoading(true)

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: consumed } = await supabase
        .from('work_order_materials')
        .select('issued_quantity')
        .eq('raw_material_id', material.id)
        .gte('created_at', thirtyDaysAgo.toISOString())

      const totalConsumed = consumed?.reduce((sum, item) => sum + (item.issued_quantity || 0), 0) || 0
      const avgDaily = totalConsumed / 30

      let calculatedDaysLeft: number | null = null
      if (avgDaily > 0) {
        calculatedDaysLeft = Math.floor(material.current_stock / avgDaily)
      }
      setDaysLeft(calculatedDaysLeft)

      // Show button if:
      // - Days left < 14, OR
      // - Current stock <= reorder_point (critical), OR
      // - Current stock <= reorder_point * 1.2 (within 20% of reorder point - near critical)
      const isCritical = material.current_stock <= material.reorder_point
      const isNearCritical = material.current_stock <= (material.reorder_point * 1.2)
      const isLowDays = calculatedDaysLeft !== null && calculatedDaysLeft < 14
      
      setIsUrgent(isCritical || isNearCritical || isLowDays)
    } catch (error) {
      console.error('Failed to check urgency:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClick = () => {
    // Calculate suggested quantity
    const suggestedQty = Math.max(0, material.reorder_point * 2 - material.current_stock)
    
    const params = new URLSearchParams({
      material_id: material.id,
      quantity: (suggestedQty || material.reorder_point).toString(),
      material_name: material.name,
      cost: material.unit_cost.toString(),
      unit: material.unit_of_measure,
    })
    
    navigate(`/purchase?${params.toString()}`)
  }

  if (loading) {
    return <div className="h-6 w-16 bg-dark-200 rounded animate-pulse" />
  }

  // Only hide if stock is healthy (well above reorder point AND days left >= 14)
  const isHealthy = material.current_stock > (material.reorder_point * 1.2) && 
                    (daysLeft === null || daysLeft >= 14)
  
  if (isHealthy) {
    return null
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={handleClick}
      icon={<ShoppingCart size={12} />}
      className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30"
    >
      Reorder
    </Button>
  )
}
