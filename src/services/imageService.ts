import { supabase } from '@/lib/supabase';

const MAX_FILE_SIZE = 500 * 1024; // 500KB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface ImageUploadResult {
  url: string;
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

  if (file.size > MAX_FILE_SIZE) {
    return {
      field: 'size',
      message: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`
    };
  }

  return null;
}

// Optimize image before upload
export async function optimizeImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'image/jpeg' | 'image/png' | 'image/webp';
  } = {}
): Promise<Blob> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
    format = 'image/webp'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
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

// Upload image to Supabase Storage
export async function uploadProductImage(
  file: File,
  productId: string
): Promise<ImageUploadResult> {
  // Validate
  const validationError = validateImage(file);
  if (validationError) {
    throw new Error(validationError.message);
  }

  // Optimize
  const optimizedBlob = await optimizeImage(file);
  
  // Generate filename
  const timestamp = Date.now();
  const fileExt = 'webp';
  const fileName = `products/${productId}/${timestamp}.${fileExt}`;

  // Upload
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(fileName, optimizedBlob, {
      contentType: 'image/webp',
      upsert: true
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  return {
    url: publicUrl,
    path: fileName,
    size: optimizedBlob.size,
    width: 0, // Could get from canvas
    height: 0
  };
}

// Upload raw material image
export async function uploadRawMaterialImage(
  file: File,
  materialId: string
): Promise<ImageUploadResult> {
  const validationError = validateImage(file);
  if (validationError) {
    throw new Error(validationError.message);
  }

  const optimizedBlob = await optimizeImage(file);
  const timestamp = Date.now();
  const fileName = `raw-materials/${materialId}/${timestamp}.webp`;

  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(fileName, optimizedBlob, {
      contentType: 'image/webp',
      upsert: true
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  return {
    url: publicUrl,
    path: fileName,
    size: optimizedBlob.size,
    width: 0,
    height: 0
  };
}

// Delete image
export async function deleteImage(imageUrl: string): Promise<void> {
  // Extract path from URL
  const url = new URL(imageUrl);
  const pathMatch = url.pathname.match(/product-images\/(.*)/);
  
  if (!pathMatch) {
    throw new Error('Invalid image URL');
  }

  const path = pathMatch[1];

  const { error } = await supabase.storage
    .from('product-images')
    .remove([path]);

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

// Create thumbnail
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

      // Calculate thumbnail size
      let { width, height } = img;
      if (width > height) {
        height = (height / width) * maxSize;
        width = maxSize;
      } else {
        width = (width / height) * maxSize;
        height = maxSize;
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}