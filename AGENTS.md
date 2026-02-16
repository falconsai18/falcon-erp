# Falcon Super Gold ERP - Agent Documentation
*Auto-generated on 2026-02-15*

## 📊 Quick Stats

| Metric | Count |
|--------|-------|
| **Total Services** | 21 |
| **Total Features** | 22 |
| **Build Status** | ✅ PASSING |

## 🧩 Services Overview


### baseService
- **File:** `baseService.ts`
- **Functions:** 6 (fetchPaginated, fetchById, createRecord, updateRecord, deleteRecord...)
- **Interfaces:** 2 (PaginationParams, PaginatedResult)

### batchService
- **File:** `batchService.ts`
- **Functions:** 9 (getBatches, getBatchById, createBatch, updateBatchStatus, deleteBatch...)
- **Interfaces:** 2 (Batch, BatchFormData)

### challanService
- **File:** `challanService.ts`
- **Functions:** 11 (getChallans, getChallanById, createChallan, deleteChallan, updateChallanStatus...)
- **Interfaces:** 3 (ChallanItem, DeliveryChallan, ChallanFormData)

### creditNoteService
- **File:** `creditNoteService.ts`
- **Functions:** 11 (calculateCNItem, calculateCNTotals, getCreditNotes, getCreditNoteById, createCreditNote...)
- **Interfaces:** 3 (CreditNoteItem, CreditNote, CreditNoteFormData)

### customerService
- **File:** `customerService.ts`
- **Functions:** 9 (getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer...)
- **Interfaces:** 4 (Customer, CustomerAddress, CustomerFormData, AddressFormData)

### debitNoteService
- **File:** `debitNoteService.ts`
- **Functions:** 11 (calculateDNItem, calculateDNTotals, getDebitNotes, getDebitNoteById, createDebitNote...)
- **Interfaces:** 3 (DebitNoteItem, DebitNote, DebitNoteFormData)

### exportService
- **File:** `exportService.ts`
- **Functions:** 5 (exportToCSV, exportSalesOrders, exportInvoices, exportSingleReport, generateInvoicePDF)
- **Interfaces:** 0 (none)

### grnService
- **File:** `grnService.ts`
- **Functions:** 10 (getGRNs, getGRNById, createGRN, updateGRN, deleteGRN...)
- **Interfaces:** 3 (GRNItem, GRN, GRNFormData)

### inventoryService
- **File:** `inventoryService.ts`
- **Functions:** 5 (getInventory, getStockMovements, addStock, adjustStock, getInventoryStats)
- **Interfaces:** 3 (InventoryItem, StockMovement, AddStockFormData)

### invoiceService
- **File:** `invoiceService.ts`
- **Functions:** 10 (calculateInvoiceItem, calculateInvoiceTotals, getInvoices, getInvoiceById, createInvoiceFromSO...)
- **Interfaces:** 3 (Invoice, InvoiceItem, InvoiceFormData)

### productionService
- **File:** `productionService.ts`
- **Functions:** 12 (getBOMs, getBOMById, getBOMsForProduct, createBOM, deleteBOM...)
- **Interfaces:** 6 (BOM, BOMItem, ProductionOrder, ProductionMaterial, BOMFormData)

### purchaseService
- **File:** `purchaseService.ts`
- **Functions:** 8 (calculatePOItem, calculatePOTotals, getPurchaseOrders, getPurchaseOrderById, createPurchaseOrder...)
- **Interfaces:** 3 (PurchaseOrder, PurchaseOrderItem, POFormData)

### qualityCheckService
- **File:** `qualityCheckService.ts`
- **Functions:** 9 (getQualityChecks, getQualityCheckById, createQualityCheck, updateQualityCheckStatus, updateQualityCheckItem...)
- **Interfaces:** 3 (QualityCheckItem, QualityCheck, QualityCheckFormData)

### quotationService
- **File:** `quotationService.ts`
- **Functions:** 10 (calculateQuotationItem, calculateQuotationTotals, getQuotations, getQuotationById, createQuotation...)
- **Interfaces:** 3 (QuotationItem, Quotation, QuotationFormData)

### rawMaterialService
- **File:** `rawMaterialService.ts`
- **Functions:** 5 (getRawMaterials, createRawMaterial, updateRawMaterial, deleteRawMaterial, getRawMaterialStats)
- **Interfaces:** 2 (RawMaterial, RawMaterialFormData)

### reportService
- **File:** `reportService.ts`
- **Functions:** 4 (getSalesReport, getInventoryReport, getFinancialReport, getProductionReport)
- **Interfaces:** 4 (SalesReport, InventoryReport, FinancialReport, ProductionReport)

### salesService
- **File:** `salesService.ts`
- **Functions:** 8 (calculateLineItem, calculateOrderTotals, getSalesOrders, getSalesOrderById, createSalesOrder...)
- **Interfaces:** 3 (SalesOrder, SalesOrderItem, SalesOrderFormData)

