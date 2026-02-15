import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Search, Download, Edit2, Trash2, X, Save, ChevronLeft, ChevronRight,
    AlertCircle, LayoutGrid, LayoutList, FlaskConical, AlertTriangle,
    Thermometer, Calendar, IndianRupee, Package,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import {
    getRawMaterials, createRawMaterial, updateRawMaterial, deleteRawMaterial,
    getRawMaterialStats, RM_CATEGORIES,
    type RawMaterial, type RawMaterialFormData, EMPTY_RAWMATERIAL_FORM,
} from '@/services/rawMaterialService'

const UNIT_OPTIONS = [
    { value: 'KG', label: 'Kilogram' }, { value: 'GM', label: 'Gram' },
    { value: 'LTR', label: 'Litre' }, { value: 'ML', label: 'Millilitre' },
    { value: 'PCS', label: 'Pieces' }, { value: 'PKT', label: 'Packet' },
]

// ============ STOCK BAR ============
function StockBar({ current, reorder, min }: { current: number; reorder: number; min: number }) {
    const max = Math.max(reorder * 3, current, 1)
    const percent = Math.min((current / max) * 100, 100)
    const isLow = current <= reorder
    const isCritical = current <= min

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
                <span className={cn(isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-lime-400')}>
                    {current} {isCritical ? '⚠️ Critical' : isLow ? '⚠ Low' : '✓ OK'}
                </span>
                <span className="text-dark-600">Reorder: {reorder}</span>
            </div>
            <div className="h-1.5 bg-dark-300/30 rounded-full overflow-hidden">
                <div
                    className={cn('h-full rounded-full transition-all',
                        isCritical ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-lime-500')}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    )
}

// ============ DETAIL PANEL ============
function RawMaterialDetail({ item, onClose, onEdit }: {
    item: RawMaterial; onClose: () => void; onEdit: () => void
}) {
    const isLow = item.current_stock <= item.reorder_point

    return (
        <div className="glass-card h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-dark-300/50">
                <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg',
                        isLow ? 'bg-red-500/10 text-red-400' : 'bg-lime-500/10 text-lime-400')}>
                        <FlaskConical size={20} />
                    </div>
                    <div>
                        <h2 className="font-semibold text-white">{item.name}</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            {item.code && <Badge variant="default">{item.code}</Badge>}
                            <StatusBadge status={item.status} />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={onEdit} icon={<Edit2 size={14} />}>Edit</Button>
                    <button onClick={onClose} className="p-2 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200"><X size={16} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Stock Level */}
                <div className="bg-dark-200/20 rounded-xl p-4">
                    <p className="text-xs text-dark-500 mb-3 uppercase tracking-wider">Stock Level</p>
                    <StockBar current={item.current_stock} reorder={item.reorder_point} min={item.min_stock_level} />
                    <div className="grid grid-cols-3 gap-3 mt-4">
                        <div className="text-center">
                            <p className="text-[10px] text-dark-600">Current</p>
                            <p className="text-lg font-bold text-white">{item.current_stock} <span className="text-xs text-dark-500">{item.unit_of_measure}</span></p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-dark-600">Reorder At</p>
                            <p className="text-lg font-bold text-amber-400">{item.reorder_point}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-dark-600">Min Level</p>
                            <p className="text-lg font-bold text-red-400">{item.min_stock_level}</p>
                        </div>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Category', value: item.category || '-', icon: Package },
                        { label: 'Unit Cost', value: formatCurrency(item.unit_cost), icon: IndianRupee },
                        { label: 'Total Value', value: formatCurrency(item.current_stock * item.unit_cost), icon: IndianRupee },
                        { label: 'Supplier', value: item.supplier_name || '-', icon: Package },
                        { label: 'Shelf Life', value: item.shelf_life_days ? `${item.shelf_life_days} days` : '-', icon: Calendar },
                        { label: 'Storage', value: item.storage_conditions || '-', icon: Thermometer },
                    ].map(d => (
                        <div key={d.label} className="space-y-1">
                            <div className="flex items-center gap-1.5 text-dark-600">
                                <d.icon size={12} />
                                <span className="text-[10px] uppercase tracking-wider">{d.label}</span>
                            </div>
                            <p className="text-sm text-white">{d.value}</p>
                        </div>
                    ))}
                </div>

                {item.description && (
                    <div className="space-y-1">
                        <p className="text-[10px] text-dark-600 uppercase tracking-wider">Description</p>
                        <p className="text-sm text-dark-500 bg-dark-200/20 p-3 rounded-lg">{item.description}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ============ MAIN PAGE ============
export function RawMaterialsPage() {
    const [items, setItems] = useState<RawMaterial[]>([])
    const [suppliers, setSuppliers] = useState<{ value: string; label: string }[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [showLowStock, setShowLowStock] = useState(false)
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 25

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<RawMaterial | null>(null)
    const [deletingItem, setDeletingItem] = useState<RawMaterial | null>(null)
    const [selectedItem, setSelectedItem] = useState<RawMaterial | null>(null)
    const [formData, setFormData] = useState<RawMaterialFormData>(EMPTY_RAWMATERIAL_FORM)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [stats, setStats] = useState({ total: 0, active: 0, lowStock: 0, totalValue: 0 })

    const fetchSuppliers = async () => {
        try {
            const { data } = await supabase.from('suppliers').select('id, name').eq('status', 'active').order('name')
            setSuppliers((data || []).map((s: any) => ({ value: s.id, label: s.name })))
        } catch { }
    }

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getRawMaterials({ page, pageSize }, { status: statusFilter, category: categoryFilter, search, lowStock: showLowStock }),
                getRawMaterialStats(),
            ])
            setItems(result.data)
            setTotalPages(result.totalPages)
            setTotalCount(result.count)
            setStats(statsData)
        } catch (err: any) {
            toast.error('Failed: ' + err.message)
        } finally {
            setIsLoading(false)
        }
    }, [page, statusFilter, categoryFilter, search, showLowStock])

    useEffect(() => { fetchData(); fetchSuppliers() }, [fetchData])
    useEffect(() => {
        const t = setTimeout(() => { setPage(1); fetchData() }, 300)
        return () => clearTimeout(t)
    }, [search])

    const handleCreate = () => { setEditingItem(null); setFormData(EMPTY_RAWMATERIAL_FORM); setIsModalOpen(true) }

    const handleEdit = (rm: RawMaterial) => {
        setEditingItem(rm)
        setFormData({
            name: rm.name, code: rm.code || '', description: rm.description || '',
            category: rm.category || '', unit_of_measure: rm.unit_of_measure,
            current_stock: rm.current_stock, min_stock_level: rm.min_stock_level,
            reorder_point: rm.reorder_point, unit_cost: rm.unit_cost,
            supplier_id: rm.supplier_id || '', shelf_life_days: rm.shelf_life_days || 365,
            storage_conditions: rm.storage_conditions || '', status: rm.status,
        })
        setIsModalOpen(true)
    }

    const handleSave = async () => {
        if (!formData.name.trim()) { toast.error('Name required'); return }
        try {
            setIsSaving(true)
            if (editingItem) {
                await updateRawMaterial(editingItem.id, formData)
                toast.success('Updated!')
            } else {
                await createRawMaterial(formData)
                toast.success('Created!')
            }
            setIsModalOpen(false); fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsSaving(false) }
    }

    const handleDelete = async () => {
        if (!deletingItem) return
        try {
            setIsDeleting(true)
            await deleteRawMaterial(deletingItem.id)
            toast.success('Deleted!')
            setIsDeleteModalOpen(false); setDeletingItem(null)
            if (selectedItem?.id === deletingItem.id) setSelectedItem(null)
            fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsDeleting(false) }
    }

    const updateForm = (field: keyof RawMaterialFormData, value: any) => setFormData(p => ({ ...p, [field]: value }))

    return (
        <div className="space-y-6">
            <PageHeader title="Raw Materials"
                description={`${stats.total} materials • Stock Value: ${formatCurrency(stats.totalValue)}`}
                actions={<div className="flex items-center gap-3">
                    <Button variant="secondary" icon={<Download size={16} />} size="sm">Export</Button>
                    <Button icon={<Plus size={16} />} onClick={handleCreate}>Add Material</Button>
                </div>} />

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Items', value: stats.total, color: 'text-lime-400' },
                    { label: 'Active', value: stats.active, color: 'text-emerald-400' },
                    { label: 'Low Stock', value: stats.lowStock, color: 'text-red-400', alert: stats.lowStock > 0 },
                    { label: 'Stock Value', value: formatCurrency(stats.totalValue), color: 'text-lime-400' },
                ].map(k => (
                    <div key={k.label} className={cn('glass-card p-4', k.alert && 'border-red-500/30')}>
                        <p className="text-xs text-dark-500">{k.label}</p>
                        <p className={cn('text-xl font-bold mt-1', k.color)}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 max-w-md">
                    <Input placeholder="Search materials..." value={search}
                        onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
                </div>
                <div className="flex items-center gap-2">
                    {['all', 'active', 'inactive'].map(s => (
                        <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                statusFilter === s ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30' : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent')}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
                <button onClick={() => { setShowLowStock(!showLowStock); setPage(1) }}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all',
                        showLowStock ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent')}>
                    <AlertTriangle size={12} /> Low Stock
                </button>
                <Select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
                    options={[{ value: 'all', label: 'All Categories' }, ...RM_CATEGORIES.map(c => ({ value: c, label: c }))]} />
                <div className="flex items-center border border-dark-300 rounded-lg overflow-hidden">
                    <button onClick={() => setViewMode('table')}
                        className={cn('p-2', viewMode === 'table' ? 'bg-lime-500/20 text-lime-400' : 'text-dark-500')}><LayoutList size={16} /></button>
                    <button onClick={() => setViewMode('grid')}
                        className={cn('p-2', viewMode === 'grid' ? 'bg-lime-500/20 text-lime-400' : 'text-dark-500')}><LayoutGrid size={16} /></button>
                </div>
            </div>

            {/* Split View */}
            <div className={cn('flex gap-6', selectedItem ? 'items-start' : '')}>
                <div className={cn('transition-all duration-300', selectedItem ? 'w-1/2' : 'w-full')}>
                    {isLoading ? (
                        <div className="glass-card p-8"><div className="animate-pulse space-y-3">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-dark-200 rounded-lg" />)}
                        </div></div>
                    ) : items.length === 0 ? (
                        <EmptyState icon={<FlaskConical size={48} />} title="No raw materials"
                            description="Add your first raw material" actionLabel="Add Material" onAction={handleCreate} />
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {items.map(rm => (
                                <Card key={rm.id} hover onClick={() => setSelectedItem(rm)} className="group relative">
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(rm) }}
                                            className="p-1.5 rounded-lg bg-dark-200 text-dark-500 hover:text-lime-400"><Edit2 size={14} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); setDeletingItem(rm); setIsDeleteModalOpen(true) }}
                                            className="p-1.5 rounded-lg bg-dark-200 text-dark-500 hover:text-red-400"><Trash2 size={14} /></button>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
                                                rm.current_stock <= rm.reorder_point ? 'bg-red-500/10 text-red-400' : 'bg-lime-500/10 text-lime-400')}>
                                                <FlaskConical size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-white truncate">{rm.name}</h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {rm.code && <Badge variant="default">{rm.code}</Badge>}
                                                    {rm.category && <span className="text-xs text-dark-500">{rm.category}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <StockBar current={rm.current_stock} reorder={rm.reorder_point} min={rm.min_stock_level} />
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-dark-500">{formatCurrency(rm.unit_cost)}/{rm.unit_of_measure}</span>
                                            <StatusBadge status={rm.status} />
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead><tr className="border-b border-dark-300/50">
                                    {['Material', 'Category', 'Stock Level', 'Unit Cost', 'Value', 'Status', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody className="divide-y divide-dark-300/30">
                                    {items.map(rm => (
                                        <tr key={rm.id} onClick={() => setSelectedItem(rm)}
                                            className={cn('hover:bg-dark-200/30 cursor-pointer transition-colors',
                                                selectedItem?.id === rm.id && 'bg-lime-500/5 border-l-2 border-lime-500')}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center',
                                                        rm.current_stock <= rm.reorder_point ? 'bg-red-500/10 text-red-400' : 'bg-lime-500/10 text-lime-400')}>
                                                        <FlaskConical size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">{rm.name}</p>
                                                        <p className="text-xs text-dark-500">{rm.code || '-'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-dark-500">{rm.category || '-'}</td>
                                            <td className="px-4 py-3 w-48"><StockBar current={rm.current_stock} reorder={rm.reorder_point} min={rm.min_stock_level} /></td>
                                            <td className="px-4 py-3 text-sm font-mono text-white">{formatCurrency(rm.unit_cost)}</td>
                                            <td className="px-4 py-3 text-sm font-mono text-lime-400">{formatCurrency(rm.current_stock * rm.unit_cost)}</td>
                                            <td className="px-4 py-3"><StatusBadge status={rm.status} /></td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(rm) }}
                                                        className="p-1.5 rounded-lg text-dark-500 hover:text-lime-400 hover:bg-dark-200"><Edit2 size={14} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setDeletingItem(rm); setIsDeleteModalOpen(true) }}
                                                        className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-dark-200"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-xs text-dark-500">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount}</p>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)} icon={<ChevronLeft size={16} />}>Prev</Button>
                                <span className="text-sm text-dark-500">{page}/{totalPages}</span>
                                <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={16} /></Button>
                            </div>
                        </div>
                    )}
                </div>

                {selectedItem && (
                    <div className="w-1/2 sticky top-20">
                        <RawMaterialDetail item={selectedItem}
                            onClose={() => setSelectedItem(null)}
                            onEdit={() => handleEdit(selectedItem)} />
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
                title={editingItem ? 'Edit Raw Material' : 'Add Raw Material'} size="lg"
                footer={<>
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} isLoading={isSaving} icon={<Save size={16} />}>
                        {editingItem ? 'Update' : 'Create'}
                    </Button>
                </>}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Material Name *" value={formData.name}
                        onChange={(e) => updateForm('name', e.target.value)} placeholder="e.g. Ashwagandha Root" />
                    <Input label="Code" value={formData.code}
                        onChange={(e) => updateForm('code', e.target.value.toUpperCase())} placeholder="e.g. RM-ASH-001" />
                    <Select label="Category" value={formData.category}
                        onChange={(e) => updateForm('category', e.target.value)}
                        options={RM_CATEGORIES.map(c => ({ value: c, label: c }))} placeholder="Select category" />
                    <Select label="Unit" value={formData.unit_of_measure}
                        onChange={(e) => updateForm('unit_of_measure', e.target.value)} options={UNIT_OPTIONS} />
                    <Input label="Current Stock" type="number" value={formData.current_stock}
                        onChange={(e) => updateForm('current_stock', e.target.value)} />
                    <Input label="Reorder Point" type="number" value={formData.reorder_point}
                        onChange={(e) => updateForm('reorder_point', e.target.value)} />
                    <Input label="Min Stock Level" type="number" value={formData.min_stock_level}
                        onChange={(e) => updateForm('min_stock_level', e.target.value)} />
                    <Input label="Unit Cost (₹)" type="number" value={formData.unit_cost}
                        onChange={(e) => updateForm('unit_cost', e.target.value)} icon={<IndianRupee size={14} />} />
                    <Select label="Supplier" value={formData.supplier_id}
                        onChange={(e) => updateForm('supplier_id', e.target.value)}
                        options={suppliers} placeholder="Select supplier" />
                    <Input label="Shelf Life (days)" type="number" value={formData.shelf_life_days}
                        onChange={(e) => updateForm('shelf_life_days', e.target.value)} />
                    <Select label="Status" value={formData.status}
                        onChange={(e) => updateForm('status', e.target.value)}
                        options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
                    <Input label="Storage Conditions" value={formData.storage_conditions}
                        onChange={(e) => updateForm('storage_conditions', e.target.value)} placeholder="e.g. Cool & dry place" />
                    <div className="md:col-span-2"><Textarea label="Description" value={formData.description}
                        onChange={(e) => updateForm('description', e.target.value)} rows={2} /></div>
                </div>
            </Modal>

            {/* Delete Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setDeletingItem(null) }}
                title="Delete Raw Material" size="sm"
                footer={<>
                    <Button variant="secondary" onClick={() => { setIsDeleteModalOpen(false); setDeletingItem(null) }}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Delete</Button>
                </>}>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                    <AlertCircle size={20} className="text-red-400 mt-0.5" />
                    <p className="text-sm text-white">Delete <strong>{deletingItem?.name}</strong>? Cannot be undone.</p>
                </div>
            </Modal>
        </div>
    )
}
