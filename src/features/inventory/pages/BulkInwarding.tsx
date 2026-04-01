import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  FileSpreadsheet,
  Save,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Download,
  X,
  Copy,
  AlertCircle,
  Clock,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface Product {
  id: string;
  name: string;
  sku: string;
  display_name?: string;
}

interface BulkRow {
  id: string;
  product_id: string;
  product_name: string;
  batch_number: string;
  quantity: number | '';
  manufacturing_date: string;
  expiry_date: string;
  unit_cost: number | '';
  warehouse_location: string;
  status: 'pending' | 'valid' | 'error' | 'saved';
  error_message: string;
}

interface CSVRow {
  sku?: string;
  product_name?: string;
  batch_number?: string;
  quantity?: string;
  manufacturing_date?: string;
  expiry_date?: string;
  unit_cost?: string;
  warehouse_location?: string;
}

let rowCounter = 0;
function generateRowId(): string {
  rowCounter += 1;
  return `row_${Date.now()}_${rowCounter}`;
}

function createEmptyRow(): BulkRow {
  return {
    id: generateRowId(),
    product_id: '',
    product_name: '',
    batch_number: '',
    quantity: '',
    manufacturing_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    unit_cost: '',
    warehouse_location: '',
    status: 'pending',
    error_message: '',
  };
}

function validateRow(row: BulkRow): { valid: boolean; message: string } {
  if (!row.product_id) return { valid: false, message: 'Product select karo' };
  if (!row.batch_number.trim()) return { valid: false, message: 'Batch number daalo' };
  if (!row.quantity || Number(row.quantity) <= 0) return { valid: false, message: 'Quantity > 0 chahiye' };
  if (!row.manufacturing_date) return { valid: false, message: 'Mfg date daalo' };
  return { valid: true, message: '' };
}

function parseCSV(text: string): CSVRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row as CSVRow;
  });
}

