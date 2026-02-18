import { generateQRCode } from './qrCodeService';

export interface WorkflowAction {
  id: string;
  label: string;
  icon: string;
  action: 'navigate' | 'modal' | 'api' | 'sheet';
  endpoint?: string;
  requiresAuth?: boolean;
  confirmationMessage?: string;
  color?: string;
  bgColor?: string;
}

export type EntityType = 'product' | 'batch' | 'material' | 'work_order' | 'customer' | 'supplier';

export interface QRWorkflowData {
  type: EntityType;
  id: string;
  entityData: any;
  suggestedActions: WorkflowAction[];
  qrCodeData: string;
}

// Generate workflow data based on entity type and state
export async function generateWorkflowData(
  type: QRWorkflowData['type'],
  entity: any
): Promise<QRWorkflowData> {
  const baseData: QRWorkflowData = {
    type,
    id: entity.id,
    entityData: {
      id: entity.id,
      name: entity.name || entity.product_name || entity.work_order_number,
      code: entity.sku || entity.product_code || entity.batch_number,
      status: entity.status
    },
    qrCodeData: '',
    suggestedActions: []
  };

  // Generate actions based on entity type and status
  switch (type) {
    case 'product':
      baseData.suggestedActions = generateProductActions(entity);
      break;
    case 'batch':
      baseData.suggestedActions = generateBatchActions(entity);
      break;
    case 'material':
      baseData.suggestedActions = generateMaterialActions(entity);
      break;
    case 'work_order':
      baseData.suggestedActions = generateWorkOrderActions(entity);
      break;
    case 'customer':
      baseData.suggestedActions = generateCustomerActions(entity);
      break;
    case 'supplier':
      baseData.suggestedActions = generateSupplierActions(entity);
      break;
  }

  // Generate QR code data string
  baseData.qrCodeData = JSON.stringify({
    v: 1, // Version
    t: type,
    id: entity.id,
    c: entity.sku || entity.product_code || entity.batch_number || entity.id,
    n: entity.name || entity.product_name || entity.work_order_number,
    url: `${window.location.origin}/${getEntityPath(type)}/${entity.id}`
  });

  return baseData;
}

// Generate actions for products
function generateProductActions(product: any): WorkflowAction[] {
  const actions: WorkflowAction[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: 'Eye',
      action: 'navigate',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    {
      id: 'inventory',
      label: 'Check Stock',
      icon: 'Package',
      action: 'navigate',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20'
    }
  ];

  // Add reorder action if low stock
  if (product.current_stock && product.reorder_point && product.current_stock <= product.reorder_point) {
    actions.push({
      id: 'reorder',
      label: 'Create PO',
      icon: 'ShoppingCart',
      action: 'modal',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      confirmationMessage: 'Create purchase order for this material?'
    });
  }

  return actions;
}

// Generate actions for batches
function generateBatchActions(batch: any): WorkflowAction[] {
  const actions: WorkflowAction[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: 'Eye',
      action: 'navigate',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    }
  ];

  // QC actions
  if (batch.status === 'in_qc' || batch.status === 'qc_pending') {
    actions.push(
      {
        id: 'approve_qc',
        label: 'Approve QC',
        icon: 'CheckCircle',
        action: 'api',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        confirmationMessage: 'Approve this batch for QC?'
      },
      {
        id: 'reject_qc',
        label: 'Reject QC',
        icon: 'XCircle',
        action: 'api',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        confirmationMessage: 'Reject this batch?',
        requiresAuth: true
      }
    );
  }

  // Production actions
  if (batch.status === 'approved' || batch.status === 'ready') {
    actions.push({
      id: 'start_production',
      label: 'Start Production',
      icon: 'Play',
      action: 'modal',
      color: 'text-brand-400',
      bgColor: 'bg-brand-500/20'
    });
  }

  // Expiry warning
  if (batch.expiry_date) {
    const daysToExpiry = Math.ceil((new Date(batch.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysToExpiry < 0) {
      actions.unshift({
        id: 'expired',
        label: 'EXPIRED - Mark Dispose',
        icon: 'AlertTriangle',
        action: 'api',
        color: 'text-red-400',
        bgColor: 'bg-red-500/30',
        confirmationMessage: 'This batch has expired. Mark as disposed?'
      });
    } else if (daysToExpiry < 7) {
      actions.unshift({
        id: 'expiring_soon',
        label: `Expires in ${daysToExpiry} days`,
        icon: 'Clock',
        action: 'navigate',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20'
      });
    }
  }

  return actions;
}

// Generate actions for raw materials
function generateMaterialActions(material: any): WorkflowAction[] {
  const actions: WorkflowAction[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: 'Eye',
      action: 'navigate',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    }
  ];

  // Stock level actions
  if (material.current_stock && material.reorder_point) {
    const stockRatio = material.current_stock / material.reorder_point;
    
    if (stockRatio <= 1) {
      actions.push({
        id: 'low_stock',
        label: 'Create PO',
        icon: 'ShoppingCart',
        action: 'sheet',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        confirmationMessage: 'Stock is low. Create purchase order?'
      });
    } else if (stockRatio <= 1.5) {
      actions.push({
        id: 'reorder_soon',
        label: 'Plan Reorder',
        icon: 'Calendar',
        action: 'navigate',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20'
      });
    }
  }

  return actions;
}

