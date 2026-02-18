import { useState, useEffect } from 'react'
import { X, Trash2, AlertTriangle, DollarSign, Package, FileText, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { WorkOrder, WorkOrderMaterial } from '@/services/workOrderService'
import {
  recordScrap,
  getScrapRecordsByWorkOrder,
  deleteScrapRecord,
  SCRAP_REASONS,
  type ScrapReason,
  type ScrapRecord,
} from '@/services/scrapService'
import { useAuthStore } from '@/features/auth/store/authStore'

interface ScrapModalProps {
  isOpen: boolean
  onClose: () => void
  workOrder: WorkOrder | null
  onScrapRecorded: () => void
}

export function ScrapModal({ isOpen, onClose, workOrder, onScrapRecorded }: ScrapModalProps) {
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [scrapRecords, setScrapRecords] = useState<ScrapRecord[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    raw_material_id: '',
    quantity: '',
    unit: 'kg',
    reason: '' as ScrapReason | '',
    cost_per_unit: '',
    notes: '',
  })

  // Load existing scrap records
  useEffect(() => {
    if (isOpen && workOrder) {
      loadScrapRecords()
    }
  }, [isOpen, workOrder])

  const loadScrapRecords = async () => {
    if (!workOrder) return
    try {
      const records = await getScrapRecordsByWorkOrder(workOrder.id)
      setScrapRecords(records)
    } catch (error) {
      console.error('Failed to load scrap records:', error)
    }
  }

  const handleSubmit = async () => {
    if (!workOrder) return

    // Validation
    if (!formData.raw_material_id) {
      toast.error('Please select a material')
      return
    }
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }
    if (!formData.reason) {
      toast.error('Please select a reason')
      return
    }

    try {
      setIsLoading(true)

      await recordScrap(
        {
          work_order_id: workOrder.id,
          raw_material_id: formData.raw_material_id,
          quantity: Number(formData.quantity),
          unit: formData.unit,
          reason: formData.reason,
          cost_per_unit: Number(formData.cost_per_unit) || 0,
          notes: formData.notes,
        },
        user?.id
      )

      toast.success('Scrap recorded successfully!')
      
      // Reset form
      setFormData({
        raw_material_id: '',
        quantity: '',
        unit: 'kg',
        reason: '',
        cost_per_unit: '',
        notes: '',
      })
      setShowAddForm(false)
      
      // Refresh records and notify parent
      await loadScrapRecords()
      onScrapRecorded()
    } catch (error: any) {
      toast.error(error.message || 'Failed to record scrap')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      await deleteScrapRecord(id)
      toast.success('Scrap record deleted')
      await loadScrapRecords()
      onScrapRecorded()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete scrap record')
    } finally {
      setDeletingId(null)
    }
  }

  const calculateTotalCost = () => {
    const qty = Number(formData.quantity) || 0
    const cost = Number(formData.cost_per_unit) || 0
    return qty * cost
  }

  const totalScrapCost = scrapRecords.reduce((sum, r) => sum + (r.total_cost || 0), 0)

  if (!workOrder) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Scrap - ${workOrder.work_order_number}`}
      size="lg"
      footer={
        !showAddForm && (
          <>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={() => setShowAddForm(true)}
              icon={<Plus size={16} />}
            >
              Record New Scrap
            </Button>
          </>
        )
      }
    >
      <div className="space-y-6">
        {/* Summary */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Trash2 size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Total Scrap Cost</p>
              <p className="text-xs text-amber-400">{scrapRecords.length} records</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-400">
            {formatCurrency(totalScrapCost)}
          </p>
        </div>

        {/* Existing Scrap Records */}
        {scrapRecords.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-white">Previous Scrap Records</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {scrapRecords.map((record) => {
                const reason = SCRAP_REASONS.find(r => r.value === record.reason)
                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-dark-200/30 border border-dark-300/30"
                  >
                    <div className="flex items-center gap-3">
                      <Package size={16} className="text-dark-500" />
                      <div>
                        <p className="text-sm text-white">{record.material_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant={reason?.color as any || 'default'}>
                            {reason?.label || record.reason}
                          </Badge>
                          <span className="text-xs text-dark-500">
                            {record.quantity} {record.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium text-amber-400">
                        {formatCurrency(record.total_cost)}
                      </p>
                      <button
                        onClick={() => handleDelete(record.id)}
                        disabled={deletingId === record.id}
                        className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        {deletingId === record.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <X size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Add Form */}
        {showAddForm && (
          <div className="space-y-4 p-4 rounded-xl bg-dark-200/20 border border-dark-300/30">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-400" />
                Record New Scrap
              </p>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1 rounded-lg text-dark-500 hover:text-white hover:bg-dark-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Material Selection */}
            <Select
              label="Material *"
              value={formData.raw_material_id}
              onChange={(e) => {
                const material = workOrder.materials?.find(m => m.raw_material_id === e.target.value)
                setFormData(prev => ({
                  ...prev,
                  raw_material_id: e.target.value,
                  unit: material?.unit || 'kg',
                }))
              }}
              options={workOrder.materials?.map(m => ({
                value: m.raw_material_id,
                label: `${m.product_name} (${m.product_sku})`,
              })) || []}
              placeholder="Select material that was scrapped"
            />

            {/* Quantity & Unit */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Quantity *"
                type="number"
                step="0.001"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="Enter quantity"
              />
              <Input
                label="Unit"
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                placeholder="kg, pcs, etc."
              />
            </div>

            {/* Reason */}
            <Select
              label="Reason *"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value as ScrapReason }))}
              options={SCRAP_REASONS.map(r => ({
                value: r.value,
                label: r.label,
              }))}
              placeholder="Select reason for scrap"
            />

            {/* Cost */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Cost per Unit (₹)"
                type="number"
                step="0.01"
                value={formData.cost_per_unit}
                onChange={(e) => setFormData(prev => ({ ...prev, cost_per_unit: e.target.value }))}
                placeholder="Enter cost per unit"
                icon={<DollarSign size={16} />}
              />
              <div className="flex items-end pb-2">
                <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[10px] text-amber-400 uppercase">Total Cost</p>
                  <p className="text-lg font-semibold text-amber-400">
                    {formatCurrency(calculateTotalCost())}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <Textarea
              label="Notes (Optional)"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional details about the scrap..."
              rows={2}
            />

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowAddForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                isLoading={isLoading}
                icon={<Trash2 size={16} />}
                className="flex-1"
              >
                Record Scrap
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// Small scrap button component for work order rows
export function ScrapButton({
  workOrder,
  onScrapRecorded,
}: {
  workOrder: WorkOrder
  onScrapRecorded: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(true)
        }}
        className="p-1.5 rounded-lg text-dark-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
        title="Record Scrap"
      >
        <Trash2 size={14} />
      </button>

      <ScrapModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        workOrder={workOrder}
        onScrapRecorded={onScrapRecorded}
      />
    </>
  )
}
