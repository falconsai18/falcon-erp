import { useState, useEffect } from 'react'
import { TrendingUp, Users, Package, ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn, formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface MonthlySales {
  month: string
  total: number
  orders: number
}

interface TopCustomer {
  customer_id: string
  customer_name: string
  total_revenue: number
}

interface TopProduct {
  product_id: string
  product_name: string
  total_quantity: number
  total_revenue: number
}

interface SalesTrendChartProps {
  className?: string
}

export function SalesTrendChart({ className }: SalesTrendChartProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [monthlyData, setMonthlyData] = useState<MonthlySales[]>([])
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSalesData()
  }, [])

  const loadSalesData = async () => {
    try {
      setLoading(true)

      const months: MonthlySales[] = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).toISOString()
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString()
        
        const { data: orders } = await supabase
          .from('sales_orders')
          .select('total_amount')
          .neq('status', 'cancelled')
          .gte('order_date', monthStart.split('T')[0])
          .lte('order_date', monthEnd.split('T')[0])

        const total = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
        months.push({
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          total,
          orders: orders?.length || 0,
        })
      }
      setMonthlyData(months)

      const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const { data: customers } = await supabase
        .from('sales_orders')
        .select('customer_id, total_amount, customers(name)')
        .gte('order_date', thisMonthStart.split('T')[0])
        .neq('status', 'cancelled')

      const customerMap: Record<string, { name: string; total: number }> = {}
      customers?.forEach((c: any) => {
        if (customerMap[c.customer_id]) {
          customerMap[c.customer_id].total += c.total_amount || 0
        } else {
          customerMap[c.customer_id] = {
            name: c.customers?.name || 'Unknown',
            total: c.total_amount || 0,
          }
        }
      })

      const sortedCustomers = Object.entries(customerMap)
        .map(([id, data]) => ({ customer_id: id, customer_name: data.name, total_revenue: data.total }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 5)

      setTopCustomers(sortedCustomers)

      const { data: orderItems } = await supabase
        .from('sales_order_items')
        .select('product_id, quantity, total_amount')
        .gte('created_at', thisMonthStart)

      const productIds = [...new Set(orderItems?.map((item: any) => item.product_id) || [])]
      const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds)

      const productNameMap = new Map(products?.map((p: any) => [p.id, p.name]) || [])

      const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {}
      orderItems?.forEach((item: any) => {
        const productName = productNameMap.get(item.product_id) || 'Unknown'
        if (productMap[item.product_id]) {
          productMap[item.product_id].quantity += item.quantity || 0
          productMap[item.product_id].revenue += item.total_amount || 0
        } else {
          productMap[item.product_id] = {
            name: productName,
            quantity: item.quantity || 0,
            revenue: item.total_amount || 0,
          }
        }
      })

      const sortedProducts = Object.entries(productMap)
        .map(([id, data]) => ({
          product_id: id,
          product_name: data.name,
          total_quantity: data.quantity,
          total_revenue: data.revenue,
        }))
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 5)

      setTopProducts(sortedProducts)
    } catch (error) {
      console.error('Failed to load sales data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="h-8 bg-dark-200 rounded w-1/3 mb-4" />
        <div className="h-48 bg-dark-200 rounded" />
      </div>
    )
  }

  return (
    <div className={cn('glass-card overflow-hidden', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <TrendingUp size={20} className="text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Sales Intelligence</p>
            <p className="text-xs text-gray-400">6-month trends and top performers</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp size={20} className="text-gray-400" />
        ) : (
          <ChevronDown size={20} className="text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-6">
          <div className="h-48 -mx-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="month" stroke="#6B7280" fontSize={10} />
                <YAxis stroke="#6B7280" fontSize={10} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                  itemStyle={{ color: '#60A5FA' }}
                  formatter={(v: any) => [formatCurrency(v), 'Sales']}
                />
                <Line type="monotone" dataKey="total" stroke="#60A5FA" strokeWidth={2} dot={{ fill: '#60A5FA', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-3 bg-dark-200/20 border-dark-300/30">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-purple-400" />
                <p className="text-xs font-medium text-white">Top Customers (This Month)</p>
              </div>
              <div className="space-y-2">
                {topCustomers.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-2">No data</p>
                ) : (
                  topCustomers.map((customer, idx) => (
                    <div key={customer.customer_id} className="flex items-center justify-between p-2 rounded-lg bg-dark-200/30">
                       <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-dark-300 flex items-center justify-center text-[10px] text-white font-medium">
                          {idx + 1}
                        </span>
                        <p className="text-xs text-white truncate max-w-[120px]">{customer.customer_name}</p>
                      </div>
                      <p className="text-xs font-semibold text-purple-400">{formatCurrency(customer.total_revenue)}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-3 bg-dark-200/20 border-dark-300/30">
              <div className="flex items-center gap-2 mb-3">
                <Package size={16} className="text-emerald-400" />
                <p className="text-xs font-medium text-white">Top Products (This Month)</p>
              </div>
              <div className="space-y-2">
                {topProducts.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-2">No data</p>
                ) : (
                  topProducts.map((product, idx) => (
                    <div key={product.product_id} className="flex items-center justify-between p-2 rounded-lg bg-dark-200/30">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-dark-300 flex items-center justify-center text-[10px] text-white font-medium">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs text-white truncate max-w-[100px]">{product.product_name}</p>
                          <p className="text-[10px] text-gray-400">{product.total_quantity} units</p>
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-emerald-400">{formatCurrency(product.total_revenue)}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
