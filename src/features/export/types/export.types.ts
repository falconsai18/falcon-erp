// ============ EXPORT TYPES ============

// Status Types
export type ExportOrderStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PRODUCTION' | 'READY_TO_SHIP' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
export type ShipmentMode = 'SEA' | 'AIR'
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAYMENT_PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED'
export type ShipmentStatus = 'BOOKING_CONFIRMED' | 'CUSTOMS_CLEARED' | 'LOADED' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED' | 'CANCELLED'
export type DocumentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'READY' | 'SUBMITTED' | 'NOT_REQUIRED'
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'RECEIVED' | 'OVERDUE'
export type PackingStatus = 'DRAFT' | 'CONFIRMED' | 'DISPATCHED'
export type ContainerSize = '20FT' | '40FT' | '40HQ' | 'LCL'
export type BLType = 'ORIGINAL' | 'SURRENDER' | 'SEAWAY_BILL'
export type Incoterm = 'EXW' | 'FCA' | 'FAS' | 'FOB' | 'CFR' | 'CIF' | 'CPT' | 'CIP' | 'DAP' | 'DPU' | 'DDP'

// Database Interfaces
export interface ExportCustomer {
    id: string
    customer_code: string
    company_name: string
    country: string
    address_line1: string
    address_line2: string | null
    city: string
    state: string | null
    postal_code: string
    contact_person: string
    email: string
    phone: string
    website: string | null
    gst_number: string | null
    tax_id: string | null
    payment_terms: string
    incoterm: Incoterm
    is_active: boolean
    notes: string | null
    created_at: string
    updated_at: string
}

export interface ExportOrder {
    id: string
    order_number: string
    customer_id: string
    order_date: string
    buyer_po_number: string | null
    buyer_po_date: string | null
    incoterm: Incoterm
    port_of_loading: string
    port_of_destination: string
    country_of_destination: string
    shipment_mode: ShipmentMode
    expected_shipment_date: string | null
    delivery_deadline: string | null
    exchange_rate: number
    total_amount_usd: number
    total_amount_inr: number
    lut_arn: string | null
    lut_date: string | null
    status: ExportOrderStatus
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    customer?: ExportCustomer
    items?: ExportOrderItem[]
    documents?: ExportDocument[]
    shipment?: ExportShipment
    invoice?: ExportInvoice
    packing_list?: ExportPackingList
    payments?: ExportPayment[]
}

export interface ExportOrderItem {
    id: string
    export_order_id: string
    product_name: string
    product_code: string
    hsn_code: string
    quantity: number
    unit_of_measure: string
    rate_usd: number
    amount_usd: number
    packages: number | null
    net_weight_kg: number | null
    gross_weight_kg: number | null
    length_cm: number | null
    width_cm: number | null
    height_cm: number | null
    cbm: number | null
    created_at: string
    updated_at: string
}

export interface ExportInvoice {
    id: string
    invoice_number: string
    export_order_id: string | null
    customer_id: string
    invoice_date: string
    exchange_rate: number
    amount_usd: number
    amount_inr: number
    lut_arn: string | null
    lut_date: string | null
    shipping_bill_number: string | null
    shipping_bill_date: string | null
    port_code: string | null
    bank_name: string | null
    bank_account_number: string | null
    bank_ifsc: string | null
    bank_swift: string | null
    bank_ad_code: string | null
    payment_terms: string | null
    notes: string | null
    status: InvoiceStatus
    created_by: string | null
    created_at: string
    updated_at: string
    customer?: ExportCustomer
    order?: ExportOrder
    items?: ExportOrderItem[]
    payments?: ExportPayment[]
}

export interface ExportPackingList {
    id: string
    packing_list_number: string
    export_order_id: string
    packing_date: string
    package_type: string
    total_packages: number
    total_net_weight_kg: number
    total_gross_weight_kg: number
    total_cbm: number
    container_number: string | null
    container_size: ContainerSize | null
    seal_number: string | null
    awb_number: string | null
    pieces: number | null
    chargeable_weight: number | null
    marks_and_numbers: string | null
    status: PackingStatus
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    order?: ExportOrder
    items?: ExportPackingListItem[]
}

export interface ExportPackingListItem {
    id: string
    packing_list_id: string
    product_name: string
    product_code: string
    quantity: number
    packages: number
    net_weight_kg: number
    gross_weight_kg: number
    length_cm: number
    width_cm: number
    height_cm: number
    cbm: number
    created_at: string
}

export interface ExportShipment {
    id: string
    shipment_number: string
    export_order_id: string
    shipment_mode: ShipmentMode
    shipping_line: string | null
    airline: string | null
    vessel_name: string | null
    voyage_number: string | null
    flight_number: string | null
    container_number: string | null
    container_size: ContainerSize | null
    bl_number: string | null
    bl_type: BLType | null
    awb_number: string | null
    forwarder_name: string | null
    forwarder_contact: string | null
    port_of_loading: string
    port_of_destination: string
    etd: string | null
    eta: string | null
    actual_departure: string | null
    actual_arrival: string | null
    status: ShipmentStatus
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    order?: ExportOrder
    customer?: ExportCustomer
}

