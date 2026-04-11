/**
 * Falcon ERP — Local SQLite Database Adapter
 *
 * Provides a Supabase-compatible query builder that routes to local SQLite
 * via Electron IPC calls (db-query, db-execute, db-execute-batch).
 *
 * Services swap: `import { supabase } from '@/lib/supabase'` → `import { db } from '@/lib/db'`
 * and keep the same chained API:
 *
 *   db.from('products').select('*').eq('status', 'active').order('name').range(0, 9)
 *   db.from('products').insert({...}).select().single()
 *   db.from('products').update({...}).eq('id', x).select().single()
 *   db.from('products').delete().eq('id', x)
 *   db.rpc('function_name', params)
 */

// Electron invoke — only available in desktop mode
const invoke = (channel: string, args?: any): Promise<any> => {
  if (typeof window !== 'undefined' && window.electron) {
    return window.electron.invoke(channel, args)
  }
  throw new Error('Electron IPC not available')
}

/** Check if running inside Electron desktop shell */
export function isTauri(): boolean {
  // Kept as isTauri for backward compat with sync.ts
  return !!(window as any).__ELECTRON__ || !!(window as any).__TAURI__ || !!(window as any).__TAURI_IPC__
}

// ─── Electron File System (for local storage) ───────────────────────
let fsReady = false
let appDataPath: string | null = null
let imagesDir: string | null = null

async function ensureFsReady() {
  if (fsReady) return
  if (typeof window === 'undefined' || !window.electron) return
  try {
    appDataPath = await invoke('fs-app-data-dir')
    imagesDir = await invoke('fs-images-dir')
    const imgDir = await invoke('fs-join', [imagesDir])
    const exists = await invoke('fs-exists', imgDir)
    if (!exists) {
      await invoke('fs-create-dir', imgDir)
    }
    fsReady = true
  } catch (e) {
    console.error('Failed to init fs:', e)
  }
}

// Init fs early
if (typeof window !== 'undefined' && isTauri()) {
  ensureFsReady()
}

// ─── Low-level DB helpers ───────────────────────────────────────────

async function dbQuery(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  return (await invoke('db-query', { sql, params })) as Record<string, unknown>[]
}

async function dbExecute(sql: string, params: unknown[] = []): Promise<number> {
  return (await invoke('db-execute', { sql, params })) as number
}

async function dbExecuteBatch(sql: string): Promise<void> {
  await invoke('db-execute-batch', { sql })
}

export { dbQuery, dbExecute, dbExecuteBatch }

// ─── UUID generator ─────────────────────────────────────────────────

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

// ─── Result types ───────────────────────────────────────────────────

interface QueryResult<T> {
  data: T | T[] | null
  error: { message: string; code?: string } | null
  count: number | null
}

// ─── FK Relationship Map ────────────────────────────────────────────
// Maps table → { fk_column → referenced_table }

