# Falcon ERP — Project Context

> Last Updated: 06-Apr-2026 (Offline Desktop Conversion Complete)
> Status: 🟢 OFFLINE ARCHITECTURE COMPLETE
> Hosting: Vercel (Web) / Windows Tauri App (Desktop) | Database: Supabase / Local SQLite

## About
Falcon ERP is a React + TypeScript ERP for manufacturing/sales operations focused on India workflows (GST, invoice/payout flows, inventory and production). It provides protected CRUD screens for core masters (products/customers/suppliers) plus operational modules (sales, invoices, credit/debit notes, GRN/challan, production/QC), and includes an International Trade export module (frontend) for export orders, invoices, shipments, packing lists, and payments.

**Full documentation set:** see [`docs/README.md`](docs/README.md) (overview report, user guide, setup & development).

## Tech Stack
- Frontend: React `19.2.0` + Vite `7.3.1` + TypeScript `~5.9.3`
- Database/Auth: Supabase (`@supabase/supabase-js` `^2.95.3`)
- Styling/UI: Tailwind CSS `^3.4.19` + Radix UI (`@radix-ui/react-dialog` `^1.1.15`)
- State/Navigation: Zustand `^4.5.7` + React Router DOM `^6.30.3`
- Charts: Recharts `^2.15.4`
- PDF method: jsPDF `^4.1.0` + jspdf-autotable `^5.0.7` + Custom HTML Print View

## Key File Paths
| Purpose | File Path |
|---|---|
| App routing + protected routes | `src/app/Router.tsx` |
| Lazy route page map (`React.lazy`) | `src/app/lazyPages.ts` |
| App shell + lazy outlet Suspense | `src/components/layout/AppShell.tsx` |
| Route loading skeleton | `src/components/shared/RouteLoadingFallback.tsx` |
| Navigation shell (sidebar/topbar) | `src/components/layout/Sidebar.tsx`, `src/components/layout/Topbar.tsx` |
| Invoice UI (listing/creation/payment/PDF entry) | `src/features/invoices/pages/InvoicesPage.tsx` |
| Invoice Print Template (HTML) | `src/utils/pdfExport.ts` |
| Invoice PDF generator (jsPDF) | `src/services/exportService.ts` |
| Settings UI (Terms & Conditions, Company) | `src/features/settings/pages/SettingsPage.tsx` |
| Inventory + Stock Entry | `src/features/inventory/pages/InventoryPage.tsx` |
| Image Upload Utility | `src/services/imageService.ts` |
| Customers (list, CRUD, stats, ledger RPC) | `src/services/customerService.ts` |
| ESLint flat config (TypeScript + React) | `eslint.config.js` |
| Vite build / dev server (port `3007`) | `vite.config.ts` |
| Project context / handoff (this file) | `context.md` |
| Documentation hub (overview, user guide, dev setup) | `docs/README.md` |
| **Tauri** desktop shell (Windows `.exe` / installer) | `src-tauri/` — `npm run tauri:dev` / `npm run tauri:build` (requires Rust + MSVC on Windows); see `docs/SETUP_AND_DEVELOPMENT.md` §9 |

## Database Tables
| Table Name | Key Columns | Purpose |
|---|---|---|
| products | id, name, sku, category_id, brand_id, unit_of_measure, hsn_code, selling_price, mrp, status, reorder_point, image_url (upcoming) | Product master |
| invoices | id, invoice_number, sales_order_id, customer_id, total_amount, round_off, status | Invoice header & totals |
| inventory | id, product_id, batch_number, mfg_date, expiry_date, quantity, available_quantity, unit_cost | Batch-wise stock tracking |
| inventory_movements | id, product_id, movement_type (in/out/adj), quantity, reference_id | Ledger of all stock changes |
| users | id, email, full_name, role (admin/manager/staff) | Public profile sync with Auth |

