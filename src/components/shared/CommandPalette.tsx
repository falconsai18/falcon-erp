import { useEffect, useState, useCallback } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import {
    Search, Users, Package, FileText, ShoppingCart, Truck,
    IndianRupee, X, ArrowRight, Building2, FlaskConical, ClipboardList
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn, formatCurrency } from '@/lib/utils'

interface SearchResult {
    id: string
    title: string
    subtitle: string
    type: 'customer' | 'supplier' | 'product' | 'invoice' | 'sales_order' | 'purchase_order'
    url: string
    amount?: number
    status?: string
}

const TYPE_CONFIG = {
    customer: { icon: Users, label: 'Customers', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    supplier: { icon: Building2, label: 'Suppliers', color: 'text-purple-400', bg: 'bg-purple-500/10' },
    product: { icon: Package, label: 'Products', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    invoice: { icon: IndianRupee, label: 'Invoices', color: 'text-rose-400', bg: 'bg-rose-500/10' },
    sales_order: { icon: ShoppingCart, label: 'Sales Orders', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    purchase_order: { icon: Truck, label: 'Purchase Orders', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
}

const QUICK_LINKS = [
    { title: 'Dashboard', url: '/', icon: ClipboardList },
    { title: 'Customers', url: '/customers', icon: Users },
    { title: 'Suppliers', url: '/suppliers', icon: Building2 },
    { title: 'Products', url: '/products', icon: Package },
    { title: 'Invoices', url: '/invoices', icon: IndianRupee },
    { title: 'Sales Orders', url: '/sales', icon: ShoppingCart },
    { title: 'Purchase Orders', url: '/purchases', icon: Truck },
    { title: 'Raw Materials', url: '/raw-materials', icon: FlaskConical },
    { title: 'Work Orders', url: '/work-orders', icon: ClipboardList },
]

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [loading, setLoading] = useState(false)

    const performSearch = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([])
            return
        }

        setLoading(true)
        try {
            const q = `%${searchQuery}%`
            const [customers, suppliers, products, invoices, salesOrders, purchaseOrders] = await Promise.all([
                supabase.from('customers').select('id, name, phone, status').ilike('name', q).limit(5),
                supabase.from('suppliers').select('id, name, phone, status').ilike('name', q).limit(5),
                supabase.from('products').select('id, name, sku, selling_price').ilike('name', q).limit(5),
                supabase.from('invoices')
                    .select('id, invoice_number, total_amount, status, customers(name)')
                    .or(`invoice_number.ilike.${q}`)
                    .limit(5),
                supabase.from('sales_orders')
                    .select('id, order_number, total_amount, status, customers(name)')
                    .or(`order_number.ilike.${q}`)
                    .limit(5),
                supabase.from('purchase_orders')
                    .select('id, po_number, total_amount, status, suppliers(name)')
                    .or(`po_number.ilike.${q}`)
                    .limit(5),
            ])

            // Also search invoices/SO by customer name, PO by supplier name
            let extraInvoices: any[] = []
            let extraSOs: any[] = []
            let extraPOs: any[] = []

            const [invByCust, soByCust, poBySupp] = await Promise.all([
                supabase.from('invoices')
                    .select('id, invoice_number, total_amount, status, customers!inner(name)')
                    .ilike('customers.name', q)
                    .limit(5),
                supabase.from('sales_orders')
                    .select('id, order_number, total_amount, status, customers!inner(name)')
                    .ilike('customers.name', q)
                    .limit(5),
                supabase.from('purchase_orders')
                    .select('id, po_number, total_amount, status, suppliers!inner(name)')
                    .ilike('suppliers.name', q)
                    .limit(5),
            ])

            extraInvoices = invByCust.data || []
            extraSOs = soByCust.data || []
            extraPOs = poBySupp.data || []

            // Merge and deduplicate
            const seenIds = new Set<string>()
            const addUnique = (items: SearchResult[]) => {
                return items.filter(item => {
                    if (seenIds.has(item.id)) return false
                    seenIds.add(item.id)
                    return true
                })
            }

            const allResults: SearchResult[] = addUnique([
                ...(customers.data || []).map((c: any) => ({
                    id: c.id, title: c.name, subtitle: c.phone || 'No phone',
                    type: 'customer' as const, url: '/customers', status: c.status,
                })),
                ...(suppliers.data || []).map((s: any) => ({
                    id: s.id, title: s.name, subtitle: s.phone || 'No phone',
                    type: 'supplier' as const, url: '/suppliers', status: s.status,
                })),
                ...(products.data || []).map((p: any) => ({
                    id: p.id, title: p.name, subtitle: p.sku || '-',
                    type: 'product' as const, url: '/products', amount: p.selling_price,
                })),
                ...[...(invoices.data || []), ...extraInvoices].map((i: any) => ({
                    id: i.id, title: i.invoice_number, subtitle: i.customers?.name || '-',
                    type: 'invoice' as const, url: '/invoices', amount: i.total_amount, status: i.status,
                })),
                ...[...(salesOrders.data || []), ...extraSOs].map((so: any) => ({
                    id: so.id, title: so.order_number, subtitle: so.customers?.name || '-',
                    type: 'sales_order' as const, url: '/sales', amount: so.total_amount, status: so.status,
                })),
                ...[...(purchaseOrders.data || []), ...extraPOs].map((po: any) => ({
                    id: po.id, title: po.po_number, subtitle: po.suppliers?.name || '-',
                    type: 'purchase_order' as const, url: '/purchases', amount: po.total_amount, status: po.status,
                })),
            ])

            setResults(allResults)
        } catch (err) {
            console.error('Search error:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => performSearch(query), 300)
        return () => clearTimeout(timer)
    }, [query, performSearch])

    // Reset on close
    useEffect(() => {
        if (!open) { setQuery(''); setResults([]) }
    }, [open])

    // Escape key
    useEffect(() => {
        if (!open) return
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onOpenChange(false)
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [open, onOpenChange])

    const handleSelect = (url: string) => {
        navigate(url)
        onOpenChange(false)
    }

    // Group results by type
    const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
        if (!acc[r.type]) acc[r.type] = []
        acc[r.type].push(r)
        return acc
    }, {})

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[100]">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
            <div className="relative flex items-start justify-center pt-[15vh]">
                <div className="w-full max-w-2xl mx-4 bg-white dark:bg-dark-50 rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-300/50 overflow-hidden">
                    <Command shouldFilter={false} className="bg-transparent">
                        {/* Search Input */}
                        <div className="flex items-center gap-3 px-4 border-b border-gray-200 dark:border-dark-300/50">
                            <Search size={18} className="text-gray-400 dark:text-dark-500 flex-shrink-0" />
                            <Command.Input
                                value={query}
                                onValueChange={setQuery}
                                placeholder="Search customers, products, invoices, orders..."
                                className="flex-1 py-4 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-dark-500 outline-none text-sm"
                                autoFocus
                            />
                            {loading && (
                                <div className="w-4 h-4 border-2 border-gray-300 dark:border-dark-400 border-t-brand-500 rounded-full animate-spin" />
                            )}
                            <button
                                title="Close search"
                                onClick={() => onOpenChange(false)}
                                className="p-1.5 rounded-lg text-gray-400 dark:text-dark-500 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Results */}
                        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                            {query.length < 2 ? (
                                <Command.Group heading={
                                    <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-dark-600 font-semibold px-2">Quick Links</span>
                                }>
                                    {QUICK_LINKS.map((link) => (
                                        <Command.Item
                                            key={link.url}
                                            value={link.title}
                                            onSelect={() => handleSelect(link.url)}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200/50 data-[selected=true]:bg-gray-100 dark:data-[selected=true]:bg-dark-200/50 transition-colors"
                                        >
                                            <link.icon size={16} className="text-gray-400 dark:text-dark-500" />
                                            <span className="text-sm">{link.title}</span>
                                            <ArrowRight size={12} className="ml-auto text-gray-300 dark:text-dark-600" />
                                        </Command.Item>
                                    ))}
                                </Command.Group>
                            ) : results.length === 0 && !loading ? (
                                <Command.Empty className="py-12 text-center">
                                    <Search size={32} className="text-gray-300 dark:text-dark-600 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500 dark:text-dark-500">No results for "{query}"</p>
                                    <p className="text-xs text-gray-400 dark:text-dark-600 mt-1">Try a different search term</p>
                                </Command.Empty>
                            ) : (
                                Object.entries(grouped).map(([type, items]) => {
                                    const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG]
                                    return (
                                        <Command.Group
                                            key={type}
                                            heading={
                                                <span className={cn("text-[10px] uppercase tracking-wider font-semibold px-2", config.color)}>
                                                    {config.label}
                                                </span>
                                            }
                                        >
                                            {items.map((item) => {
                                                const Icon = config.icon
                                                return (
                                                    <Command.Item
                                                        key={`${type}-${item.id}`}
                                                        value={`${item.title} ${item.subtitle}`}
                                                        onSelect={() => handleSelect(item.url)}
                                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200/50 data-[selected=true]:bg-gray-100 dark:data-[selected=true]:bg-dark-200/50 transition-colors"
                                                    >
                                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", config.bg)}>
                                                            <Icon size={14} className={config.color} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                                                            <p className="text-xs text-gray-500 dark:text-dark-500 truncate">{item.subtitle}</p>
                                                        </div>
                                                        {item.amount !== undefined && (
                                                            <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{formatCurrency(item.amount)}</span>
                                                        )}
                                                        {item.status && (
                                                            <span className={cn(
                                                                "text-[10px] px-2 py-0.5 rounded-full font-medium capitalize",
                                                                item.status === 'active' || item.status === 'paid' || item.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500' :
                                                                    item.status === 'draft' || item.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                                                        item.status === 'overdue' || item.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                                                                            'bg-gray-500/10 text-gray-500'
                                                            )}>
                                                                {item.status}
                                                            </span>
                                                        )}
                                                        <ArrowRight size={12} className="text-gray-300 dark:text-dark-600 flex-shrink-0" />
                                                    </Command.Item>
                                                )
                                            })}
                                        </Command.Group>
                                    )
                                })
                            )}
                        </Command.List>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 dark:border-dark-300/50 text-[10px] text-gray-400 dark:text-dark-600">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-dark-300/50 rounded font-mono">↑↓</kbd> Navigate</span>
                                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-dark-300/50 rounded font-mono">↵</kbd> Open</span>
                                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-dark-300/50 rounded font-mono">esc</kbd> Close</span>
                            </div>
                            <span>Type 2+ characters to search</span>
                        </div>
                    </Command>
                </div>
            </div>
        </div>
    )
}
