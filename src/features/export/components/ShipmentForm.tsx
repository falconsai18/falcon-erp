import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import {
    CONTAINER_SIZES,
    BL_TYPES,
    type ExportOrder,
    type ExportShipmentFormData,
} from '../types/export.types'
import { getExportOrders, getExportOrderById, getPorts } from '../services/exportService'

interface ShipmentFormProps {
    orderId: string
    onSubmit: (data: ExportShipmentFormData) => Promise<void>
    onCancel: () => void
    isLoading?: boolean
}

export function ShipmentForm({ orderId, onSubmit, onCancel, isLoading = false }: ShipmentFormProps) {
    const [order, setOrder] = useState<ExportOrder | null>(null)
    const [indianPorts, setIndianPorts] = useState<Awaited<ReturnType<typeof getPorts>>>([])
    const [allPorts, setAllPorts] = useState<Awaited<ReturnType<typeof getPorts>>>([])
    const [formData, setFormData] = useState<ExportShipmentFormData>({
        export_order_id: orderId,
        shipment_mode: 'SEA',
        shipping_line: null,
        airline: null,
        vessel_name: null,
        voyage_number: null,
        flight_number: null,
        container_number: null,
        container_size: null,
        bl_number: null,
        bl_type: null,
        awb_number: null,
        forwarder_name: null,
        forwarder_contact: null,
        port_of_loading: '',
        port_of_destination: '',
        etd: null,
        eta: null,
        actual_departure: null,
        actual_arrival: null,
        status: 'BOOKING_CONFIRMED',
        notes: null,
        created_by: null,
    })

    useEffect(() => {
        getExportOrderById(orderId).then(setOrder)
        getPorts(true).then(setIndianPorts)
        getPorts(false).then(setAllPorts)
    }, [orderId])

    useEffect(() => {
        if (order) {
            queueMicrotask(() => {
                setFormData((prev) => ({
                    ...prev,
                    export_order_id: order.id,
                    shipment_mode: order.shipment_mode,
                    port_of_loading: order.port_of_loading,
                    port_of_destination: order.port_of_destination,
                }))
            })
        }
    }, [order])

    const updateForm = (field: keyof ExportShipmentFormData, value: unknown) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async () => {
        await onSubmit(formData)
    }

    const isSea = formData.shipment_mode === 'SEA'
    const containerOptions = CONTAINER_SIZES.map((c) => ({ value: c.value, label: c.label }))
    const blOptions = BL_TYPES.map((b) => ({ value: b.value, label: b.label }))
    const indianPortOptions = indianPorts.map((p) => ({ value: p.port_code, label: `${p.port_name} (${p.port_code})` }))
    const destPortOptions = allPorts.map((p) => ({ value: p.port_code, label: `${p.port_name}, ${p.country}` }))

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                    label="Port of Loading"
                    value={formData.port_of_loading}
                    onChange={(e) => updateForm('port_of_loading', e.target.value)}
                    options={[{ value: '', label: 'Select' }, ...indianPortOptions]}
                />
                <Select
                    label="Port of Destination"
                    value={formData.port_of_destination}
                    onChange={(e) => updateForm('port_of_destination', e.target.value)}
                    options={[{ value: '', label: 'Select' }, ...destPortOptions]}
                />
                <Input
                    label="ETD"
                    type="date"
                    value={formData.etd || ''}
                    onChange={(e) => updateForm('etd', e.target.value || null)}
                />
                <Input
                    label="ETA"
                    type="date"
                    value={formData.eta || ''}
                    onChange={(e) => updateForm('eta', e.target.value || null)}
                />
                {isSea && (
                    <>
                        <Input
                            label="Shipping Line"
                            value={formData.shipping_line || ''}
                            onChange={(e) => updateForm('shipping_line', e.target.value || null)}
                        />
                        <Input
                            label="Vessel Name"
                            value={formData.vessel_name || ''}
                            onChange={(e) => updateForm('vessel_name', e.target.value || null)}
                        />
                        <Input
                            label="Voyage Number"
                            value={formData.voyage_number || ''}
                            onChange={(e) => updateForm('voyage_number', e.target.value || null)}
                        />
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
                            label="B/L Number"
                            value={formData.bl_number || ''}
                            onChange={(e) => updateForm('bl_number', e.target.value || null)}
                        />
                        <Select
                            label="B/L Type"
                            value={formData.bl_type || ''}
                            onChange={(e) => updateForm('bl_type', e.target.value || null)}
                            options={[{ value: '', label: 'Select' }, ...blOptions]}
                        />
                    </>
                )}
                {!isSea && (
                    <>
                        <Input
                            label="Airline"
                            value={formData.airline || ''}
                            onChange={(e) => updateForm('airline', e.target.value || null)}
                        />
                        <Input
                            label="Flight Number"
                            value={formData.flight_number || ''}
                            onChange={(e) => updateForm('flight_number', e.target.value || null)}
                        />
                        <Input
                            label="AWB Number"
                            value={formData.awb_number || ''}
                            onChange={(e) => updateForm('awb_number', e.target.value || null)}
                        />
                    </>
                )}
                <Input
                    label="Forwarder Name"
                    value={formData.forwarder_name || ''}
                    onChange={(e) => updateForm('forwarder_name', e.target.value || null)}
                />
                <Input
                    label="Forwarder Contact"
                    value={formData.forwarder_contact || ''}
                    onChange={(e) => updateForm('forwarder_contact', e.target.value || null)}
                />
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleSubmit} isLoading={isLoading}>Save</Button>
            </div>
        </div>
    )
}
