import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Search, Download, Users, Edit2, Trash2, Eye, X, Save,
    Phone, Mail, MapPin, CreditCard, Building2, ChevronLeft, ChevronRight,
    AlertCircle, IndianRupee, UserPlus, Filter, LayoutGrid, LayoutList,
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
    getCustomers, createCustomer, updateCustomer, deleteCustomer,
    getCustomerAddresses, createAddress, deleteAddress, getCustomerStats,
    type Customer, type CustomerAddress, type CustomerFormData, type AddressFormData,
    EMPTY_CUSTOMER_FORM, EMPTY_ADDRESS_FORM,
} from '@/services/customerService'

const TYPE_OPTIONS = [
    { value: 'retail', label: 'Retail' },
    { value: 'wholesale', label: 'Wholesale' },
    { value: 'distributor', label: 'Distributor' },
    { value: 'hospital', label: 'Hospital' },
    { value: 'export', label: 'Export' },
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
    'Ladakh', 'Chandigarh', 'Puducherry', 'Lakshadweep', 'Andaman & Nicobar',
].map(s => ({ value: s, label: s }))

// ============ CUSTOMER CARD (Grid View) ============
function CustomerCard({ customer, onView, onEdit, onDelete }: {
    customer: Customer
    onView: () => void
    onEdit: () => void
    onDelete: () => void
}) {
    return (
        <Card hover onClick={onView} className="group relative">
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); onEdit() }}
                    className="p-1.5 rounded-lg bg-dark-200 text-dark-500 hover:text-cyan-400 transition-colors">
                    <Edit2 size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete() }}
                    className="p-1.5 rounded-lg bg-dark-200 text-dark-500 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                </button>
            </div>

            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold text-lg flex-shrink-0">
                    {customer.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                    <div>
                        <h3 className="font-semibold text-white truncate">{customer.name}</h3>
                        <Badge variant={customer.customer_type === 'wholesale' ? 'purple' : customer.customer_type === 'distributor' ? 'info' : 'default'} className="mt-1">
                            {customer.customer_type}
                        </Badge>
                    </div>

                    <div className="space-y-1">
                        {customer.phone && (
                            <div className="flex items-center gap-2 text-xs text-dark-500">
                                <Phone size={12} /> {customer.phone}
                            </div>
                        )}
                        {customer.email && (
                            <div className="flex items-center gap-2 text-xs text-dark-500 truncate">
                                <Mail size={12} /> {customer.email}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-dark-300/30">
                        <div>
                            <p className="text-[10px] text-dark-600">Outstanding</p>
                            <p className={cn('text-sm font-semibold', customer.outstanding_amount > 0 ? 'text-red-400' : 'text-emerald-400')}>
                                {formatCurrency(customer.outstanding_amount || 0)}
                            </p>
                        </div>
                        <StatusBadge status={customer.status} />
                    </div>
                </div>
            </div>
        </Card>
    )
}

// ============ DETAIL PANEL (Split View) ============
function CustomerDetail({ customer, onClose, onEdit }: {
    customer: Customer
    onClose: () => void
    onEdit: () => void
}) {
    const [addresses, setAddresses] = useState<CustomerAddress[]>([])
    const [showAddressForm, setShowAddressForm] = useState(false)
    const [addressForm, setAddressForm] = useState<AddressFormData>(EMPTY_ADDRESS_FORM)
    const [savingAddress, setSavingAddress] = useState(false)

    useEffect(() => {
        loadAddresses()
    }, [customer.id])

    const loadAddresses = async () => {
        try {
            const data = await getCustomerAddresses(customer.id)
            setAddresses(data)
        } catch {
            // OK if none
        }
    }

    const handleAddAddress = async () => {
        if (!addressForm.address_line1 || !addressForm.city || !addressForm.state) {
            toast.error('Address, City, State are required')
            return
        }
        try {
            setSavingAddress(true)
            await createAddress(customer.id, addressForm)
            toast.success('Address added!')
            setShowAddressForm(false)
            setAddressForm(EMPTY_ADDRESS_FORM)
            loadAddresses()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSavingAddress(false)
        }
    }

    const handleDeleteAddress = async (id: string) => {
        try {
            await deleteAddress(id)
            toast.success('Address deleted')
            loadAddresses()
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    return (
        <div className="glass-card h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-300/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold text-lg">
                        {customer.name[0]?.toUpperCase()}
                    </div>
                    <div>
                        <h2 className="font-semibold text-white">{customer.name}</h2>
                        <StatusBadge status={customer.status} />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={onEdit} icon={<Edit2 size={14} />}>Edit</Button>
                    <button onClick={onClose} className="p-2 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Type', value: customer.customer_type, icon: Building2 },
                        { label: 'Phone', value: customer.phone || '-', icon: Phone },
                        { label: 'Email', value: customer.email || '-', icon: Mail },
                        { label: 'Alt Phone', value: customer.alt_phone || '-', icon: Phone },
                        { label: 'GSTIN', value: customer.gst_number || '-', icon: CreditCard },
                        { label: 'PAN', value: customer.pan_number || '-', icon: CreditCard },
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

                {/* Financial */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-dark-200/30 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-dark-500 uppercase">Credit Limit</p>
                        <p className="text-lg font-bold text-white mt-1">{formatCurrency(customer.credit_limit)}</p>
                    </div>
                    <div className="bg-dark-200/30 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-dark-500 uppercase">Credit Days</p>
                        <p className="text-lg font-bold text-white mt-1">{customer.credit_days}</p>
                    </div>
                    <div className="bg-dark-200/30 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-dark-500 uppercase">Outstanding</p>
                        <p className={cn('text-lg font-bold mt-1', customer.outstanding_amount > 0 ? 'text-red-400' : 'text-emerald-400')}>
                            {formatCurrency(customer.outstanding_amount)}
                        </p>
                    </div>
                </div>

                {/* Notes */}
                {customer.notes && (
                    <div className="space-y-1">
                        <p className="text-[10px] text-dark-600 uppercase tracking-wider">Notes</p>
                        <p className="text-sm text-dark-500 bg-dark-200/20 p-3 rounded-lg">{customer.notes}</p>
                    </div>
                )}

                {/* Addresses */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white flex items-center gap-2">
                            <MapPin size={14} className="text-cyan-400" /> Addresses
                        </p>
                        <Button size="sm" variant="ghost" onClick={() => setShowAddressForm(true)} icon={<Plus size={14} />}>
                            Add
                        </Button>
                    </div>

                    {addresses.length === 0 && !showAddressForm && (
                        <p className="text-xs text-dark-500 text-center py-4">No addresses added yet</p>
                    )}

                    {addresses.map(addr => (
                        <div key={addr.id} className="bg-dark-200/20 rounded-lg p-3 relative group">
                            <button
                                onClick={() => handleDeleteAddress(addr.id)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded text-dark-500 hover:text-red-400"
                            >
                                <Trash2 size={12} />
                            </button>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant={addr.address_type === 'billing' ? 'info' : 'purple'}>
                                    {addr.address_type}
                                </Badge>
                                {addr.is_default && <Badge variant="success">Default</Badge>}
                            </div>
                            <p className="text-sm text-white">{addr.address_line1}</p>
                            {addr.address_line2 && <p className="text-sm text-dark-500">{addr.address_line2}</p>}
                            <p className="text-sm text-dark-500">{addr.city}, {addr.state} {addr.pincode}</p>
                        </div>
                    ))}

                    {/* Add Address Form */}
                    {showAddressForm && (
                        <div className="bg-dark-200/20 rounded-lg p-4 space-y-3 border border-cyan-500/20">
                            <div className="grid grid-cols-2 gap-3">
                                <Select label="Type" value={addressForm.address_type}
                                    onChange={(e) => setAddressForm(p => ({ ...p, address_type: e.target.value }))}
                                    options={[{ value: 'billing', label: 'Billing' }, { value: 'shipping', label: 'Shipping' }]} />
                                <Input label="Pincode" value={addressForm.pincode}
                                    onChange={(e) => setAddressForm(p => ({ ...p, pincode: e.target.value }))} placeholder="400001" />
                            </div>
                            <Input label="Address Line 1 *" value={addressForm.address_line1}
                                onChange={(e) => setAddressForm(p => ({ ...p, address_line1: e.target.value }))} placeholder="Street address" />
                            <Input label="Address Line 2" value={addressForm.address_line2}
                                onChange={(e) => setAddressForm(p => ({ ...p, address_line2: e.target.value }))} placeholder="Area, landmark" />
                            <div className="grid grid-cols-2 gap-3">
                                <Input label="City *" value={addressForm.city}
                                    onChange={(e) => setAddressForm(p => ({ ...p, city: e.target.value }))} placeholder="City" />
                                <Select label="State *" value={addressForm.state}
                                    onChange={(e) => setAddressForm(p => ({ ...p, state: e.target.value }))}
                                    options={INDIAN_STATES} placeholder="Select state" />
                            </div>
                            <div className="flex items-center justify-between pt-2">
                                <label className="flex items-center gap-2 text-sm text-dark-500 cursor-pointer">
                                    <input type="checkbox" checked={addressForm.is_default}
                                        onChange={(e) => setAddressForm(p => ({ ...p, is_default: e.target.checked }))}
                                        className="rounded border-dark-300 bg-dark-100" />
                                    Set as default
                                </label>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => { setShowAddressForm(false); setAddressForm(EMPTY_ADDRESS_FORM) }}>Cancel</Button>
                                    <Button size="sm" onClick={handleAddAddress} isLoading={savingAddress}>Save Address</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ============ MAIN PAGE ============
export function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [typeFilter, setTypeFilter] = useState('all')
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 25

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
    const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [formData, setFormData] = useState<CustomerFormData>(EMPTY_CUSTOMER_FORM)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, blocked: 0, totalOutstanding: 0 })

    // ============ FETCH ============
    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [result, statsData] = await Promise.all([
                getCustomers({ page, pageSize }, { status: statusFilter, type: typeFilter, search }),
                getCustomerStats(),
            ])
            setCustomers(result.data)
            setTotalPages(result.totalPages)
            setTotalCount(result.count)
            setStats(statsData)
        } catch (err: any) {
            toast.error('Failed to load customers: ' + err.message)
        } finally {
            setIsLoading(false)
        }
    }, [page, statusFilter, typeFilter, search])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        const timer = setTimeout(() => { setPage(1); fetchData() }, 300)
        return () => clearTimeout(timer)
    }, [search])

    // ============ CRUD ============
    const handleCreate = () => {
        setEditingCustomer(null)
        setFormData(EMPTY_CUSTOMER_FORM)
        setIsModalOpen(true)
    }

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer)
        setFormData({
            name: customer.name,
            email: customer.email || '',
            phone: customer.phone || '',
            alt_phone: customer.alt_phone || '',
            gst_number: customer.gst_number || '',
            pan_number: customer.pan_number || '',
            customer_type: customer.customer_type,
            credit_limit: customer.credit_limit,
            credit_days: customer.credit_days,
            status: customer.status,
            notes: customer.notes || '',
        })
        setIsModalOpen(true)
    }

    const handleSave = async () => {
        if (!formData.name.trim()) { toast.error('Customer name is required'); return }

        try {
            setIsSaving(true)
            if (editingCustomer) {
                await updateCustomer(editingCustomer.id, formData)
                toast.success('Customer updated!')
                if (selectedCustomer?.id === editingCustomer.id) {
                    setSelectedCustomer({ ...selectedCustomer, ...formData } as Customer)
                }
            } else {
                await createCustomer(formData)
                toast.success('Customer created!')
            }
            setIsModalOpen(false)
            fetchData()
        } catch (err: any) {
            toast.error('Failed: ' + err.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingCustomer) return
        try {
            setIsDeleting(true)
            await deleteCustomer(deletingCustomer.id)
            toast.success('Customer deleted!')
            setIsDeleteModalOpen(false)
            setDeletingCustomer(null)
            if (selectedCustomer?.id === deletingCustomer.id) setSelectedCustomer(null)
            fetchData()
        } catch (err: any) {
            toast.error('Failed: ' + err.message)
        } finally {
            setIsDeleting(false)
        }
    }

    const updateForm = (field: keyof CustomerFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    // ============ RENDER ============
    return (
        <div className="space-y-6">
            {/* Header */}
            <PageHeader
                title="Customers"
                description={`${stats.total} customers • Outstanding: ${formatCurrency(stats.totalOutstanding)}`}
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" icon={<Download size={16} />} size="sm">Export</Button>
                        <Button icon={<UserPlus size={16} />} onClick={handleCreate}>Add Customer</Button>
                    </div>
                }
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: stats.total, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
                    { label: 'Active', value: stats.active, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                    { label: 'Inactive', value: stats.inactive, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                    { label: 'Outstanding', value: formatCurrency(stats.totalOutstanding), color: 'text-red-400', bg: 'bg-red-400/10' },
                ].map(kpi => (
                    <div key={kpi.label} className="glass-card p-4">
                        <p className="text-xs text-dark-500">{kpi.label}</p>
                        <p className={cn('text-xl font-bold mt-1', kpi.color)}>{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters + View Toggle */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 max-w-md">
                    <Input placeholder="Search customers..." value={search}
                        onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
                </div>

                <div className="flex items-center gap-2">
                    {['all', 'active', 'inactive', 'blocked'].map(s => (
                        <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                statusFilter === s ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent')}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>

                <Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
                    options={[{ value: 'all', label: 'All Types' }, ...TYPE_OPTIONS]} />

                {/* View Toggle */}
                <div className="flex items-center border border-dark-300 rounded-lg overflow-hidden">
                    <button onClick={() => setViewMode('table')}
                        className={cn('p-2 transition-colors', viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-400' : 'text-dark-500 hover:text-white')}>
                        <LayoutList size={16} />
                    </button>
                    <button onClick={() => setViewMode('grid')}
                        className={cn('p-2 transition-colors', viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-dark-500 hover:text-white')}>
                        <LayoutGrid size={16} />
                    </button>
                </div>
            </div>

            {/* SPLIT VIEW: List + Detail */}
            <div className={cn('flex gap-6', selectedCustomer ? 'items-start' : '')}>
                {/* Left: List/Grid */}
                <div className={cn('transition-all duration-300', selectedCustomer ? 'w-1/2' : 'w-full')}>
                    {isLoading ? (
                        <div className="glass-card p-8">
                            <div className="animate-pulse space-y-3">
                                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-dark-200 rounded-lg" />)}
                            </div>
                        </div>
                    ) : customers.length === 0 ? (
                        <EmptyState icon={<Users size={48} />} title="No customers yet"
                            description="Add your first customer to get started" actionLabel="Add Customer" onAction={handleCreate} />
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {customers.map(c => (
                                <CustomerCard key={c.id} customer={c}
                                    onView={() => setSelectedCustomer(c)}
                                    onEdit={() => handleEdit(c)}
                                    onDelete={() => { setDeletingCustomer(c); setIsDeleteModalOpen(true) }} />
                            ))}
                        </div>
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-dark-300/50">
                                        {['Customer', 'Type', 'Phone', 'Outstanding', 'Status', ''].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-300/30">
                                    {customers.map(c => (
                                        <tr key={c.id} onClick={() => setSelectedCustomer(c)}
                                            className={cn('hover:bg-dark-200/30 cursor-pointer transition-colors',
                                                selectedCustomer?.id === c.id && 'bg-cyan-500/5 border-l-2 border-cyan-500')}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold text-sm">
                                                        {c.name[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">{c.name}</p>
                                                        <p className="text-xs text-dark-500">{c.email || '-'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={c.customer_type === 'wholesale' ? 'purple' : c.customer_type === 'distributor' ? 'info' : 'default'}>
                                                    {c.customer_type}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-dark-500">{c.phone || '-'}</td>
                                            <td className="px-4 py-3">
                                                <span className={cn('text-sm font-mono font-semibold', c.outstanding_amount > 0 ? 'text-red-400' : 'text-emerald-400')}>
                                                    {formatCurrency(c.outstanding_amount || 0)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(c) }}
                                                        className="p-1.5 rounded-lg text-dark-500 hover:text-cyan-400 hover:bg-dark-200"><Edit2 size={14} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setDeletingCustomer(c); setIsDeleteModalOpen(true) }}
                                                        className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-dark-200"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-xs text-dark-500">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount}</p>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)} icon={<ChevronLeft size={16} />}>Prev</Button>
                                <span className="text-sm text-dark-500">{page} / {totalPages}</span>
                                <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={16} /></Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Detail Panel */}
                {selectedCustomer && (
                    <div className="w-1/2 sticky top-20">
                        <CustomerDetail customer={selectedCustomer}
                            onClose={() => setSelectedCustomer(null)}
                            onEdit={() => handleEdit(selectedCustomer)} />
                    </div>
                )}
            </div>

            {/* ============ CREATE/EDIT MODAL ============ */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
                title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                description={editingCustomer ? `Editing ${editingCustomer.name}` : 'Fill in customer details'}
                size="lg"
                footer={<>
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} isLoading={isSaving} icon={<Save size={16} />}>
                        {editingCustomer ? 'Update' : 'Create Customer'}
                    </Button>
                </>}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Customer Name *" value={formData.name}
                        onChange={(e) => updateForm('name', e.target.value)} placeholder="Business or person name" />
                    <Select label="Customer Type" value={formData.customer_type}
                        onChange={(e) => updateForm('customer_type', e.target.value)} options={TYPE_OPTIONS} />
                    <Input label="Phone" value={formData.phone}
                        onChange={(e) => updateForm('phone', e.target.value)} placeholder="9876543210" icon={<Phone size={14} />} />
                    <Input label="Alt Phone" value={formData.alt_phone}
                        onChange={(e) => updateForm('alt_phone', e.target.value)} placeholder="Alternative number" />
                    <Input label="Email" value={formData.email} type="email"
                        onChange={(e) => updateForm('email', e.target.value)} placeholder="email@company.com" icon={<Mail size={14} />} />
                    <Input label="GSTIN" value={formData.gst_number}
                        onChange={(e) => updateForm('gst_number', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" />
                    <Input label="PAN" value={formData.pan_number}
                        onChange={(e) => updateForm('pan_number', e.target.value.toUpperCase())} placeholder="AAAAA0000A" />
                    <Select label="Status" value={formData.status}
                        onChange={(e) => updateForm('status', e.target.value)} options={STATUS_OPTIONS} />
                    <Input label="Credit Limit (₹)" type="number" value={formData.credit_limit}
                        onChange={(e) => updateForm('credit_limit', e.target.value)} placeholder="0" icon={<IndianRupee size={14} />} />
                    <Input label="Credit Days" type="number" value={formData.credit_days}
                        onChange={(e) => updateForm('credit_days', e.target.value)} placeholder="30" />
                    <div className="md:col-span-2">
                        <Textarea label="Notes" value={formData.notes}
                            onChange={(e) => updateForm('notes', e.target.value)} placeholder="Internal notes..." rows={3} />
                    </div>
                </div>
            </Modal>

            {/* ============ DELETE MODAL ============ */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setDeletingCustomer(null) }}
                title="Delete Customer" size="sm"
                footer={<>
                    <Button variant="secondary" onClick={() => { setIsDeleteModalOpen(false); setDeletingCustomer(null) }}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Delete</Button>
                </>}>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                    <AlertCircle size={20} className="text-red-400 mt-0.5" />
                    <div>
                        <p className="text-sm text-white">Delete <strong>{deletingCustomer?.name}</strong>?</p>
                        <p className="text-xs text-dark-500 mt-1">This will also delete all addresses. Cannot be undone.</p>
                    </div>
                </div>
            </Modal>
        </div>
    )
}