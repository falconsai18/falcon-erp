import { supabase } from '@/lib/supabase';

// ✅ CHANGED: 300KB as per your requirement
const MAX_FILE_SIZE = 300 * 1024; // 300KB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface ImageUploadResult {
  url: string;
  thumbnailUrl: string; // ✅ NEW: thumbnail URL
  path: string;
  size: number;
  width: number;
  height: number;
}

export interface ImageValidationError {
  field: string;
  message: string;
}

// Validate image file
export function validateImage(file: File): ImageValidationError | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      field: 'type',
      message: 'Invalid file type. Please upload JPG, PNG, or WebP images.'
    };
  }

  if (file.size > MAX_FILE_SIZE * 10) {
    // ✅ CHANGED: Allow up to 3MB raw input (we compress it anyway)
    return {
      field: 'size',
      message: 'File too large. Maximum upload size is 3MB (will be compressed automatically).'
    };
  }

  return null;
}

// ✅ CHANGED: Optimize image with new settings
export async function optimizeImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'image/jpeg' | 'image/png' | 'image/webp';
  } = {}
): Promise<{ blob: Blob; width: number; height: number }> {
  const {
    maxWidth = 800,    // ✅ CHANGED: 1200 → 800
    maxHeight = 800,   // ✅ CHANGED: 1200 → 800
    quality = 0.75,    // ✅ CHANGED: 0.85 → 0.75
    format = 'image/webp'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            // ✅ NEW: Check if compressed size exceeds limit
            if (blob.size > MAX_FILE_SIZE) {
              // Re-compress with lower quality
              canvas.toBlob(
                (retryBlob) => {
                  if (retryBlob) {
                    resolve({ blob: retryBlob, width, height });
                  } else {
                    resolve({ blob, width, height }); // Use original attempt
                  }
                },
                format,
                0.6 // Lower quality fallback
              );
            } else {
              resolve({ blob, width, height });
            }
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        format,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

// ✅ NEW: Create thumbnail blob (150x150)
export async function createThumbnailBlob(
  file: File,
  maxSize: number = 150
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      let { width, height } = img;
      if (width > height) {
        height = Math.round((height / width) * maxSize);
        width = maxSize;
      } else {
        width = Math.round((width / height) * maxSize);
        height = maxSize;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create thumbnail blob'));
        },
        'image/webp',
        0.7
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

// ✅ CHANGED: Upload product image (now also uploads thumbnail)
export async function uploadProductImage(
  file: File,
  productId: string
): Promise<ImageUploadResult> {
  const validationError = validateImage(file);
  if (validationError) {
    throw new Error(validationError.message);
  }

  const timestamp = Date.now();

  // Optimize main image
  const { blob: optimizedBlob, width, height } = await optimizeImage(file);

  // Create thumbnail
  const thumbnailBlob = await createThumbnailBlob(file);

  // Upload main image
  const mainPath = `products/${productId}/${timestamp}.webp`;
  const { error: mainError } = await supabase.storage
    .from('product-images')
    .upload(mainPath, optimizedBlob, {
      contentType: 'image/webp',
      upsert: true
    });

  if (mainError) {
    throw new Error(`Upload failed: ${mainError.message}`);
  }

  // Upload thumbnail
  const thumbPath = `products/${productId}/${timestamp}_thumb.webp`;
  const { error: thumbError } = await supabase.storage
    .from('product-images')
    .upload(thumbPath, thumbnailBlob, {
      contentType: 'image/webp',
      upsert: true
    });

  if (thumbError) {
    console.warn('Thumbnail upload failed, using main image:', thumbError.message);
  }

  // Get public URLs
  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(mainPath);

  const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(thumbPath);

  return {
    url: publicUrl,
    thumbnailUrl: thumbError ? publicUrl : thumbPublicUrl,
    path: mainPath,
    size: optimizedBlob.size,
    width,
    height
  };
}

// ✅ CHANGED: Upload raw material image (same pattern)
export async function uploadRawMaterialImage(
  file: File,
  materialId: string
): Promise<ImageUploadResult> {
  const validationError = validateImage(file);
  if (validationError) {
    throw new Error(validationError.message);
  }

  const timestamp = Date.now();

  const { blob: optimizedBlob, width, height } = await optimizeImage(file);
  const thumbnailBlob = await createThumbnailBlob(file);

  const mainPath = `raw-materials/${materialId}/${timestamp}.webp`;
  const { error: mainError } = await supabase.storage
    .from('product-images')
    .upload(mainPath, optimizedBlob, {
      contentType: 'image/webp',
      upsert: true
    });

  if (mainError) {
    throw new Error(`Upload failed: ${mainError.message}`);
  }

  const thumbPath = `raw-materials/${materialId}/${timestamp}_thumb.webp`;
  const { error: thumbError } = await supabase.storage
    .from('product-images')
    .upload(thumbPath, thumbnailBlob, {
      contentType: 'image/webp',
      upsert: true
    });

  if (thumbError) {
    console.warn('Thumbnail upload failed, using main image:', thumbError.message);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(mainPath);

  const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(thumbPath);

  return {
    url: publicUrl,
    thumbnailUrl: thumbError ? publicUrl : thumbPublicUrl,
    path: mainPath,
    size: optimizedBlob.size,
    width,
    height
  };
}

// Delete image (also deletes thumbnail)
export async function deleteImage(imageUrl: string): Promise<void> {
  const url = new URL(imageUrl);
  const pathMatch = url.pathname.match(/product-images\/(.*)/);

  if (!pathMatch) {
    throw new Error('Invalid image URL');
  }

  const path = pathMatch[1];
  // ✅ NEW: Also delete thumbnail
  const thumbPath = path.replace('.webp', '_thumb.webp');

  const { error } = await supabase.storage
    .from('product-images')
    .remove([path, thumbPath]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

// Get image dimensions
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ✅ KEPT: Create thumbnail as data URL (for preview before upload)
export async function createThumbnail(
  file: File,
  maxSize: number = 150
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      let { width, height } = img;
      if (width > height) {
        height = Math.round((height / width) * maxSize);
        width = maxSize;
      } else {
        width = Math.round((width / height) * maxSize);
        height = maxSize;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/webp', 0.7)); // ✅ CHANGED: jpeg → webp
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}