const FK: Record<string, Record<string, string>> = {
  sales_orders: { customer_id: 'customers', created_by: 'users' },
  sales_order_items: { sales_order_id: 'sales_orders', product_id: 'products' },
  invoices: { customer_id: 'customers', sales_order_id: 'sales_orders', created_by: 'users' },
  invoice_items: { invoice_id: 'invoices', product_id: 'products' },
  payments: { invoice_id: 'invoices', created_by: 'users' },
  quotations: { customer_id: 'customers', created_by: 'users' },
  quotation_items: { quotation_id: 'quotations', product_id: 'products' },
  purchase_orders: { supplier_id: 'suppliers', created_by: 'users' },
  purchase_order_items: { purchase_order_id: 'purchase_orders', raw_material_id: 'raw_materials', product_id: 'products' },
  grn: { purchase_order_id: 'purchase_orders', supplier_id: 'suppliers', created_by: 'users' },
  grn_items: { grn_id: 'grn', raw_material_id: 'raw_materials', product_id: 'products' },
  inventory: { product_id: 'products', warehouse_id: 'warehouses', location_id: 'warehouse_locations' },
  inventory_movements: { product_id: 'products', raw_material_id: 'raw_materials', warehouse_id: 'warehouses', created_by: 'users' },
  formulations: { product_id: 'products' },
  formulation_ingredients: { formulation_id: 'formulations', raw_material_id: 'raw_materials' },
  formulation_process_steps: { formulation_id: 'formulations' },
  work_orders: { formulation_id: 'formulations', product_id: 'products', created_by: 'users' },
  work_order_materials: { work_order_id: 'work_orders', raw_material_id: 'raw_materials' },
  production_materials: { work_order_id: 'work_orders', raw_material_id: 'raw_materials' },
  batches: { product_id: 'products', work_order_id: 'work_orders', warehouse_id: 'warehouses', location_id: 'warehouse_locations' },
  quality_checks: { product_id: 'products', batch_id: 'batches', work_order_id: 'work_orders', grn_id: 'grn' },
  quality_check_items: { quality_check_id: 'quality_checks' },
  scrap_records: { work_order_id: 'work_orders', product_id: 'products', raw_material_id: 'raw_materials' },
  credit_notes: { invoice_id: 'invoices', customer_id: 'customers', created_by: 'users' },
  credit_note_items: { credit_note_id: 'credit_notes', product_id: 'products' },
  debit_notes: { purchase_order_id: 'purchase_orders', supplier_id: 'suppliers', created_by: 'users' },
  debit_note_items: { debit_note_id: 'debit_notes', raw_material_id: 'raw_materials', product_id: 'products' },
  delivery_challans: { sales_order_id: 'sales_orders', customer_id: 'customers', created_by: 'users' },
  challan_items: { challan_id: 'delivery_challans', product_id: 'products', batch_id: 'batches' },
  supplier_bills: { supplier_id: 'suppliers', purchase_order_id: 'purchase_orders', created_by: 'users' },
  supplier_bill_items: { supplier_bill_id: 'supplier_bills', raw_material_id: 'raw_materials', product_id: 'products' },
  supplier_payments: { supplier_id: 'suppliers', supplier_bill_id: 'supplier_bills', created_by: 'users' },
  products: { category_id: 'product_categories', brand_id: 'brands' },
  activity_log: { user_id: 'users' },
  notifications: { user_id: 'users' },
}

function findFk(from: string, to: string): string | null {
  const fks = FK[from]
  if (!fks) return null
  for (const [col, tbl] of Object.entries(fks)) {
    if (tbl === to) return col
  }
  return null
}

// ─── Select String Parser ───────────────────────────────────────────

interface Join {
  table: string
  alias?: string
  columns: string[]
  nested: Join[]
  isMany: boolean // one-to-many (child has FK to parent)
}

function tokenize(str: string): string[] {
  const tokens: string[] = []
  let cur = '', depth = 0
  for (const ch of str) {
    if (ch === '(') { depth++; cur += ch }
    else if (ch === ')') { depth--; cur += ch }
    else if (ch === ',' && depth === 0) { tokens.push(cur); cur = '' }
    else cur += ch
  }
  if (cur.trim()) tokens.push(cur)
  return tokens
}

function parseSelect(sel: string, parentTable: string): { cols: string[]; joins: Join[] } {
  const cols: string[] = [], joins: Join[] = []
  if (!sel?.trim()) return { cols: ['*'], joins: [] }

  for (const tok of tokenize(sel)) {
    const t = tok.trim()
    if (!t) continue
    // Match: alias:table(cols) or table(cols) — also handle !inner suffix
    const m = t.match(/^(?:(\w+):)?(\w+?)(?:!inner)?\((.+)\)$/)
    if (m) {
      const [, alias, table, inner] = m
      const parsed = parseSelect(inner, table)
      const parentHasFk = !!findFk(parentTable, table)
      joins.push({ table, alias, columns: parsed.cols, nested: parsed.joins, isMany: !parentHasFk })
    } else {
      cols.push(t)
    }
  }
  if (cols.length === 0) cols.push('*')
  return { cols, joins }
}

// ─── Query Builder ──────────────────────────────────────────────────

type Op = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in' | 'not'

interface Where { col: string; op: Op; val: unknown }

