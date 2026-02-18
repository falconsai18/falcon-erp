import Quagga from '@ericblade/quagga2';
import { supabase } from '@/lib/supabase';

export interface BarcodeResult {
  barcode: string;
  format: string;
  productId?: string;
  productName?: string;
  sku?: string;
}

/**
 * Scan a barcode from an image file using Quagga2
 */
export async function scanBarcodeFromImage(file: File): Promise<BarcodeResult | null> {
  return new Promise((resolve) => {
    const imageUrl = URL.createObjectURL(file);

    Quagga.decodeSingle(
      {
        src: imageUrl,
        numOfWorkers: 0,
        decoder: {
          readers: [
            'ean_reader',
            'ean_8_reader',
            'code_128_reader',
            'code_39_reader',
            'upc_reader',
            'upc_e_reader',
            'i2of5_reader',
          ],
        },
        locate: true,
      },
      (result) => {
        URL.revokeObjectURL(imageUrl);
        if (result?.codeResult?.code) {
          resolve({
            barcode: result.codeResult.code,
            format: result.codeResult.format || 'unknown',
          });
        } else {
          resolve(null);
        }
      }
    );
  });
}

/**
 * Look up a product in Supabase by barcode/SKU
 */
export async function findProductByBarcode(barcode: string): Promise<{
  productId: string;
  productName: string;
  sku: string;
} | null> {
  // Try matching by SKU first (exact match)
  const { data: skuMatch } = await supabase
    .from('products')
    .select('id, name, sku')
    .eq('sku', barcode)
    .eq('status', 'active')
    .single();

  if (skuMatch) {
    return {
      productId: skuMatch.id,
      productName: skuMatch.name,
      sku: skuMatch.sku,
    };
  }

  // Try partial SKU match (barcode may be part of SKU)
  const { data: partialMatch } = await supabase
    .from('products')
    .select('id, name, sku')
    .ilike('sku', `%${barcode}%`)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (partialMatch) {
    return {
      productId: partialMatch.id,
      productName: partialMatch.name,
      sku: partialMatch.sku,
    };
  }

  return null;
}

/**
 * Scan barcode from image file and find matching product
 */
export async function scanAndFindProduct(file: File): Promise<BarcodeResult | null> {
  const barcodeResult = await scanBarcodeFromImage(file);
  if (!barcodeResult) return null;

  const product = await findProductByBarcode(barcodeResult.barcode);
  if (product) {
    return {
      ...barcodeResult,
      productId: product.productId,
      productName: product.productName,
      sku: product.sku,
    };
  }

  // Return barcode even if product not found - user can manually select
  return barcodeResult;
}
