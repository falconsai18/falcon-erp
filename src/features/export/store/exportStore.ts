import { create } from 'zustand'
import {
    ExportCustomer,
    ExportOrder,
    ExportInvoice,
    ExportShipment,
    ExportPackingList,
    ExportPayment,
    ExportDashboardStats,
    TopExportBuyer,
    MonthlyExportTrend,
    OrderStatusCount,
    ShipmentInTransit,
    PendingDocument,
    ExportOrderFilters,
    ExportInvoiceFilters,
    ExportPaymentFilters,
    ExportShipmentFilters,
    ExportCustomerFormData,
    ExportOrderFormData,
    ExportOrderItemFormData,
    ExportInvoiceFormData,
    ExportPackingListFormData,
    ExportPackingListItemFormData,
    ExportShipmentFormData,
    ExportPaymentFormData,
    ExportOrderStatus,
    InvoiceStatus,
    ShipmentStatus,
    DocumentStatus,
    PaymentStatus,
    PackingStatus,
} from '../types/export.types'
import * as exportService from '../services/exportService'

interface ExportStore {
    // Entities
    customers: ExportCustomer[]
    orders: ExportOrder[]
    invoices: ExportInvoice[]
    shipments: ExportShipment[]
    packingLists: ExportPackingList[]
    payments: ExportPayment[]

    // Selected
    selectedOrder: ExportOrder | null
    selectedCustomer: ExportCustomer | null
    selectedInvoice: ExportInvoice | null
    selectedShipment: ExportShipment | null

    // Dashboard
    dashboardStats: ExportDashboardStats | null
    topBuyers: TopExportBuyer[]
    monthlyTrend: MonthlyExportTrend[]
    ordersByStatus: OrderStatusCount[]
    shipmentsInTransit: ShipmentInTransit[]
    pendingDocuments: PendingDocument[]

    // Filters
    filters: {
        search: string
        status: string
        dateRange: { start: string; end: string }
        customerId: string
    }

    // UI
    loading: boolean
    error: string | null

    // Actions - Customers
    fetchCustomers: (filters?: { search?: string; is_active?: boolean }) => Promise<void>
    fetchCustomerById: (id: string) => Promise<ExportCustomer | null>
    createCustomer: (data: ExportCustomerFormData) => Promise<ExportCustomer>
    updateCustomer: (id: string, data: Partial<ExportCustomerFormData>) => Promise<ExportCustomer>
    deleteCustomer: (id: string) => Promise<void>

    // Actions - Orders
    fetchOrders: (filters?: ExportOrderFilters) => Promise<void>
    fetchOrderById: (id: string) => Promise<ExportOrder | null>
    createOrder: (data: ExportOrderFormData, items: ExportOrderItemFormData[]) => Promise<ExportOrder>
    updateOrder: (id: string, data: Partial<ExportOrderFormData>) => Promise<ExportOrder>
    updateOrderStatus: (id: string, status: ExportOrderStatus) => Promise<ExportOrder>
    deleteOrder: (id: string) => Promise<void>
    addOrderItem: (orderId: string, item: ExportOrderItemFormData) => Promise<void>
    updateOrderItem: (itemId: string, data: Partial<ExportOrderItemFormData>) => Promise<void>
    removeOrderItem: (itemId: string, orderId: string) => Promise<void>

    // Actions - Invoices
    fetchInvoices: (filters?: ExportInvoiceFilters) => Promise<void>
    fetchInvoiceById: (id: string) => Promise<ExportInvoice | null>
    createInvoice: (data: ExportInvoiceFormData) => Promise<ExportInvoice>
    updateInvoice: (id: string, data: Partial<ExportInvoiceFormData>) => Promise<ExportInvoice>
    updateInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<ExportInvoice>

    // Actions - Packing Lists
    fetchPackingLists: (filters?: { status?: string; date_range?: { start: string; end: string }; search?: string }) => Promise<void>
    fetchPackingListById: (id: string) => Promise<ExportPackingList | null>
    createPackingList: (data: ExportPackingListFormData, items: ExportPackingListItemFormData[]) => Promise<ExportPackingList>
    updatePackingList: (id: string, data: Partial<ExportPackingListFormData>) => Promise<ExportPackingList>

    // Actions - Shipments
    fetchShipments: (filters?: ExportShipmentFilters) => Promise<void>
    fetchShipmentById: (id: string) => Promise<ExportShipment | null>
    createShipment: (data: ExportShipmentFormData) => Promise<ExportShipment>
    updateShipment: (id: string, data: Partial<ExportShipmentFormData>) => Promise<ExportShipment>
    updateShipmentStatus: (id: string, status: ShipmentStatus) => Promise<ExportShipment>

