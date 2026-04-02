# Falcon ERP — Project Context

> Last Updated: 02-Apr-2026 (Invoice PDF Fix + System Cleanup & RBAC Hardening)
> Status: 🟢 LIVE (Production Ready)
> Hosting: Vercel | Database: Supabase | Repo: GitHub (single branch)

## About
Falcon ERP is a React + TypeScript ERP for manufacturing/sales operations focused on India workflows (GST, invoice/payout flows, inventory and production). It provides protected CRUD screens for core masters (products/customers/suppliers) plus operational modules (sales, invoices, credit/debit notes, GRN/challan, production/QC), and includes an International Trade export module (frontend) for export orders, invoices, shipments, packing lists, and payments.

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
| Navigation shell (sidebar/topbar) | `src/components/layout/Sidebar.tsx`, `src/components/layout/Topbar.tsx` |
| Invoice UI (listing/creation/payment/PDF entry) | `src/features/invoices/pages/InvoicesPage.tsx` |
| Invoice Print Template (HTML) | `src/utils/pdfExport.ts` |
| Invoice PDF generator (jsPDF) | `src/services/exportService.ts` |
| Settings UI (Terms & Conditions, Company) | `src/features/settings/pages/SettingsPage.tsx` |
| Inventory + Stock Entry | `src/features/inventory/pages/InventoryPage.tsx` |
| Image Upload Utility | `src/services/imageService.ts` |

## Database Tables
| Table Name | Key Columns | Purpose |
|---|---|---|
| products | id, name, sku, category_id, brand_id, unit_of_measure, hsn_code, selling_price, mrp, status, reorder_point, image_url (upcoming) | Product master |
| invoices | id, invoice_number, sales_order_id, customer_id, total_amount, round_off, status | Invoice header & totals |
| inventory | id, product_id, batch_number, mfg_date, expiry_date, quantity, available_quantity, unit_cost | Batch-wise stock tracking |
| inventory_movements | id, product_id, movement_type (in/out/adj), quantity, reference_id | Ledger of all stock changes |
| users | id, email, full_name, role (admin/manager/staff) | Public profile sync with Auth |

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
