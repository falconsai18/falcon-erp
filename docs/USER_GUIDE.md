# Falcon ERP — User Guide

This guide explains **how to use the application** after you can log in. Menu labels match the **left sidebar** (desktop). On mobile, open the **menu** from the header to reach the same sections.

---

## 1. First-time access

1. Open your organisation’s **Falcon ERP URL** (e.g. production on Vercel, or `http://localhost:3007` during development).
2. You will see the **Login** screen if you are not authenticated.
3. Sign in with the credentials your **administrator** created (Supabase Auth–backed).
4. After login, you land on the **Dashboard** (if your role allows it).

**If a menu item is missing:** your **role** does not include that module. Ask an **admin** or **super admin** to adjust permissions or role assignment.

---

## 2. Global UI patterns

| Pattern | What it means |
|---------|----------------|
| **Sidebar navigation** | Primary way to switch modules; sections group related pages |
| **Breadcrumbs** | Under the top bar — shows where you are in the app hierarchy |
| **List + detail** | Many screens show a **table or list** on the left and **details** on the right when you select a row |
| **Filters & search** | Use search boxes and status filters to narrow large lists |
| **KPI cards** | Summary numbers at the top of list pages (totals, outstanding, etc.) |
| **Status badges** | Draft / sent / paid / etc. — always check status before assuming legal effect |
| **Export CSV** | Where present, exports current list data for Excel analysis |
| **Print / PDF** | Invoices and some documents support **print view** or **downloaded PDF** — use the buttons on the document screen |

---

## 3. Dashboard (`/`)

- High-level **KPIs** and shortcuts (exact widgets depend on implementation).
- Use it as the **home base** after login.

---

## 4. Sales

### 4.1 Customers (`/customers`)

- **Add** new customers with address, GSTIN, credit terms, and type (retail, wholesale, etc.).
- **Search** by name, phone, GST, email.
- **Outstanding** may be shown against unpaid/partial invoices (depending on status rules).
- Open **Customer ledger** from the row actions when you need **account-style history** for that customer (`/customers/:id/ledger`).

### 4.2 Quotations (`/quotations`)

- Create **quotes** before a firm order exists.
- Track validity, line items, and conversion toward a **sales order** (per your process).

### 4.3 Sales orders (`/sales`)

- Central **order** object: items, quantities, pricing, status (confirmed, processing, shipped, etc.).
- Often the **source** for **invoice generation** (e.g. generate invoice from an order when ready).

### 4.4 Invoices (`/invoices`)

- List all **tax invoices / proforma** flows.
- **Generate invoice** from a **confirmed sales order** (when unbilled orders exist).
- **Send** draft → sent, **record payments**, **print**, download **proforma PDF** for drafts, **mark paid** where allowed.
- **Bulk actions** (when selection is enabled): mark multiple as sent or paid — use carefully with accounting.

**GST tip:** Place of supply and customer state drive **CGST+SGST vs IGST**; seller state is configured in the app environment.

### 4.5 Credit notes (`/credit-notes`)

- Use for **reductions / returns** linked to sales (credit against customer account), per your process.

### 4.6 Delivery challans (`/challans`)

- Use for **goods movement / delivery** documentation alongside or before invoicing, as per your workflow.

---

## 5. Export (international trade)

These screens are for **export-specific** pipelines (parallel to domestic sales).

| Path | Typical use |
|------|-------------|
| `/export` | Export **dashboard** overview |
| `/export/customers` | Export customer master |
| `/export/orders` | Export orders (`/export/orders/:id` for detail) |
| `/export/invoices` | Export invoices |
| `/export/shipments` | Shipments |
| `/export/packing-lists` | Packing lists |
| `/export/payments` | Export-related payments |

Forms and PDFs may use **USD** amounts, **exchange rates**, **LUT** / compliance fields where implemented — fill **exactly** as per your export documentation.

---

## 6. Purchase

### 6.1 Suppliers (`/suppliers`)

- Maintain **supplier master** (similar idea to customers).
- **Supplier ledger** at `/suppliers/:id/ledger` for payable-style history.

### 6.2 Purchase orders (`/purchase`)

- Raise **POs** to suppliers; track receipt and billing against GRN.

### 6.3 GRN — Goods receipt (`/grn`)

- Record **goods received** against purchase; updates inventory and supplier liability depending on setup.

### 6.4 Debit notes (`/debit-notes`)

- Supplier **debit adjustments** (returns, rate corrections) per process.

### 6.5 Supplier payments (`/supplier-payments`)

- Record **payments** to suppliers and reconcile with bills/GRN as per your accounts practice.

---

## 7. Manufacturing

| Path | Purpose |
|------|---------|
| `/raw-materials` | Raw material master, stock, images, low-stock alerts |
| `/formulations` | Formulations / recipes (BOM-style) |
| `/production` | Production orders / work orders |
| `/batches` | Batch tracking for manufactured goods |

Typical flow: **formulation** → **production** → **batch** output → **inventory** / **QC**.

---

## 8. Quality

- **`/quality-checks`** — Record inspections, results, and links to batches where applicable.

---

## 9. Stock (products & inventory)

| Path | Purpose |
|------|---------|
| `/products` | **Product master** (SKU, HSN, pricing, etc.) |
| `/inventory` | **Stock levels**, movements, batches, expiry/low-stock alerts |
| `/inventory/bulk-entry` | **Bulk inwarding** for faster stock entry |

---

## 10. Reports & compliance

| Path | Purpose |
|------|---------|
| `/reports` | Operational / management reports |
| `/gst-reports` | GST-focused reporting for India compliance |

Export or print from these screens where your role allows.

---

## 11. Administration

| Path | Purpose |
|------|---------|
| `/users` | Manage users (roles **super admin / admin** typically) |
| `/audit-logs` | Who did what, when (read for managers / admins depending on policy) |
| `/settings` | Company profile, terms on invoices, and other app settings |

---

## 12. Roles & permissions (simplified)

The app uses a **permission matrix** (resource × action × role). Examples:

- **Viewer** — mostly read-only on dashboards and lists.
- **Staff / Manager** — create and update operational documents; **delete** may be restricted (e.g. managers often **CRU** without delete).
- **Admin / Super admin** — full access including **users**, **settings**, and sensitive deletes.

Exact rules are in code (`src/config/permissions.ts`); when in doubt, ask your **admin**.

---

## 13. Tips for smooth daily use

1. **Keep masters clean** — customers, suppliers, products, HSN codes; bad master data causes bad invoices and reports.  
2. **Match document status to reality** — e.g. do not mark invoices **paid** until money is received.  
3. **Use ledgers** for reconciliation — customer/ supplier ledgers before month-end.  
4. **Prefer PDF/print preview** before sending invoices to important customers.  
5. **If something looks wrong** — check **audit logs** (if you have access) and the **underlying Supabase row** with your technical team.

---

## 14. Getting help

- **Internal:** your Falcon ERP admin or super admin.  
- **Technical:** developers should read **[SETUP_AND_DEVELOPMENT.md](SETUP_AND_DEVELOPMENT.md)** and **[../context.md](../context.md)**.

---

*Screens and exact field names may evolve; this guide reflects the modular structure of the Falcon ERP codebase.*
