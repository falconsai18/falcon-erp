# Falcon Super Gold ERP - Complete Project Context & Resume Guide

**Last Updated:** February 16, 2026  
**Purpose:** Full context summary for resuming this project in a new IDE

---

## 1. PROJECT OVERVIEW

**Falcon Super Gold ERP** is an Enterprise Resource Planning system for manufacturing/sales businesses (India-focused, GST-compliant).

### Tech Stack
- **Frontend:** React 18, TypeScript, Vite 7
- **Backend/DB:** Supabase (PostgreSQL, Auth, RLS)
- **Styling:** Tailwind CSS
- **State:** Zustand
- **Charts:** Recharts
- **Forms:** react-hook-form, zod
- **PDF:** jsPDF, jspdf-autotable
- **Icons:** Lucide React

### Folder Structure
```
src/
├── app/           # App shell, Router, Providers
├── components/    # UI, layout (AppShell, Sidebar, Topbar, Button, Input, etc.)
├── features/      # One folder per module (auth, dashboard, products, etc.)
├── lib/           # supabase client, utils (formatCurrency, formatDate, cn)
├── services/      # API/business logic (one service per domain)
├── stores/        # Zustand stores (theme, auth)
├── types/         # Shared TypeScript types
└── styles/        # globals.css
```

### Key Entry Points
- `src/main.tsx` → `src/app/App.tsx` → `Router.tsx`
- Auth: `src/features/auth/store/authStore.ts` (Supabase Auth + users table)
- Supabase: `src/lib/supabase.ts` (needs `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `.env`)

---

## 2. PHASES COMPLETED (BEFORE THIS SESSION)

- **Phase B:** Sales automation (SO→Invoice, Quote→SO, Payments)
- **Phase C:** Purchase automation (PO→GRN, GRN→Bill, Low Stock→PO)
- **Phase D:** Smart Dashboard (KPIs, alerts, charts, real data)

---

## 3. WHAT WE DID IN THIS SESSION (Feb 16, 2026)

### 3.1 Build & TypeScript Fixes
- Fixed Dashboard chart fallback: removed `REVENUE_DATA` mock, added empty state "No revenue data yet"
- Deleted dead files: `src/App.tsx`, `src/App.css` (unused Vite template leftovers)
- Build passes with 0 TypeScript errors

### 3.2 Dashboard → RPC
- Replaced 6+ API calls with single Supabase RPC: `get_dashboard_data()`
- `dashboardService.ts`: `getAllDashboardData(chartDays)` calls `supabase.rpc('get_dashboard_data', { p_days: chartDays })`
- Note: Supabase RPC must accept `p_days` parameter for time range to affect chart; update RPC if it doesn't

### 3.3 Navigation & Labels
- Renamed "Inventory" → "Stock" in Sidebar, Topbar, InventoryPage, LoginPage
- Route `/inventory` unchanged

### 3.4 Low Stock Query Fix
- `purchaseService.ts` `getLowStockMaterials()`: removed invalid `.lte('current_stock', 'reorder_point')` (Supabase can't compare two columns)
- Now fetches all active materials, filters client-side: `filter(rm => rm.current_stock <= rm.reorder_point)`

### 3.5 Topbar Improvements
- Added missing PAGE_TITLES for: quotations, credit-notes, debit-notes, challans, grn, batches, quality-checks, formulations, supplier-payments
- Search bar: clickable with toast "Global search coming soon! Use page-level search for now."
- Notifications bell: clickable with toast "Notifications coming soon!"

### 3.6 Dashboard Time Range
- Time range buttons (Today/Week/Month/Year) now wired to chart:
  - `loadDashboardData` computes days (1, 7, 30, 365) from `timeRange`
  - `getAllDashboardData(days)` passes `p_days` to RPC
  - `useEffect` depends on `[refreshKey, timeRange]`

### 3.7 Dashboard Quick Actions
- Replaced with 12 expandable actions:
  - New Sale Order, Create Invoice, Add Product, Purchase Order, New Work Order, Add Customer
  - +6 more: New Quotation, Add Supplier, Quality Check, New Challan, Raw Material, View Reports
- State `showAllActions`: shows 6 by default, "+6 More" / "Show Less" to toggle
- Grid 3 columns, smaller buttons

### 3.8 Audit
- Created `ERP_AUDIT_REPORT.md` – full module audit (built, broken, missing)

---

## 4. DATABASE FACTS (Supabase)

| Table | Key Columns | Notes |
|-------|-------------|-------|
| sales_orders | total_amount | (not total_price) |
| sales_order_items | id, sales_order_id, product_id, quantity, unit_price, total_amount, created_at | |
| raw_materials | current_stock, reorder_point, min_stock_level | All numeric |
| quality_checks | result | Values: 'pass' or NULL (not status) |
| batches | batch_number, expiry_date, status ('available'), product_id | FK to products |
| invoices | invoice_date, total_amount, balance_amount, status | |
| product_categories | id, name | Used in products, no CRUD UI |
| brands | id, name | Used in products, no CRUD UI |

**RPC:** `get_dashboard_data(p_days?)` – returns KPIs, alerts, salesChart, orderStatusDistribution, topProducts, recentActivity

---

## 5. ROUTES (21 total)

| Path | Page | Content |
|------|------|---------|
| /login | LoginPage | Auth |
| / | DashboardPage | KPIs, charts, quick actions, alerts |
| /products | ProductsPage | CRUD, categories, brands |
| /inventory | InventoryPage (labeled "Stock") | Product inventory, batches |
| /customers | CustomersPage | CRUD, addresses, outstanding |
| /sales | SalesPage | Sales orders, Create Invoice |
| /invoices | InvoicesPage | Invoices, PDF, payments |
| /quotations | QuotationsPage | Quotations, Convert to SO |
| /credit-notes | CreditNotesPage | Credit notes from invoices |
| /debit-notes | DebitNotesPage | Debit notes from POs |
| /challans | ChallansPage | Delivery challans |
| /purchase | PurchasePage | Purchase orders |
| /grn | GRNPage | Goods receipt, Create Bill |
| /suppliers | SuppliersPage | CRUD |
| /raw-materials | RawMaterialsPage | CRUD, low stock → PO |
| /production | ProductionPage | Work orders |
| /batches | BatchesPage | Batch tracking |
| /quality-checks | QualityChecksPage | QC |
| /formulations | FormulationsPage | BOM, ingredients |
| /supplier-payments | SupplierPaymentsPage | Bills, payments |
| /reports | ReportsPage | Sales, Inventory, Financial, Production |
| /settings | SettingsPage | Company, Profile, Numbering, Bank |

---

## 6. AUTOMATIONS (All Working)

- SO → Invoice: `createInvoiceFromSO()` 
- Quote → SO: `convertToSalesOrder()`
- Low Stock → PO: `createPOFromLowStock()`
- GRN → Bill: `createSupplierBillFromGRN()`
- WO Complete → Batch + Inventory: `completeWorkOrder()`
- Challan Dispatch → Deduct Inventory
- CN Approve → Adjust Invoice + Return Stock
- DN Approve → Deduct Stock

---

## 7. MISSING / INCOMPLETE

- Product Categories CRUD (data exists, no UI)
- Brands CRUD (same)
- Customer Ledger page
- Supplier Ledger page
- User management (auth via Supabase, no admin UI)
- UOM master (hardcoded in products)
- Tax master (hardcoded 0/5/12/18/28%)
- Global search (placeholder toast)
- Notifications (placeholder toast)

---

## 8. HOW TO RUN

```bash
# Install
npm install

# Dev (port 3000, or next free port)
npm run dev

# Build
npm run build

# Preview production build
npm run preview
```

**Env:** `.env` with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_SELLER_STATE=Maharashtra   # optional, for GST
```

---

## 9. KEY FILES TO KNOW

| File | Purpose |
|------|---------|
| `src/app/Router.tsx` | All routes |
| `src/components/layout/Sidebar.tsx` | Nav sections |
| `src/components/layout/Topbar.tsx` | Page titles, search, notifications |
| `src/services/dashboardService.ts` | Single RPC for dashboard |
| `src/lib/supabase.ts` | Supabase client |
| `src/features/auth/store/authStore.ts` | Login, session |
| `ERP_AUDIT_REPORT.md` | Full module audit |
| `PROJECT_CONTEXT.md` | This file |

---

## 10. RECOMMENDED NEXT STEPS

1. Update Supabase RPC `get_dashboard_data` to accept and use `p_days` for chart date range
2. Add Product Categories CRUD page
3. Add Brands CRUD page
4. Add Customer Ledger
5. Add Supplier Ledger
6. Implement global search (or remove placeholder)

---

*Use this document when opening the project in a new IDE to quickly regain context.*
