import { useState, useEffect } from 'react'
import { Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import {
    PACKAGE_TYPES,
    CONTAINER_SIZES,
    type ExportOrder,
    type ExportPackingListFormData,
    type ExportPackingListItemFormData,
} from '../types/export.types'
import { getExportOrders, getExportOrderById } from '../services/exportService'

interface PackingListFormProps {
    orderId?: string
    initialData?: Partial<ExportPackingListFormData>
    onSubmit: (data: ExportPackingListFormData, items: ExportPackingListItemFormData[]) => Promise<void>
    onCancel: () => void
    isLoading?: boolean
}

const EMPTY_ITEM: ExportPackingListItemFormData = {
    product_name: '',
    product_code: '',
    quantity: 0,
    packages: 0,
    net_weight_kg: 0,
    gross_weight_kg: 0,
    length_cm: 0,
    width_cm: 0,
    height_cm: 0,
    cbm: 0,
}

function calcCbm(l: number, w: number, h: number): number {
    return Math.round((l * w * h) / 1000000 * 1000) / 1000
}

export function PackingListForm({
    orderId,
    initialData,
    onSubmit,
    onCancel,
    isLoading = false,
}: PackingListFormProps) {
    const [orders, setOrders] = useState<ExportOrder[]>([])
    const [selectedOrder, setSelectedOrder] = useState<ExportOrder | null>(null)
    const [formData, setFormData] = useState<Partial<ExportPackingListFormData>>({
        export_order_id: '',
        packing_date: new Date().toISOString().split('T')[0],
        package_type: 'CARTONS',
        marks_and_numbers: null,
        status: 'DRAFT',
        notes: null,
        created_by: null,
    })
    const [items, setItems] = useState<ExportPackingListItemFormData[]>([{ ...EMPTY_ITEM }])

    useEffect(() => {
        getExportOrders().then(setOrders)
    }, [])

    useEffect(() => {
        if (orderId) {
            getExportOrderById(orderId).then((order) => {
                setSelectedOrder(order ?? null)
                if (order) {
                    setFormData((prev) => ({ ...prev, export_order_id: order.id }))
                    if (order.items && order.items.length > 0) {
                        setItems(
                            order.items.map((i) => ({
                                product_name: i.product_name,
                                product_code: i.product_code,
                                quantity: i.quantity,
                                packages: 0,
                                net_weight_kg: 0,
                                gross_weight_kg: 0,
                                length_cm: 0,
                                width_cm: 0,
                                height_cm: 0,
                                cbm: 0,
                            }))
                        )
                    }
                }
            })
        }
    }, [orderId])

    useEffect(() => {
        if (initialData) {
            setFormData((prev) => ({ ...prev, ...initialData }))
        }
    }, [initialData])

    const isSea = selectedOrder?.shipment_mode === 'SEA'

    const updateForm = (field: keyof ExportPackingListFormData, value: unknown) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const updateItem = (index: number, field: keyof ExportPackingListItemFormData, value: unknown) => {
        setItems((prev) => {
            const next = [...prev]
            const item = { ...next[index], [field]: value }
            if (['length_cm', 'width_cm', 'height_cm'].includes(field)) {
                item.cbm = calcCbm(
                    Number(item.length_cm) || 0,
                    Number(item.width_cm) || 0,
                    Number(item.height_cm) || 0
                )
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

    const totalPackages = items.reduce((s, i) => s + (i.packages || 0), 0)
    const totalNetWt = items.reduce((s, i) => s + (i.net_weight_kg || 0), 0)
    const totalGrossWt = items.reduce((s, i) => s + (i.gross_weight_kg || 0), 0)
    const totalCbm = items.reduce((s, i) => s + (i.cbm || 0), 0)

    const handleSubmit = async () => {
        if (!formData.export_order_id) return
        const validItems = items.filter((i) => i.product_name && i.quantity > 0)
        if (validItems.length === 0) return
        const submitData: ExportPackingListFormData = {
            ...formData,
            export_order_id: formData.export_order_id!,
            packing_date: formData.packing_date!,
            package_type: formData.package_type!,
            total_packages: totalPackages,
            total_net_weight_kg: totalNetWt,
            total_gross_weight_kg: totalGrossWt,
            total_cbm: totalCbm,
        } as ExportPackingListFormData
        await onSubmit(submitData, validItems)
    }

    const orderOptions = orders
        .filter((o) => !['CANCELLED'].includes(o.status))
        .map((o) => ({
            value: o.id,
            label: `${o.order_number} - ${(o.customer as { company_name?: string })?.company_name || 'Customer'}`,
        }))
    const packageOptions = PACKAGE_TYPES.map((p) => ({ value: p.value, label: p.label }))
    const containerOptions = CONTAINER_SIZES.map((c) => ({ value: c.value, label: c.label }))

    return (
        <div className="space-y-6">
            <Select
                label="Export Order *"
                value={formData.export_order_id}
                onChange={(e) => {
                    const o = orders.find((x) => x.id === e.target.value)
                    setSelectedOrder(o ?? null)
                    updateForm('export_order_id', e.target.value)
                    if (o?.items?.length) {
                        setItems(
                            o.items.map((i) => ({
                                product_name: i.product_name,
                                product_code: i.product_code,
                                quantity: i.quantity,
                                packages: 0,
                                net_weight_kg: 0,
                                gross_weight_kg: 0,
                                length_cm: 0,
                                width_cm: 0,
                                height_cm: 0,
                                cbm: 0,
                            }))
                        )
                    }
                }}
                options={[{ value: '', label: 'Select order' }, ...orderOptions]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                    label="Packing Date"
                    type="date"
                    value={formData.packing_date}
                    onChange={(e) => updateForm('packing_date', e.target.value)}
                />
                <Select
                    label="Package Type"
                    value={formData.package_type}
                    onChange={(e) => updateForm('package_type', e.target.value)}
                    options={packageOptions}
                />
                {isSea && (
                    <>
                        <Input
                            label="Container Number"
                            value={formData.container_number || ''}
                            onChange={(e) => updateForm('container_number', e.target.value || null)}
                        />
                        <Select
                            label="Container Size"
                            value={formData.container_size || ''}
                            onChange={(e) => updateForm('container_size', e.target.value || null)}
                            options={[{ value: '', label: 'Select' }, ...containerOptions]}
                        />
                        <Input
                            label="Seal Number"
                            value={formData.seal_number || ''}
                            onChange={(e) => updateForm('seal_number', e.target.value || null)}
                        />
                    </>
                )}
                {!isSea && (
                    <>
                        <Input
                            label="AWB Number"
                            value={formData.awb_number || ''}
                            onChange={(e) => updateForm('awb_number', e.target.value || null)}
                        />
                        <Input
                            label="Pieces"
                            type="number"
                            value={formData.pieces || ''}
                            onChange={(e) => updateForm('pieces', Number(e.target.value) || null)}
                        />
                        <Input
                            label="Chargeable Weight (KG)"
                            type="number"
                            value={formData.chargeable_weight || ''}
                            onChange={(e) => updateForm('chargeable_weight', Number(e.target.value) || null)}
                        />
                    </>
                )}
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Items</h3>
                    <Button size="sm" variant="secondary" onClick={addItem} icon={<Plus size={14} />}>
                        Add Row
                    </Button>
                </div>
                <div className="border border-gray-200 dark:border-dark-300 rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-dark-200">
                                <th className="px-3 py-2 text-left">Product</th>
                                <th className="px-3 py-2 text-left">Qty</th>
                                <th className="px-3 py-2 text-left">Packages</th>
                                <th className="px-3 py-2 text-left">Net Wt</th>
                                <th className="px-3 py-2 text-left">Gross Wt</th>
                                <th className="px-3 py-2 text-left">L×W×H cm</th>
                                <th className="px-3 py-2 text-left">CBM</th>
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
                                        <input
                                            type="number"
                                            className="w-16 bg-transparent border-0 px-2 py-1 text-gray-900 dark:text-white"
                                            value={item.packages || ''}
                                            onChange={(e) => updateItem(idx, 'packages', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            className="w-16 bg-transparent border-0 px-2 py-1 text-gray-900 dark:text-white"
                                            value={item.net_weight_kg || ''}
                                            onChange={(e) => updateItem(idx, 'net_weight_kg', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            className="w-16 bg-transparent border-0 px-2 py-1 text-gray-900 dark:text-white"
                                            value={item.gross_weight_kg || ''}
                                            onChange={(e) => updateItem(idx, 'gross_weight_kg', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            placeholder="L"
                                            className="w-12 bg-transparent border-0 px-1 py-1 text-gray-900 dark:text-white"
                                            value={item.length_cm || ''}
                                            onChange={(e) => updateItem(idx, 'length_cm', Number(e.target.value))}
                                        />
                                        ×
                                        <input
                                            type="number"
                                            placeholder="W"
                                            className="w-12 bg-transparent border-0 px-1 py-1 text-gray-900 dark:text-white"
                                            value={item.width_cm || ''}
                                            onChange={(e) => updateItem(idx, 'width_cm', Number(e.target.value))}
                                        />
                                        ×
                                        <input
                                            type="number"
                                            placeholder="H"
                                            className="w-12 bg-transparent border-0 px-1 py-1 text-gray-900 dark:text-white"
                                            value={item.height_cm || ''}
                                            onChange={(e) => updateItem(idx, 'height_cm', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="px-3 py-2 font-mono">{item.cbm?.toFixed(3) ?? '0'}</td>
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
                <div className="flex gap-6 mt-3 p-3 bg-gray-100 dark:bg-dark-200 rounded-lg text-sm">
                    <span>Total Packages: {totalPackages}</span>
                    <span>Total Net Wt: {totalNetWt.toFixed(2)} KG</span>
                    <span>Total Gross Wt: {totalGrossWt.toFixed(2)} KG</span>
                    <span>Total CBM: {totalCbm.toFixed(3)}</span>
                </div>
            </div>

            <Textarea
                label="Marks & Numbers"
                value={formData.marks_and_numbers || ''}
                onChange={(e) => updateForm('marks_and_numbers', e.target.value || null)}
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
