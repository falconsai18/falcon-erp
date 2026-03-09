import { Check } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { ExportShipment, ShipmentStatus } from '../types/export.types'
import { SHIPMENT_STATUSES } from '../types/export.types'

const TRACKER_STEPS: ShipmentStatus[] = [
    'BOOKING_CONFIRMED',
    'CUSTOMS_CLEARED',
    'LOADED',
    'IN_TRANSIT',
    'ARRIVED',
    'DELIVERED',
]

interface ShipmentTrackerProps {
    shipment: ExportShipment
}

export function ShipmentTracker({ shipment }: ShipmentTrackerProps) {
    const currentIndex = TRACKER_STEPS.indexOf(shipment.status)
    const isCancelled = shipment.status === 'CANCELLED'

    if (isCancelled) {
        return (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                <p className="text-red-400 font-medium">Shipment Cancelled</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-1 w-full overflow-x-auto pb-2">
                {TRACKER_STEPS.map((step, index) => {
                    const isCompleted = index <= currentIndex
                    const isCurrent = index === currentIndex
                    const label = SHIPMENT_STATUSES.find((s) => s.value === step)?.label ?? step
                    return (
                        <div key={step} className="flex items-center flex-1 min-w-[100px]">
                            <div className="flex flex-col items-center flex-1">
                                <div
                                    className={cn(
                                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                                        isCompleted ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-dark-300 text-gray-500 dark:text-dark-500',
                                        isCurrent && 'ring-2 ring-blue-500/30'
                                    )}
                                >
                                    {isCompleted ? <Check size={14} /> : index + 1}
                                </div>
                                <span
                                    className={cn(
                                        'text-[10px] mt-1 text-center',
                                        isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-dark-500'
                                    )}
                                >
                                    {label}
                                </span>
                            </div>
                            {index < TRACKER_STEPS.length - 1 && (
                                <div
                                    className={cn(
                                        'flex-1 h-0.5 mx-1 min-w-[20px]',
                                        isCompleted ? 'bg-blue-500' : 'bg-gray-200 dark:bg-dark-300'
                                    )}
                                />
                            )}
                        </div>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shipment.shipment_mode === 'SEA' && (
                    <>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-dark-500 uppercase">Vessel</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {shipment.vessel_name || '-'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-dark-500 uppercase">Voyage</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {shipment.voyage_number || '-'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-dark-500 uppercase">Container</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {shipment.container_number || '-'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-dark-500 uppercase">B/L Number</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {shipment.bl_number || '-'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-dark-500 uppercase">Shipping Line</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {shipment.shipping_line || '-'}
                            </p>
                        </div>
                    </>
                )}
                {shipment.shipment_mode === 'AIR' && (
                    <>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-dark-500 uppercase">Airline</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {shipment.airline || '-'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-dark-500 uppercase">Flight</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {shipment.flight_number || '-'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-dark-500 uppercase">AWB Number</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {shipment.awb_number || '-'}
                            </p>
                        </div>
                    </>
                )}
                <div>
                    <p className="text-xs text-gray-500 dark:text-dark-500 uppercase">Port of Loading</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {shipment.port_of_loading}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-dark-500 uppercase">Port of Destination</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {shipment.port_of_destination}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-dark-500 uppercase">ETD</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {shipment.etd ? formatDate(shipment.etd) : '-'}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-dark-500 uppercase">ETA</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {shipment.eta ? formatDate(shipment.eta) : '-'}
                    </p>
                </div>
                {shipment.forwarder_name && (
                    <div className="md:col-span-2">
                        <p className="text-xs text-gray-500 dark:text-dark-500 uppercase">Forwarder</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {shipment.forwarder_name}
                            {shipment.forwarder_contact && ` - ${shipment.forwarder_contact}`}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
