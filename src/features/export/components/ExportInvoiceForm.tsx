import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import {
    type ExportOrder,
    type ExportInvoiceFormData,
} from '../types/export.types'
import { getExportOrders, getExportOrderById } from '../services/exportService'
import { formatUSD, formatINR } from '@/lib/utils'

interface ExportInvoiceFormProps {
    orderId?: string
    initialData?: Partial<ExportInvoiceFormData>
    onSubmit: (data: ExportInvoiceFormData) => Promise<void>
    onCancel: () => void
    isLoading?: boolean
}

export function ExportInvoiceForm({
    orderId,
    initialData,
    onSubmit,
    onCancel,
    isLoading = false,
}: ExportInvoiceFormProps) {
    const [orders, setOrders] = useState<ExportOrder[]>([])
    const [formData, setFormData] = useState<ExportInvoiceFormData>({
        export_order_id: null,
        customer_id: '',
        invoice_date: new Date().toISOString().split('T')[0],
        exchange_rate: 83,
        amount_usd: 0,
        lut_arn: null,
        lut_date: null,
        shipping_bill_number: null,
        shipping_bill_date: null,
        port_code: null,
        bank_name: null,
        bank_account_number: null,
        bank_ifsc: null,
        bank_swift: null,
        bank_ad_code: null,
        payment_terms: null,
        notes: null,
        status: 'DRAFT',
        created_by: null,
    })

    useEffect(() => {
        getExportOrders().then(setOrders)
    }, [])

    useEffect(() => {
        if (orderId) {
            getExportOrderById(orderId).then((order) => {
                if (order) {
                    setFormData((prev) => ({
                        ...prev,
                        export_order_id: order.id,
                        customer_id: order.customer_id,
                        exchange_rate: order.exchange_rate,
                        amount_usd: order.total_amount_usd,
                        lut_arn: order.lut_arn,
                        lut_date: order.lut_date,
                    }))
                }
            })
        }
    }, [orderId])

    useEffect(() => {
        if (initialData) {
            setFormData((prev) => ({ ...prev, ...initialData }))
        }
    }, [initialData])

    const amountInr = formData.amount_usd * (formData.exchange_rate || 0)

    const updateForm = (field: keyof ExportInvoiceFormData, value: unknown) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleOrderSelect = (id: string) => {
        const order = orders.find((o) => o.id === id)
        if (order) {
            setFormData((prev) => ({
                ...prev,
                export_order_id: order.id,
                customer_id: order.customer_id,
                exchange_rate: order.exchange_rate,
                amount_usd: order.total_amount_usd,
                lut_arn: order.lut_arn,
                lut_date: order.lut_date,
            }))
        }
    }

    const handleSubmit = async () => {
        if (!formData.customer_id || formData.amount_usd <= 0) return
        await onSubmit(formData)
    }

    const orderOptions = orders
        .filter((o) => !['CANCELLED', 'DRAFT'].includes(o.status))
        .map((o) => ({ value: o.id, label: `${o.order_number} - ${(o.customer as { company_name?: string })?.company_name || 'Customer'}` }))

    return (
        <div className="space-y-6">
            <Select
                label="Export Order (optional)"
                value={formData.export_order_id || ''}
                onChange={(e) => handleOrderSelect(e.target.value)}
                options={[{ value: '', label: 'Standalone invoice' }, ...orderOptions]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                    label="Invoice Date"
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => updateForm('invoice_date', e.target.value)}
                />
                <Input
                    label="Exchange Rate (₹/USD)"
                    type="number"
                    step="0.0001"
                    value={formData.exchange_rate}
                    onChange={(e) => updateForm('exchange_rate', Number(e.target.value) || 83)}
                />
                <Input
                    label="Amount USD"
                    type="number"
                    step="0.01"
                    value={formData.amount_usd}
                    onChange={(e) => updateForm('amount_usd', Number(e.target.value))}
                />
                <div className="pt-6">
                    <p className="text-sm text-gray-500 dark:text-dark-500">Amount INR (auto)</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatINR(amountInr)}</p>
                </div>
                <Input
                    label="LUT ARN"
                    value={formData.lut_arn || ''}
                    onChange={(e) => updateForm('lut_arn', e.target.value || null)}
                />
                <Input
                    label="LUT Date"
                    type="date"
                    value={formData.lut_date || ''}
                    onChange={(e) => updateForm('lut_date', e.target.value || null)}
                />
                <Input
                    label="Shipping Bill Number"
                    value={formData.shipping_bill_number || ''}
                    onChange={(e) => updateForm('shipping_bill_number', e.target.value || null)}
                />
                <Input
                    label="Shipping Bill Date"
                    type="date"
                    value={formData.shipping_bill_date || ''}
                    onChange={(e) => updateForm('shipping_bill_date', e.target.value || null)}
                />
                <Input
                    label="Port Code"
                    value={formData.port_code || ''}
                    onChange={(e) => updateForm('port_code', e.target.value || null)}
                />
                <Input
                    label="Payment Terms"
                    value={formData.payment_terms || ''}
                    onChange={(e) => updateForm('payment_terms', e.target.value || null)}
                />
            </div>

            <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Bank Details (for TT)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Bank Name"
                        value={formData.bank_name || ''}
                        onChange={(e) => updateForm('bank_name', e.target.value || null)}
                    />
                    <Input
                        label="Account Number"
                        value={formData.bank_account_number || ''}
                        onChange={(e) => updateForm('bank_account_number', e.target.value || null)}
                    />
                    <Input
                        label="IFSC"
                        value={formData.bank_ifsc || ''}
                        onChange={(e) => updateForm('bank_ifsc', e.target.value || null)}
                    />
                    <Input
                        label="SWIFT"
                        value={formData.bank_swift || ''}
                        onChange={(e) => updateForm('bank_swift', e.target.value || null)}
                    />
                    <Input
                        label="AD Code"
                        value={formData.bank_ad_code || ''}
                        onChange={(e) => updateForm('bank_ad_code', e.target.value || null)}
                    />
                </div>
            </div>

            <div className="rounded-lg bg-gray-100 dark:bg-dark-200 p-3 text-xs text-gray-600 dark:text-dark-500">
                <p className="font-medium text-gray-900 dark:text-white mb-1">Invoice Footer (LUT Declaration)</p>
                <p>
                    Supply meant for export under LUT without payment of IGST.
                    {formData.lut_arn && ` LUT ARN: ${formData.lut_arn}`}
                    {formData.lut_date && ` dated ${new Date(formData.lut_date).toLocaleDateString('en-IN')}`}
                </p>
            </div>

            <Textarea
                label="Notes"
                value={formData.notes || ''}
                onChange={(e) => updateForm('notes', e.target.value || null)}
                rows={2}
            />

            <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" onClick={onCancel}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit} isLoading={isLoading}>
                    Save
                </Button>
            </div>
        </div>
    )
}
