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
    type: 'image/png' as const,
  };

  try {
    return await QRCode.toDataURL(data, qrOptions);
  } catch (error) {
    console.error('[QRCode] Failed to generate:', error);
    throw error;
  }
}

export async function generateQRCodeForProduct(product: {
  id: string
  name?: string | null
  sku?: string | null
  product_code?: string | null
}): Promise<string> {
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

export async function generateQRCodeForBatch(batch: {
  id: string
  batch_number?: string | null
  product_name?: string | null
}): Promise<string> {
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

export async function generateQRCodeForWorkOrder(order: {
  id: string
  work_order_number?: string | null
  product_name?: string | null
}): Promise<string> {
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

/** Parsed JSON (or URL-derived) payload from a QR scan. */
export function parseQRCodeData(qrString: string): Record<string, unknown> | null {
  try {
    const data = JSON.parse(qrString) as unknown
    if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
      return data as Record<string, unknown>
    }
    return null
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