export interface ExportDocument {
    id: string
    export_order_id: string
    document_type: string
    document_name: string
    status: DocumentStatus
    reference_number: string | null
    issue_date: string | null
    expiry_date: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export interface ExportPayment {
    id: string
    payment_number: string
    export_order_id: string | null
    export_invoice_id: string | null
    customer_id: string
    payment_date: string
    expected_amount_usd: number
    received_amount_usd: number
    bank_realization_rate: number
    realized_amount_inr: number
    forex_gain_loss: number
    bank_reference: string | null
    receiving_bank: string | null
    payment_method: string | null
    status: PaymentStatus
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    customer?: ExportCustomer
    order?: ExportOrder
    invoice?: ExportInvoice
}

export interface PortLookup {
    id: string
    port_code: string
    port_name: string
    country: string
    is_indian: boolean
    created_at: string
}

// Dashboard Types
export interface ExportDashboardStats {
    totalRevenueUSD: number
    totalRevenueINR: number
    activeOrdersCount: number
    shipmentsInTransitCount: number
    pendingPaymentsAmount: number
    overduePaymentsAmount: number
    netForexGainLoss: number
    documentsReadyCount: number
    documentsTotalCount: number
}

export interface TopExportBuyer {
    customer_id: string
    company_name: string
    country: string
    total_orders: number
    total_revenue_usd: number
}

export interface MonthlyExportTrend {
    month: string
    revenue_usd: number
    order_count: number
}

export interface OrderStatusCount {
    status: ExportOrderStatus
    count: number
}

export interface ShipmentInTransit {
    id: string
    shipment_number: string
    order_number: string
    customer_name: string
    shipment_mode: ShipmentMode
    vessel_or_flight: string
    etd: string | null
    eta: string | null
    status: ShipmentStatus
}

export interface PendingDocument {
    order_number: string
    document_name: string
    status: DocumentStatus
}

// Form Data Types (Omit id, timestamps, computed fields)
export type ExportCustomerFormData = Omit<ExportCustomer, 'id' | 'created_at' | 'updated_at'>

export type ExportOrderFormData = Omit<ExportOrder, 'id' | 'order_number' | 'total_amount_inr' | 'created_at' | 'updated_at' | 'customer' | 'items' | 'documents' | 'shipment' | 'invoice' | 'packing_list' | 'payments'>

export type ExportOrderItemFormData = Omit<ExportOrderItem, 'id' | 'export_order_id' | 'created_at' | 'updated_at'>

export type ExportInvoiceFormData = Omit<ExportInvoice, 'id' | 'invoice_number' | 'amount_inr' | 'created_at' | 'updated_at' | 'customer' | 'order' | 'items' | 'payments'>

export type ExportPackingListFormData = Omit<ExportPackingList, 'id' | 'packing_list_number' | 'created_at' | 'updated_at' | 'order' | 'items'>

export type ExportPackingListItemFormData = Omit<ExportPackingListItem, 'id' | 'packing_list_id' | 'created_at'>

export type ExportShipmentFormData = Omit<ExportShipment, 'id' | 'shipment_number' | 'created_at' | 'updated_at' | 'order' | 'customer'>

export type ExportPaymentFormData = Omit<ExportPayment, 'id' | 'payment_number' | 'realized_amount_inr' | 'forex_gain_loss' | 'created_at' | 'updated_at' | 'customer' | 'order' | 'invoice'>

// Filter Types
export interface ExportOrderFilters {
    status?: ExportOrderStatus | 'ALL'
    customer_id?: string
    date_range?: {
        start: string
        end: string
    }
    search?: string
}

export interface ExportInvoiceFilters {
    status?: InvoiceStatus | 'ALL'
    customer_id?: string
    date_range?: {
        start: string
        end: string
    }
    search?: string
}

export interface ExportPaymentFilters {
    status?: PaymentStatus | 'ALL'
    customer_id?: string
    date_range?: {
        start: string
        end: string
    }
    search?: string
}

export interface ExportShipmentFilters {
    status?: ShipmentStatus | 'ALL'
    shipment_mode?: ShipmentMode | 'ALL'
    date_range?: {
        start: string
        end: string
    }
    search?: string
}

// Constants
export const INCOTERMS = [
    { value: 'EXW', label: 'EXW', description: 'Ex Works - Seller delivers goods at their premises' },
    { value: 'FCA', label: 'FCA', description: 'Free Carrier - Seller delivers to carrier nominated by buyer' },
    { value: 'FAS', label: 'FAS', description: 'Free Alongside Ship - Seller delivers alongside vessel' },
    { value: 'FOB', label: 'FOB', description: 'Free On Board - Seller delivers goods on board vessel' },
    { value: 'CFR', label: 'CFR', description: 'Cost and Freight - Seller pays cost and freight' },
    { value: 'CIF', label: 'CIF', description: 'Cost, Insurance and Freight - Seller pays cost, insurance, freight' },
    { value: 'CPT', label: 'CPT', description: 'Carriage Paid To - Seller pays carriage to destination' },
    { value: 'CIP', label: 'CIP', description: 'Carriage and Insurance Paid To - Seller pays carriage and insurance' },
    { value: 'DAP', label: 'DAP', description: 'Delivered at Place - Seller delivers at named place' },
    { value: 'DPU', label: 'DPU', description: 'Delivered at Place Unloaded - Seller delivers and unloads' },
    { value: 'DDP', label: 'DDP', description: 'Delivered Duty Paid - Seller delivers with import clearance' },
] as const

export const EXPORT_ORDER_STATUSES = [
    { value: 'DRAFT', label: 'Draft', color: 'gray' },
    { value: 'CONFIRMED', label: 'Confirmed', color: 'blue' },
    { value: 'IN_PRODUCTION', label: 'In Production', color: 'yellow' },
    { value: 'READY_TO_SHIP', label: 'Ready to Ship', color: 'orange' },
    { value: 'SHIPPED', label: 'Shipped', color: 'purple' },
    { value: 'DELIVERED', label: 'Delivered', color: 'green' },
    { value: 'CANCELLED', label: 'Cancelled', color: 'red' },
] as const

export const SHIPMENT_STATUSES = [
    { value: 'BOOKING_CONFIRMED', label: 'Booking Confirmed', color: 'blue' },
    { value: 'CUSTOMS_CLEARED', label: 'Customs Cleared', color: 'yellow' },
    { value: 'LOADED', label: 'Loaded', color: 'orange' },
    { value: 'IN_TRANSIT', label: 'In Transit', color: 'purple' },
    { value: 'ARRIVED', label: 'Arrived', color: 'blue' },
    { value: 'DELIVERED', label: 'Delivered', color: 'green' },
    { value: 'CANCELLED', label: 'Cancelled', color: 'red' },
] as const

export const DOCUMENT_STATUSES = [
    { value: 'NOT_STARTED', label: 'Not Started', color: 'gray' },
    { value: 'IN_PROGRESS', label: 'In Progress', color: 'yellow' },
    { value: 'READY', label: 'Ready', color: 'blue' },
    { value: 'SUBMITTED', label: 'Submitted', color: 'green' },
    { value: 'NOT_REQUIRED', label: 'Not Required', color: 'gray' },
] as const

export const DEFAULT_DOCUMENT_CHECKLIST = [
    { document_type: 'COMMERCIAL_INVOICE', document_name: 'Commercial Invoice', status: 'NOT_STARTED' as DocumentStatus },
    { document_type: 'PACKING_LIST', document_name: 'Packing List', status: 'NOT_STARTED' as DocumentStatus },
    { document_type: 'BILL_OF_LADING', document_name: 'Bill of Lading', status: 'NOT_STARTED' as DocumentStatus },
    { document_type: 'CERTIFICATE_OF_ORIGIN', document_name: 'Certificate of Origin', status: 'NOT_STARTED' as DocumentStatus },
    { document_type: 'SHIPPING_BILL', document_name: 'Shipping Bill', status: 'NOT_STARTED' as DocumentStatus },
    { document_type: 'INSURANCE_CERTIFICATE', document_name: 'Insurance Certificate', status: 'NOT_STARTED' as DocumentStatus },
    { document_type: 'INSPECTION_REPORT', document_name: 'Inspection Report', status: 'NOT_STARTED' as DocumentStatus },
    { document_type: 'PHYTOSANITARY_CERTIFICATE', document_name: 'Phytosanitary Certificate', status: 'NOT_STARTED' as DocumentStatus },
    { document_type: 'BANK_REALIZATION_CERTIFICATE', document_name: 'Bank Realization Certificate', status: 'NOT_STARTED' as DocumentStatus },
] as const

export const UNITS_OF_MEASURE = [
    { value: 'KG', label: 'Kilograms' },
    { value: 'MT', label: 'Metric Tons' },
    { value: 'PCS', label: 'Pieces' },
    { value: 'LTRS', label: 'Liters' },
    { value: 'NOS', label: 'Numbers' },
    { value: 'MTRS', label: 'Meters' },
    { value: 'SQMTRS', label: 'Square Meters' },
    { value: 'CBM', label: 'Cubic Meters' },
] as const

export const PACKAGE_TYPES = [
    { value: 'CARTONS', label: 'Cartons' },
    { value: 'PALLETS', label: 'Pallets' },
    { value: 'DRUMS', label: 'Drums' },
    { value: 'BAGS', label: 'Bags' },
    { value: 'CRATES', label: 'Crates' },
    { value: 'BOXES', label: 'Boxes' },
    { value: 'BUNDLES', label: 'Bundles' },
    { value: 'LOOSE', label: 'Loose' },
] as const

export const CONTAINER_SIZES = [
    { value: '20FT', label: '20 Feet', cbm: 33 },
    { value: '40FT', label: '40 Feet', cbm: 67 },
    { value: '40HQ', label: '40 Feet High Cube', cbm: 76 },
    { value: 'LCL', label: 'Less than Container Load', cbm: 0 },
] as const

export const BL_TYPES = [
    { value: 'ORIGINAL', label: 'Original' },
    { value: 'SURRENDER', label: 'Surrender' },
    { value: 'SEAWAY_BILL', label: 'Seaway Bill' },
] as const
