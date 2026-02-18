import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { haptics } from '@/lib/offline/haptics';
import { 
  validateImage, 
  formatFileSize, 
  createThumbnail,
  uploadProductImage,
  ImageUploadResult
} from '@/services/imageService';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  maxSize?: number;
  bucket?: string;
  entityId?: string;
  className?: string;
  label?: string;
  placeholder?: string;
}

export function ImageUpload({
  value,
  onChange,
  maxSize = 500 * 1024,
  entityId,
  className,
  label = 'Upload Image',
  placeholder = 'Drop image here or click to browse'
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    setError(null);
    
    // Validate
    const validationError = validateImage(file);
    if (validationError) {
      setError(validationError.message);
      haptics.error();
      return;
    }

    // Create preview
    try {
      const thumbnail = await createThumbnail(file);
      setPreview(thumbnail);
    } catch {
      // Ignore preview error
    }

    // Upload
    if (!entityId) {
      setError('Entity ID required for upload');
      return;
    }

    setIsUploading(true);
    haptics.medium();

    try {
      const result = await uploadProductImage(file, entityId);
      onChange(result.url);
      haptics.success();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      haptics.error();
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [entityId]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [entityId]);

  const handleRemove = useCallback(() => {
    onChange(null);
    setPreview(null);
    haptics.light();
  }, [onChange]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}

      {value ? (
        // Image Preview
        <div className="relative group">
          <img
            src={value}
            alt="Uploaded"
            className="w-full h-48 object-cover rounded-xl border border-dark-300"
          />
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        // Upload Area
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
            "border-gray-600 hover:border-brand-500",
            isDragging && "border-brand-500 bg-brand-500/10",
            isUploading && "opacity-50 pointer-events-none"
          )}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">Uploading...</span>
            </div>
          ) : preview ? (
            <img
              src={preview}
              alt="Preview"
              className="w-32 h-32 object-cover rounded-lg mx-auto"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-dark-200">
                <Upload size={24} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-400">{placeholder}</p>
              <p className="text-xs text-gray-500">
                Max {formatFileSize(maxSize)} • JPG, PNG, WebP
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// Compact version for inline use
interface CompactImageUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  entityId?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CompactImageUpload({
  value,
  onChange,
  entityId,
  size = 'md'
}: CompactImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !entityId) return;

    const validationError = validateImage(file);
    if (validationError) return;

    setIsUploading(true);
    try {
      const result = await uploadProductImage(file, entityId);
      onChange(result.url);
      haptics.success();
    } catch {
      haptics.error();
    } finally {
      setIsUploading(false);
    }
  };

  if (value) {
    return (
      <div className={cn("relative group rounded-lg overflow-hidden", sizeClasses[size])}>
        <img
          src={value}
          alt="Product"
          className="w-full h-full object-cover"
        />
        <button
          onClick={() => onChange(null)}
          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={16} className="text-white" />
        </button>
      </div>
    );
  }

  return (
    <label className={cn(
      "flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-brand-500 transition-colors",
      sizeClasses[size]
    )}>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />
      {isUploading ? (
        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      ) : (
        <ImageIcon size={20} className="text-gray-400" />
      )}
    </label>
  );
}