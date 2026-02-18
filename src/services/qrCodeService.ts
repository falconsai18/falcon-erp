// @ts-nocheck - QRCode library has complex types
import QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

export async function generateQRCode(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const qrOptions = {
    width: options.width || 400,
    margin: options.margin || 2,
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#ffffff'
    },
    type: 'image/png'
  };

  try {
    return await QRCode.toDataURL(data, qrOptions);
  } catch (error) {
    console.error('[QRCode] Failed to generate:', error);
    throw error;
  }
}

export async function generateQRCodeForProduct(product: any): Promise<string> {
  const data = JSON.stringify({
    v: 1,
    t: 'product',
    id: product.id,
    c: product.sku || product.product_code,
    n: product.name,
    url: `${window.location.origin}/products/${product.id}`
  });

  return generateQRCode(data, { width: 300 });
}

export async function generateQRCodeForBatch(batch: any): Promise<string> {
  const data = JSON.stringify({
    v: 1,
    t: 'batch',
    id: batch.id,
    c: batch.batch_number,
    n: batch.product_name,
    url: `${window.location.origin}/batches/${batch.id}`
  });

  return generateQRCode(data, { width: 300 });
}

export async function generateQRCodeForWorkOrder(order: any): Promise<string> {
  const data = JSON.stringify({
    v: 1,
    t: 'work_order',
    id: order.id,
    c: order.work_order_number,
    n: order.product_name,
    url: `${window.location.origin}/work-orders/${order.id}`
  });

  return generateQRCode(data, { width: 300 });
}

export function parseQRCodeData(qrString: string): any | null {
  try {
    return JSON.parse(qrString);
  } catch {
    // Try to parse as URL
    if (qrString.includes('/products/')) {
      const match = qrString.match(/\/products\/(\w+)/);
      if (match) {
        return { t: 'product', id: match[1] };
      }
    }
    if (qrString.includes('/batches/')) {
      const match = qrString.match(/\/batches\/(\w+)/);
      if (match) {
        return { t: 'batch', id: match[1] };
      }
    }
    return null;
  }
}