# Falcon ERP — Project Context

> Last Updated: 30-Mar-2026
> Status: 🟢 LIVE (Production)
> Hosting: Vercel | Database: Supabase | Repo: GitHub (single branch)

## About
Falcon ERP is a React + TypeScript ERP for manufacturing/sales operations focused on India workflows (GST, invoice/payout flows, inventory and production). It provides protected CRUD screens for core masters (products/customers/suppliers) plus operational modules (sales, invoices, credit/debit notes, GRN/challan, production/QC), and includes an International Trade export module (frontend) for export orders, invoices, shipments, packing lists, and payments.

## Tech Stack
- Frontend: React `19.2.0` + Vite `7.3.1` + TypeScript `~5.9.3`
- Database/Auth: Supabase (`@supabase/supabase-js` `^2.95.3`)
- Styling/UI: Tailwind CSS `^3.4.19` + Radix UI (`@radix-ui/react-dialog` `^1.1.15`)
- State/Navigation: Zustand `^4.5.7` + React Router DOM `^6.30.3`
- Charts: Recharts `^2.15.4`
- PDF method: jsPDF `^4.1.0` + jspdf-autotable `^5.0.7`

## Key File Paths
| Purpose | File Path |
|---|---|
| App routing + protected routes | `src/app/Router.tsx` |
| Navigation shell (sidebar/topbar) | `src/components/layout/Sidebar.tsx`, `src/components/layout/Topbar.tsx` |
| Invoice UI (listing/creation/payment/PDF entry) | `src/features/invoices/pages/InvoicesPage.tsx` |
| Invoice CRUD + tax calculations + payment recording | `src/services/invoiceService.ts` |
| Invoice PDF generator wiring | `src/services/exportService.ts` (`generateInvoicePDF`) |
| Customer UI + ledgers entry points | `src/features/customers/pages/CustomersPage.tsx` |
| Customer CRUD + customer ledger RPC usage | `src/services/customerService.ts` |
| Product UI | `src/features/products/pages/ProductsPage.tsx` |
| Settings UI + auth profile + masters | `src/features/settings/pages/SettingsPage.ts` |
| Settings data access (settings key-value, company, sequences, bank accounts) | `src/services/settingsService.ts` |
| Supabase client | `src/lib/supabase.ts` |
| Common formatting utilities | `src/lib/utils.ts` |
| International Trade export types | `src/features/export/types/export.types.ts` |

## Database Tables
| Table Name | Key Columns (just names, no types) | Purpose |
|---|---|---|
| products | id, name, sku, category_id, brand_id, unit_of_measure, hsn_code, selling_price, cost_price, mrp, tax_rate, status, min_stock_level, max_stock_level, reorder_point, display_name, default_free_qty | Product master used across inventory and invoice line items |
| invoices | id, invoice_number, sales_order_id, customer_id, invoice_date, due_date, status, subtotal, discount_amount, tax_amount, cgst_amount, sgst_amount, igst_amount, total_amount, round_off, paid_amount, balance_amount, place_of_supply, reverse_charge, payment_method, notes, created_by, created_at, updated_at | Invoice header data and payment/balance tracking |
| invoice_items | id, invoice_id, product_id, description, quantity, free_qty, unit_price, discount_percent, tax_rate, tax_amount, cgst_amount, sgst_amount, igst_amount, total_amount, hsn_code, batch_number | Invoice line items with per-line tax breakdown |
| sales_order_items | id, sales_order_id, product_id, quantity, free_qty, unit_price, discount_percent, tax_rate, tax_amount, total_amount | Sales order line items |
| customers | id, name, email, phone, alt_phone, gst_number, pan_number, customer_type, credit_limit, credit_days, outstanding_amount, status, notes, address_line1, address_line2, city, state, pincode, country, created_at, updated_at | Customer master used for invoicing and outstanding balance |
| settings | id, key, value, description | Key-value configuration (company/system fields, configurable parameters) |

## Current Sprint: Invoice Fixes (30-Mar-2026)

| # | Issue | What's Wrong | What's Needed | Status |
|---|-------|-------------|---------------|--------|
| 1 | Amount in Words | Word order broken, paise showing after round off | Correct English, show rounded total only | ✅ Done |
| 2 | Round Off | Not following business rule | >=51 paise round UP, <=50 paise wave off | ✅ Done |
| 3 | GST Calculation | May be incorrect | Verify CGST/SGST accuracy | ✅ Done |
| 4 | Scheme | No column exists | Add scheme display near Qty (e.g. 5+1 free), manual entry | ✅ Done |
| 5 | SR Header | Shows "Sr" | Change to "#" or "SR NO" | ✅ Done |
| 6 | Description | Shows product tags/marketing text | Only product name + weight | ✅ Done |
| 7 | Batch No | Missing from invoice | Add Batch No column | ✅ Done |
| 8 | Bank Details | Possibly hardcoded | Should be editable from settings | ⏳ Pending |
| 9 | Terms & Conditions | Possibly hardcoded | Should be editable from settings | ⏳ Pending |
| 10 | Place of Supply | Hardcoded Maharashtra | Auto-fill from customer's state | ✅ Done |

## AI Team
| Tool | Role | Rule |
|------|------|------|
| Claude | Strategy & Prompts | Consult first |
| Kimi 2.5 | Investigation | Read-only |
| Qwen CLI | Quick checks | Read-only |
| Cursor | Code changes | Only modifier |

## Rules
- Git commit before & after every change
- One fix at a time
- Supabase changes manually only
- Review diffs before accepting
- Test locally before pushing

## Change Log
| Date | Change | Done By | Status |
|------|--------|---------|--------|
| 30-Mar-2026 | context.md created | Cursor | ✅ |
| 30-Mar-2026 | Sr No. header: Changed to "Sr No." in PDF table | Qwen Code | ✅ |
| 30-Mar-2026 | Batch No column: Added to invoice PDF table | Qwen Code | ✅ |
| 30-Mar-2026 | Description cleanup: Use display_name or product name only | Qwen Code | ✅ |
| 30-Mar-2026 | Place of Supply: Auto-fill from customer's state | Qwen Code | ✅ |
| 30-Mar-2026 | Round Off logic: >=51 paise round UP, <=50 wave off | Qwen Code | ✅ |
| 30-Mar-2026 | Amount in Words: Fixed format to "Rupees X Only" | Qwen Code | ✅ |
| 30-Mar-2026 | Round Off display: Added row in PDF summary (+₹X.XX / -₹X.XX) | Qwen Code | ✅ |
| 30-Mar-2026 | Scheme Part 1: SO form Free Qty field + migration | Qwen Code | ✅ |
| 30-Mar-2026 | Scheme Part 2: Invoice mapping free_qty from SO | Qwen Code | ✅ |
| 30-Mar-2026 | Scheme Part 3: PDF display "qty+free" format | Qwen Code | ✅ |

## Database Migrations (30-Mar-2026)
| Migration File | Columns Added |
|---|---|
| `20260330_add_free_qty_to_sales_orders.sql` | `products.default_free_qty`, `sales_order_items.free_qty` |
| Manual (pending) | `invoice_items.free_qty` |
| Manual (pending) | `products.display_name` |
