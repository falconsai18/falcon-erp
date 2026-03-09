import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Ship, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportStatusBadge } from '../components/ExportStatusBadge'
import { ShipmentTracker } from '../components/ShipmentTracker'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { getShipments } from '../services/exportService'
import type { ExportShipment } from '../types/export.types'
import type { ExportShipmentFilters } from '../types/export.types'
import { cn } from '@/lib/utils'

export function ShipmentsPage() {
    const [shipments, setShipments] = useState<ExportShipment[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
    const [detailModalOpen, setDetailModalOpen] = useState(false)
    const [selectedShipment, setSelectedShipment] = useState<ExportShipment | null>(null)

    const loadShipments = useCallback(async () => {
        try {
            setLoading(true)
            const filters: ExportShipmentFilters = {}
            if (statusFilter !== 'ALL') filters.status = statusFilter as ExportShipmentFilters['status']
            if (search) filters.search = search
            const data = await getShipments(filters)
            setShipments(data)
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to load shipments')
        } finally {
            setLoading(false)
        }
    }, [search, statusFilter])

    useEffect(() => {
        loadShipments()
    }, [loadShipments])

    const statusTabs = ['ALL', 'BOOKING_CONFIRMED', 'CUSTOMS_CLEARED', 'LOADED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED']

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            BOOKING_CONFIRMED: 'border-blue-500',
            CUSTOMS_CLEARED: 'border-amber-500',
            LOADED: 'border-orange-500',
            IN_TRANSIT: 'border-purple-500',
            ARRIVED: 'border-blue-500',
            DELIVERED: 'border-emerald-500',
        }
        return colors[status] || 'border-gray-300'
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Shipments"
                description={`${shipments.length} shipments`}
                actions={
                    <Button icon={<Plus size={16} />} onClick={() => toast.info('Create shipment from order detail page')}>
                        Create Shipment
                    </Button>
                }
            />

            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 max-w-md">
                    <Input
                        placeholder="Search shipment#, order#, vessel, AWB..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        icon={<Search size={16} />}
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {statusTabs.map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-medium',
                                statusFilter === s ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-200'
                            )}
                        >
                            {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
                        </button>
                    ))}
                </div>
                <div className="flex border border-gray-200 dark:border-dark-300 rounded-lg overflow-hidden">
                    <button
                        onClick={() => setViewMode('table')}
                        className={cn('p-2', viewMode === 'table' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500')}
                    >
                        <List size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('cards')}
                        className={cn('p-2', viewMode === 'cards' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500')}
                    >
                        <LayoutGrid size={16} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="glass-card p-8">
                    <div className="animate-pulse space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-12 bg-gray-200 dark:bg-dark-200 rounded-lg" />
                        ))}
                    </div>
                </div>
            ) : shipments.length === 0 ? (
                <EmptyState
                    icon={<Ship size={48} />}
                    title="No shipments yet"
                    description="Create shipments from export order detail page"
                    actionLabel="View Orders"
                    onAction={() => window.location.href = '/export/orders'}
                />
            ) : viewMode === 'table' ? (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-dark-300">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Shipment#</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Order#</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Mode</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Vessel/Airline</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Container/AWB</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Route</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">ETD</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">ETA</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shipments.map((s) => (
                                <tr
                                    key={s.id}
                                    className="border-t border-gray-200 dark:border-dark-300 hover:bg-gray-50 dark:hover:bg-dark-200/30 cursor-pointer"
                                    onClick={() => {
                                        setSelectedShipment(s)
                                        setDetailModalOpen(true)
                                    }}
                                >
                                    <td className="px-4 py-3 font-mono text-blue-400">{s.shipment_number}</td>
                                    <td className="px-4 py-3 font-mono text-sm">
                                        {(s.order as { order_number?: string })?.order_number || '-'}
                                    </td>
                                    <td className="px-4 py-3">{s.shipment_mode === 'SEA' ? '🚢' : '✈️'}</td>
                                    <td className="px-4 py-3 text-sm">
                                        {s.shipment_mode === 'SEA' ? s.vessel_name || s.shipping_line : s.airline}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-sm">
                                        {s.shipment_mode === 'SEA' ? s.container_number : s.awb_number}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {s.port_of_loading} → {s.port_of_destination}
                                    </td>
                                    <td className="px-4 py-3 text-sm">{s.etd ? formatDate(s.etd) : '-'}</td>
                                    <td className="px-4 py-3 text-sm">{s.eta ? formatDate(s.eta) : '-'}</td>
                                    <td className="px-4 py-3">
                                        <ExportStatusBadge status={s.status} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {shipments.map((s) => (
                        <div
                            key={s.id}
                            className={cn(
                                'glass-card p-4 border-l-4 cursor-pointer hover:border-opacity-100 transition-opacity',
                                getStatusColor(s.status)
                            )}
                            onClick={() => {
                                setSelectedShipment(s)
                                setDetailModalOpen(true)
                            }}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-mono text-blue-400">{s.shipment_number}</span>
                                <span>{s.shipment_mode === 'SEA' ? '🚢' : '✈️'}</span>
                            </div>
                            <p className="text-sm text-gray-900 dark:text-white">
                                {s.shipment_mode === 'SEA' ? s.vessel_name || s.shipping_line : s.airline}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-dark-500 mt-1">
                                {s.etd ? formatDate(s.etd) : '-'} → {s.eta ? formatDate(s.eta) : '-'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-dark-500">
                                {(s.customer as { company_name?: string })?.company_name || (s.order as { order_number?: string })?.order_number}
                            </p>
                            <ExportStatusBadge status={s.status} className="mt-2" />
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={detailModalOpen}
                onClose={() => { setDetailModalOpen(false); setSelectedShipment(null) }}
                title={selectedShipment ? `Shipment ${selectedShipment.shipment_number}` : 'Shipment'}
                size="lg"
            >
                {selectedShipment && <ShipmentTracker shipment={selectedShipment} />}
            </Modal>
        </div>
    )
}
