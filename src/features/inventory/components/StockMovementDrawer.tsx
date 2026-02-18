import { useState, useEffect } from 'react'
import { X, ArrowDownLeft, ArrowUpRight, Trash2, Package, Calendar, User } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { RawMaterial } from '@/services/rawMaterialService'

interface StockMovement {
  id: string
  date: string
  type: 'IN' | 'OUT' | 'SCRAP'
  quantity: number
  reference: string
  referenceType: string
  user: string | null
  notes?: string | null
}

interface StockMovementDrawerProps {
  isOpen: boolean
  onClose: () => void
  material: RawMaterial | null
}

export function StockMovementDrawer({ isOpen, onClose, material }: StockMovementDrawerProps) {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && material) {
      loadMovements()
    }
  }, [isOpen, material])

  const loadMovements = async () => {
    if (!material) return

    try {
      setLoading(true)

      const allMovements: StockMovement[] = []

      // 1. Get GRN entries (Stock IN)
      const { data: grnItems } = await supabase
        .from('grn_items')
        .select(`
          id,
          accepted_quantity,
          created_at,
          grn!inner(grn_number, status, created_by),
          raw_materials!inner(unit_of_measure)
        `)
        .eq('raw_material_id', material.id)
        .eq('grn.status', 'accepted')
        .order('created_at', { ascending: false })

      grnItems?.forEach((item: any) => {
        allMovements.push({
          id: `grn-${item.id}`,
          date: item.created_at,
          type: 'IN',
          quantity: item.accepted_quantity,
          reference: item.grn?.grn_number || 'Unknown',
          referenceType: 'GRN',
          user: item.grn?.created_by,
        })
      })

      // 2. Get Work Order consumption (Stock OUT)
      const { data: woMaterials } = await supabase
        .from('work_order_materials')
        .select(`
          id,
          issued_quantity,
          created_at,
          work_orders!inner(work_order_number, status, created_by)
        `)
        .eq('raw_material_id', material.id)
        .gt('issued_quantity', 0)
        .order('created_at', { ascending: false })

      woMaterials?.forEach((item: any) => {
        allMovements.push({
          id: `wo-${item.id}`,
          date: item.created_at,
          type: 'OUT',
          quantity: item.issued_quantity,
          reference: item.work_orders?.work_order_number || 'Unknown',
          referenceType: 'Work Order',
          user: item.work_orders?.created_by,
        })
      })

      // 3. Get Scrap records (Stock SCRAP)
      const { data: scrapRecords } = await supabase
        .from('scrap_records')
        .select(`
          id,
          quantity,
          reason,
          created_at,
          work_orders!inner(work_order_number),
          recorded_by
        `)
        .eq('raw_material_id', material.id)
        .order('created_at', { ascending: false })

      scrapRecords?.forEach((item: any) => {
        allMovements.push({
          id: `scrap-${item.id}`,
          date: item.created_at,
          type: 'SCRAP',
          quantity: item.quantity,
          reference: item.work_orders?.work_order_number || 'Unknown',
          referenceType: 'Scrap',
          user: item.recorded_by,
          notes: item.reason,
        })
      })

      // Sort by date (newest first)
      allMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setMovements(allMovements)
    } catch (error) {
      console.error('Failed to load stock movements:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !material) return null

  const typeConfig = {
    IN: {
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      icon: ArrowDownLeft,
      label: 'Stock In',
    },
    OUT: {
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      icon: ArrowUpRight,
      label: 'Stock Out',
    },
    SCRAP: {
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      icon: Trash2,
      label: 'Scrap',
    },
  }

  // Calculate running balance
  let runningBalance = material.current_stock
  const movementsWithBalance = movements.map(m => {
    const balance = runningBalance
    if (m.type === 'IN') {
      runningBalance -= m.quantity
    } else {
      runningBalance += m.quantity
    }
    return { ...m, balance }
  })

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-md bg-gray-900 border-l border-dark-300/50 z-50',
          'transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-300/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Package size={20} className="text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Stock History</h3>
              <p className="text-xs text-gray-400">{material.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current Stock Summary */}
        <div className="p-4 border-b border-dark-300/30 bg-dark-200/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase">Current Stock</p>
              <p className="text-2xl font-bold text-white">
                {material.current_stock} <span className="text-sm text-gray-400">{material.unit_of_measure}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase">Value</p>
              <p className="text-lg font-semibold text-emerald-400">
                {formatCurrency(material.current_stock * material.unit_cost)}
              </p>
            </div>
          </div>
        </div>

        {/* Movement List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-dark-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No stock movements yet</p>
              <p className="text-xs text-gray-500 mt-1">GRN receipts and production usage will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {movementsWithBalance.map((movement) => {
                const config = typeConfig[movement.type]
                const Icon = config.icon

                return (
                  <div
                    key={movement.id}
                    className={cn(
                      'p-3 rounded-lg border transition-colors',
                      config.bgColor,
                      config.borderColor
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn('p-1.5 rounded-lg bg-dark-200/50')}>
                          <Icon size={14} className={config.color} />
                        </div>
                        <div>
                          <p className={cn('text-sm font-medium', config.color)}>
                            {movement.type === 'IN' ? '+' : '-'}{movement.quantity} {material.unit_of_measure}
                          </p>
                          <p className="text-[10px] text-gray-400">{config.label}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">{formatDate(movement.date)}</p>
                        <p className="text-[10px] text-gray-500">Balance: {movement.balance}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-dark-300/30">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400">Ref:</span>
                        <Badge variant="default" className="text-[10px]">
                          {movement.referenceType}
                        </Badge>
                        <span className="text-xs text-white font-mono">{movement.reference}</span>
                      </div>
                    </div>

                    {movement.notes && (
                      <p className="text-[10px] text-gray-400 mt-2">Note: {movement.notes}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-dark-300/50 bg-gray-900">
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </>
  )
}
