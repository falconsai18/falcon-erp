import { useState } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { SalesOrderItem } from '@/services/salesService'

interface LastOrderData {
  items: SalesOrderItem[]
  total_amount: number
}

interface RepeatOrderButtonProps {
  customerId: string
  onRepeatOrder: (items: SalesOrderItem[]) => void
}

export function RepeatOrderButton({ customerId, onRepeatOrder }: RepeatOrderButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleRepeatOrder = async () => {
    if (!customerId) {
      toast.error('Please select a customer first')
      return
    }

    try {
      setLoading(true)

      // Get customer's last order with items
      const { data: lastOrder } = await supabase
        .from('sales_orders')
        .select('id, order_number')
        .eq('customer_id', customerId)
        .neq('status', 'cancelled')
        .order('order_date', { ascending: false })
        .maybeSingle()

      if (!lastOrder) {
        toast.error('No previous orders found for this customer')
        return
      }

      // Get order items with product details
      const { data: items } = await supabase
        .from('sales_order_items')
        .select(`
          *,
          products(id, name, sku, selling_price, tax_rate)
        `)
        .eq('sales_order_id', lastOrder.id)

      if (!items || items.length === 0) {
        toast.error('No items found in last order')
        return
      }

      // Transform to SalesOrderItem format
      const orderItems: SalesOrderItem[] = items.map((item: any) => ({
        product_id: item.product_id,
        product_name: item.products?.name || item.product_name || 'Unknown',
        product_sku: item.products?.sku || item.product_sku || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent || 0,
        tax_rate: item.tax_rate || item.products?.tax_rate || 12,
        tax_amount: item.tax_amount,
        total_amount: item.total_amount,
      }))

      onRepeatOrder(orderItems)
      toast.success(`Loaded ${orderItems.length} items from order ${lastOrder.order_number}`)
    } catch (error: any) {
      toast.error('Failed to repeat order: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleRepeatOrder}
      isLoading={loading}
      icon={loading ? <Loader2 size={14} /> : <RefreshCw size={14} />}
      className="text-xs"
    >
      Repeat Last Order
    </Button>
  )
}
