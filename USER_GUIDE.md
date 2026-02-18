# 📚 Falcon Super Gold ERP - Complete User Guide

## 🎯 Quick Start (5 Minutes)

### 1. Login
- URL: `http://localhost:3000` (or your deployed URL)
- Default admin credentials: (set up during first run)
- You'll see the Dashboard with KPIs and charts

### 2. Navigation
- **Left Sidebar**: All modules organized by category
- **Top Bar**: Search, notifications, user menu
- **Dark Mode**: Toggle in user menu (top right)

### 3. First Steps
1. Go to **Settings** → Add your company info
2. Go to **Users** → Create accounts for your team
3. Go to **Raw Materials** → Add your inventory items
4. Go to **Customers** → Add your customer list

---

## 📖 Module-by-Module Guide

### 🏠 DASHBOARD
**What it shows:**
- Today's sales, purchase, invoice counts
- Comparison with last month
- Credit intelligence (customer risk)
- Recent activity

**How to use:**
- Click any comparison card to go to that module
- Use refresh button to update data
- Watch the live indicator for real-time updates

---

### 👥 CUSTOMERS

**Creating a Customer:**
1. Go to **Customers** → Click "New Customer"
2. Fill name, email, phone, address
3. Set **Credit Limit** (important!)
4. Save

**Customer Ledger:**
1. Click customer name
2. See all transactions
3. Record payments
4. Export statement to PDF

**Credit Intelligence:**
- System automatically calculates credit score
- Shows: Risk level, outstanding amount, available credit
- Blocks orders if over limit

---

### 🛒 SALES ORDERS

**Creating a Sales Order:**
1. Go to **Sales Orders** → Click "New Order"
2. Select Customer (credit check happens automatically!)
3. You'll see:
   - Credit status bar (green/yellow/red)
   - Customer insights (last orders, favorite products)
   - "Repeat Last Order" button (one-click magic!)
4. Add products, quantities
5. System auto-calculates: Subtotal, Tax, Total
6. Save → Creates order

**Converting to Invoice:**
1. Open the sales order
2. Click "Create Invoice"
3. Invoice auto-fills with order details
4. Print or email to customer

**What the Colors Mean:**
- 🟢 Green: Customer has good credit
- 🟡 Yellow: Customer near credit limit
- 🔴 Red: Customer over limit (ORDER BLOCKED)

---

### 💰 INVOICES

**Creating Invoice:**
- From Sales Order: Auto-convert
- Manual: Click "New Invoice" → Fill details

**Recording Payment:**
1. Open invoice
2. Click "Record Payment"
3. Enter amount, method, date
4. System updates balance automatically

**Invoice Status:**
- **Unpaid**: Not yet paid
- **Partial**: Partially paid
- **Paid**: Fully paid
- **Overdue**: Past due date

---

### 📦 PURCHASE ORDERS

**Creating Purchase Order:**
1. Go to **Purchase Orders** → Click "New PO"
2. Select Supplier
3. Add raw materials/products
4. System suggests quantities based on:
   - Current stock
   - Reorder levels
5. Save → PO created

**From Inventory Reorder:**
1. Go to **Raw Materials**
2. Find item with "Reorder" button
3. Click "Reorder"
4. System pre-fills PO with suggested quantity
5. Just review and submit!

**Receiving Goods (GRN):**
1. Open Purchase Order
2. Click "Create GRN"
3. Enter received quantities
4. System updates inventory automatically

---

### 🏭 PRODUCTION

**Creating Work Order:**
1. Go to **Production** → Click "New Production"
2. Select Formulation (recipe)
3. Enter batch size
4. System shows required materials
5. Save → Work order created

**Production Process:**
1. **Planned** → Click "Start" (changes to In Progress)
2. **In Progress** → Record scrap if any
3. **Complete** → Enter actual quantity produced
4. System automatically:
   - Deducts raw materials from stock
   - Adds finished goods to inventory
   - Creates batch record

**Gantt Chart:**
- Visual timeline of all work orders
- Colors: Blue (In Progress), Green (Done), Red (Delayed)
- Click any bar to see details

**Recording Scrap:**
1. Open work order
2. Click scrap icon
3. Select material, quantity, reason
4. Save (deducts from stock, tracks cost)

---

### 📊 RAW MATERIALS (Inventory)

**Adding Material:**
1. Go to **Raw Materials** → Click "Add Material"
2. Fill: Name, Code, Unit, Stock Level
3. Set: Reorder Point (when to reorder)
4. Save