export class QueryBuilder<T = any> {
  private _tbl: string
  private _sel = '*'
  private _wh: Where[] = []
  private _or: string[] = []
  private _ord: { col: string; asc: boolean }[] = []
  private _from: number | null = null
  private _to: number | null = null
  private _cnt = false
  private _head = false
  private _mode: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private _ins: any = null
  private _upd: any = null
  private _upsConflict?: string
  private _ret = false
  private _single = false
  private _maybe = false

  constructor(tbl: string) { this._tbl = tbl }

  select(cols?: string, opts?: { count?: string; head?: boolean }): this {
    this._mode = 'select'
    if (cols) this._sel = cols
    if (opts?.count === 'exact') this._cnt = true
    if (opts?.head) this._head = true
    if (this._ins || this._upd) this._ret = true
    return this
  }
  insert(d: any): this { this._mode = 'insert'; this._ins = Array.isArray(d) ? d : [d]; return this }
  update(d: any): this { this._mode = 'update'; this._upd = d; return this }
  upsert(d: any, o?: { onConflict?: string }): this { this._mode = 'upsert'; this._ins = Array.isArray(d) ? d : [d]; this._upsConflict = o?.onConflict; return this }
  delete(): this { this._mode = 'delete'; return this }

  eq(c: string, v: unknown): this { this._wh.push({ col: c, op: 'eq', val: v }); return this }
  neq(c: string, v: unknown): this { this._wh.push({ col: c, op: 'neq', val: v }); return this }
  gt(c: string, v: unknown): this { this._wh.push({ col: c, op: 'gt', val: v }); return this }
  gte(c: string, v: unknown): this { this._wh.push({ col: c, op: 'gte', val: v }); return this }
  lt(c: string, v: unknown): this { this._wh.push({ col: c, op: 'lt', val: v }); return this }
  lte(c: string, v: unknown): this { this._wh.push({ col: c, op: 'lte', val: v }); return this }
  like(c: string, v: string): this { this._wh.push({ col: c, op: 'like', val: v }); return this }
  ilike(c: string, v: string): this { this._wh.push({ col: c, op: 'ilike', val: v }); return this }
  is(c: string, v: unknown): this { this._wh.push({ col: c, op: 'is', val: v }); return this }
  in(c: string, v: unknown[]): this { this._wh.push({ col: c, op: 'in', val: v }); return this }
  not(c: string, op: string, v: unknown): this { this._wh.push({ col: c, op: 'not', val: { innerOp: op, innerValue: v } }); return this }
  or(cond: string): this { this._or.push(cond); return this }
  order(c: string, o?: { ascending?: boolean }): this { this._ord.push({ col: c, asc: o?.ascending ?? true }); return this }
  range(f: number, t: number): this { this._from = f; this._to = t; return this }
  limit(n: number): this { this._from = 0; this._to = n - 1; return this }
  single(): this { this._single = true; return this }
  maybeSingle(): this { this._maybe = true; return this }

  // Thenable — supports `await db.from('x').select()`
  then(resolve: (v: QueryResult<T>) => void, reject?: (e: any) => void): void {
    this._exec().then(resolve, e => {
      if (reject) reject(e)
      else resolve({ data: null, error: { message: (e as Error).message }, count: null })
    })
  }

  private async _exec(): Promise<QueryResult<T>> {
    try {
      switch (this._mode) {
        case 'select': return await this._doSelect()
        case 'insert': return await this._doInsert()
        case 'update': return await this._doUpdate()
        case 'upsert': return await this._doUpsert()
        case 'delete': return await this._doDelete()
        default: return { data: null, error: { message: 'Unknown op' }, count: null }
      }
    } catch (e: any) {
      console.error(`[DB] ${this._mode} ${this._tbl}:`, e)
      return { data: null, error: { message: e.message || String(e) }, count: null }
    }
  }

