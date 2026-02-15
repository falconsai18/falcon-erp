import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import {
    Plus,
    Search,
    Filter,
    Download,
    Package,
    Edit2,
    Trash2,
    Eye,
    MoreVertical,
    X,
    Save,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Table } from '@/components/ui/Table'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

// ============ TYPES ============
interface Product {
    id: string
    name: string
    sku: string
    description: string | null
    category_id: string | null
    brand_id: string | null
    unit_of_measure: string
    hsn_code: string | null
    selling_price: number
    cost_price: number
    mrp: number
    tax_rate: number
    status: string
    min_stock_level: number
    max_stock_level: number
    reorder_point: number
    created_at: string
    updated_at: string
    // joined
    category_name?: string
    brand_name?: string
}

interface ProductFormData {
    name: string
    sku: string
    description: string
    category_id: string
    brand_id: string
    unit_of_measure: string
    hsn_code: string
    selling_price: number
    cost_price: number
    mrp: number
    tax_rate: number
    status: string
    min_stock_level: number
    max_stock_level: number
    reorder_point: number
}

const EMPTY_FORM: ProductFormData = {
    name: '',
    sku: '',
    description: '',
    category_id: '',
    brand_id: '',
    unit_of_measure: 'PCS',
    hsn_code: '',
    selling_price: 0,
    cost_price: 0,
    mrp: 0,
    tax_rate: 12,
    status: 'active',
    min_stock_level: 10,
    max_stock_level: 1000,
    reorder_point: 25,
}

const UNIT_OPTIONS = [
    { value: 'PCS', label: 'Pieces' },
    { value: 'BOX', label: 'Box' },
    { value: 'KG', label: 'Kilogram' },
    { value: 'GM', label: 'Gram' },
    { value: 'LTR', label: 'Litre' },
    { value: 'ML', label: 'Millilitre' },
    { value: 'BTL', label: 'Bottle' },
    { value: 'PKT', label: 'Packet' },
    { value: 'STRIP', label: 'Strip' },
    { value: 'TUBE', label: 'Tube' },
]

const TAX_OPTIONS = [
    { value: '0', label: '0% GST' },
    { value: '5', label: '5% GST' },
    { value: '12', label: '12% GST' },
    { value: '18', label: '18% GST' },
    { value: '28', label: '28% GST' },
]

const STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'draft', label: 'Draft' },
]

