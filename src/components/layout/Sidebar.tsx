import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useThemeStore } from '@/stores/themeStore'
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
    LogOut,
    Sun,
    Moon,
    Boxes,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Products', icon: Package, path: '/products' },
    { label: 'Inventory', icon: Warehouse, path: '/inventory' },
    { label: 'Customers', icon: Users, path: '/customers' },
    { label: 'Sales Orders', icon: ShoppingCart, path: '/sales' },
    { label: 'Invoices', icon: FileText, path: '/invoices' },
    { label: 'Purchase', icon: Truck, path: '/purchase' },
    { label: 'Suppliers', icon: Boxes, path: '/suppliers' },
    { label: 'Raw Materials', icon: FlaskConical, path: '/raw-materials' },
    { label: 'Production', icon: Factory, path: '/production' },
    { label: 'Reports', icon: BarChart3, path: '/reports' },
    { label: 'Settings', icon: Settings, path: '/settings' },
]

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const { user, logout } = useAuthStore()
    const { isDark, toggle: toggleTheme } = useThemeStore()
    const location = useLocation()

    return (
        <aside
            className={cn(
                'h-screen flex flex-col border-r border-dark-300/50 dark:border-dark-300/50 border-gray-200 bg-dark-50 dark:bg-dark-50 bg-white transition-all duration-300 sticky top-0',
                collapsed ? 'w-[68px]' : 'w-[240px]'
            )}
        >
            {/* Logo */}
            <div className="h-16 flex items-center gap-3 px-4 border-b border-dark-300/50 dark:border-dark-300/50 border-gray-200">
                <span className="text-2xl flex-shrink-0">🦅</span>
                {!collapsed && (
                    <div className="overflow-hidden">
                        <h1 className="text-sm font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">Falcon Super Gold</h1>
                        <p className="text-[10px] text-dark-500 whitespace-nowrap">Enterprise ERP</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                {NAV_ITEMS.map((item) => {
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