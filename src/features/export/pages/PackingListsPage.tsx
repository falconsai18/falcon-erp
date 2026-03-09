import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Package, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportStatusBadge } from '../components/ExportStatusBadge'
import { PackingListForm } from '../components/PackingListForm'
import { toast } from 'sonner'
import { getPackingLists, createPackingList } from '../services/exportService'
import type { ExportPackingList, ExportPackingListFormData, ExportPackingListItemFormData } from '../types/export.types'

export function PackingListsPage() {
    const [packingLists, setPackingLists] = useState<ExportPackingList[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [detailModalOpen, setDetailModalOpen] = useState(false)
    const [selectedPL, setSelectedPL] = useState<ExportPackingList | null>(null)
    const [saving, setSaving] = useState(false)

    const loadPackingLists = useCallback(async () => {
        try {
            setLoading(true)
            const data = await getPackingLists({ search: search || undefined })
            setPackingLists(data)
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to load packing lists')
        } finally {
            setLoading(false)
        }
    }, [search])

    useEffect(() => {
        loadPackingLists()
    }, [loadPackingLists])

    const handleCreate = async (data: ExportPackingListFormData, items: ExportPackingListItemFormData[]) => {
        try {
            setSaving(true)
            await createPackingList(data, items)
            toast.success('Packing list created')
            setModalOpen(false)
            loadPackingLists()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to create packing list')
            throw err
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Packing Lists"
                description={`${packingLists.length} packing lists`}
                actions={
                    <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
                        Create Packing List
                    </Button>
                }
            />

            <div className="flex-1 max-w-md">
                <Input
                    placeholder="Search PL#, order#..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    icon={<Search size={16} />}
                />
            </div>

            {loading ? (
                <div className="glass-card p-8">
                    <div className="animate-pulse space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-12 bg-gray-200 dark:bg-dark-200 rounded-lg" />
                        ))}
                    </div>
                </div>
            ) : packingLists.length === 0 ? (
                <EmptyState
                    icon={<Package size={48} />}
                    title="No packing lists yet"
                    description="Create your first packing list"
                    actionLabel="Create Packing List"
                    onAction={() => setModalOpen(true)}
                />
            ) : (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-dark-300">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">PL#</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Order#</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Packages</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Net Wt KG</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Gross Wt KG</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">CBM</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Container/AWB</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-dark-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {packingLists.map((pl) => (
                                <tr
                                    key={pl.id}
                                    className="border-t border-gray-200 dark:border-dark-300 hover:bg-gray-50 dark:hover:bg-dark-200/30 cursor-pointer"
                                    onClick={() => {
                                        setSelectedPL(pl)
                                        setDetailModalOpen(true)
                                    }}
                                >
                                    <td className="px-4 py-3 font-mono text-blue-400">{pl.packing_list_number}</td>
                                    <td className="px-4 py-3 font-mono text-sm">
                                        {(pl.order as { order_number?: string })?.order_number || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm">{new Date(pl.packing_date).toLocaleDateString('en-IN')}</td>
                                    <td className="px-4 py-3">{pl.total_packages}</td>
                                    <td className="px-4 py-3 text-sm">{pl.package_type}</td>
                                    <td className="px-4 py-3 font-mono">{pl.total_net_weight_kg?.toFixed(2)}</td>
                                    <td className="px-4 py-3 font-mono">{pl.total_gross_weight_kg?.toFixed(2)}</td>
                                    <td className="px-4 py-3 font-mono">{pl.total_cbm?.toFixed(3)}</td>
                                    <td className="px-4 py-3 font-mono text-sm">{pl.container_number || pl.awb_number || '-'}</td>
                                    <td className="px-4 py-3">
                                        <ExportStatusBadge status={pl.status} />
                                    </td>
                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                        <Button size="sm" variant="ghost" icon={<Printer size={14} />}>
                                            Print
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Packing List" size="xl">
                <PackingListForm
                    onSubmit={handleCreate}
                    onCancel={() => setModalOpen(false)}
                    isLoading={saving}
                />
            </Modal>

            <Modal
                isOpen={detailModalOpen}
                onClose={() => { setDetailModalOpen(false); setSelectedPL(null) }}
                title={selectedPL ? `Packing List ${selectedPL.packing_list_number}` : 'Packing List'}
                size="lg"
                footer={
                    <Button icon={<Printer size={14} />} onClick={() => window.print()}>
                        Print
                    </Button>
                }
            >
                {selectedPL && (
                    <div className="space-y-4">
                        <p className="text-sm">Order: {(selectedPL.order as { order_number?: string })?.order_number}</p>
                        <p className="text-sm">Packages: {selectedPL.total_packages} | Net: {selectedPL.total_net_weight_kg} KG | Gross: {selectedPL.total_gross_weight_kg} KG | CBM: {selectedPL.total_cbm}</p>
                        {selectedPL.items && selectedPL.items.length > 0 && (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2">Product</th>
                                        <th className="text-left py-2">Qty</th>
                                        <th className="text-left py-2">Packages</th>
                                        <th className="text-left py-2">Net Wt</th>
                                        <th className="text-left py-2">Gross Wt</th>
                                </tr>
                                </thead>
                                <tbody>
                                    {selectedPL.items.map((item) => (
                                        <tr key={item.id} className="border-b">
                                            <td className="py-2">{item.product_name}</td>
                                            <td className="py-2">{item.quantity}</td>
                                            <td className="py-2">{item.packages}</td>
                                            <td className="py-2">{item.net_weight_kg}</td>
                                            <td className="py-2">{item.gross_weight_kg}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    )
}