  // ── SELECT ──
  private async _doSelect(): Promise<QueryResult<T>> {
    const { cols, joins } = parseSelect(this._sel, this._tbl)
    const oneToOne = joins.filter(j => !j.isMany)
    const oneToMany = joins.filter(j => j.isMany)

    let selCols = cols.includes('*') ? `${this._tbl}.*` : cols.map(c => `${this._tbl}.${c}`).join(', ')
    const joinSql: string[] = []

    for (const j of oneToOne) {
      const fk = findFk(this._tbl, j.table)
      if (fk) {
        joinSql.push(`LEFT JOIN ${j.table} ON ${this._tbl}.${fk} = ${j.table}.id`)
        for (const c of j.columns) {
          if (c !== '*') selCols += `, ${j.table}.${c} AS __j_${j.alias || j.table}__${c}`
        }
      }
    }

    const { sql: wh, params: wp } = this._where()

    if (this._head) {
      const [r] = await dbQuery(`SELECT COUNT(*) as count FROM ${this._tbl} ${wh}`, wp)
      return { data: null, error: null, count: (r?.count as number) || 0 }
    }

    let sql = `SELECT ${selCols} FROM ${this._tbl} ${joinSql.join(' ')} ${wh}`

    let countVal: number | null = null
    if (this._cnt) {
      const [cr] = await dbQuery(`SELECT COUNT(*) as count FROM ${this._tbl} ${wh}`, wp)
      countVal = (cr?.count as number) || 0
    }

    if (this._ord.length) {
      sql += ' ORDER BY ' + this._ord.map(o => `${this._tbl}.${o.col} ${o.asc ? 'ASC' : 'DESC'}`).join(', ')
    }
    if (this._from !== null && this._to !== null) {
      sql += ` LIMIT ${this._to - this._from + 1} OFFSET ${this._from}`
    }

    let rows = await dbQuery(sql, wp)

    // Post-process: restructure __j_ prefixed columns into nested objects
    rows = rows.map(row => {
      const out: Record<string, unknown> = {}
      const jd: Record<string, Record<string, unknown>> = {}
      for (const [k, v] of Object.entries(row)) {
        const m = k.match(/^__j_(\w+)__(\w+)$/)
        if (m) { const [, jt, jc] = m; if (!jd[jt]) jd[jt] = {}; jd[jt][jc] = v }
        else out[k] = v
      }
      for (const [jt, d] of Object.entries(jd)) {
        out[jt] = Object.values(d).every(v => v == null) ? null : d
      }
      return out
    })

    // Fetch one-to-many children
    if (oneToMany.length > 0 && rows.length > 0) {
      for (const j of oneToMany) {
        const fk = findFk(j.table, this._tbl)
        if (!fk) continue
        const ids = rows.map(r => r.id).filter(Boolean)
        if (!ids.length) continue

        let childSel = j.columns.includes('*') ? `${j.table}.*` : j.columns.map(c => `${j.table}.${c}`).join(', ')
        let childJoin = ''
        for (const n of j.nested) {
          const nfk = findFk(j.table, n.table)
          if (nfk) {
            childJoin += ` LEFT JOIN ${n.table} ON ${j.table}.${nfk} = ${n.table}.id`
            for (const c of n.columns) {
              if (c !== '*') childSel += `, ${n.table}.${c} AS __j_${n.alias || n.table}__${c}`
            }
          }
        }

        const ph = ids.map(() => '?').join(',')
        const childRows = await dbQuery(
          `SELECT ${childSel}, ${j.table}.${fk} AS __pfk FROM ${j.table} ${childJoin} WHERE ${j.table}.${fk} IN (${ph})`,
          ids
        )

        // Restructure child nested joins
        const processed = childRows.map(cr => {
          const o: Record<string, unknown> = {}, jd: Record<string, Record<string, unknown>> = {}
          for (const [k, v] of Object.entries(cr)) {
            if (k === '__pfk') continue
            const m = k.match(/^__j_(\w+)__(\w+)$/)
            if (m) { const [, jt, jc] = m; if (!jd[jt]) jd[jt] = {}; jd[jt][jc] = v }
            else o[k] = v
          }
          for (const [jt, d] of Object.entries(jd)) o[jt] = Object.values(d).every(v => v == null) ? null : d
          return { ...o, __pfk: cr.__pfk }
        })

        const alias = j.alias || j.table
        for (const row of rows) {
          (row as any)[alias] = processed
            .filter(c => c.__pfk === row.id)
            .map(({ __pfk, ...rest }) => rest)
        }
      }
    }

    if (this._single) {
      if (!rows.length) return { data: null, error: { message: 'Row not found', code: 'PGRST116' }, count: countVal }
      return { data: rows[0] as T, error: null, count: countVal }
    }
    if (this._maybe) return { data: (rows[0] || null) as T, error: null, count: countVal }
    return { data: rows as unknown as T, error: null, count: countVal }
  }

