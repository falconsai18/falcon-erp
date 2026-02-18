import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Search, Command } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store/authStore'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { NotificationBell } from '@/components/notifications/NotificationBell'

const PAGE_TITLES: Record<string, string> = {
    '/': 'Dashboard',
    '/products': 'Products',
    '/inventory': 'Stock',
    '/customers': 'Customers',
    '/sales': 'Sales Orders',
    '/invoices': 'Invoices',
    '/quotations': 'Quotations',
    '/credit-notes': 'Credit Notes',
    '/debit-notes': 'Debit Notes',
    '/challans': 'Delivery Challans',
    '/purchase': 'Purchase Orders',
    '/grn': 'Goods Receipt Notes',
    '/suppliers': 'Suppliers',
    '/raw-materials': 'Raw Materials',
    '/production': 'Production',
    '/batches': 'Batches',
    '/quality-checks': 'Quality Control',
    '/formulations': 'Formulations',
    '/supplier-payments': 'Supplier Payments',
    '/reports': 'Reports',
    '/settings': 'Settings',
}

export function Topbar() {
    const location = useLocation()
    const { user } = useAuthStore()
    const pageTitle = PAGE_TITLES[location.pathname] || 'Falcon ERP'
    const [searchOpen, setSearchOpen] = useState(false)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                e.stopPropagation()
                setSearchOpen(prev => !prev)
            }
        }
        // Use capture phase to intercept before browser handles it
        document.addEventListener('keydown', handleKeyDown, { capture: true })
        return () => document.removeEventListener('keydown', handleKeyDown, { capture: true })
    }, [])

    return (
        <header className="h-16 border-b border-gray-200 dark:border-dark-300/50 bg-white/80 dark:bg-dark-50/80 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-6">
            {/* Left - Page Title */}
            <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{pageTitle}</h1>
            </div>

            {/* Center - Search */}
            <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-100/50 dark:bg-dark-200/50 border border-gray-200 dark:border-dark-300/50 hover:border-gray-300 dark:hover:border-dark-300 transition-colors max-w-md w-full mx-8 group cursor-pointer"
            >
                <Search size={16} className="text-gray-500 dark:text-dark-500" />
                <span className="text-sm text-gray-500 dark:text-dark-500 flex-1 text-left">Search anything...</span>
                <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-200 dark:bg-dark-300/50 text-[10px] text-gray-500 dark:text-dark-500 font-mono">
                    <Command size={10} />K
                </kbd>
            </button>

            {/* Right - Actions */}
            <div className="flex items-center gap-3">
                {/* Notifications */}
                <NotificationBell />

                {/* User Avatar */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 text-sm font-bold">
                        {user?.full_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                </div>
            </div>

            <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
        </header>
    )
}
