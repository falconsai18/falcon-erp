import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/authStore'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useEffect } from 'react'

/**
 * Detect if running in Electron (production build uses file:// protocol).
 * BrowserRouter requires http:// protocol; HashRouter works with file://.
 */
const isElectron = typeof window !== 'undefined' && !!(window as any).electron
import {
    DashboardPage,
    ProductsPage,
    InventoryPage,
    CustomersPage,
    SalesPage,
    InvoicesPage,
    QuotationsPage,
    PurchasePage,
    GRNPage,
    CreditNotesPage,
    DebitNotesPage,
    ChallansPage,
    BatchesPage,
    QualityChecksPage,
    FormulationsPage,
    SupplierPaymentsPage,
    SuppliersPage,
    RawMaterialsPage,
    ProductionPage,
    ReportsPage,
    SettingsPage,
    ExportDashboardPage,
    ExportCustomersPage,
    ExportOrdersPage,
    ExportOrderDetailPage,
    ExportInvoicesPage,
    ShipmentsPage,
    PackingListsPage,
    ExportPaymentsPage,
    BulkInwardingPage,
    CustomerLedgerPage,
    SupplierLedgerPage,
    UsersPage,
    AuditLogsPage,
    GSTReportsPage,
} from '@/app/lazyPages'

export function AppRouter() {
    const { checkSession } = useAuthStore()

    useEffect(() => {
        checkSession()
    }, [checkSession])

    const Router = isElectron ? HashRouter : BrowserRouter

    return (
        <Router>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                    element={
                        <ProtectedRoute>
                            <AppShell />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'dashboard' }}>
                            <DashboardPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/products" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'products' }}>
                            <ProductsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/inventory" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'warehouses' }}>
                            <InventoryPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/inventory/bulk-entry" element={
                        <ProtectedRoute requiredPermission={{ action: 'create', resource: 'warehouses' }}>
                            <BulkInwardingPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/customers" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'customers' }}>
                            <CustomersPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/customers/:id/ledger" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'customers' }}>
                            <CustomerLedgerPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/suppliers/:id/ledger" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'suppliers' }}>
                            <SupplierLedgerPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/sales" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'sales_orders' }}>
                            <SalesPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/invoices" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'invoices' }}>
                            <InvoicesPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/quotations" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'quotations' }}>
                            <QuotationsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/purchase" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'purchase_orders' }}>
                            <PurchasePage />
                        </ProtectedRoute>
                    } />
                    <Route path="/grn" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'grn' }}>
                            <GRNPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/credit-notes" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'credit_notes' }}>
                            <CreditNotesPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/export" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'dashboard' }}>
                            <ExportDashboardPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/export/customers" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'customers' }}>
                            <ExportCustomersPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/export/orders" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'sales_orders' }}>
                            <ExportOrdersPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/export/orders/:id" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'sales_orders' }}>
                            <ExportOrderDetailPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/export/invoices" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'invoices' }}>
                            <ExportInvoicesPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/export/shipments" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'dashboard' }}>
                            <ShipmentsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/export/packing-lists" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'dashboard' }}>
                            <PackingListsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/export/payments" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'payments' }}>
                            <ExportPaymentsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/debit-notes" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'debit_notes' }}>
                            <DebitNotesPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/challans" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'challans' }}>
                            <ChallansPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/batches" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'batches' }}>
                            <BatchesPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/quality-checks" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'quality_checks' }}>
                            <QualityChecksPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/formulations" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'formulations' }}>
                            <FormulationsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/supplier-payments" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'payments' }}>
                            <SupplierPaymentsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/suppliers" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'suppliers' }}>
                            <SuppliersPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/raw-materials" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'raw_materials' }}>
                            <RawMaterialsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/production" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'work_orders' }}>
                            <ProductionPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/reports" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'reports' }}>
                            <ReportsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/settings" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'settings' }}>
                            <SettingsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/users" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'users' }}>
                            <UsersPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/audit-logs" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'audit_logs' }}>
                            <AuditLogsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/gst-reports" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'reports' }}>
                            <GSTReportsPage />
                        </ProtectedRoute>
                    } />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    )
}
