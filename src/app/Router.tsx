import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/authStore'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { ProductsPage } from '@/features/products/pages/ProductsPage'
import { InventoryPage } from '@/features/inventory/pages/InventoryPage'
import { CustomersPage } from '@/features/customers/pages/CustomersPage'
import { SalesPage } from '@/features/sales/pages/SalesPage'
import { InvoicesPage } from '@/features/invoices/pages/InvoicesPage'
import { QuotationsPage } from '@/features/quotations/pages/QuotationsPage'
import { PurchasePage } from '@/features/purchase/pages/PurchasePage'
import { GRNPage } from '@/features/grn/pages/GRNPage'
import { CreditNotesPage } from '@/features/credit-notes/pages/CreditNotesPage'
import { DebitNotesPage } from '@/features/debit-notes/pages/DebitNotesPage'
import { ChallansPage } from '@/features/challans/pages/ChallansPage'
import { BatchesPage } from '@/features/batches/pages/BatchesPage'
import { QualityChecksPage } from '@/features/quality-checks/pages/QualityChecksPage'
import { FormulationsPage } from '@/features/formulations/pages/FormulationsPage'
import { SupplierPaymentsPage } from '@/features/supplier-payments/pages/SupplierPaymentsPage'
import { SuppliersPage } from '@/features/suppliers/pages/SuppliersPage'
import { RawMaterialsPage } from '@/features/raw-materials/pages/RawMaterialsPage'
import { ProductionPage } from '@/features/production/pages/ProductionPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useEffect, lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

const CustomerLedgerPage = lazy(() => import('@/features/customers/pages/CustomerLedgerPage'))
const SupplierLedgerPage = lazy(() => import('@/features/suppliers/pages/SupplierLedgerPage'))
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage'))
const AuditLogsPage = lazy(() => import('@/features/audit/pages/AuditLogsPage'))
const GSTReportsPage = lazy(() => import('@/features/gst/pages/GSTReportsPage'))

export function AppRouter() {
    const { checkSession } = useAuthStore()

    useEffect(() => {
        checkSession()
    }, [checkSession])

    return (
        <BrowserRouter>
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
                    <Route path="/customers" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'customers' }}>
                            <CustomersPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/customers/:id/ledger" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'customers' }}>
                            <Suspense fallback={<LoadingFallback />}>
                                <CustomerLedgerPage />
                            </Suspense>
                        </ProtectedRoute>
                    } />
                    <Route path="/suppliers/:id/ledger" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'suppliers' }}>
                            <Suspense fallback={<LoadingFallback />}>
                                <SupplierLedgerPage />
                            </Suspense>
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
                            <Suspense fallback={<LoadingFallback />}>
                                <UsersPage />
                            </Suspense>
                        </ProtectedRoute>
                    } />
                    <Route path="/audit-logs" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'audit_logs' }}>
                            <Suspense fallback={<LoadingFallback />}>
                                <AuditLogsPage />
                            </Suspense>
                        </ProtectedRoute>
                    } />
                    <Route path="/gst-reports" element={
                        <ProtectedRoute requiredPermission={{ action: 'read', resource: 'reports' }}>
                            <Suspense fallback={<LoadingFallback />}>
                                <GSTReportsPage />
                            </Suspense>
                        </ProtectedRoute>
                    } />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}

function LoadingFallback() {
    return (
        <div className="p-6 animate-pulse">
            <div className="h-10 w-48 bg-gray-200 dark:bg-dark-300 rounded-lg mb-6" />
            <div className="h-32 w-full bg-gray-200 dark:bg-dark-300 rounded-xl" />
        </div>
    )
}