### settingsService
- **File:** `settingsService.ts`
- **Functions:** 13 (getCompanyInfo, updateCompanyInfo, getAllSettings, updateSetting, upsertSetting...)
- **Interfaces:** 4 (CompanyInfo, SettingRow, NumberSequence, BankAccount)

### supplierPaymentService
- **File:** `supplierPaymentService.ts`
- **Functions:** 15 (calculateBillItem, calculateBillTotals, getSupplierBills, getSupplierBillById, createSupplierBill...)
- **Interfaces:** 5 (SupplierBill, SupplierBillItem, SupplierPayment, SupplierBillFormData, SupplierPaymentFormData)

### supplierService
- **File:** `supplierService.ts`
- **Functions:** 5 (getSuppliers, createSupplier, updateSupplier, deleteSupplier, getSupplierStats)
- **Interfaces:** 2 (Supplier, SupplierFormData)

### workOrderService
- **File:** `workOrderService.ts`
- **Functions:** 10 (getWorkOrders, getWorkOrderById, createWorkOrder, updateWorkOrderStatus, issueMaterial...)
- **Interfaces:** 4 (WorkOrderMaterial, WorkOrderStep, WorkOrder, WorkOrderFormData)


## 🏗️ Features Overview


### auth
- **Path:** `src/features/auth`
- **Pages:** 1 (LoginPage.tsx)

### batches
- **Path:** `src/features/batches`
- **Pages:** 1 (BatchesPage.tsx)

### challans
- **Path:** `src/features/challans`
- **Pages:** 1 (ChallansPage.tsx)

### credit-notes
- **Path:** `src/features/credit-notes`
- **Pages:** 1 (CreditNotesPage.tsx)

### customers
- **Path:** `src/features/customers`
- **Pages:** 1 (CustomersPage.tsx)

### dashboard
- **Path:** `src/features/dashboard`
- **Pages:** 1 (DashboardPage.tsx)

### debit-notes
- **Path:** `src/features/debit-notes`
- **Pages:** 1 (DebitNotesPage.tsx)

### grn
- **Path:** `src/features/grn`
- **Pages:** 1 (GRNPage.tsx)

### inventory
- **Path:** `src/features/inventory`
- **Pages:** 1 (InventoryPage.tsx)

### invoices
- **Path:** `src/features/invoices`
- **Pages:** 1 (InvoicesPage.tsx)

### production
- **Path:** `src/features/production`
- **Pages:** 1 (ProductionPage.tsx)

### products
- **Path:** `src/features/products`
- **Pages:** 1 (ProductsPage.tsx)

### purchase
- **Path:** `src/features/purchase`
- **Pages:** 1 (PurchasePage.tsx)

### quality-checks
- **Path:** `src/features/quality-checks`
- **Pages:** 1 (QualityChecksPage.tsx)

### quotations
- **Path:** `src/features/quotations`
- **Pages:** 1 (QuotationsPage.tsx)

### raw-materials
- **Path:** `src/features/raw-materials`
- **Pages:** 1 (RawMaterialsPage.tsx)

### reports
- **Path:** `src/features/reports`
- **Pages:** 1 (ReportsPage.tsx)

### sales
- **Path:** `src/features/sales`
- **Pages:** 1 (SalesPage.tsx)

### settings
- **Path:** `src/features/settings`
- **Pages:** 1 (SettingsPage.tsx)

### supplier-payments
- **Path:** `src/features/supplier-payments`
- **Pages:** 1 (SupplierPaymentsPage.tsx)

### suppliers
- **Path:** `src/features/suppliers`
- **Pages:** 1 (SuppliersPage.tsx)

### work-orders
- **Path:** `src/features/work-orders`
- **Pages:** 1 (WorkOrdersPage.tsx)


## 📝 Recent Changes (Last 10 Commits)

| Commit | Message | Date |
|--------|---------|------|
| 0192831 | Fix: Export dropdown with click-outside handler an... | 2026-02-15 |
| d75496b | Fix all build errors - clean production build | 2026-02-15 |
| e7eb2df | Settings module: Company info, Profile, Numbering ... | 2026-02-15 |
| d303ad7 | Reports module: Sales, Inventory, Financial, Produ... | 2026-02-15 |
| 6978f74 | Production module: BOM/Recipe management, producti... | 2026-02-15 |
| 040b2dc | Inventory module: batch tracking, FEFO, expiry ale... | 2026-02-15 |
| a0b923a | Purchase Orders + Invoices with GST + Payment reco... | 2026-02-15 |
| c73dcad | Invoices module: GST compliant, SO to Invoice flow... | 2026-02-15 |
| 43429d0 | Day 2 Complete: Schema 43 tables, Service layer, C... | 2026-02-15 |
| f264585 | Day 2: Schema enhanced (43 tables), Service layer,... | 2026-02-15 |

## 🔄 How to Update This File

Run the auto-update script:
```bash
npm run docs:update
```

---

*For full documentation, see the original AGENTS.md file.*