## Recent Major Updates (06-Apr-2026) 💎
- **Offline Desktop Conversion Complete**: Built a complete offline-first Windows Desktop application using Tauri v1 and SQLite, without needing to rewrite any of the 33+ service files.
- **Smart Data Proxy (`supabase.ts`)**: Implemented a unified DB client that automatically detects the environment. In browser mode (Vercel), it returns the real Supabase client. In Desktop mode (Tauri), it returns our custom `QueryBuilder` tied to local SQLite `invoke` commands.
- **Local Authentication**: Modified `authStore.ts` to support both online Supabase sessions and offline SQLite hashing (using SHA-256). First launch sets the local admin password securely.
- **File Storage**: Images are now handled by Tauri's native `fs` and saved to `%APPDATA%/falcon_erp/images`, served transparently via the `asset://localhost/` protocol.
- **Dual-Mode Sync Engine**: Added `src/lib/sync.ts` that provides Initial Cloud Pull (seed all 40+ tables from Vercel to Local on first run) and Incremental Sync (push `_sync_log` updates to Cloud, pull newer records down).
- **Windows Installers**: Generates standalone `.exe` (NSIS) and `.msi` (WiX) installers.

## Recent Major Updates (07-Apr-2026) 💎
- **Customer list pagination**: Fixed `getCustomers` offset (`page` is 1-based). Page 1 was skipping the first `pageSize` rows, so small datasets (e.g. a single customer) could appear empty in **Customers**.
- **Customer KPI stats (`getCustomerStats`)**: Replaced `invoices!inner` join (which dropped customers with no matching invoice rows) with two queries: all customers for status counts, and `invoices` filtered to `sent`/`partial` (non-cancelled) for **total outstanding**. Dashboard/header counts now align with real data.
- **Invoices UX**: Removed duplicate/confusing toast flow after “Generate from SO”; parent `onCreated` handles refresh + “Send now” action.
- **ESLint policy** (`eslint.config.js`): `@typescript-eslint/no-explicit-any` → **warn** (gradual typing); `@typescript-eslint/no-unused-vars` → **warn** with `_` ignore pattern. **`npm run lint` exits 0** (warnings remain for backlog cleanup).
- **React Compiler / `react-hooks` errors**: Resolved all prior **error**-level findings (e.g. setState-in-effect via `queueMicrotask` where appropriate, function order for effects, `OfflineIndicator` time via tick state, `MobileCard` `useCallback` deps, empty `catch` bodies, `switch` `case` block scoping in `syncQueue`, regex escapes in `smartCameraService`, `prefer-const` in `batchService`).
- **QR / types**: Removed `@ts-nocheck` from `qrCodeService`; product payload typed; `type: 'image/png' as const` for `QRCode.toDataURL` options.
- **Audit UI**: Removed unused stub `exportAllAuditLogs`; reordered `loadUsers` / `loadLogs` in **Audit Logs** so hooks satisfy static analysis.
- **Vite build** (`vite.config.ts`): `manualChunks` for **Supabase**, **React/react-router/scheduler**, **Recharts**, **PDF stack** (jspdf/html2canvas/purify). Avoided catch-all `vendor` buckets that caused **circular chunk** warnings; raised `chunkSizeWarningLimit` to 900 kB.
- **Phase 2 — Route-level code splitting**: Every authenticated screen is loaded with `React.lazy()` from `src/app/lazyPages.ts` ( **`LoginPage` stays synchronous** for fast `/login` ). `AppShell` wraps `<Outlet />` in `<Suspense fallback={<RouteLoadingFallback />}>` so one boundary covers all routes. Production **main app JS** is now on the order of **~200 KB gzip** for the entry chunk; feature pages load as separate chunks on navigation (PWA precache lists many more entries — expected).
- **Phase 2 — Incremental typings**: `qrCodeService` — typed payloads for batch/work-order QR generation; `parseQRCodeData` returns `Record<string, unknown> | null`. `SmartQRScanner` narrows `t`/`id` and validates against `EntityType`. `customerService` — outstanding invoice aggregation map no longer uses `any[]`.
- **Documentation (`docs/`)**: **`docs/OVERVIEW_AND_REPORT.md`** — product report & architecture; **`docs/USER_GUIDE.md`** — end-user how-to by module and route; **`docs/SETUP_AND_DEVELOPMENT.md`** — install, env, build, deploy, troubleshooting; **`docs/README.md`** indexes all. Root **`README.md`** points to the doc set.

