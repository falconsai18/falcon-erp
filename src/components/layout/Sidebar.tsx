import { useState, useEffect, useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { usePermission } from '@/hooks/usePermission'
import {
    LayoutDashboard,
    Package,
    Users,
    ShoppingCart,
    FileText,
    Warehouse,
    Truck,
    FlaskConical,
    Factory,
    BarChart3,
    Settings,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    LogOut,
    Sun,
    Moon,
    Boxes,
    PackageCheck,
    FileMinus,
    ClipboardCheck,
    Wallet,
    Shield,
    X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============ SECTIONED NAVIGATION ============
interface NavItem {
    label: string
    icon: React.ElementType
    path: string
}

interface NavSection {
    title: string
    items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
    {
        title: 'Dashboard',
        items: [
            { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
        ]
    },
    {
        title: 'Sales',
        items: [
            { label: 'Customers', icon: Users, path: '/customers' },
            { label: 'Quotations', icon: FileText, path: '/quotations' },
            { label: 'Sales Orders', icon: ShoppingCart, path: '/sales' },
            { label: 'Invoices', icon: FileText, path: '/invoices' },
            { label: 'Credit Notes', icon: FileText, path: '/credit-notes' },
            { label: 'Delivery Challans', icon: Truck, path: '/challans' },
        ]
    },
    {
        title: 'Purchase',
        items: [
            { label: 'Suppliers', icon: Boxes, path: '/suppliers' },
            { label: 'Purchase Orders', icon: Truck, path: '/purchase' },
            { label: 'Goods Receipt', icon: PackageCheck, path: '/grn' },
            { label: 'Debit Notes', icon: FileMinus, path: '/debit-notes' },
            { label: 'Supplier Payments', icon: Wallet, path: '/supplier-payments' },
        ]
    },
    {
        title: 'Manufacturing',
        items: [
            { label: 'Raw Materials', icon: FlaskConical, path: '/raw-materials' },
            { label: 'Formulations', icon: FlaskConical, path: '/formulations' },
            { label: 'Production', icon: Factory, path: '/production' },
            { label: 'Batches', icon: Package, path: '/batches' },
        ]
    },
    {
        title: 'Quality',
        items: [
            { label: 'Quality Checks', icon: ClipboardCheck, path: '/quality-checks' },
        ]
    },
    {
        title: 'Stock',
        items: [
            { label: 'Products', icon: Package, path: '/products' },
            { label: 'Stock', icon: Warehouse, path: '/inventory' },
        ]
    },
    {
        title: 'Reports & Settings',
        items: [
            { label: 'Reports', icon: BarChart3, path: '/reports' },
            { label: 'GST Reports', icon: FileText, path: '/gst-reports' },
            { label: 'Users', icon: Users, path: '/users' },
            { label: 'Audit Logs', icon: Shield, path: '/audit-logs' },
            { label: 'Settings', icon: Settings, path: '/settings' },
        ]
    },
]

const STORAGE_KEY = 'sidebar-sections'

// ============ PROPS INTERFACE ============
interface SidebarProps {
    isMobile?: boolean
    mobileOpen?: boolean
    onMobileClose?: () => void
}

export function Sidebar({ isMobile = false, mobileOpen = false, onMobileClose }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false)
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
    const { user, logout } = useAuthStore()
    const { isDark, toggle: toggleTheme } = useThemeStore()
    const { canAccessModule } = usePermission()
    const location = useLocation()

    // Filter sections based on permissions
    const filteredSections = useMemo(() => {
        return NAV_SECTIONS.map(section => ({
            ...section,
            items: section.items.filter(item => canAccessModule(item.path))
        })).filter(section => section.items.length > 0)
    }, [canAccessModule])

    // Load expanded state from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            try {
                setExpandedSections(JSON.parse(stored))
            } catch {
                const defaultExpanded: Record<string, boolean> = {}
                filteredSections.forEach(section => {
                    defaultExpanded[section.title] = true
                })
                setExpandedSections(defaultExpanded)
            }
        } else {
            const defaultExpanded: Record<string, boolean> = {}
            filteredSections.forEach(section => {
                defaultExpanded[section.title] = true
            })
            setExpandedSections(defaultExpanded)
        }
    }, [filteredSections])

    // Save to localStorage whenever expandedSections changes
    useEffect(() => {
        if (Object.keys(expandedSections).length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedSections))
        }
    }, [expandedSections])

    // Auto-expand section containing active page
    useEffect(() => {
        const activeSection = filteredSections.find(section =>
            section.items.some(item =>
                location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path))
            )
        )

        if (activeSection) {
            setExpandedSections(prev => ({
                ...prev,
                [activeSection.title]: true
            }))
        }
    }, [location.pathname, filteredSections])

    // Close mobile sidebar when route changes
    useEffect(() => {
        if (isMobile && onMobileClose) {
            onMobileClose()
        }
    }, [location.pathname, isMobile, onMobileClose])

    const toggleSection = (title: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [title]: !prev[title]
        }))
    }

    // Determine which section contains the active page
    const activeSectionTitle = useMemo(() => {
        const section = filteredSections.find(section =>
            section.items.some(item =>
                location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path))
            )
        )
        return section?.title
    }, [location.pathname, filteredSections])

    // ============ MOBILE SIDEBAR (DRAWER) ============
    if (isMobile) {
        return (
            <>
                {/* Backdrop */}
                <div
                    className={cn(
                        'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden transition-opacity duration-300',
                        mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    )}
                    onClick={onMobileClose}
                />

                {/* Mobile Drawer */}
                <aside
                    className={cn(
                        'fixed inset-y-0 left-0 z-[60] w-[280px] bg-white dark:bg-dark-50 border-r border-gray-200 dark:border-dark-300/50',
                        'transform transition-transform duration-300 ease-out lg:hidden',
                        mobileOpen ? 'translate-x-0' : '-translate-x-full'
                    )}
                >
                    {/* Mobile Header with Close Button */}
                    <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-dark-300/50">
                        <div className="flex items-center gap-3">
                            {/* FAL Oval Logo */}
                            <svg width="48" height="32" viewBox="0 0 120 80" className="flex-shrink-0">
                                <defs>
                                    <linearGradient id="falFlameSidebar" x1="0%" y1="100%" x2="0%" y2="0%">
                                        <stop offset="0%" stopColor="#dc2626">
                                            <animate attributeName="stop-color" values="#dc2626;#ea580c;#16a34a;#dc2626" dur="3s" repeatCount="indefinite" />
                                        </stop>
                                        <stop offset="50%" stopColor="#ea580c">
                                            <animate attributeName="stop-color" values="#ea580c;#16a34a;#dc2626;#ea580c" dur="3s" repeatCount="indefinite" />
                                        </stop>
                                        <stop offset="100%" stopColor="#16a34a">
                                            <animate attributeName="stop-color" values="#16a34a;#dc2626;#ea580c;#16a34a" dur="3s" repeatCount="indefinite" />
                                        </stop>
                                    </linearGradient>
                                    <linearGradient id="ovalGradSidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#16a34a" />
                                        <stop offset="100%" stopColor="#22c55e" />
                                    </linearGradient>
                                    <filter id="falGlowSidebar" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                                        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                                    </filter>
                                </defs>
                                <ellipse cx="60" cy="38" rx="57" ry="34" fill="none" stroke="url(#ovalGradSidebar)" strokeWidth="2.5" filter="url(#falGlowSidebar)"/>
                                <ellipse cx="60" cy="38" rx="49" ry="27" fill="none" stroke="#16a34a" strokeWidth="0.8" opacity="0.3"/>
                                <path d="M60,10 C65,17 71,26 69,35 C67,43 63,49 60,51 C57,49 53,43 51,35 C49,26 55,17 60,10 Z" fill="url(#falFlameSidebar)" opacity="0.9"/>
                                <text x="60" y="41" textAnchor="middle" fill="#ea580c" fontSize="17" fontWeight="900" fontFamily="system-ui" filter="url(#falGlowSidebar)" letterSpacing="1">FAL</text>
                            </svg>
                            <div>
                                <h1 className="text-sm font-bold text-gray-900 dark:text-white">FALCON ERP</h1>
                                <p className="text-[10px] text-gray-500 dark:text-dark-500">Since 1989</p>
                            </div>
                        </div>
                        <button
                            onClick={onMobileClose}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
                            aria-label="Close menu"
                        >
                            <X size={20} className="text-gray-600 dark:text-gray-400" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-3 px-3 h-[calc(100vh-180px)]">
                        {filteredSections.map((section, sectionIndex) => {
                            const isExpanded = expandedSections[section.title] ?? true
                            const isActiveSection = activeSectionTitle === section.title

                            return (
                                <div key={section.title} className={cn(sectionIndex > 0 && 'mt-2')}>
                                    <button
                                        onClick={() => toggleSection(section.title)}
                                        className="w-full px-3 py-2 flex items-center justify-between text-[10px] font-medium uppercase text-gray-500 dark:text-dark-500 tracking-wider hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer transition-colors"
                                    >
                                        <span>{section.title}</span>
                                        <ChevronDown
                                            size={14}
                                            className={cn(
                                                'transition-transform duration-200',
                                                !isExpanded && '-rotate-90'
                                            )}
                                        />
                                    </button>
                                    <div
                                        className={cn(
                                            'overflow-hidden transition-all duration-200 ease-in-out',
                                            isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                                        )}
                                    >
                                        <div className="space-y-0.5 pt-1">
                                            {section.items.map((item) => {
                                                const isActive = location.pathname === item.path ||
                                                    (item.path !== '/' && location.pathname.startsWith(item.path))

                                                return (
                                                    <NavLink
                                                        key={item.path}
                                                        to={item.path}
                                                        onClick={onMobileClose}
                                                        className={cn(
                                                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative',
                                                            isActive
                                                                ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                                                                : 'text-gray-600 dark:text-dark-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-200/50'
                                                        )}
                                                    >
                                                        {isActive && (
                                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-500 rounded-r-full" />
                                                        )}
                                                        <item.icon size={18} className="flex-shrink-0" />
                                                        <span>{item.label}</span>
                                                    </NavLink>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </nav>

                    {/* Bottom Section */}
                    <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-dark-300/50 bg-white dark:bg-dark-50 p-3 space-y-2">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-dark-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-200/50 w-full transition-colors text-sm"
                        >
                            {isDark ? <Sun size={18} /> : <Moon size={18} />}
                            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                        </button>

                        {/* User Info */}
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100 dark:bg-dark-200/30">
                            <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 text-xs font-bold flex-shrink-0">
                                {user?.full_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.full_name || 'User'}</p>
                                <p className="text-[10px] text-gray-500 dark:text-dark-500 truncate">{user?.role || 'viewer'}</p>
                            </div>
                            <button
                                onClick={logout}
                                className="text-gray-500 dark:text-dark-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                title="Logout"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </aside>
            </>
        )
    }

    // ============ DESKTOP SIDEBAR ============
    return (
        <aside
            className={cn(
                'h-screen flex flex-col border-r border-gray-200 dark:border-dark-300/50 bg-white dark:bg-dark-50 transition-all duration-300 sticky top-0',
                collapsed ? 'w-[68px]' : 'w-[240px]'
            )}
        >
            {/* Logo */}
            <div className="h-16 flex items-center gap-3 px-4 border-b border-dark-300/50 dark:border-dark-300/50 border-gray-200">
                {/* FAL Oval Logo — Desktop */}
                <svg width="48" height="32" viewBox="0 0 120 80" className="flex-shrink-0">
                    <defs>
                        <linearGradient id="falFlameDesktop" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#dc2626">
                                <animate attributeName="stop-color" values="#dc2626;#ea580c;#16a34a;#dc2626" dur="3s" repeatCount="indefinite" />
                            </stop>
                            <stop offset="50%" stopColor="#ea580c">
                                <animate attributeName="stop-color" values="#ea580c;#16a34a;#dc2626;#ea580c" dur="3s" repeatCount="indefinite" />
                            </stop>
                            <stop offset="100%" stopColor="#16a34a">
                                <animate attributeName="stop-color" values="#16a34a;#dc2626;#ea580c;#16a34a" dur="3s" repeatCount="indefinite" />
                            </stop>
                        </linearGradient>
                        <linearGradient id="ovalGradDesktop" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#16a34a" />
                            <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                        <filter id="falGlowDesktop" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                    </defs>
                    <ellipse cx="60" cy="38" rx="57" ry="34" fill="none" stroke="url(#ovalGradDesktop)" strokeWidth="2.5" filter="url(#falGlowDesktop)"/>
                    <ellipse cx="60" cy="38" rx="49" ry="27" fill="none" stroke="#16a34a" strokeWidth="0.8" opacity="0.3"/>
                    <path d="M60,10 C65,17 71,26 69,35 C67,43 63,49 60,51 C57,49 53,43 51,35 C49,26 55,17 60,10 Z" fill="url(#falFlameDesktop)" opacity="0.9"/>
                    <text x="60" y="41" textAnchor="middle" fill="#ea580c" fontSize="17" fontWeight="900" fontFamily="system-ui" filter="url(#falGlowDesktop)" letterSpacing="1">FAL</text>
                </svg>
                {!collapsed && (
                    <div className="overflow-hidden">
                        <h1 className="text-sm font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">FALCON ERP</h1>
                        <p className="text-[10px] text-dark-500 whitespace-nowrap">Since 1989</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-3 px-2">
                {filteredSections.map((section, sectionIndex) => {
                    const isExpanded = expandedSections[section.title] ?? true
                    const isActiveSection = activeSectionTitle === section.title

                    return (
                        <div key={section.title} className={cn(sectionIndex > 0 && 'mt-2')}>
                            {!collapsed && (
                                <button
                                    onClick={() => toggleSection(section.title)}
                                    className="w-full px-3 py-2 flex items-center justify-between text-[10px] font-medium uppercase text-gray-500 dark:text-dark-500 tracking-wider hover:text-gray-300 dark:hover:text-gray-300 cursor-pointer transition-colors"
                                >
                                    <span>{section.title}</span>
                                    <ChevronDown
                                        size={14}
                                        className={cn(
                                            'transition-transform duration-200',
                                            !isExpanded && '-rotate-90'
                                        )}
                                    />
                                </button>
                            )}
                            <div
                                className={cn(
                                    'overflow-hidden transition-all duration-200 ease-in-out',
                                    isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                                )}
                            >
                                <div className="space-y-0.5 pt-1">
                                    {section.items.map((item) => {
                                        const isActive = location.pathname === item.path ||
                                            (item.path !== '/' && location.pathname.startsWith(item.path))

                                        return (
                                            <NavLink
                                                key={item.path}
                                                to={item.path}
                                                className={cn(
                                                    'sidebar-item group relative',
                                                    isActive
                                                        ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                                                        : 'text-gray-600 dark:text-dark-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-200/50'
                                                )}
                                                title={collapsed ? item.label : undefined}
                                            >
                                                {isActive && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-500 rounded-r-full" />
                                                )}
                                                <item.icon size={20} className="flex-shrink-0" />
                                                {!collapsed && <span>{item.label}</span>}
                                            </NavLink>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </nav>

            {/* Bottom Section */}
            <div className="border-t border-dark-300/50 dark:border-dark-300/50 border-gray-200 p-2 space-y-1">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="sidebar-item w-full text-gray-600 dark:text-dark-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-200/50"
                    title={collapsed ? (isDark ? 'Light Mode' : 'Dark Mode') : undefined}
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                    {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
                </button>

                {/* User Info */}
                <div className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100 dark:bg-dark-200/30',
                    collapsed && 'justify-center px-0'
                )}>
                    <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 text-xs font-bold flex-shrink-0">
                        {user?.full_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.full_name || 'User'}</p>
                            <p className="text-[10px] text-gray-500 dark:text-dark-500 truncate">{user?.role || 'viewer'}</p>
                        </div>
                    )}
                    {!collapsed && (
                        <button
                            onClick={logout}
                            className="text-gray-500 dark:text-dark-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            title="Logout"
                        >
                            <LogOut size={16} />
                        </button>
                    )}
                </div>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="sidebar-item w-full text-gray-600 dark:text-dark-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-200/50 justify-center"
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    {!collapsed && <span className="text-xs">Collapse</span>}
                </button>
            </div>
        </aside>
    )
}
