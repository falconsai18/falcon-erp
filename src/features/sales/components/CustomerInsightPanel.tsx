import { useState, useEffect } from 'react'
import { Clock, ShoppingBag, TrendingUp, Calendar, Package, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { SalesOrder } from '@/services/salesService'

interface CustomerInsights {
  lastOrders: SalesOrder[]
  averageOrderValue: number
  daysSinceLastOrder: number | null
  mostOrderedProduct: { name: string; count: number } | null
  totalOrders: number
}

interface CustomerInsightPanelProps {
  customerId: string
}

export function CustomerInsightPanel({ customerId }: CustomerInsightPanelProps) {
  const [insights, setInsights] = useState<CustomerInsights | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (customerId) {
      loadInsights()
    }
  }, [customerId])

  const loadInsights = async () => {
    try {
      setLoading(true)

      // Get last 3 orders
      const { data: orders } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('customer_id', customerId)
        .neq('status', 'cancelled')
        .order('order_date', { ascending: false })
        .limit(3)

      // Get all orders for average calculation
      const { data: allOrders } = await supabase
        .from('sales_orders')
        .select('total_amount, order_date')
        .eq('customer_id', customerId)
        .neq('status', 'cancelled')

      // Get product frequency
      const { data: orderItems } = await supabase
        .from('sales_order_items')
        .select('product_id, quantity, products(name)')
        .in('sales_order_id', orders?.map(o => o.id) || [])

      // Calculate metrics
      const totalOrders = allOrders?.length || 0
      const averageOrderValue = totalOrders > 0
        ? (allOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0) / totalOrders
        : 0

      // Days since last order
      let daysSinceLastOrder: number | null = null
      if (orders && orders.length > 0 && orders[0].order_date) {
        const lastOrderDate = new Date(orders[0].order_date)
        const today = new Date()
        daysSinceLastOrder = Math.floor((today.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
      }

      // Find most ordered product
      const productCounts: Record<string, { name: string; count: number }> = {}
      orderItems?.forEach((item: any) => {
        const productName = item.products?.name || 'Unknown'
        if (productCounts[item.product_id]) {
          productCounts[item.product_id].count += item.quantity || 1
        } else {
          productCounts[item.product_id] = { name: productName, count: item.quantity || 1 }
        }
      })

      const mostOrderedProduct = Object.values(productCounts).sort((a, b) => b.count - a.count)[0] || null

      setInsights({
        lastOrders: orders || [],
        averageOrderValue,
        daysSinceLastOrder,
        mostOrderedProduct,
        totalOrders,
      })
    } catch (error) {
      console.error('Failed to load customer insights:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-4 animate-pulse space-y-3">
        <div className="h-4 bg-dark-200 rounded w-1/3" />
        <div className="h-3 bg-dark-200 rounded w-full" />
        <div className="h-3 bg-dark-200 rounded w-full" />
      </div>
    )
  }

  if (!insights) return null

  const { lastOrders, averageOrderValue, daysSinceLastOrder, mostOrderedProduct, totalOrders } = insights

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <TrendingUp size={16} className="text-blue-400" />
        </div>
        <p className="text-sm font-medium text-white">Customer Intelligence</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded-lg bg-dark-200/30">
          <p className="text-[10px] text-gray-400 uppercase">Total Orders</p>
          <p className="text-lg font-semibold text-white">{totalOrders}</p>
        </div>
        <div className="p-2 rounded-lg bg-dark-200/30">
          <p className="text-[10px] text-gray-400 uppercase">Avg Order</p>
          <p className="text-lg font-semibold text-white">{formatCurrency(averageOrderValue)}</p>
        </div>
        <div className={cn(
          'p-2 rounded-lg',
          daysSinceLastOrder && daysSinceLastOrder > 30 ? 'bg-red-500/10 border border-red-500/20' : 'bg-dark-200/30'
        )}>
          <p className={cn('text-[10px] uppercase', daysSinceLastOrder && daysSinceLastOrder > 30 ? 'text-red-400' : 'text-gray-400')}>Last Order</p>
          <p className={cn('text-lg font-semibold', daysSinceLastOrder && daysSinceLastOrder > 30 ? 'text-red-400' : 'text-white')}>
            {daysSinceLastOrder !== null ? `${daysSinceLastOrder}d` : 'Never'}
          </p>
        </div>
      </div>

      {/* Days since warning */}
      {daysSinceLastOrder && daysSinceLastOrder > 30 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle size={14} className="text-red-400" />
          <p className="text-xs text-red-400">Customer inactive for {daysSinceLastOrder} days</p>
        </div>
      )}

      {/* Most Ordered Product */}
      {mostOrderedProduct && (
        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Package size={14} className="text-blue-400" />
            <p className="text-[10px] text-blue-400 uppercase">Favorite Product</p>
          </div>
          <p className="text-sm font-medium text-white">{mostOrderedProduct.name}</p>
          <p className="text-xs text-gray-400">Ordered {mostOrderedProduct.count} times</p>
        </div>
      )}

      {/* Last 3 Orders */}
      <div>
        <p className="text-xs font-medium text-white mb-2 flex items-center gap-2">
          <Clock size={12} className="text-gray-400" />
          Last 3 Orders
        </p>
        <div className="space-y-2">
          {lastOrders.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-2">No previous orders</p>
          ) : (
            lastOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-2 rounded-lg bg-dark-200/30">
                <div>
                  <p className="text-xs font-medium text-white">{order.order_number}</p>
                  <p className="text-[10px] text-gray-400">{formatDate(order.order_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-blue-400">{formatCurrency(order.total_amount)}</p>
                  <Badge variant={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'danger' : 'info'}>
                    {order.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
