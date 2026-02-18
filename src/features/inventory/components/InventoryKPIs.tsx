import { useState, useEffect } from 'react'
import { Package, AlertTriangle, TrendingDown, IndianRupee, Zap, Archive } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn, formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { RawMaterial } from '@/services/rawMaterialService'

interface InventoryKPIsProps {
  materials: RawMaterial[]
  loading?: boolean
}

interface VelocityData {
  fast: number
  slow: number
  dead: number
  normal: number
}

interface TopConsumed {
  name: string
  consumed: number
}

export function InventoryKPIs({ materials, loading }: InventoryKPIsProps) {
  const [velocity, setVelocity] = useState<VelocityData>({ fast: 0, slow: 0, dead: 0, normal: 0 })
  const [topConsumed, setTopConsumed] = useState<TopConsumed[]>([])
  const [totalValue, setTotalValue] = useState(0)
  const [criticalCount, setCriticalCount] = useState(0)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (materials.length > 0) {
      calculateMetrics()
    }
  }, [materials])

  const calculateMetrics = async () => {
    try {
      setDataLoading(true)

      // Calculate total stock value
      const stockValue = materials.reduce((sum, m) => sum + (m.current_stock * m.unit_cost), 0)
      setTotalValue(stockValue)

      // Count critical items (stock < reorder_point)
      const critical = materials.filter(m => m.current_stock <= m.reorder_point).length
      setCriticalCount(critical)

      // Get consumption data for last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: consumed } = await supabase
        .from('work_order_materials')
        .select('raw_material_id, issued_quantity, work_orders!inner(status, actual_end_date)')
        .gte('work_orders.actual_end_date', thirtyDaysAgo.toISOString())
        .eq('work_orders.status', 'completed')

      const { data: grnData } = await supabase
        .from('grn_items')
        .select('raw_material_id, accepted_quantity, grn!inner(status, accepted_at)')
        .gte('grn.accepted_at', thirtyDaysAgo.toISOString())
        .eq('grn.status', 'accepted')

      // Calculate velocity for each material
      const velocityMap = new Map<string, { consumed: number; added: number; current: number }>()

      materials.forEach(m => {
        velocityMap.set(m.id, { consumed: 0, added: 0, current: m.current_stock })
      })

      consumed?.forEach((item: any) => {
        const existing = velocityMap.get(item.raw_material_id)
        if (existing) {
          existing.consumed += item.issued_quantity || 0
        }
      })

      grnData?.forEach((item: any) => {
        const existing = velocityMap.get(item.raw_material_id)
        if (existing) {
          existing.added += item.accepted_quantity || 0
        }
      })

      // Categorize velocity
      let fast = 0, slow = 0, dead = 0, normal = 0
      const topConsumedList: TopConsumed[] = []

      velocityMap.forEach((data, id) => {
        const material = materials.find(m => m.id === id)
        if (!material) return

        // Calculate consumption rate
        const initialStock = data.current + data.consumed - data.added
        const consumptionRate = initialStock > 0 ? (data.consumed / initialStock) : 0

        if (data.consumed === 0) {
          // Check if dead stock (no consumption for 60 days)
          dead++
        } else if (consumptionRate > 0.7) {
          fast++
        } else if (consumptionRate < 0.1) {
          slow++
        } else {
          normal++
        }

        if (data.consumed > 0) {
          topConsumedList.push({ name: material.name.substring(0, 15), consumed: data.consumed })
        }
      })

      setVelocity({ fast, slow, dead, normal })
      setTopConsumed(topConsumedList.sort((a, b) => b.consumed - a.consumed).slice(0, 5))
    } catch (error) {
      console.error('Failed to calculate metrics:', error)
    } finally {
      setDataLoading(false)
    }
  }

  if (loading || dataLoading) {
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

  const kpiData = [
    {
      label: 'Total SKUs',
      value: materials.length,
      icon: Package,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Critical Items',
      value: criticalCount,
      icon: AlertTriangle,
      color: criticalCount > 0 ? 'text-red-400' : 'text-gray-400',
      bgColor: criticalCount > 0 ? 'bg-red-500/10' : 'bg-gray-500/10',
      alert: criticalCount > 0,
    },
    {
      label: 'Slow Moving',
      value: velocity.slow + velocity.dead,
      icon: TrendingDown,
      color: velocity.slow + velocity.dead > 0 ? 'text-amber-400' : 'text-gray-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Stock Value',
      value: formatCurrency(totalValue),
      icon: IndianRupee,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
  ]

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi) => (
          <Card
            key={kpi.label}
            className={cn(
              'glass-card p-4 relative overflow-hidden',
              kpi.alert && 'border-red-500/30 ring-1 ring-red-500/20'
            )}
          >
            <div className={cn('absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-20 blur-2xl', kpi.bgColor)} />
            
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', kpi.bgColor)}>
              <kpi.icon className={cn('w-5 h-5', kpi.color)} />
            </div>

            <div>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{kpi.label}</p>
            </div>

            {kpi.alert && (
              <div className="absolute top-3 right-3">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Velocity Summary & Top Consumed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Velocity Breakdown */}
        <Card className="glass-card p-4 bg-dark-200/20 border-dark-300/30">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-purple-400" />
            <p className="text-sm font-medium text-white">Inventory Velocity</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-2xl font-bold text-emerald-400">{velocity.fast}</p>
              <p className="text-[10px] text-emerald-400/70 uppercase">Fast Moving</p>
              <p className="text-[10px] text-gray-500">70%+ consumed</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-2xl font-bold text-blue-400">{velocity.normal}</p>
              <p className="text-[10px] text-blue-400/70 uppercase">Normal</p>
              <p className="text-[10px] text-gray-500">10-70% consumed</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-2xl font-bold text-amber-400">{velocity.slow}</p>
              <p className="text-[10px] text-amber-400/70 uppercase">Slow Moving</p>
              <p className="text-[10px] text-gray-500">&lt;10% consumed</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
              <p className="text-2xl font-bold text-gray-400">{velocity.dead}</p>
              <p className="text-[10px] text-gray-400/70 uppercase">Dead Stock</p>
              <p className="text-[10px] text-gray-500">No movement</p>
            </div>
          </div>
        </Card>

        {/* Top 5 Consumed This Month */}
        <Card className="glass-card p-4 bg-dark-200/20 border-dark-300/30">
          <div className="flex items-center gap-2 mb-4">
            <Archive size={16} className="text-blue-400" />
            <p className="text-sm font-medium text-white">Top Consumed (30 Days)</p>
          </div>
          
          {topConsumed.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8">No consumption data</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topConsumed} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} horizontal={false} />
                  <XAxis type="number" stroke="#6B7280" fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={10} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#F3F4F6' }}
                    itemStyle={{ color: '#60A5FA' }}
                  />
                  <Bar dataKey="consumed" fill="#60A5FA" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
