/**
 * Lazy-loaded route pages — keeps initial bundle small; chunks load on navigation.
 * Named exports from modules are wrapped as default for React.lazy.
 */
import { lazy } from 'react'

export const DashboardPage = lazy(() =>
    import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
)
export const ProductsPage = lazy(() =>
    import('@/features/products/pages/ProductsPage').then((m) => ({ default: m.ProductsPage }))
)
export const InventoryPage = lazy(() =>
    import('@/features/inventory/pages/InventoryPage').then((m) => ({ default: m.InventoryPage }))
)
export const CustomersPage = lazy(() =>
    import('@/features/customers/pages/CustomersPage').then((m) => ({ default: m.CustomersPage }))
)
export const SalesPage = lazy(() =>
    import('@/features/sales/pages/SalesPage').then((m) => ({ default: m.SalesPage }))
)
export const InvoicesPage = lazy(() =>
    import('@/features/invoices/pages/InvoicesPage').then((m) => ({ default: m.InvoicesPage }))
)
export const QuotationsPage = lazy(() =>
    import('@/features/quotations/pages/QuotationsPage').then((m) => ({ default: m.QuotationsPage }))
)
export const PurchasePage = lazy(() =>
    import('@/features/purchase/pages/PurchasePage').then((m) => ({ default: m.PurchasePage }))
)
export const GRNPage = lazy(() =>
    import('@/features/grn/pages/GRNPage').then((m) => ({ default: m.GRNPage }))
)
export const CreditNotesPage = lazy(() =>
    import('@/features/credit-notes/pages/CreditNotesPage').then((m) => ({ default: m.CreditNotesPage }))
)
export const DebitNotesPage = lazy(() =>
    import('@/features/debit-notes/pages/DebitNotesPage').then((m) => ({ default: m.DebitNotesPage }))
)
export const ChallansPage = lazy(() =>
    import('@/features/challans/pages/ChallansPage').then((m) => ({ default: m.ChallansPage }))
)
export const BatchesPage = lazy(() =>
    import('@/features/batches/pages/BatchesPage').then((m) => ({ default: m.BatchesPage }))
)
export const QualityChecksPage = lazy(() =>
    import('@/features/quality-checks/pages/QualityChecksPage').then((m) => ({ default: m.QualityChecksPage }))
)
export const FormulationsPage = lazy(() =>
    import('@/features/formulations/pages/FormulationsPage').then((m) => ({ default: m.FormulationsPage }))
)
export const SupplierPaymentsPage = lazy(() =>
    import('@/features/supplier-payments/pages/SupplierPaymentsPage').then((m) => ({
        default: m.SupplierPaymentsPage,
    }))
)
export const SuppliersPage = lazy(() =>
    import('@/features/suppliers/pages/SuppliersPage').then((m) => ({ default: m.SuppliersPage }))
)
export const RawMaterialsPage = lazy(() =>
    import('@/features/raw-materials/pages/RawMaterialsPage').then((m) => ({ default: m.RawMaterialsPage }))
)
export const ProductionPage = lazy(() =>
    import('@/features/production/pages/ProductionPage').then((m) => ({ default: m.ProductionPage }))
)
export const ReportsPage = lazy(() =>
    import('@/features/reports/pages/ReportsPage').then((m) => ({ default: m.ReportsPage }))
)
export const SettingsPage = lazy(() =>
    import('@/features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)

export const ExportDashboardPage = lazy(() =>
    import('@/features/export/pages/ExportDashboardPage').then((m) => ({ default: m.ExportDashboardPage }))
)
export const ExportCustomersPage = lazy(() =>
    import('@/features/export/pages/ExportCustomersPage').then((m) => ({ default: m.ExportCustomersPage }))
)
export const ExportOrdersPage = lazy(() =>
    import('@/features/export/pages/ExportOrdersPage').then((m) => ({ default: m.ExportOrdersPage }))
)
export const ExportOrderDetailPage = lazy(() =>
    import('@/features/export/pages/ExportOrderDetailPage').then((m) => ({ default: m.ExportOrderDetailPage }))
)
export const ExportInvoicesPage = lazy(() =>
    import('@/features/export/pages/ExportInvoicesPage').then((m) => ({ default: m.ExportInvoicesPage }))
)
export const ShipmentsPage = lazy(() =>
    import('@/features/export/pages/ShipmentsPage').then((m) => ({ default: m.ShipmentsPage }))
)
export const PackingListsPage = lazy(() =>
    import('@/features/export/pages/PackingListsPage').then((m) => ({ default: m.PackingListsPage }))
)
export const ExportPaymentsPage = lazy(() =>
    import('@/features/export/pages/ExportPaymentsPage').then((m) => ({ default: m.ExportPaymentsPage }))
)

export const BulkInwardingPage = lazy(() => import('@/features/inventory/pages/BulkInwarding'))

export const CustomerLedgerPage = lazy(() => import('@/features/customers/pages/CustomerLedgerPage'))
export const SupplierLedgerPage = lazy(() => import('@/features/suppliers/pages/SupplierLedgerPage'))
export const UsersPage = lazy(() => import('@/features/users/pages/UsersPage'))
export const AuditLogsPage = lazy(() => import('@/features/audit/pages/AuditLogsPage'))
export const GSTReportsPage = lazy(() => import('@/features/gst/pages/GSTReportsPage'))