  // ── INSERT ──
  private async _doInsert(): Promise<QueryResult<T>> {
    if (!this._ins?.length) return { data: null, error: { message: 'No data' }, count: null }
    const results: any[] = []
    for (const row of this._ins) {
      const id = row.id || generateId()
      const d = this._clean({ ...row, id })
      const cols = Object.keys(d)
      const ph = cols.map(() => '?').join(', ')
      const vals = cols.map(c => typeof d[c] === 'object' && d[c] !== null ? JSON.stringify(d[c]) : d[c])
      await dbExecute(`INSERT INTO ${this._tbl} (${cols.join(', ')}) VALUES (${ph})`, vals)
      await this._syncLog('insert', id, d)
      if (this._ret) {
        const [r] = await dbQuery(`SELECT * FROM ${this._tbl} WHERE id = ?`, [id])
        results.push(r)
      } else results.push(d)
    }
    if (this._single || this._maybe) return { data: results[0] as T, error: null, count: null }
    return { data: (results.length === 1 ? results[0] : results) as T, error: null, count: null }
  }

  // ── UPDATE ──
  private async _doUpdate(): Promise<QueryResult<T>> {
    if (!this._upd) return { data: null, error: { message: 'No data' }, count: null }
    const d = this._clean(this._upd)
    const sets = Object.keys(d).map(c => `${c} = ?`).join(', ')
    const vals = Object.values(d).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v)
    const { sql: wh, params: wp } = this._where()
    await dbExecute(`UPDATE ${this._tbl} SET ${sets} ${wh}`, [...vals, ...wp])
    if (this._ret || this._single || this._maybe) {
      const rows = await dbQuery(`SELECT * FROM ${this._tbl} ${wh}`, wp)
      for (const r of rows) await this._syncLog('update', r.id as string, r)
      if (this._single) return { data: rows[0] as T || null, error: rows.length ? null : { message: 'Not found' }, count: null }
      if (this._maybe) return { data: (rows[0] || null) as T, error: null, count: null }
      return { data: rows as unknown as T, error: null, count: null }
    }
    const idW = this._wh.find(w => w.col === 'id' && w.op === 'eq')
    if (idW) await this._syncLog('update', idW.val as string, d)
    return { data: null, error: null, count: null }
  }

  // ── UPSERT ──
  private async _doUpsert(): Promise<QueryResult<T>> {
    if (!this._ins?.length) return { data: null, error: { message: 'No data' }, count: null }
    const results: any[] = []
    for (const row of this._ins) {
      const id = row.id || generateId()
      const d = this._clean({ ...row, id })
      const cols = Object.keys(d)
      const ph = cols.map(() => '?').join(', ')
      const vals = cols.map(c => typeof d[c] === 'object' && d[c] !== null ? JSON.stringify(d[c]) : d[c])
      const conflict = this._upsConflict || 'id'
      const upd = cols.filter(c => c !== conflict).map(c => `${c} = excluded.${c}`).join(', ')
      await dbExecute(`INSERT INTO ${this._tbl} (${cols.join(', ')}) VALUES (${ph}) ON CONFLICT(${conflict}) DO UPDATE SET ${upd}`, vals)
      if (this._ret) { const [r] = await dbQuery(`SELECT * FROM ${this._tbl} WHERE id = ?`, [id]); results.push(r) }
      else results.push(d)
    }
    if (this._single || this._maybe) return { data: results[0] as T, error: null, count: null }
    return { data: results as unknown as T, error: null, count: null }
  }

  // ── DELETE ──
  private async _doDelete(): Promise<QueryResult<T>> {
    const idW = this._wh.find(w => w.col === 'id' && w.op === 'eq')
    if (idW) await this._syncLog('delete', idW.val as string, null)
    const { sql: wh, params: wp } = this._where()
    await dbExecute(`DELETE FROM ${this._tbl} ${wh}`, wp)
    return { data: null, error: null, count: null }
  }

  // ── WHERE builder ──
  private _where(): { sql: string; params: unknown[] } {
    const conds: string[] = [], params: unknown[] = []
    for (const w of this._wh) {
      const c = `${this._tbl}.${w.col}`
      switch (w.op) {
        case 'eq': conds.push(`${c} = ?`); params.push(w.val); break
        case 'neq': conds.push(`${c} != ?`); params.push(w.val); break
        case 'gt': conds.push(`${c} > ?`); params.push(w.val); break
        case 'gte': conds.push(`${c} >= ?`); params.push(w.val); break
        case 'lt': conds.push(`${c} < ?`); params.push(w.val); break
        case 'lte': conds.push(`${c} <= ?`); params.push(w.val); break
        case 'like': conds.push(`${c} LIKE ?`); params.push(w.val); break
        case 'ilike': conds.push(`LOWER(${c}) LIKE LOWER(?)`); params.push(w.val); break
        case 'is': w.val === null ? conds.push(`${c} IS NULL`) : (conds.push(`${c} IS ?`), params.push(w.val)); break
        case 'in': {
          const arr = w.val as unknown[]
          if (arr?.length) { conds.push(`${c} IN (${arr.map(() => '?').join(',')})`); params.push(...arr) }
          break
        }
        case 'not': {
          const { innerOp, innerValue } = w.val as any
          if (innerOp === 'is' && innerValue === null) conds.push(`${c} IS NOT NULL`)
          else { conds.push(`${c} != ?`); params.push(innerValue) }
          break
        }
      }
    }
    for (const orStr of this._or) {
      const parts = orStr.split(',').map(p => {
        const m = p.trim().match(/^(\w+)\.(eq|neq|gt|gte|lt|lte|like|ilike|is)\.(.+)$/)
        if (!m) return '1=0'
        const [, col, op, val] = m
        const fc = `${this._tbl}.${col}`
        switch (op) {
          case 'ilike': params.push(val); return `LOWER(${fc}) LIKE LOWER(?)`
          case 'like': params.push(val); return `${fc} LIKE ?`
          case 'eq': params.push(val); return `${fc} = ?`
          case 'is': return val === 'null' ? `${fc} IS NULL` : `${fc} IS ?`
          default: params.push(val); return `${fc} ${op === 'neq' ? '!=' : op === 'gte' ? '>=' : op === 'lte' ? '<=' : op === 'gt' ? '>' : '<'} ?`
        }
      })
      if (parts.length) conds.push(`(${parts.join(' OR ')})`)
    }
    return { sql: conds.length ? `WHERE ${conds.join(' AND ')}` : '', params }
  }

  private _clean(obj: any): Record<string, any> {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) out[k] = v
    }
    return out
  }

  private async _syncLog(action: string, id: string, payload: any): Promise<void> {
    if (this._tbl.startsWith('_')) return
    try {
      await dbExecute(
        `INSERT INTO _sync_log (table_name, record_id, action, payload) VALUES (?, ?, ?, ?)`,
        [this._tbl, id, action, payload ? JSON.stringify(payload) : null]
      )
    } catch { /* non-critical */ }
  }
}