    // Actions - Documents
    fetchDocumentsByOrder: (orderId: string) => Promise<import('../types/export.types').ExportDocument[]>
    updateDocumentStatus: (docId: string, status: DocumentStatus, refNumber?: string, issueDate?: string) => Promise<void>

    // Actions - Payments
    fetchPayments: (filters?: ExportPaymentFilters) => Promise<void>
    fetchPaymentsByOrder: (orderId: string) => Promise<ExportPayment[]>
    createPayment: (data: ExportPaymentFormData) => Promise<ExportPayment>
    updatePayment: (id: string, data: Partial<ExportPaymentFormData>) => Promise<ExportPayment>

    // Actions - Dashboard
    fetchDashboardStats: () => Promise<void>
    fetchTopBuyers: (limit?: number) => Promise<void>
    fetchMonthlyTrend: (months?: number) => Promise<void>
    fetchOrdersByStatusCount: () => Promise<void>
    fetchShipmentsInTransit: () => Promise<void>
    fetchPendingDocuments: () => Promise<void>

    // Setters
    setSelectedOrder: (order: ExportOrder | null) => void
    setSelectedCustomer: (customer: ExportCustomer | null) => void
    setSelectedInvoice: (invoice: ExportInvoice | null) => void
    setSelectedShipment: (shipment: ExportShipment | null) => void
    setFilters: (filters: Partial<ExportStore['filters']>) => void
    clearError: () => void
}

