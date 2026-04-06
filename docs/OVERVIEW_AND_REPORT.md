# Falcon ERP — Overview & Full Report

## 1. Executive summary

**Falcon Super Gold ERP** (often referred to as **Falcon ERP** in code) is a **browser-based business application** for companies that need to run **sales, purchase, inventory, manufacturing, quality, and financial reporting** in one place. It is built for **Indian regulatory reality** (GST, tax splits, HSN-driven line items) while also supporting an **International Trade / export** workflow (export customers, orders, invoices, shipments, packing lists, payments).

The app is a **single-page application (SPA)** powered by **React 19**, **TypeScript**, and **Vite**, with **Supabase** as the backend (PostgreSQL + Auth + realtime where used). It is designed to be **deployed on the edge** (e.g. Vercel) and used as a **Progressive Web App (PWA)** for installable, offline-friendly behaviour where configured.

---

## 2. What makes it stand out (“the wonders”)

These are intentional design choices that matter in real operations:

1. **One system, many departments**  
   Sales (quotations → orders → invoices → challans / credit notes) connects logically to **stock**, **purchase**, **production**, and **reports**, so teams do not maintain parallel spreadsheets for the same truth.

2. **GST-aware sales documents**  
   Invoicing logic understands **place of supply**, **CGST/SGST vs IGST** (with seller state configuration), rounding, and printable **tax invoice / proforma** flows suitable for Indian B2B.

3. **Deep operational coverage**  
   Beyond generic “ERP screens,” the product includes **formulations**, **production / work orders**, **batches**, **quality checks**, **GRN**, **supplier payments**, and **raw materials** — aligned with manufacturing and regulated product businesses.

4. **Export (international) module**  
   A dedicated **Export** area tracks export customers, orders, invoices, shipments, packing lists, and payments — parallel to domestic sales but structured for export operations.

5. **Security model in the UI**  
   **Role-based access** gates menus and actions (who can create, read, update, delete, export). Sensitive areas such as **Users**, **Settings**, and **Audit logs** are restricted to appropriate roles.

6. **Auditability**  
   **Audit logs** help answer “who did what, when” for compliance and internal review.

7. **Modern delivery**  
   **Route-based code splitting** keeps initial load lean; heavy pages load when you navigate. **PWA** support allows installation and service-worker caching for assets and configured API patterns.

8. **Polished UX patterns**  
   List + detail panels, filters, KPI cards, status badges, PDF/print flows, and mobile-minded components (e.g. swipe cards, bottom sheets where used) make the app usable on the floor and in the office.

---

## 3. Who should use it

| Role | Typical usage |
|------|----------------|
| **Leadership / owner** | Dashboard, reports, GST summaries, export KPIs |
| **Sales / CS** | Customers, quotations, sales orders, invoices, challans, credit notes |
| **Purchase** | Suppliers, purchase orders, GRN, debit notes, supplier payments |
| **Production / plant** | Raw materials, formulations, production, batches |
| **QC** | Quality checks tied to batches and processes |
| **Warehouse / stock** | Products, inventory, movements, bulk inwarding |
| **Accounts** | Invoices, payments, GST reports, ledgers |
| **Admin / IT** | Users, settings, audit logs |

Exact permissions depend on the **user role** assigned in the system (`super_admin`, `admin`, `manager`, `accountant`, `staff`, `viewer`).

---

## 4. High-level architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React SPA + PWA)                                   │
│  Router · lazy-loaded pages · Zustand auth · UI components   │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS (REST + Realtime)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase                                                    │
│  PostgreSQL · Row Level Security (policies in project)      │
│  Auth · Storage (if used) · Edge Functions (if any)          │
└─────────────────────────────────────────────────────────────┘
```

- **Frontend** talks to Supabase using the **anon key** (safe for browser only if **RLS** and policies are correctly configured in Supabase).
- **Business rules** (tax calculation, numbering, some workflows) live in **TypeScript services** and optionally **SQL / RPC** in the database (e.g. ledger functions).

---

## 5. Module map (conceptual)

| Area | Purpose |
|------|---------|
| **Dashboard** | KPIs and entry point after login |
| **Sales** | Customers, quotations, sales orders, invoices, credit notes, delivery challans |
| **Export** | Export dashboard, customers, orders, invoices, shipments, packing lists, payments |
| **Purchase** | Suppliers, purchase orders, GRN, debit notes, supplier payments |
| **Manufacturing** | Raw materials, formulations, production, batches |
| **Quality** | Quality checks |
| **Stock** | Product master, inventory, stock movements, bulk inwarding |
| **Reports** | Operational and financial summaries (module-specific) |
| **GST reports** | GST-focused reporting |
| **Admin** | Users, audit logs, settings |

Routes match the sidebar; see **User guide** for paths and workflows.

---

## 6. Data & compliance note

- **Source of truth** for persistent data is the **Supabase database**, not the browser.
- **GST and legal correctness** depend on **master data** (HSN, rates, addresses, GSTIN), **correct configuration** (company, seller state, terms), and **user discipline** when entering transactions.
- **Printed/PDF invoices** should be reviewed against your CA / compliance process before going live for a new legal entity.

---

## 7. Related documents

- **[USER_GUIDE.md](USER_GUIDE.md)** — How to use each area step-by-step  
- **[SETUP_AND_DEVELOPMENT.md](SETUP_AND_DEVELOPMENT.md)** — Install, env, build, deploy  
- **[../context.md](../context.md)** — Changelog-style context for the team

---

*This report describes the application as designed; always verify behaviour against your deployed environment and Supabase policies.*
