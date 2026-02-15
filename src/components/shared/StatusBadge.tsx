import { Badge } from '@/components/ui/Badge'

type Status = 'active' | 'inactive' | 'draft' | 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled' | 'paid' | 'unpaid' | 'partial' | 'overdue' | 'delivered' | 'shipped'

const STATUS_CONFIG: Record<Status, { variant: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'default'; label: string }> = {
    active: { variant: 'success', label: 'Active' },
    inactive: { variant: 'default', label: 'Inactive' },
    draft: { variant: 'default', label: 'Draft' },
    pending: { variant: 'warning', label: 'Pending' },
    confirmed: { variant: 'info', label: 'Confirmed' },
    processing: { variant: 'info', label: 'Processing' },
    completed: { variant: 'success', label: 'Completed' },
    cancelled: { variant: 'danger', label: 'Cancelled' },
    paid: { variant: 'success', label: 'Paid' },
    unpaid: { variant: 'danger', label: 'Unpaid' },
    partial: { variant: 'warning', label: 'Partial' },
    overdue: { variant: 'danger', label: 'Overdue' },
    delivered: { variant: 'success', label: 'Delivered' },
    shipped: { variant: 'purple', label: 'Shipped' },
}

interface StatusBadgeProps {
    status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status as Status] || { variant: 'default' as const, label: status }
    return <Badge variant={config.variant} dot>{config.label}</Badge>
}