**Understanding the Table:**
- **Stock Bar**: Visual showing current vs reorder point
- **Velocity Badge**: 
  - ⚡ Fast (70%+ consumed monthly)
  - 📊 Normal (10-70%)
  - 🐢 Slow (<10%)
  - 📦 Dead (no movement)
- **Days Left**: Predicts stockout ("12 days left")
- **Reorder Button**: Appears when low stock

**Stock History:**
1. Click any material
2. Click "History" icon
3. See: GRN receipts, Work order usage, Scrap
4. Green = Stock In, Red = Stock Out

**Velocity Explained:**
- Helps identify:
  - What to stock more of (Fast movers)
  - What's wasting space (Dead stock)
  - Seasonal patterns

---

### 🧪 BATCHES

**What are Batches?**
- Each production run creates a batch
- Track: Manufacturing date, Expiry, Quality status
- FEFO: First Expired, First Out

**Using Batches:**
1. View all batches
2. Filter by: Available, Expired, Quality status
3. Click batch for details
4. Use in sales orders

---

### 📈 REPORTS

**Available Reports:**
- **Sales**: By customer, product, date range
- **Purchase**: By supplier, material
- **Inventory**: Stock levels, movements
- **Financial**: Revenue, expenses, GST
- **Production**: Efficiency, scrap analysis

**Export:**
- All reports export to CSV
- Use in Excel for further analysis

---

### 🛡️ AUDIT LOGS

**What it tracks:**
- Who created what
- When it happened
- What was changed
- IP address

**Using Audit Logs:**
1. Go to **Audit Logs** (under System)
2. See timeline of all activity
3. Filter by: User, Action type, Date
4. Export for compliance

**Why it's useful:**
- Track mistakes
- Compliance requirements
- Security monitoring
- User accountability

---

## 💡 Pro Tips

### Keyboard Shortcuts
- **Ctrl+K**: Global search (if implemented)
- **Ctrl+S**: Save form
- **Esc**: Close modal

### Bulk Actions
- Many tables have checkboxes
- Select multiple items
- Use bulk actions (Delete, Update Status, etc.)

### Smart Defaults
- Dates auto-fill to today
- Customer addresses auto-fill from master
- Product prices auto-fill from last sale

### Export Everything
- Most tables have export button
- Export to CSV for Excel analysis
- PDF for sharing/printing

---

## 🚨 Common Issues & Solutions

### "Credit Limit Exceeded" Error
**Solution:** 
1. Go to customer profile
2. Check outstanding invoices
3. Record payment OR increase credit limit
4. Retry order

### Can't Find Product/Customer
**Solution:**
1. Use search box (top of page)
2. Check if item is "Active" (not deleted)
3. Clear filters if any applied

### Report Shows Wrong Data
**Solution:**
1. Check date range
2. Clear filters
3. Click refresh button
4. Check Audit Logs for recent changes

### Stock Shows Negative
**Solution:**
1. Check Goods Receipts (maybe not recorded)
2. Check Sales Orders (maybe over-sold)
3. Do stock adjustment if needed

---

## 📞 Getting Help

**In-App Help:**
- Tooltips on hover
- Field labels explain purpose
- Validation messages guide you

**Documentation:**
- This User Guide (bookmark it!)
- PROJECT_CONTEXT.md (technical details)
- Code comments (for developers)

**Support:**
1. Check Audit Logs first
2. Screenshot the error
3. Note steps to reproduce
4. Contact admin/developer

---

## 🎓 Training Checklist

### Day 1: Basic Navigation
- [ ] Login and explore dashboard
- [ ] Create a test customer
- [ ] Create a test sales order
- [ ] Convert to invoice

### Day 2: Purchase & Inventory
- [ ] Create a supplier
- [ ] Create purchase order
- [ ] Record goods receipt
- [ ] Check inventory levels

### Day 3: Production (if applicable)
- [ ] Create a formulation
- [ ] Create work order
- [ ] Record production completion
- [ ] View Gantt chart

### Day 4: Reports & Admin
- [ ] Run sales report
- [ ] Export to CSV
- [ ] Check Audit Logs
- [ ] Review user permissions

---

## ✅ Daily Workflow Example

**Morning (9 AM):**
1. Check Dashboard for overnight activity
2. Review low stock alerts (Raw Materials)
3. Check overdue invoices

**Mid-Day:**
4. Process new sales orders
5. Create purchase orders for low stock
6. Update work order statuses

**Evening:**
7. Record day's payments
8. Run daily sales report
9. Check Audit Logs for any issues

---

*Last Updated: February 18, 2026*  
*Version: 1.0*  
*ERP: Falcon Super Gold*  

**Need more help? Check the PROJECT_CONTEXT.md file for technical details!**