// ─── RPC Handler ────────────────────────────────────────────────────

async function handleRpc(fn: string, p: Record<string, any>): Promise<any> {
  switch (fn) {
    case 'generate_next_number': {
      const et = p.p_entity_type
      await dbExecute(`UPDATE number_sequences SET current_number = current_number + 1, updated_at = datetime('now') WHERE entity_type = ?`, [et])
      const [seq] = await dbQuery(`SELECT prefix, current_number, padding FROM number_sequences WHERE entity_type = ?`, [et])
      if (!seq) {
        const pre = et.toUpperCase().replace(/_/g, '-') + '-'
        await dbExecute(`INSERT INTO number_sequences (id, entity_type, prefix, current_number, padding) VALUES (?, ?, ?, 1, 4)`, [generateId(), et, pre])
        return `${pre}0001`
      }
      return `${seq.prefix}${String(seq.current_number).padStart(seq.padding as number, '0')}`
    }
    case 'get_dashboard_data': {
      const days = p.p_days || 30
      const since = new Date(); since.setDate(since.getDate() - days)
      const sinceStr = since.toISOString().split('T')[0]
      const [s] = await dbQuery(`SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as total FROM sales_orders WHERE order_date >= ?`, [sinceStr])
      const [i] = await dbQuery(`SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as total, COALESCE(SUM(balance_amount),0) as outstanding FROM invoices WHERE invoice_date >= ?`, [sinceStr])
      const [pr] = await dbQuery(`SELECT COUNT(*) as count FROM products WHERE status = 'active'`)
      const [cu] = await dbQuery(`SELECT COUNT(*) as count FROM customers WHERE status = 'active'`)
      return { total_sales: s?.total || 0, sales_count: s?.count || 0, total_invoiced: i?.total || 0, invoice_count: i?.count || 0, outstanding: i?.outstanding || 0, active_products: pr?.count || 0, active_customers: cu?.count || 0 }
    }
    case 'get_customer_ledger': {
      return await dbQuery(`
        SELECT 'invoice' as type, invoice_number as reference, invoice_date as date, total_amount as debit, 0 as credit, balance_amount, status FROM invoices WHERE customer_id = ?
        UNION ALL
        SELECT 'payment' as type, p.reference_number as reference, p.payment_date as date, 0 as debit, p.amount as credit, 0 as balance, p.status FROM payments p JOIN invoices i ON p.invoice_id = i.id WHERE i.customer_id = ?
        ORDER BY date DESC
      `, [p.p_customer_id, p.p_customer_id])
    }
    default: console.warn(`[DB] Unknown RPC: ${fn}`); return null
  }
}