## Recent Major Updates (03-Apr-2026) 💎
- **Invoice Date Consistency**: Invoices generated from Sales Orders now inherit the original SO date as the `invoice_date`. Due dates are also calculated based on the SO date (SO Date + 30 days), ensuring historical accuracy regardless of when the print is generated.
- **Enhanced Bill To Details**: Enriched the customer section in both PDF download and print views with complete address, city, state, pincode, and phone number. Used robust joining logic to ensure clean formatting without trailing commas.
- **GSTIN Styling & Null Handling**: Bolded GSTIN labels and numbers for better visibility. Missing GSTINs now show as an empty space instead of "N/A" for a cleaner, professional look.
- **HSN Column Optimization**: Increased the HSN column width in the print view to accommodate 8-digit codes on a single line without wrapping.
- **Footer Closing Message**: Added a bold "Thank you for your business!" line at the bottom of both Draft (Print) and Final (PDF) invoices.
- **Proforma vs Tax Invoice Toggle**: Implemented dynamic title logic; invoices in `draft` status are now titled **PROFORMA INVOICE**, while others remain **TAX INVOICE**.
- **Consolidated Print Layout**: Replaced the multi-page print loop with a single-page template featuring "ORIGINAL [ ]  DUPLICATE [ ]  TRIPLICATE [ ]" checkboxes at the top right.
- **Auto IGST Detection**: Updated the global `SELLER_STATE` to **Karnataka** and implemented case-insensitive interstate detection. The system now automatically applies IGST for any customer/place of supply outside Karnataka.

## Recent Major Fixes (02-Apr-2026) ✅
- **Invoice PDF Product Display Fix**: Fixed duplicate product name issue in invoice PDFs (print & download). Product column now shows only `Product Name (XXg)` - clean, single display with weight info.
- **SQL Cleanup & Admin Access**: Purged test users, migrated all power to `falconherbs@gmail.com` (Admin) and `managerherbs@gmail.com` (Manager).
- **Invoice Math & Rounding**: Unified `Math.round` logic across Print & Download. Proper Rupee (₹) symbol and "Rupees X Only" formatting.
- **GST Compliance**: Added **HSN Summary** table to printed invoices.
- **Transporter Documents**: Added support for **Original/Duplicate/Triplicate** copies in the print preview.
- **Dynamic Settings**: Integrated `invoice_terms_conditions` setting; T&C are now editable via Settings UI.
- **Manufacturing Data Cleanup**: Executed deep purge of all test data (Formulations, Production Orders, Batches, Quality Checks) to ensure a clean production environment.
- **RBAC & Permission Hardening**:
    - Downgraded `manager` role to **CRU** (Create, Read, Update) — direct deletion is now restricted to `admin` and `super_admin`.
    - Implemented UI-level permission checks for "Delete" buttons in Sales, Invoices, Formulations, Production, and Batches.
- **Robust Deletion Logic**: Updated service layers (`invoiceService`, `salesService`, `formulationService`, `workOrderService`, `batchService`) to handle complex cascading deletions of child records (items, payments, QC checks) before parent records, preventing foreign key errors.
- **Payment Synchronization**: Recording a payment now automatically updates the linked Sales Order's `payment_status`.

## Phase 4 Plan: Inventory & Assets (Next) ⏳
1. **Product Images**: Add `image_url` to DB and enable uploads in Product Master.
2. **Bulk Inventory**: Implement CSV/Excel import for initial stock entries & batch updates.
3. **Inventory Audit Tool**: Screen for "Physical vs System" stock comparison with one-click adjustment.
4. **Finished Goods Streamlining**: Bulk inwarding for production output batches.

## AI Team Rules
- Git commit after every logic change.
- Never delete production data; only migrate or update roles via SQL.
- PDF changes must be verified in both `exportService` (Download) and `pdfExport` (Print).