export default function BulkInwardingPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<BulkRow[]>(() => Array.from({ length: 5 }, createEmptyRow));
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, display_name')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      toast.error(`Products load nahi ho sake: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  const addRows = (count: number = 5) => {
    setRows((prev) => [...prev, ...Array.from({ length: count }, createEmptyRow)]);
  };

  const removeRow = (rowId: string) => {
    setRows((prev) => {
      if (prev.length <= 1) {
        toast.info('Kam se kam ek row honi chahiye');
        return prev;
      }
      return prev.filter((r) => r.id !== rowId);
    });
  };

  const duplicateRow = (rowId: string) => {
    setRows((prev) => {
      const source = prev.find((r) => r.id === rowId);
      if (!source) return prev;
      const newRow: BulkRow = { ...source, id: generateRowId(), status: 'pending', error_message: '' };
      const index = prev.findIndex((r) => r.id === rowId);
      const updated = [...prev];
      updated.splice(index + 1, 0, newRow);
      return updated;
    });
  };

  const updateRow = (rowId: string, field: keyof BulkRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated: BulkRow = { ...r, [field]: value, status: 'pending', error_message: '' };
        if (field === 'product_id') {
          const product = products.find((p) => p.id === value);
          updated.product_name = product ? (product.display_name || product.name) : '';
        }
        return updated;
      })
    );
  };

  async function handleCSVImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const csvRows = parseCSV(text);
      if (csvRows.length === 0) {
        toast.error('CSV khali hai');
        return;
      }
      const newRows: BulkRow[] = csvRows.map((csv) => {
        const row = createEmptyRow();
        if (csv.sku) {
          const product = products.find((p) => p.sku.toLowerCase() === csv.sku!.toLowerCase());
          if (product) {
            row.product_id = product.id;
            row.product_name = product.display_name || product.name;
          }
        }
        row.batch_number = csv.batch_number || '';
        row.quantity = csv.quantity ? Number(csv.quantity) : '';
        row.manufacturing_date = csv.manufacturing_date || new Date().toISOString().split('T')[0];
        row.expiry_date = csv.expiry_date || '';
        row.unit_cost = csv.unit_cost ? Number(csv.unit_cost) : '';
        row.warehouse_location = csv.warehouse_location || '';
        const validation = validateRow(row);
        row.status = validation.valid ? 'valid' : 'error';
        row.error_message = validation.message;
        return row;
      });
      setRows(newRows);
      toast.success(`${csvRows.length} rows imported!`);
    } catch (err: any) {
      toast.error(`CSV Error: ${err.message}`);
    }
  }

  const downloadTemplate = () => {
    const headers = 'sku,batch_number,quantity,manufacturing_date,expiry_date,unit_cost,warehouse_location\nFSG-001,BATCH-2025-001,100,2025-01-15,2026-01-15,25.50,Rack-A1';
    const blob = new Blob([headers], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_stock_template.csv';
    a.click();
  };

  const confirmSave = async () => {
    let allValid = true;
    const validatedRows = rows.map(r => {
      if (r.status === 'saved') return r;
      const v = validateRow(r);
      if (!v.valid) allValid = false;
      return { ...r, status: (v.valid ? 'valid' : 'error') as BulkRow['status'], error_message: v.message };
    });
    setRows(validatedRows);

    if (!allValid) {
      toast.error('Red rows fix karo pehle');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleFinalSave = async () => {
    setShowConfirmModal(false);
    setSaving(true);
    const pendingRows = rows.filter(r => r.status !== 'saved');
    setSaveProgress({ done: 0, total: pendingRows.length });

    for (let i = 0; i < pendingRows.length; i++) {
        const row = pendingRows[i];
        try {
            const { error } = await supabase.from('inventory').insert({
                product_id: row.product_id,
                batch_number: row.batch_number.trim(),
                quantity: Number(row.quantity),
                available_quantity: Number(row.quantity),
                reserved_quantity: 0,
                manufacturing_date: row.manufacturing_date || null,
                expiry_date: row.expiry_date || null,
                unit_cost: Number(row.unit_cost) || 0,
                warehouse_location: row.warehouse_location?.trim() || null,
                status: 'available',
            });
            if (error) throw error;
            setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'saved' } : r));
        } catch (err: any) {
            setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'error', error_message: err.message } : r));
        }
        setSaveProgress(p => ({ ...p, done: i + 1 }));
    }
    setSaving(false);
    toast.success('Inventory update complete!');
  };

  const stats = {
    total: rows.length,
    valid: rows.filter(r => r.status === 'valid').length,
    errors: rows.filter(r => r.status === 'error').length,
    saved: rows.filter(r => r.status === 'saved').length,
    pending: rows.filter(r => r.status === 'pending').length,
  };

  const productOptions = products.map(p => ({
    value: p.id,
    label: `${p.sku} - ${p.display_name || p.name}`
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="sm" onClick={() => navigate('/inventory')} icon={<ArrowLeft size={16} />} />
          <div>
            <h1 className="text-2xl font-bold text-white">Bulk Stock Entry</h1>
            <p className="text-sm text-dark-500">Add multiple batches simultaneously</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={downloadTemplate} icon={<Download size={16} />}>Template</Button>
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} icon={<Upload size={16} />}>Import CSV</Button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
          <Button onClick={confirmSave} isLoading={saving} icon={<Save size={16} />}>
            {saving ? `Saving ${saveProgress.done}/${saveProgress.total}` : 'Save All'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Pending', value: stats.pending, color: 'text-amber-400' },
          { label: 'Valid', value: stats.valid, color: 'text-emerald-400' },
          { label: 'Errors', value: stats.errors, color: 'text-red-400' },
          { label: 'Saved', value: stats.saved, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="glass-card p-3">
            <p className="text-[10px] text-dark-500 uppercase">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-300 bg-dark-200/20">
                <th className="p-2 text-left w-10 text-dark-500">#</th>
                <th className="p-2 text-left min-w-[250px] text-dark-500">Product *</th>
                <th className="p-2 text-left min-w-[150px] text-dark-500">Batch *</th>
                <th className="p-2 text-left w-24 text-dark-500">Qty *</th>
                <th className="p-2 text-left w-36 text-dark-500">Mfg Date</th>
                <th className="p-2 text-left w-36 text-dark-500">Expiry</th>
                <th className="p-2 text-left w-24 text-dark-500">Unit Cost</th>
                <th className="p-2 text-left text-dark-500">Location</th>
                <th className="p-2 text-left w-12 text-dark-500">Status</th>
                <th className="p-2 text-left w-20 text-dark-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-300/30">
              {rows.map((row, idx) => (
                <tr key={row.id} className={row.status === 'saved' ? 'opacity-50' : 'hover:bg-dark-200/10'}>
                  <td className="p-2 text-dark-600 font-mono text-xs">{idx + 1}</td>
                  <td className="p-1">
                    <Select value={row.product_id} options={productOptions} placeholder="S"
                      onChange={(e) => updateRow(row.id, 'product_id', e.target.value)} disabled={row.status === 'saved'} />
                  </td>
                  <td className="p-1"><Input className="h-9" value={row.batch_number} onChange={(e) => updateRow(row.id, 'batch_number', e.target.value)} disabled={row.status === 'saved'} /></td>
                  <td className="p-1"><Input className="h-9" type="number" value={row.quantity} onChange={(e) => updateRow(row.id, 'quantity', e.target.value)} disabled={row.status === 'saved'} /></td>
                  <td className="p-1"><Input className="h-9" type="date" value={row.manufacturing_date} onChange={(e) => updateRow(row.id, 'manufacturing_date', e.target.value)} disabled={row.status === 'saved'} /></td>
                  <td className="p-1"><Input className="h-9" type="date" value={row.expiry_date} onChange={(e) => updateRow(row.id, 'expiry_date', e.target.value)} disabled={row.status === 'saved'} /></td>
                  <td className="p-1"><Input className="h-9" type="number" value={row.unit_cost} onChange={(e) => updateRow(row.id, 'unit_cost', e.target.value)} disabled={row.status === 'saved'} /></td>
                  <td className="p-1"><Input className="h-9" value={row.warehouse_location} onChange={(e) => updateRow(row.id, 'warehouse_location', e.target.value)} disabled={row.status === 'saved'} /></td>
                  <td className="p-2 text-center">
                    {row.status === 'valid' && <CheckCircle2 size={16} className="text-emerald-500" />}
                    {row.status === 'error' && <AlertCircle size={16} className="text-red-500" />}
                    {row.status === 'pending' && <Clock size={16} className="text-gray-400" />}
                    {row.status === 'saved' && <CheckCircle2 size={16} className="text-blue-500" />}
                  </td>
                  <td className="p-1 flex items-center gap-1">
                    <button onClick={() => duplicateRow(row.id)} className="p-1.5 text-dark-500 hover:text-white"><Copy size={14} /></button>
                    <button onClick={() => removeRow(row.id)} className="p-1.5 text-dark-500 hover:text-red-400"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-dark-300 flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => addRows(1)} icon={<Plus size={14} />}>Add Row</Button>
            <Button variant="secondary" size="sm" onClick={() => addRows(10)} icon={<Plus size={14} />}>Add 10 Rows</Button>
            <Button variant="secondary" size="sm" onClick={() => setRows(Array.from({ length: 5 }, createEmptyRow))} icon={<Trash2 size={14} />}>Clear</Button>
        </div>
      </Card>

      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Confirm Bulk Entry" size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
          <Button onClick={handleFinalSave}>Confirm & Save</Button>
        </>}>
        <p className="text-sm text-dark-500">
            Total <strong>{stats.total - stats.saved}</strong> items inventory mein add honge. Confirm karein?
        </p>
      </Modal>
    </div>
  );
}