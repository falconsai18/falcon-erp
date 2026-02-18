import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Plus, Search, Download, Edit2, Trash2, X, Save, Phone, Mail, MapPin,
    CreditCard, Building2, ChevronLeft, ChevronRight, AlertCircle, Star,
    LayoutGrid, LayoutList, Truck, User, FileText,
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
import {
    getSuppliers, createSupplier, updateSupplier, deleteSupplier, getSupplierStats,
    type Supplier, type SupplierFormData, EMPTY_SUPPLIER_FORM,
} from '@/services/supplierService'

const TYPE_OPTIONS = [
    { value: 'raw_material', label: 'Raw Material' },
    { value: 'packaging', label: 'Packaging' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'service', label: 'Service' },
    { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'blocked', label: 'Blocked' },
]

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir',
].map(s => ({ value: s, label: s }))

// ============ STAR RATING ============
function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
                <button key={i} type="button" disabled={readonly}
                    onClick={() => onChange?.(i)}
                    className={cn('transition-colors', readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110')}>
                    <Star size={16} className={cn(i <= value ? 'text-amber-400 fill-amber-400' : 'text-dark-400')} />
                </button>
            ))}
        </div>
    )
}

// ============ DETAIL PANEL ============
function SupplierDetail({ supplier, onClose, onEdit }: {
    supplier: Supplier; onClose: () => void; onEdit: () => void
}) {
    return (
        <div className="glass-card h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-dark-300/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 font-bold text-lg">
                        {supplier.name[0]?.toUpperCase()}
                    </div>
                    <div>
                        <h2 className="font-semibold text-white">{supplier.name}</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <StatusBadge status={supplier.status} />
                            <StarRating value={supplier.rating} readonly />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={onEdit} icon={<Edit2 size={14} />} title="Edit">Edit</Button>
                    <button title="Close" onClick={onClose} className="p-2 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200"><X size={16} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Type', value: supplier.supplier_type?.replace('_', ' '), icon: Building2 },
                        { label: 'Contact Person', value: supplier.contact_person || '-', icon: User },
                        { label: 'Phone', value: supplier.phone || '-', icon: Phone },
                        { label: 'Email', value: supplier.email || '-', icon: Mail },
                        { label: 'GSTIN', value: supplier.gst_number || '-', icon: CreditCard },
                        { label: 'PAN', value: supplier.pan_number || '-', icon: CreditCard },
                        { label: 'Payment Terms', value: `${supplier.payment_terms} days`, icon: CreditCard },
                    ].map(item => (
                        <div key={item.label} className="space-y-1">
                            <div className="flex items-center gap-1.5 text-dark-600">
                                <item.icon size={12} />
                                <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
                            </div>
                            <p className="text-sm text-white">{item.value}</p>
                        </div>
                    ))}
                </div>

                {(supplier.address_line1 || supplier.city) && (
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-dark-600">
                            <MapPin size={12} />
                            <span className="text-[10px] uppercase tracking-wider">Address</span>
                        </div>
                        <div className="bg-dark-200/20 rounded-lg p-3">
                            {supplier.address_line1 && <p className="text-sm text-white">{supplier.address_line1}</p>}
                            {supplier.address_line2 && <p className="text-sm text-dark-500">{supplier.address_line2}</p>}
                            <p className="text-sm text-dark-500">
                                {[supplier.city, supplier.state, supplier.pincode].filter(Boolean).join(', ')}
                            </p>
                        </div>
                    </div>
                )}

                {supplier.notes && (
                    <div className="space-y-1">
                        <p className="text-[10px] text-dark-600 uppercase tracking-wider">Notes</p>
                        <p className="text-sm text-dark-500 bg-dark-200/20 p-3 rounded-lg">{supplier.notes}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ============ MAIN PAGE ============
export function SuppliersPage() {
    const navigate = useNavigate()
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [typeFilter, setTypeFilter] = useState('all')
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 25

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
    const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null)
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
    const [formData, setFormData] = useState<SupplierFormData>(EMPTY_SUPPLIER_FORM)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, avgRating: 0 })

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getSuppliers({ page, pageSize }, { status: statusFilter, type: typeFilter, search }),
                getSupplierStats(),
            ])
            setSuppliers(result.data)
            setTotalPages(result.totalPages)
            setTotalCount(result.count)
            setStats(statsData)
        } catch (err: any) {
            toast.error('Failed to load: ' + err.message)
        } finally {
            setIsLoading(false)
        }
    }, [page, statusFilter, typeFilter, search])

    useEffect(() => { fetchData() }, [fetchData])
    useEffect(() => {
        const t = setTimeout(() => { setPage(1); fetchData() }, 300)
        return () => clearTimeout(t)
    }, [search])

    const handleCreate = () => { setEditingSupplier(null); setFormData(EMPTY_SUPPLIER_FORM); setIsModalOpen(true) }

    const handleEdit = (s: Supplier) => {
        setEditingSupplier(s)
        setFormData({
            name: s.name, email: s.email || '', phone: s.phone || '',
            contact_person: s.contact_person || '', gst_number: s.gst_number || '',
            pan_number: s.pan_number || '', supplier_type: s.supplier_type,
            payment_terms: s.payment_terms, rating: s.rating,
            address_line1: s.address_line1 || '', address_line2: s.address_line2 || '',
            city: s.city || '', state: s.state || '', pincode: s.pincode || '',
            status: s.status, notes: s.notes || '',
        })
        setIsModalOpen(true)
    }

    const handleSave = async () => {
        if (!formData.name.trim()) { toast.error('Name required'); return }
        try {
            setIsSaving(true)
            if (editingSupplier) {
                await updateSupplier(editingSupplier.id, formData)
                toast.success('Supplier updated!')
            } else {
                await createSupplier(formData)
                toast.success('Supplier created!')
            }
            setIsModalOpen(false); fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsSaving(false) }
    }

    const handleDelete = async () => {
        if (!deletingSupplier) return
        try {
            setIsDeleting(true)
            await deleteSupplier(deletingSupplier.id)
            toast.success('Deleted!')
            setIsDeleteModalOpen(false); setDeletingSupplier(null)
            if (selectedSupplier?.id === deletingSupplier.id) setSelectedSupplier(null)
            fetchData()
        } catch (err: any) { toast.error(err.message) }
        finally { setIsDeleting(false) }
    }

    const updateForm = (field: keyof SupplierFormData, value: any) => setFormData(p => ({ ...p, [field]: value }))

    return (
        <div className="space-y-6">
            <PageHeader title="Suppliers"
                description={`${stats.total} suppliers • Avg Rating: ${stats.avgRating}⭐`}
                actions={<div className="flex items-center gap-3">
                    <Button variant="secondary" icon={<Download size={16} />} size="sm">Export</Button>
                    <Button icon={<Plus size={16} />} onClick={handleCreate}>Add Supplier</Button>
                </div>} />

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: stats.total, color: 'text-teal-400' },
                    { label: 'Active', value: stats.active, color: 'text-emerald-400' },
                    { label: 'Inactive', value: stats.inactive, color: 'text-amber-400' },
                    { label: 'Avg Rating', value: `${stats.avgRating} ⭐`, color: 'text-amber-400' },
                ].map(k => (
                    <div key={k.label} className="glass-card p-4">
                        <p className="text-xs text-dark-500">{k.label}</p>
                        <p className={cn('text-xl font-bold mt-1', k.color)}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 max-w-md">
                    <Input placeholder="Search suppliers..." value={search}
                        onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
                </div>
                <div className="flex items-center gap-2">
                    {['all', 'active', 'inactive', 'blocked'].map(s => (
                        <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                statusFilter === s ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent')}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
                <Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
                    options={[{ value: 'all', label: 'All Types' }, ...TYPE_OPTIONS]} />
                <div className="flex items-center border border-dark-300 rounded-lg overflow-hidden">
                    <button onClick={() => setViewMode('table')}
                        className={cn('p-2', viewMode === 'table' ? 'bg-teal-500/20 text-teal-400' : 'text-dark-500 hover:text-white')}>
                        <LayoutList size={16} />
                    </button>
                    <button onClick={() => setViewMode('grid')}
                        className={cn('p-2', viewMode === 'grid' ? 'bg-teal-500/20 text-teal-400' : 'text-dark-500 hover:text-white')}>
                        <LayoutGrid size={16} />
                    </button>
                </div>
            </div>

            {/* Split View */}
            <div className={cn('flex gap-6', selectedSupplier ? 'items-start' : '')}>
                <div className={cn('transition-all duration-300', selectedSupplier ? 'w-1/2' : 'w-full')}>
                    {isLoading ? (
                        <div className="glass-card p-8"><div className="animate-pulse space-y-3">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-dark-200 rounded-lg" />)}
                        </div></div>
                    ) : suppliers.length === 0 ? (
                        <EmptyState icon={<Truck size={48} />} title="No suppliers yet"
                            description="Add your first supplier" actionLabel="Add Supplier" onAction={handleCreate} />
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {suppliers.map(s => (
                                <Card key={s.id} hover onClick={() => setSelectedSupplier(s)} className="group relative">
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button title="View Ledger" onClick={(e) => { e.stopPropagation(); navigate(`/suppliers/${s.id}/ledger`) }}
                                            className="p-1.5 rounded-lg bg-dark-200 text-dark-500 hover:text-blue-400"><FileText size={14} /></button>
                                        <button title="Edit" onClick={(e) => { e.stopPropagation(); handleEdit(s) }}
                                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-dark-200 text-gray-500 dark:text-dark-500 hover:text-cyan-400 transition-colors">
                                            <Edit2 size={14} />
                                        </button>
                                        <button title="Delete" onClick={(e) => { e.stopPropagation(); setDeletingSupplier(s); setIsDeleteModalOpen(true) }}
                                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-dark-200 text-gray-500 dark:text-dark-500 hover:text-red-400 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 font-bold text-lg flex-shrink-0">
                                            {s.name[0]?.toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <div>
                                                <h3 className="font-semibold text-white truncate">{s.name}</h3>
                                                <p className="text-xs text-dark-500">{s.contact_person || 'No contact'}</p>
                                            </div>
                                            <StarRating value={s.rating} readonly />
                                            <div className="flex items-center justify-between pt-2 border-t border-dark-300/30">
                                                <Badge variant="info">{s.supplier_type?.replace('_', ' ')}</Badge>
                                                <StatusBadge status={s.status} />
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead><tr className="border-b border-dark-300/50">
                                    {['Supplier', 'Type', 'Contact', 'Phone', 'Rating', 'Status', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody className="divide-y divide-dark-300/30">
                                    {suppliers.map(s => (
                                        <tr key={s.id} onClick={() => setSelectedSupplier(s)}
                                            className={cn('hover:bg-dark-200/30 cursor-pointer transition-colors',
                                                selectedSupplier?.id === s.id && 'bg-teal-500/5 border-l-2 border-teal-500')}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 font-bold text-sm">
                                                        {s.name[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">{s.name}</p>
                                                        <p className="text-xs text-dark-500">{s.email || '-'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3"><Badge variant="info">{s.supplier_type?.replace('_', ' ')}</Badge></td>
                                            <td className="px-4 py-3 text-sm text-dark-500">{s.contact_person || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-dark-500">{s.phone || '-'}</td>
                                            <td className="px-4 py-3"><StarRating value={s.rating} readonly /></td>
                                            <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button title="View Ledger" onClick={(e) => { e.stopPropagation(); navigate(`/suppliers/${s.id}/ledger`) }}
                                                        className="p-1.5 rounded-lg text-dark-500 hover:text-blue-400 hover:bg-dark-200"><FileText size={14} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(s) }}
                                                        className="p-1.5 rounded-lg text-dark-500 hover:text-teal-400 hover:bg-dark-200"><Edit2 size={14} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setDeletingSupplier(s); setIsDeleteModalOpen(true) }}
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

                {selectedSupplier && (
                    <div className="w-1/2 sticky top-20">
                        <SupplierDetail supplier={selectedSupplier}
                            onClose={() => setSelectedSupplier(null)}
                            onEdit={() => handleEdit(selectedSupplier)} />
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
                title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                size="lg"
                footer={<>
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} isLoading={isSaving} icon={<Save size={16} />}>
                        {editingSupplier ? 'Update' : 'Create Supplier'}
                    </Button>
                </>}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Supplier Name *" value={formData.name}
                        onChange={(e) => updateForm('name', e.target.value)} placeholder="Company name" />
                    <Select label="Type" value={formData.supplier_type}
                        onChange={(e) => updateForm('supplier_type', e.target.value)} options={TYPE_OPTIONS} />
                    <Input label="Contact Person" value={formData.contact_person}
                        onChange={(e) => updateForm('contact_person', e.target.value)} placeholder="Name" icon={<User size={14} />} />
                    <Input label="Phone" value={formData.phone}
                        onChange={(e) => updateForm('phone', e.target.value)} placeholder="9876543210" icon={<Phone size={14} />} />
                    <Input label="Email" value={formData.email} type="email"
                        onChange={(e) => updateForm('email', e.target.value)} placeholder="email@supplier.com" icon={<Mail size={14} />} />
                    <Input label="GSTIN" value={formData.gst_number}
                        onChange={(e) => updateForm('gst_number', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" />
                    <Input label="PAN" value={formData.pan_number}
                        onChange={(e) => updateForm('pan_number', e.target.value.toUpperCase())} placeholder="AAAAA0000A" />
                    <Input label="Payment Terms (days)" type="number" value={formData.payment_terms}
                        onChange={(e) => updateForm('payment_terms', e.target.value)} />
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-dark-500">Rating</label>
                        <StarRating value={formData.rating} onChange={(v) => updateForm('rating', v)} />
                    </div>
                    <Select label="Status" value={formData.status}
                        onChange={(e) => updateForm('status', e.target.value)} options={STATUS_OPTIONS} />
                    <div className="md:col-span-2"><Input label="Address Line 1" value={formData.address_line1}
                        onChange={(e) => updateForm('address_line1', e.target.value)} placeholder="Street" /></div>
                    <Input label="Address Line 2" value={formData.address_line2}
                        onChange={(e) => updateForm('address_line2', e.target.value)} placeholder="Area" />
                    <Input label="City" value={formData.city}
                        onChange={(e) => updateForm('city', e.target.value)} placeholder="City" />
                    <Select label="State" value={formData.state}
                        onChange={(e) => updateForm('state', e.target.value)} options={INDIAN_STATES} placeholder="Select" />
                    <Input label="Pincode" value={formData.pincode}
                        onChange={(e) => updateForm('pincode', e.target.value)} placeholder="400001" />
                    <div className="md:col-span-2"><Textarea label="Notes" value={formData.notes}
                        onChange={(e) => updateForm('notes', e.target.value)} rows={2} /></div>
                </div>
            </Modal>

            {/* Delete Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setDeletingSupplier(null) }}
                title="Delete Supplier" size="sm"
                footer={<>
                    <Button variant="secondary" onClick={() => { setIsDeleteModalOpen(false); setDeletingSupplier(null) }}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Delete</Button>
                </>}>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                    <AlertCircle size={20} className="text-red-400 mt-0.5" />
                    <p className="text-sm text-white">Delete <strong>{deletingSupplier?.name}</strong>? Cannot be undone.</p>
                </div>
            </Modal>
        </div>
    )
}