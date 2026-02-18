import { supabase } from '@/lib/supabase'
import { logActivity, AUDIT_ACTIONS } from './auditService'

// Scrap Reasons
export const SCRAP_REASONS = [
  { value: 'defective_material', label: 'Defective Material', color: 'amber' },
  { value: 'machine_error', label: 'Machine Error', color: 'red' },
  { value: 'human_error', label: 'Human Error', color: 'orange' },
  { value: 'quality_reject', label: 'Quality Reject', color: 'purple' },
  { value: 'other', label: 'Other', color: 'gray' },
] as const

export type ScrapReason = typeof SCRAP_REASONS[number]['value']

// Scrap Record Interface
export interface ScrapRecord {
  id: string
  work_order_id: string
  raw_material_id: string | null
  quantity: number
  unit: string
  reason: ScrapReason
  notes: string | null
  cost_per_unit: number
  total_cost: number
  recorded_by: string | null
  created_at: string
  work_order_number?: string
  material_name?: string
  material_code?: string
}

export interface ScrapFormData {
  work_order_id: string
  raw_material_id: string
  quantity: number
  unit: string
  reason: ScrapReason
  notes?: string
  cost_per_unit: number
}

// ============ SQL TO CREATE TABLE (Run this in Supabase SQL Editor) ============
/*
CREATE TABLE IF NOT EXISTS scrap_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  raw_material_id UUID REFERENCES raw_materials(id) ON DELETE SET NULL,
  quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(20) NOT NULL,
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('defective_material', 'machine_error', 'human_error', 'quality_reject', 'other')),
  notes TEXT,
  cost_per_unit DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(12,2) GENERATED ALWAYS AS (quantity * cost_per_unit) STORED,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_scrap_records_work_order ON scrap_records(work_order_id);
CREATE INDEX idx_scrap_records_created_at ON scrap_records(created_at);
CREATE INDEX idx_scrap_records_reason ON scrap_records(reason);

-- Enable RLS
ALTER TABLE scrap_records ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all scrap records
CREATE POLICY "Scrap records viewable by authenticated users"
  ON scrap_records FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can insert their own scrap records
CREATE POLICY "Users can create scrap records"
  ON scrap_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = recorded_by);

-- Policy: Admins can update/delete
CREATE POLICY "Admins can update scrap records"
  ON scrap_records FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete scrap records"
  ON scrap_records FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
*/

// ============ CRUD OPERATIONS ============

export async function recordScrap(data: ScrapFormData, userId?: string): Promise<ScrapRecord> {
  const totalCost = data.quantity * data.cost_per_unit

  const { data: record, error } = await supabase
    .from('scrap_records')
    .insert({
      work_order_id: data.work_order_id,
      raw_material_id: data.raw_material_id,
      quantity: data.quantity,
      unit: data.unit,
      reason: data.reason,
      notes: data.notes || null,
      cost_per_unit: data.cost_per_unit,
      recorded_by: userId || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Record scrap error:', error)
    throw new Error('Failed to record scrap: ' + error.message)
  }

  // Log activity (fire and forget)
  logActivity({
    action: AUDIT_ACTIONS.WORK_ORDER_SCRAP_RECORDED,
    entity_type: 'work_order',
    entity_id: data.work_order_id,
    details: {
      material_id: data.raw_material_id,
      quantity: data.quantity,
      reason: data.reason,
      total_cost: totalCost,
    },
  })

  return record
}

export async function getScrapRecordsByWorkOrder(workOrderId: string): Promise<ScrapRecord[]> {
  const { data, error } = await supabase
    .from('scrap_records')
    .select(`
      *,
      work_orders(work_order_number),
      raw_materials(name, code)
    `)
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get scrap records error:', error)
    throw new Error('Failed to fetch scrap records')
  }

  return (data || []).map((r: any) => ({
    ...r,
    work_order_number: r.work_orders?.work_order_number || '-',
    material_name: r.raw_materials?.name || '-',
    material_code: r.raw_materials?.code || '-',
  }))
}