// ============ MAIN COMPONENT ============
export function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<{ value: string; label: string }[]>([])
    const [brands, setBrands] = useState<{ value: string; label: string }[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
    const [formData, setFormData] = useState<ProductFormData>(EMPTY_FORM)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [viewProduct, setViewProduct] = useState<Product | null>(null)

    // ============ FETCH DATA ============
    const fetchProducts = async () => {
        try {
            setIsLoading(true)

            let query = supabase
                .from('products')
                .select(`
          *,
          product_categories(name),
          brands(name)
        `)
                .order('created_at', { ascending: false })

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter)
            }

            if (search) {
                query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
            }

            const { data, error } = await query

            if (error) {
                console.error('Products fetch error:', error)
                // Try without joins if table structure is different
                const { data: simpleData, error: simpleError } = await supabase
                    .from('products')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (simpleError) {
                    toast.error('Failed to fetch products: ' + simpleError.message)
                    setProducts([])
                } else {
                    setProducts(simpleData || [])
                }
            } else {
                const mapped = (data || []).map((p: any) => ({
                    ...p,
                    category_name: p.product_categories?.name || '-',
                    brand_name: p.brands?.name || '-',
                }))
                setProducts(mapped)
            }
        } catch (err: any) {
            toast.error('Error: ' + err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchCategories = async () => {
        try {
            const { data } = await supabase.from('product_categories').select('id, name').order('name')
            setCategories((data || []).map((c: any) => ({ value: c.id, label: c.name })))
        } catch {
            // Table might not exist
        }
    }

    const fetchBrands = async () => {
        try {
            const { data } = await supabase.from('brands').select('id, name').order('name')
            setBrands((data || []).map((b: any) => ({ value: b.id, label: b.name })))
        } catch {
            // Table might not exist
        }
    }

    useEffect(() => {
        fetchProducts()
        fetchCategories()
        fetchBrands()
    }, [statusFilter])

    useEffect(() => {
        const timer = setTimeout(() => fetchProducts(), 300)
        return () => clearTimeout(timer)
    }, [search])

    // ============ CRUD OPERATIONS ============
    const handleCreate = () => {
        setEditingProduct(null)
        setFormData(EMPTY_FORM)
        setIsModalOpen(true)
    }

    const handleEdit = (product: Product) => {
        setEditingProduct(product)
        setFormData({
            name: product.name || '',
            sku: product.sku || '',
            description: product.description || '',
            category_id: product.category_id || '',
            brand_id: product.brand_id || '',
            unit_of_measure: product.unit_of_measure || 'PCS',
            hsn_code: product.hsn_code || '',
            selling_price: product.selling_price || 0,
            cost_price: product.cost_price || 0,
            mrp: product.mrp || 0,
            tax_rate: product.tax_rate || 12,
            status: product.status || 'active',
            min_stock_level: product.min_stock_level || 10,
            max_stock_level: product.max_stock_level || 1000,
            reorder_point: product.reorder_point || 25,
        })
        setIsModalOpen(true)
    }

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('Product name is required')
            return
        }
        if (!formData.sku.trim()) {
            toast.error('SKU is required')
            return
        }

        try {
            setIsSaving(true)

            const payload: any = {
                name: formData.name.trim(),
                sku: formData.sku.trim().toUpperCase(),
                description: formData.description.trim() || null,
                unit_of_measure: formData.unit_of_measure,
                hsn_code: formData.hsn_code.trim() || null,
                selling_price: Number(formData.selling_price),
                cost_price: Number(formData.cost_price),
                mrp: Number(formData.mrp),
                tax_rate: Number(formData.tax_rate),
                status: formData.status,
                min_stock_level: Number(formData.min_stock_level),
                max_stock_level: Number(formData.max_stock_level),
                reorder_point: Number(formData.reorder_point),
            }

            // Only add category/brand if selected
            if (formData.category_id) payload.category_id = formData.category_id
            if (formData.brand_id) payload.brand_id = formData.brand_id

            if (editingProduct) {
                // UPDATE
                const { error } = await supabase
                    .from('products')
                    .update(payload)
                    .eq('id', editingProduct.id)

                if (error) throw error
                toast.success('Product updated successfully!')
            } else {
                // CREATE
                const { error } = await supabase
                    .from('products')
                    .insert(payload)

                if (error) throw error
                toast.success('Product created successfully!')
            }

            setIsModalOpen(false)
            fetchProducts()
        } catch (err: any) {
            toast.error('Failed to save: ' + err.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingProduct) return

        try {
            setIsDeleting(true)
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', deletingProduct.id)

            if (error) throw error

            toast.success('Product deleted successfully!')
            setIsDeleteModalOpen(false)
            setDeletingProduct(null)
            fetchProducts()
        } catch (err: any) {
            toast.error('Failed to delete: ' + err.message)
        } finally {
            setIsDeleting(false)
        }
    }

    const updateForm = (field: keyof ProductFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    // ============ TABLE COLUMNS ============
    const columns = [
        {
            key: 'name',
            label: 'Product',
            render: (item: Product) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center">
                        <Package size={16} className="text-brand-400" />
                    </div>
                    <div>
                        <p className="font-medium text-white">{item.name}</p>
                        <p className="text-xs text-dark-500">{item.sku}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'category',
            label: 'Category',
            render: (item: Product) => (
                <span className="text-dark-500">{item.category_name || '-'}</span>
            ),
        },
        {
            key: 'brand',
            label: 'Brand',
            render: (item: Product) => (
                <span className="text-dark-500">{item.brand_name || '-'}</span>
            ),
        },
        {
            key: 'mrp',
            label: 'MRP',
            render: (item: Product) => (
                <span className="font-mono text-white">{formatCurrency(item.mrp || 0)}</span>
            ),
        },
        {
            key: 'selling_price',
            label: 'Selling Price',
            render: (item: Product) => (
                <span className="font-mono text-brand-400">{formatCurrency(item.selling_price || 0)}</span>
            ),
        },
        {
            key: 'tax_rate',
            label: 'GST',
            render: (item: Product) => (
                <Badge variant="info">{item.tax_rate || 0}%</Badge>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (item: Product) => <StatusBadge status={item.status || 'draft'} />,
        },
        {
            key: 'actions',
            label: '',
            className: 'w-24',
            render: (item: Product) => (
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); setViewProduct(item) }}
                        className="p-1.5 rounded-lg text-dark-500 hover:text-white hover:bg-dark-200 transition-colors"
                    >
                        <Eye size={15} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(item) }}
                        className="p-1.5 rounded-lg text-dark-500 hover:text-brand-400 hover:bg-dark-200 transition-colors"
                    >
                        <Edit2 size={15} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setDeletingProduct(item)
                            setIsDeleteModalOpen(true)
                        }}
                        className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-dark-200 transition-colors"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            ),
        },
    ]

    // ============ STATS ============
    const stats = {
        total: products.length,
        active: products.filter(p => p.status === 'active').length,
        inactive: products.filter(p => p.status === 'inactive').length,
        draft: products.filter(p => p.status === 'draft').length,
    }

    // ============ RENDER ============
    return (
        <div className="space-y-6">
            {/* Header */}
            <PageHeader
                title="Products"
                description={`${stats.total} total products • ${stats.active} active`}
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" icon={<Download size={16} />} size="sm">
                            Export
                        </Button>
                        <Button icon={<Plus size={16} />} onClick={handleCreate}>
                            Add Product
                        </Button>
                    </div>
                }
            />

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex-1 max-w-md">
                    <Input
                        placeholder="Search products by name or SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        icon={<Search size={16} />}
                    />
                </div>
                <div className="flex items-center gap-2">
                    {['all', 'active', 'inactive', 'draft'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                statusFilter === status
                                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                                    : 'text-dark-500 hover:text-white hover:bg-dark-200 border border-transparent'
                            )}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                            {status !== 'all' && (
                                <span className="ml-1.5 text-dark-600">
                                    {stats[status as keyof typeof stats] || 0}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <Table
                columns={columns}
                data={products}
                isLoading={isLoading}
                onRowClick={(item) => setViewProduct(item)}
                emptyMessage="No products found. Create your first product!"
                emptyIcon={<Package size={48} />}
            />

            {/* ============ CREATE/EDIT MODAL ============ */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProduct ? 'Edit Product' : 'Add New Product'}
                description={editingProduct ? `Editing ${editingProduct.name}` : 'Fill in product details'}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} isLoading={isSaving} icon={<Save size={16} />}>
                            {editingProduct ? 'Update Product' : 'Create Product'}
                        </Button>
                    </>
                }
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Product Name *"
                        value={formData.name}
                        onChange={(e) => updateForm('name', e.target.value)}
                        placeholder="e.g. Ashwagandha Capsules"
                    />
                    <Input
                        label="SKU *"
                        value={formData.sku}
                        onChange={(e) => updateForm('sku', e.target.value.toUpperCase())}
                        placeholder="e.g. ASH-CAP-500"
                    />
                    <Select
                        label="Category"
                        value={formData.category_id}
                        onChange={(e) => updateForm('category_id', e.target.value)}
                        options={categories}
                        placeholder="Select category"
                    />
                    <Select
                        label="Brand"
                        value={formData.brand_id}
                        onChange={(e) => updateForm('brand_id', e.target.value)}
                        options={brands}
                        placeholder="Select brand"
                    />
                    <Select
                        label="Unit of Measure"
                        value={formData.unit_of_measure}
                        onChange={(e) => updateForm('unit_of_measure', e.target.value)}
                        options={UNIT_OPTIONS}
                    />
                    <Input
                        label="HSN Code"
                        value={formData.hsn_code}
                        onChange={(e) => updateForm('hsn_code', e.target.value)}
                        placeholder="e.g. 30049011"
                    />
                    <Input
                        label="MRP (₹)"
                        type="number"
                        value={formData.mrp}
                        onChange={(e) => updateForm('mrp', e.target.value)}
                        placeholder="0"
                    />
                    <Input
                        label="Selling Price (₹)"
                        type="number"
                        value={formData.selling_price}
                        onChange={(e) => updateForm('selling_price', e.target.value)}
                        placeholder="0"
                    />
                    <Input
                        label="Cost Price (₹)"
                        type="number"
                        value={formData.cost_price}
                        onChange={(e) => updateForm('cost_price', e.target.value)}
                        placeholder="0"
                    />
                    <Select
                        label="GST Rate"
                        value={String(formData.tax_rate)}
                        onChange={(e) => updateForm('tax_rate', e.target.value)}
                        options={TAX_OPTIONS}
                    />
                    <Select
                        label="Status"
                        value={formData.status}
                        onChange={(e) => updateForm('status', e.target.value)}
                        options={STATUS_OPTIONS}
                    />
                    <Input
                        label="Reorder Point"
                        type="number"
                        value={formData.reorder_point}
                        onChange={(e) => updateForm('reorder_point', e.target.value)}
                    />
                    <div className="md:col-span-2">
                        <Textarea
                            label="Description"
                            value={formData.description}
                            onChange={(e) => updateForm('description', e.target.value)}
                            placeholder="Product description..."
                            rows={3}
                        />
                    </div>
                </div>
            </Modal>

            {/* ============ VIEW MODAL ============ */}
            <Modal
                isOpen={!!viewProduct}
                onClose={() => setViewProduct(null)}
                title={viewProduct?.name || 'Product Details'}
                description={viewProduct?.sku}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setViewProduct(null)}>Close</Button>
                        <Button onClick={() => { if (viewProduct) { setViewProduct(null); handleEdit(viewProduct) } }}>
                            Edit Product
                        </Button>
                    </>
                }
            >
                {viewProduct && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {[
                            { label: 'SKU', value: viewProduct.sku },
                            { label: 'Status', value: viewProduct.status, badge: true },
                            { label: 'Category', value: viewProduct.category_name || '-' },
                            { label: 'Brand', value: viewProduct.brand_name || '-' },
                            { label: 'Unit', value: viewProduct.unit_of_measure },
                            { label: 'HSN Code', value: viewProduct.hsn_code || '-' },
                            { label: 'MRP', value: formatCurrency(viewProduct.mrp || 0) },
                            { label: 'Selling Price', value: formatCurrency(viewProduct.selling_price || 0) },
                            { label: 'Cost Price', value: formatCurrency(viewProduct.cost_price || 0) },
                            { label: 'GST Rate', value: `${viewProduct.tax_rate || 0}%` },
                            { label: 'Reorder Point', value: viewProduct.reorder_point || 0 },
                            { label: 'Min Stock', value: viewProduct.min_stock_level || 0 },
                        ].map((item) => (
                            <div key={item.label} className="space-y-1">
                                <p className="text-xs text-dark-500 font-medium">{item.label}</p>
                                {item.badge ? (
                                    <StatusBadge status={String(item.value)} />
                                ) : (
                                    <p className="text-sm font-semibold text-white">{item.value}</p>
                                )}
                            </div>
                        ))}
                        {viewProduct.description && (
                            <div className="col-span-full space-y-1">
                                <p className="text-xs text-dark-500 font-medium">Description</p>
                                <p className="text-sm text-white">{viewProduct.description}</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* ============ DELETE MODAL ============ */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => { setIsDeleteModalOpen(false); setDeletingProduct(null) }}
                title="Delete Product"
                description="This action cannot be undone."
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => { setIsDeleteModalOpen(false); setDeletingProduct(null) }}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
                            Delete Product
                        </Button>
                    </>
                }
            >
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                    <AlertCircle size={20} className="text-red-400 mt-0.5" />
                    <div>
                        <p className="text-sm text-white">
                            Are you sure you want to delete <strong>{deletingProduct?.name}</strong>?
                        </p>
                        <p className="text-xs text-dark-500 mt-1">SKU: {deletingProduct?.sku}</p>
                    </div>
                </div>
            </Modal>
        </div>
    )
}