export const useExportStore = create<ExportStore>((set, get) => ({
    customers: [],
    orders: [],
    invoices: [],
    shipments: [],
    packingLists: [],
    payments: [],

    selectedOrder: null,
    selectedCustomer: null,
    selectedInvoice: null,
    selectedShipment: null,

    dashboardStats: null,
    topBuyers: [],
    monthlyTrend: [],
    ordersByStatus: [],
    shipmentsInTransit: [],
    pendingDocuments: [],

    filters: {
        search: '',
        status: 'ALL',
        dateRange: { start: '', end: '' },
        customerId: '',
    },

    loading: false,
    error: null,

    fetchCustomers: async (filters) => {
        set({ loading: true, error: null })
        try {
            const data = await exportService.getExportCustomers(filters)
            set({ customers: data })
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch customers' })
        } finally {
            set({ loading: false })
        }
    },

    fetchCustomerById: async (id) => {
        set({ loading: true, error: null })
        try {
            const data = await exportService.getExportCustomerById(id)
            return data
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch customer' })
            return null
        } finally {
            set({ loading: false })
        }
    },

    createCustomer: async (data) => {
        set({ loading: true, error: null })
        try {
            const created = await exportService.createExportCustomer(data)
            await get().fetchCustomers()
            return created
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to create customer' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    updateCustomer: async (id, data) => {
        set({ loading: true, error: null })
        try {
            const updated = await exportService.updateExportCustomer(id, data)
            await get().fetchCustomers()
            return updated
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to update customer' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    deleteCustomer: async (id) => {
        set({ loading: true, error: null })
        try {
            await exportService.deleteExportCustomer(id)
            await get().fetchCustomers()
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to delete customer' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    fetchOrders: async (filters) => {
        set({ loading: true, error: null })
        try {
            const { filters: f } = get()
            const merged = {
                ...filters,
                status: (filters?.status ?? f.status) as ExportOrderStatus | 'ALL',
                customer_id: filters?.customer_id ?? (f.customerId || undefined),
                date_range: filters?.date_range ?? (f.dateRange.start && f.dateRange.end ? { start: f.dateRange.start, end: f.dateRange.end } : undefined),
                search: filters?.search ?? (f.search || undefined),
            }
            const data = await exportService.getExportOrders(merged)
            set({ orders: data })
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch orders' })
        } finally {
            set({ loading: false })
        }
    },

    fetchOrderById: async (id) => {
        set({ loading: true, error: null })
        try {
            const data = await exportService.getExportOrderById(id)
            set({ selectedOrder: data ?? null })
            return data
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch order' })
            return null
        } finally {
            set({ loading: false })
        }
    },

    createOrder: async (data, items) => {
        set({ loading: true, error: null })
        try {
            const created = await exportService.createExportOrder(data, items)
            await get().fetchOrders()
            return created
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to create order' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    updateOrder: async (id, data) => {
        set({ loading: true, error: null })
        try {
            const updated = await exportService.updateExportOrder(id, data)
            await get().fetchOrders()
            if (get().selectedOrder?.id === id) {
                set({ selectedOrder: { ...get().selectedOrder!, ...updated } })
            }
            return updated
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to update order' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    updateOrderStatus: async (id, status) => {
        set({ loading: true, error: null })
        try {
            const updated = await exportService.updateExportOrderStatus(id, status)
            await get().fetchOrders()
            if (get().selectedOrder?.id === id) {
                set({ selectedOrder: { ...get().selectedOrder!, status } })
            }
            return updated
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to update status' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    deleteOrder: async (id) => {
        set({ loading: true, error: null })
        try {
            await exportService.deleteExportOrder(id)
            await get().fetchOrders()
            if (get().selectedOrder?.id === id) {
                set({ selectedOrder: null })
            }
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to delete order' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    addOrderItem: async (orderId, item) => {
        set({ loading: true, error: null })
        try {
            await exportService.addOrderItem(orderId, item)
            await get().fetchOrderById(orderId)
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to add item' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    updateOrderItem: async (itemId, data) => {
        set({ loading: true, error: null })
        try {
            const item = await exportService.updateOrderItem(itemId, data)
            const orderId = (item as { export_order_id: string }).export_order_id
            if (orderId) await get().fetchOrderById(orderId)
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to update item' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    removeOrderItem: async (itemId, orderId) => {
        set({ loading: true, error: null })
        try {
            await exportService.removeOrderItem(itemId, orderId)
            await get().fetchOrderById(orderId)
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to remove item' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    fetchInvoices: async (filters) => {
        set({ loading: true, error: null })
        try {
            const { filters: f } = get()
            const merged = {
                ...filters,
                status: filters?.status ?? (f.status !== 'ALL' ? (f.status as InvoiceStatus) : undefined),
                customer_id: filters?.customer_id ?? (f.customerId || undefined),
                date_range: filters?.date_range ?? (f.dateRange.start && f.dateRange.end ? { start: f.dateRange.start, end: f.dateRange.end } : undefined),
                search: filters?.search ?? (f.search || undefined),
            }
            const data = await exportService.getExportInvoices(merged)
            set({ invoices: data })
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch invoices' })
        } finally {
            set({ loading: false })
        }
    },

    fetchInvoiceById: async (id) => {
        set({ loading: true, error: null })
        try {
            const data = await exportService.getExportInvoiceById(id)
            set({ selectedInvoice: data ?? null })
            return data
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch invoice' })
            return null
        } finally {
            set({ loading: false })
        }
    },

    createInvoice: async (data) => {
        set({ loading: true, error: null })
        try {
            const created = await exportService.createExportInvoice(data)
            await get().fetchInvoices()
            return created
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to create invoice' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    updateInvoice: async (id, data) => {
        set({ loading: true, error: null })
        try {
            const updated = await exportService.updateExportInvoice(id, data)
            await get().fetchInvoices()
            return updated
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to update invoice' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    updateInvoiceStatus: async (id, status) => {
        set({ loading: true, error: null })
        try {
            const updated = await exportService.updateInvoiceStatus(id, status)
            await get().fetchInvoices()
            return updated
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to update invoice status' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    fetchPackingLists: async (filters) => {
        set({ loading: true, error: null })
        try {
            const data = await exportService.getPackingLists(filters as { status?: PackingStatus | 'ALL'; date_range?: { start: string; end: string }; search?: string })
            set({ packingLists: data })
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch packing lists' })
        } finally {
            set({ loading: false })
        }
    },

    fetchPackingListById: async (id) => {
        set({ loading: true, error: null })
        try {
            const data = await exportService.getPackingListById(id)
            return data
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch packing list' })
            return null
        } finally {
            set({ loading: false })
        }
    },

    createPackingList: async (data, items) => {
        set({ loading: true, error: null })
        try {
            const created = await exportService.createPackingList(data, items)
            await get().fetchPackingLists()
            return created
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to create packing list' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    updatePackingList: async (id, data) => {
        set({ loading: true, error: null })
        try {
            const updated = await exportService.updatePackingList(id, data)
            await get().fetchPackingLists()
            return updated
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to update packing list' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    fetchShipments: async (filters) => {
        set({ loading: true, error: null })
        try {
            const data = await exportService.getShipments(filters)
            set({ shipments: data })
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch shipments' })
        } finally {
            set({ loading: false })
        }
    },

    fetchShipmentById: async (id) => {
        set({ loading: true, error: null })
        try {
            const data = await exportService.getShipmentById(id)
            set({ selectedShipment: data ?? null })
            return data
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch shipment' })
            return null
        } finally {
            set({ loading: false })
        }
    },

    createShipment: async (data) => {
        set({ loading: true, error: null })
        try {
            const created = await exportService.createShipment(data)
            await get().fetchShipments()
            return created
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to create shipment' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    updateShipment: async (id, data) => {
        set({ loading: true, error: null })
        try {
            const updated = await exportService.updateShipment(id, data)
            await get().fetchShipments()
            return updated
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to update shipment' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    updateShipmentStatus: async (id, status) => {
        set({ loading: true, error: null })
        try {
            const updated = await exportService.updateShipmentStatus(id, status)
            await get().fetchShipments()
            return updated
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to update shipment status' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    fetchDocumentsByOrder: async (orderId) => {
        set({ loading: true, error: null })
        try {
            const data = await exportService.getDocumentsByOrder(orderId)
            return data
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch documents' })
            return []
        } finally {
            set({ loading: false })
        }
    },

    updateDocumentStatus: async (docId, status, refNumber, issueDate) => {
        set({ loading: true, error: null })
        try {
            await exportService.updateDocumentStatus(docId, status, refNumber, issueDate)
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to update document' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    fetchPayments: async (filters) => {
        set({ loading: true, error: null })
        try {
            const { filters: f } = get()
            const merged = {
                ...filters,
                status: filters?.status ?? (f.status !== 'ALL' ? (f.status as PaymentStatus) : undefined),
                customer_id: filters?.customer_id ?? (f.customerId || undefined),
                date_range: filters?.date_range ?? (f.dateRange.start && f.dateRange.end ? { start: f.dateRange.start, end: f.dateRange.end } : undefined),
                search: filters?.search ?? (f.search || undefined),
            }
            const data = await exportService.getExportPayments(merged)
            set({ payments: data })
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch payments' })
        } finally {
            set({ loading: false })
        }
    },

    fetchPaymentsByOrder: async (orderId) => {
        set({ loading: true, error: null })
        try {
            const data = await exportService.getPaymentsByOrder(orderId)
            return data
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch payments' })
            return []
        } finally {
            set({ loading: false })
        }
    },

    createPayment: async (data) => {
        set({ loading: true, error: null })
        try {
            const created = await exportService.createExportPayment(data)
            await get().fetchPayments()
            return created
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to create payment' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    updatePayment: async (id, data) => {
        set({ loading: true, error: null })
        try {
            const updated = await exportService.updateExportPayment(id, data)
            await get().fetchPayments()
            return updated
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to update payment' })
            throw err
        } finally {
            set({ loading: false })
        }
    },

    fetchDashboardStats: async () => {
        set({ loading: true, error: null })
        try {
            const data = await exportService.getExportDashboardStats()
            set({ dashboardStats: data })
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch dashboard stats' })
        } finally {
            set({ loading: false })
        }
    },

    fetchTopBuyers: async (limit = 5) => {
        set({ loading: true, error: null })
        try {
            const data = await exportService.getTopExportBuyers(limit)
            set({ topBuyers: data })
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch top buyers' })
        } finally {
            set({ loading: false })
        }
    },

    fetchMonthlyTrend: async (months = 12) => {
        set({ loading: true, error: null })
        try {
            const data = await exportService.getMonthlyExportTrend(months)
            set({ monthlyTrend: data })
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch monthly trend' })
        } finally {
            set({ loading: false })
        }
    },

    fetchOrdersByStatusCount: async () => {
        set({ loading: true, error: null })
        try {
            const data = await exportService.getOrdersByStatusCount()
            set({ ordersByStatus: data })
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch orders by status' })
        } finally {
            set({ loading: false })
        }
    },

    fetchShipmentsInTransit: async () => {
        set({ loading: true, error: null })
        try {
            const data = await exportService.getShipmentsInTransit()
            set({ shipmentsInTransit: data })
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch shipments in transit' })
        } finally {
            set({ loading: false })
        }
    },

    fetchPendingDocuments: async () => {
        set({ loading: true, error: null })
        try {
            const data = await exportService.getPendingDocuments()
            set({ pendingDocuments: data })
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch pending documents' })
        } finally {
            set({ loading: false })
        }
    },

    setSelectedOrder: (order) => set({ selectedOrder: order }),
    setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),
    setSelectedInvoice: (invoice) => set({ selectedInvoice: invoice }),
    setSelectedShipment: (shipment) => set({ selectedShipment: shipment }),
    setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
    clearError: () => set({ error: null }),
}))