// ─── Main Export ────────────────────────────────────────────────────

export const db = {
  from: <T = any>(table: string) => new QueryBuilder<T>(table),
  rpc: async (fn: string, params?: Record<string, any>) => {
    try { return { data: await handleRpc(fn, params || {}), error: null } }
    catch (e: any) { return { data: null, error: { message: e.message } } }
  },
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File | Blob) => {
        await ensureFsReady()
        if (!appDataPath || !imagesDir) {
          console.warn('[Storage] File system not ready')
          return { data: { path: `${bucket}/${path}` }, error: null }
        }
        try {
          const buffer = await file.arrayBuffer()
          const pathParts = path.split('/').slice(0, -1)
          const dirPath = await invoke('fs-join', [imagesDir, bucket, ...pathParts])
          if (!(await invoke('fs-exists', dirPath))) {
            await invoke('fs-create-dir', dirPath)
          }
          const fullPath = await invoke('fs-join', [imagesDir, bucket, path])
          await invoke('fs-write-binary', [fullPath, Array.from(new Uint8Array(buffer))])
          return { data: { path: `${bucket}/${path}` }, error: null }
        } catch (e: any) {
          console.error('[Storage] Upload failed', e)
          return { data: null, error: { message: e.message } }
        }
      },
      getPublicUrl: (path: string) => {
        const cleanPath = path.startsWith(bucket + '/') ? path.substring(bucket.length + 1) : path
        if (appDataPath && imagesDir) {
          const formattedPath = `${imagesDir}\\${bucket}\\${cleanPath}`.replace(/\\/g, '/')
          return { data: { publicUrl: `file:///${formattedPath}` } }
        }
        return { data: { publicUrl: `${bucket}/${cleanPath}` } }
      },
      remove: async (paths: string[]) => {
        if (!imagesDir) return { data: null, error: null }
        for (const p of paths) {
          const cleanPath = p.startsWith(bucket + '/') ? p.substring(bucket.length + 1) : p
          try {
            const fullPath = await invoke('fs-join', [imagesDir, bucket, cleanPath])
            if (await invoke('fs-exists', fullPath)) {
              await invoke('fs-remove', fullPath)
            }
          } catch (e) {
            console.error('[Storage] Delete failed', e)
          }
        }
        return { data: null, error: null }
      },
    })
  },
}

export default db
