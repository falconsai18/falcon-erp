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
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuthStore()

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 size={40} className="animate-spin text-brand-400 mx-auto" />
                    <p className="text-dark-500">Loading Falcon ERP...</p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}

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
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/inventory" element={<InventoryPage />} />
                    <Route path="/customers" element={<CustomersPage />} />
                    <Route path="/sales" element={<SalesPage />} />
                    <Route path="/invoices" element={<InvoicesPage />} />
                    <Route path="/quotations" element={<QuotationsPage />} />
                    <Route path="/purchase" element={<PurchasePage />} />
                    <Route path="/grn" element={<GRNPage />} />
                    <Route path="/credit-notes" element={<CreditNotesPage />} />
                    <Route path="/debit-notes" element={<DebitNotesPage />} />
                    <Route path="/challans" element={<ChallansPage />} />
                    <Route path="/batches" element={<BatchesPage />} />
                    <Route path="/quality-checks" element={<QualityChecksPage />} />
                    <Route path="/formulations" element={<FormulationsPage />} />
                    <Route path="/supplier-payments" element={<SupplierPaymentsPage />} />
                    <Route path="/suppliers" element={<SuppliersPage />} />
                    <Route path="/raw-materials" element={<RawMaterialsPage />} />
                    <Route path="/production" element={<ProductionPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}