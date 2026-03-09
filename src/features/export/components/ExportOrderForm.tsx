import { useState, useEffect } from 'react'
import { Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import {
    INCOTERMS,
    UNITS_OF_MEASURE,
    type ExportCustomer,
    type ExportOrderFormData,
    type ExportOrderItemFormData,
    type PortLookup,
} from '../types/export.types'
import { getExportCustomers } from '../services/exportService'
import { getPorts } from '../services/exportService'
import { formatUSD, formatINR } from '@/lib/utils'

interface ExportOrderFormProps {
    initialData?: Partial<ExportOrderFormData> & { items?: ExportOrderItemFormData[] }
    onSubmit: (data: ExportOrderFormData, items: ExportOrderItemFormData[]) => Promise<void>
    onCancel: () => void
    isLoading?: boolean
}

const EMPTY_ITEM: ExportOrderItemFormData = {
    product_name: '',
    product_code: '',
    hsn_code: '',
    quantity: 0,
    unit_of_measure: 'KG',
    rate_usd: 0,
    amount_usd: 0,
    packages: null,
    net_weight_kg: null,
    gross_weight_kg: null,
    length_cm: null,
    width_cm: null,
    height_cm: null,
    cbm: null,
}

export function ExportOrderForm({
    initialData,
    onSubmit,
    onCancel,
    isLoading = false,
}: ExportOrderFormProps) {
    const [customers, setCustomers] = useState<ExportCustomer[]>([])
    const [indianPorts, setIndianPorts] = useState<PortLookup[]>([])
    const [allPorts, setAllPorts] = useState<PortLookup[]>([])
    const [formData, setFormData] = useState<ExportOrderFormData>({
        customer_id: '',
        order_date: new Date().toISOString().split('T')[0],
        buyer_po_number: null,
        buyer_po_date: null,
        incoterm: 'FOB',
        port_of_loading: '',
        port_of_destination: '',
        country_of_destination: '',
        shipment_mode: 'SEA',
        expected_shipment_date: null,
        delivery_deadline: null,
        exchange_rate: 83,
        total_amount_usd: 0,
        lut_arn: null,
        lut_date: null,
        status: 'DRAFT',
        notes: null,
        created_by: null,
    })
    const [items, setItems] = useState<ExportOrderItemFormData[]>([{ ...EMPTY_ITEM }])

    useEffect(() => {
        getExportCustomers({ is_active: true }).then(setCustomers)
        getPorts(true).then(setIndianPorts)
        getPorts(false).then(setAllPorts)
    }, [])

    useEffect(() => {
        if (initialData) {
            setFormData((prev) => ({
                ...prev,
                ...initialData,
                total_amount_usd: prev.total_amount_usd,
            }))
            if (initialData.items && initialData.items.length > 0) {
                setItems(initialData.items)
            }
        }
    }, [initialData])

    const updateForm = (field: keyof ExportOrderFormData, value: unknown) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const updateItem = (index: number, field: keyof ExportOrderItemFormData, value: unknown) => {
        setItems((prev) => {
            const next = [...prev]
            const item = { ...next[index], [field]: value }
            if (field === 'quantity' || field === 'rate_usd') {
                item.amount_usd = (Number(item.quantity) || 0) * (Number(item.rate_usd) || 0)
            }
            next[index] = item
            return next
        })
    }

    const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }])
    const removeItem = (index: number) => {
        if (items.length <= 1) return
        setItems((prev) => prev.filter((_, i) => i !== index))
    }

    const totalUsd = items.reduce((sum, i) => sum + (i.amount_usd || 0), 0)
    const totalInr = totalUsd * (formData.exchange_rate || 0)

    const handleSubmit = async () => {
        if (!formData.customer_id) return
        const validItems = items.filter((i) => i.product_name && i.quantity > 0 && i.rate_usd > 0)
        if (validItems.length === 0) return
        await onSubmit(
            { ...formData, total_amount_usd: totalUsd },
            validItems.map((i) => ({ ...i, amount_usd: i.quantity * i.rate_usd }))
        )
    }

    const customerOptions = customers.map((c) => ({ value: c.id, label: `${c.company_name} (${c.country})` }))
    const incotermOptions = INCOTERMS.map((i) => ({ value: i.value, label: `${i.value} - ${i.description}` }))
    const unitOptions = UNITS_OF_MEASURE.map((u) => ({ value: u.value, label: u.label }))
    const indianPortOptions = indianPorts.map((p) => ({ value: p.port_code, label: `${p.port_name} (${p.port_code})` }))
    const destPortOptions = allPorts.map((p) => ({ value: p.port_code, label: `${p.port_name}, ${p.country}` }))

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                    label="Customer *"
                    value={formData.customer_id}
                    onChange={(e) => updateForm('customer_id', e.target.value)}
                    options={[{ value: '', label: 'Select customer' }, ...customerOptions]}
                />
                <Input
                    label="Order Date"
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => updateForm('order_date', e.target.value)}
                />
                <Input
                    label="Buyer PO Number"
                    value={formData.buyer_po_number || ''}
                    onChange={(e) => updateForm('buyer_po_number', e.target.value || null)}
                />
                <Input
                    label="Buyer PO Date"
                    type="date"
                    value={formData.buyer_po_date || ''}
                    onChange={(e) => updateForm('buyer_po_date', e.target.value || null)}
                />
                <Select
                    label="Incoterm"
                    value={formData.incoterm}
                    onChange={(e) => updateForm('incoterm', e.target.value)}
                    options={incotermOptions}
                />
                <div className="flex gap-2 items-end">
                    <span className="text-sm font-medium text-gray-500 dark:text-dark-500">Shipment Mode</span>
                    <div className="flex rounded-lg border border-gray-200 dark:border-dark-300 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => updateForm('shipment_mode', 'SEA')}
                            className={`px-4 py-2 text-sm font-medium ${formData.shipment_mode === 'SEA' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-dark-500'}`}
                        >
                            🚢 Sea
                        </button>
                        <button
                            type="button"
                            onClick={() => updateForm('shipment_mode', 'AIR')}
                            className={`px-4 py-2 text-sm font-medium ${formData.shipment_mode === 'AIR' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-dark-500'}`}
                        >
                            ✈️ Air
                        </button>
                    </div>
                </div>
                <Select
                    label="Port of Loading"
                    value={formData.port_of_loading}
                    onChange={(e) => updateForm('port_of_loading', e.target.value)}
                    options={[{ value: '', label: 'Select port' }, ...indianPortOptions]}
                />
                <Select
                    label="Port of Destination"
                    value={formData.port_of_destination}
                    onChange={(e) => updateForm('port_of_destination', e.target.value)}
                    options={[{ value: '', label: 'Select port' }, ...destPortOptions]}
                />
                <Input
                    label="Country of Destination"
                    value={formData.country_of_destination}
                    onChange={(e) => updateForm('country_of_destination', e.target.value)}
                />
                <Input
                    label="Expected Shipment Date"
                    type="date"
                    value={formData.expected_shipment_date || ''}
                    onChange={(e) => updateForm('expected_shipment_date', e.target.value || null)}
                />
                <Input
                    label="Delivery Deadline"
                    type="date"
                    value={formData.delivery_deadline || ''}
                    onChange={(e) => updateForm('delivery_deadline', e.target.value || null)}
                />
                <Input
                    label="Exchange Rate (₹/USD)"
                    type="number"
                    step="0.0001"
                    value={formData.exchange_rate}
                    onChange={(e) => updateForm('exchange_rate', Number(e.target.value) || 83)}
                />
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
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Order Items</h3>
                    <Button size="sm" variant="secondary" onClick={addItem} icon={<Plus size={14} />}>
                        Add Row
                    </Button>
                </div>
                <div className="border border-gray-200 dark:border-dark-300 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-dark-200">
                                <th className="px-3 py-2 text-left">Product</th>
                                <th className="px-3 py-2 text-left">Code</th>
                                <th className="px-3 py-2 text-left">HSN</th>
                                <th className="px-3 py-2 text-left">Qty</th>
                                <th className="px-3 py-2 text-left">Unit</th>
                                <th className="px-3 py-2 text-left">Rate USD</th>
                                <th className="px-3 py-2 text-left">Amount USD</th>
                                <th className="w-10" />
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={idx} className="border-t border-gray-200 dark:border-dark-300">
                                    <td className="px-3 py-2">
                                        <input
                                            className="w-full bg-transparent border-0 px-2 py-1 text-gray-900 dark:text-white"
                                            value={item.product_name}
                                            onChange={(e) => updateItem(idx, 'product_name', e.target.value)}
                                            placeholder="Product name"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            className="w-full bg-transparent border-0 px-2 py-1 text-gray-900 dark:text-white"
                                            value={item.product_code}
                                            onChange={(e) => updateItem(idx, 'product_code', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            className="w-20 bg-transparent border-0 px-2 py-1 text-gray-900 dark:text-white"
                                            value={item.hsn_code}
                                            onChange={(e) => updateItem(idx, 'hsn_code', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            className="w-16 bg-transparent border-0 px-2 py-1 text-gray-900 dark:text-white"
                                            value={item.quantity || ''}
                                            onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <select
                                            className="bg-transparent border-0 text-gray-900 dark:text-white"
                                            value={item.unit_of_measure}
                                            onChange={(e) => updateItem(idx, 'unit_of_measure', e.target.value)}
                                        >
                                            {unitOptions.map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-20 bg-transparent border-0 px-2 py-1 text-gray-900 dark:text-white"
                                            value={item.rate_usd || ''}
                                            onChange={(e) => updateItem(idx, 'rate_usd', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="px-3 py-2 font-mono">
                                        {formatUSD(item.quantity * item.rate_usd)}
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(idx)}
                                            className="p-1 text-gray-500 hover:text-red-400"
                                        >
                                            <Minus size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end gap-4 mt-3 p-3 bg-gray-100 dark:bg-dark-200 rounded-lg">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        Total USD: {formatUSD(totalUsd)}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        Total INR: {formatINR(totalInr)}
                    </span>
                </div>
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