// Generate actions for work orders
function generateWorkOrderActions(order: any): WorkflowAction[] {
  const actions: WorkflowAction[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: 'Eye',
      action: 'navigate',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    }
  ];

  // Status-based actions
  switch (order.status) {
    case 'scheduled':
    case 'pending':
      actions.push({
        id: 'start',
        label: 'Start Production',
        icon: 'Play',
        action: 'api',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        confirmationMessage: 'Start production for this work order?'
      });
      break;

    case 'in_progress':
      actions.push(
        {
          id: 'issue_material',
          label: 'Issue Material',
          icon: 'Package',
          action: 'sheet',
          color: 'text-brand-400',
          bgColor: 'bg-brand-500/20'
        },
        {
          id: 'record_scrap',
          label: 'Record Scrap',
          icon: 'Trash2',
          action: 'modal',
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/20'
        },
        {
          id: 'complete',
          label: 'Complete',
          icon: 'CheckCircle',
          action: 'api',
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/20',
          confirmationMessage: 'Mark work order as complete?'
        }
      );
      break;

    case 'completed':
      actions.push({
        id: 'view_qc',
        label: 'View QC Report',
        icon: 'FileCheck',
        action: 'navigate',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20'
      });
      break;
  }

  return actions;
}

// Generate actions for customers
function generateCustomerActions(customer: any): WorkflowAction[] {
  return [
    {
      id: 'view',
      label: 'View Profile',
      icon: 'User',
      action: 'navigate',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    {
      id: 'new_order',
      label: 'New Order',
      icon: 'Plus',
      action: 'navigate',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20'
    },
    {
      id: 'ledger',
      label: 'View Ledger',
      icon: 'BookOpen',
      action: 'navigate',
      color: 'text-brand-400',
      bgColor: 'bg-brand-500/20'
    }
  ];
}

// Generate actions for suppliers
function generateSupplierActions(supplier: any): WorkflowAction[] {
  return [
    {
      id: 'view',
      label: 'View Profile',
      icon: 'Building',
      action: 'navigate',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    {
      id: 'new_po',
      label: 'Create PO',
      icon: 'FileText',
      action: 'navigate',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20'
    },
    {
      id: 'payment',
      label: 'Record Payment',
      icon: 'CreditCard',
      action: 'modal',
      color: 'text-brand-400',
      bgColor: 'bg-brand-500/20'
    }
  ];
}

// Helper to get entity path
function getEntityPath(type: QRWorkflowData['type']): string {
  const paths: Record<string, string> = {
    product: 'products',
    batch: 'batches',
    material: 'raw-materials',
    work_order: 'work-orders',
    customer: 'customers',
    supplier: 'suppliers'
  };
  return paths[type] || type;
}

// Execute workflow action
export async function executeWorkflowAction(
  action: WorkflowAction,
  entityData: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    switch (action.action) {
      case 'navigate':
        // Navigation handled by component
        return { success: true };

      case 'api':
        // API call (implementation depends on specific endpoint)
        console.log(`[QRWorkflow] Executing API action: ${action.id}`, entityData);
        return { success: true };

      case 'modal':
      case 'sheet':
        // Modal/Sheet opening handled by component
        return { success: true };

      default:
        return { success: false, error: 'Unknown action type' };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Action failed'
    };
  }
}