export async function getScrapRecords(params?: {
  fromDate?: string
  toDate?: string
  reason?: ScrapReason
  workOrderId?: string
}): Promise<ScrapRecord[]> {
  let query = supabase
    .from('scrap_records')
    .select(`
      *,
      work_orders(work_order_number),
      raw_materials(name, code)
    `)

  if (params?.fromDate) {
    query = query.gte('created_at', params.fromDate)
  }
  if (params?.toDate) {
    query = query.lte('created_at', params.toDate)
  }
  if (params?.reason) {
    query = query.eq('reason', params.reason)
  }
  if (params?.workOrderId) {
    query = query.eq('work_order_id', params.workOrderId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Get scrap records error:', error)
    throw new Error('Failed to fetch scrap records')
  }

  return (data || []).map((r: any) => ({
    ...r,
    work_order_number: r.work_orders?.work_order_number || '-',
    material_name: r.raw_materials?.name || '-',
    material_code: r.raw_materials?.code || '-',
  }))
}

// ============ STATS & ANALYTICS ============

export interface ScrapStats {
  totalScrapCost: number
  totalScrapQuantity: number
  todayCost: number
  todayQuantity: number
  thisMonthCost: number
  thisMonthQuantity: number
  byReason: Record<ScrapReason, { count: number; cost: number }>
  topMaterials: { material_id: string; material_name: string; total_cost: number; total_quantity: number }[]
}

export async function getScrapStats(fromDate?: string, toDate?: string): Promise<ScrapStats> {
  // Get all records in date range
  const { data: records, error } = await supabase
    .from('scrap_records')
    .select(`
      *,
      raw_materials(name)
    `)
    .gte('created_at', fromDate || '1970-01-01')
    .lte('created_at', toDate || new Date().toISOString())

  if (error) {
    console.error('Get scrap stats error:', error)
    throw new Error('Failed to fetch scrap stats')
  }

  const scraps = records || []

  // Calculate today's stats
  const today = new Date().toISOString().split('T')[0]
  const todayScraps = scraps.filter((s: any) => s.created_at?.startsWith(today))

  // Calculate this month's stats
  const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
  const monthScraps = scraps.filter((s: any) => s.created_at?.startsWith(thisMonth))

  // By reason breakdown
  const byReason: Record<ScrapReason, { count: number; cost: number }> = {
    defective_material: { count: 0, cost: 0 },
    machine_error: { count: 0, cost: 0 },
    human_error: { count: 0, cost: 0 },
    quality_reject: { count: 0, cost: 0 },
    other: { count: 0, cost: 0 },
  }

  scraps.forEach((s: any) => {
    const reason = s.reason as ScrapReason
    if (byReason[reason]) {
      byReason[reason].count += 1
      byReason[reason].cost += s.total_cost || 0
    }
  })

  // Top materials by cost
  const materialMap = new Map<string, { material_id: string; material_name: string; total_cost: number; total_quantity: number }>()
  scraps.forEach((s: any) => {
    const existing = materialMap.get(s.raw_material_id)
    if (existing) {
      existing.total_cost += s.total_cost || 0
      existing.total_quantity += s.quantity || 0
    } else {
      materialMap.set(s.raw_material_id, {
        material_id: s.raw_material_id,
        material_name: s.raw_materials?.name || '-',
        total_cost: s.total_cost || 0,
        total_quantity: s.quantity || 0,
      })
    }
  })

  return {
    totalScrapCost: scraps.reduce((sum: number, s: any) => sum + (s.total_cost || 0), 0),
    totalScrapQuantity: scraps.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0),
    todayCost: todayScraps.reduce((sum: number, s: any) => sum + (s.total_cost || 0), 0),
    todayQuantity: todayScraps.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0),
    thisMonthCost: monthScraps.reduce((sum: number, s: any) => sum + (s.total_cost || 0), 0),
    thisMonthQuantity: monthScraps.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0),
    byReason,
    topMaterials: Array.from(materialMap.values()).sort((a, b) => b.total_cost - a.total_cost).slice(0, 5),
  }
}

export async function getTodayScrapCost(): Promise<number> {
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('scrap_records')
    .select('total_cost')
    .gte('created_at', today)

  if (error) {
    console.error('Get today scrap cost error:', error)
    return 0
  }

  return (data || []).reduce((sum: number, r: any) => sum + (r.total_cost || 0), 0)
}

export async function getThisMonthScrapCost(): Promise<number> {
  const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
  
  const { data, error } = await supabase
    .from('scrap_records')
    .select('total_cost')
    .like('created_at', `${thisMonth}%`)

  if (error) {
    console.error('Get month scrap cost error:', error)
    return 0
  }

  return (data || []).reduce((sum: number, r: any) => sum + (r.total_cost || 0), 0)
}

// ============ DELETE (Admin only) ============

export async function deleteScrapRecord(id: string): Promise<void> {
  const { error } = await supabase
    .from('scrap_records')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Delete scrap record error:', error)
    throw new Error('Failed to delete scrap record')
  }

  // Log activity (fire and forget)
  logActivity({
    action: AUDIT_ACTIONS.WORK_ORDER_SCRAP_DELETED,
    entity_type: 'scrap_record',
    entity_id: id,
  })
}
