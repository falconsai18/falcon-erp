
import {
    LayoutDashboard, Users, FileText, ShoppingCart, Truck,
    Boxes, PackageCheck, FileMinus, Wallet, FlaskConical,
    Factory, Package, ClipboardCheck, Warehouse, BarChart3, Settings
} from 'lucide-react'

// ============ TYPES ============
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'accountant' | 'staff' | 'viewer'

export type Resource =
    | 'dashboard'
    | 'users'
    | 'settings'
    | 'audit_logs'
    | 'customers'
    | 'quotations'
    | 'sales_orders'
    | 'invoices'
    | 'credit_notes'
    | 'challans'
    | 'suppliers'
    | 'purchase_orders'
    | 'grn'
    | 'supplier_bills'
    | 'debit_notes'
    | 'payments' // General payments or Supplier Payments
    | 'products'
    | 'raw_materials'
    | 'batches'
    | 'warehouses'
    | 'formulations'
    | 'work_orders'
    | 'quality_checks'
    | 'reports'
    | 'gst_reports'
    | 'categories'
    | 'brands'
    | 'tax_rates'
    | 'uom'
    | 'hsn_codes'

export type Action = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export'

export type PermissionMatrix = Record<Resource, Record<UserRole, Action[]>>

// ============ LABELS & COLORS ============
export const ROLE_LABELS: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    accountant: 'Accountant',
    staff: 'Staff',
    viewer: 'Viewer',
}

export const ROLE_COLORS: Record<UserRole, string> = {
    super_admin: 'purple',
    admin: 'gold',
    manager: 'blue',
    accountant: 'green',
    staff: 'orange',
    viewer: 'gray',
}

// ============ PERMISSIONS MATRIX ============
const ALL_ACTIONS: Action[] = ['create', 'read', 'update', 'delete', 'approve', 'export']
const READ_ONLY: Action[] = ['read']
const CRUD: Action[] = ['create', 'read', 'update', 'delete']
const CRU: Action[] = ['create', 'read', 'update']

export const PERMISSIONS: PermissionMatrix = {
    dashboard: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: ALL_ACTIONS,
        staff: ALL_ACTIONS,
        viewer: READ_ONLY
    },
    users: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: [],
        accountant: [],
        staff: [],
        viewer: []
    },
    settings: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: [],
        accountant: [],
        staff: [],
        viewer: []
    },
    audit_logs: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: READ_ONLY,
        accountant: [],
        staff: [],
        viewer: []
    },
    customers: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: READ_ONLY,
        staff: CRUD,
        viewer: READ_ONLY
    },
    quotations: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: READ_ONLY,
        staff: CRUD,
        viewer: READ_ONLY
    },
    sales_orders: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: READ_ONLY,
        staff: CRUD,
        viewer: READ_ONLY
    },
    invoices: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: CRUD,
        staff: CRUD,
        viewer: READ_ONLY
    },
    credit_notes: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: CRUD,
        staff: [],
        viewer: READ_ONLY
    },
    challans: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: [],
        staff: CRUD,
        viewer: READ_ONLY
    },
    suppliers: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: READ_ONLY,
        staff: CRUD,
        viewer: READ_ONLY
    },
    purchase_orders: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: READ_ONLY,
        staff: CRUD,
        viewer: READ_ONLY
    },
    grn: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: [],
        staff: CRUD,
        viewer: READ_ONLY
    },
    supplier_bills: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: CRUD,
        staff: [],
        viewer: READ_ONLY
    },
    debit_notes: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: CRUD,
        staff: [],
        viewer: READ_ONLY
    },
    payments: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: CRUD,
        staff: [],
        viewer: READ_ONLY
    },
    products: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: READ_ONLY,
        staff: CRUD,
        viewer: READ_ONLY
    },
    raw_materials: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: READ_ONLY,
        staff: CRUD,
        viewer: READ_ONLY
    },
    batches: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: [],
        staff: CRUD,
        viewer: READ_ONLY
    },
    warehouses: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: [],
        staff: READ_ONLY,
        viewer: READ_ONLY
    },
    formulations: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: [],
        staff: CRUD,
        viewer: READ_ONLY
    },
    work_orders: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: [],
        staff: CRUD,
        viewer: READ_ONLY
    },
    quality_checks: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: [],
        staff: CRUD,
        viewer: READ_ONLY
    },
    reports: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: CRUD,
        staff: [],
        viewer: READ_ONLY
    },
    gst_reports: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: CRUD,
        staff: [],
        viewer: READ_ONLY
    },
    categories: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: [],
        staff: [],
        viewer: READ_ONLY
    },
    brands: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: ALL_ACTIONS,
        accountant: [],
        staff: [],
        viewer: READ_ONLY
    },
    tax_rates: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: [],
        accountant: CRUD,
        staff: [],
        viewer: READ_ONLY
    },
    uom: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: [],
        accountant: CRUD,
        staff: [],
        viewer: READ_ONLY
    },
    hsn_codes: {
        super_admin: ALL_ACTIONS,
        admin: ALL_ACTIONS,
        manager: [],
        accountant: CRUD,
        staff: [],
        viewer: READ_ONLY
    },
}

// ============ SIDEBAR MODULES ============
// Maps Role -> Array of visible PATHS
// Based on Sidebar.tsx path constants and user requirements

export const SIDEBAR_MODULES: Record<UserRole, string[]> = {
    super_admin: ['*'], // All routes
    admin: ['*'],       // All routes

    manager: [
        '/', '/customers', '/quotations', '/sales', '/invoices',
        '/credit-notes', '/challans', '/suppliers', '/purchase',
        '/grn', '/debit-notes', '/supplier-payments', '/raw-materials',
        '/formulations', '/production', '/batches', '/quality-checks',
        '/products', '/inventory', '/reports'
        // Excludes: settings, users (if existed)
    ],

    accountant: [
        '/', '/invoices', '/credit-notes', '/debit-notes',
        '/supplier-payments', '/reports', '/customers', '/suppliers'
        // Note: gst_reports is likely a sub-feature of reports
    ],

    staff: [
        '/', '/customers', '/quotations', '/sales', '/challans',
        '/suppliers', '/purchase', '/grn', '/products',
        '/raw-materials', '/batches', '/inventory', '/formulations',
        '/production', '/quality-checks'
    ],

    viewer: ['*'] // All visible (Read Only enforced by permission check)
}
