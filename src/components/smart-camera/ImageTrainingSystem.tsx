import React, { useState, useCallback, useEffect } from 'react';
import { Camera, Plus, Trash2, Save, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/offline/haptics';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { MobileBottomSheet } from '../ui/MobileBottomSheet';

interface ProductTrainingData {
  productId: string;
  productName: string;
  category: string;
  imageUrls: string[];
  labels: string[];
}

interface ImageTrainingSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImageTrainingSystem({ isOpen, onClose }: ImageTrainingSystemProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [trainingData, setTrainingData] = useState<Map<string, ProductTrainingData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentCaptures, setCurrentCaptures] = useState<string[]>([]);
  const [customLabels, setCustomLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load products
  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, image_url')
        .order('name');

      if (error) throw error;
      setProducts(data || []);

      // Load existing training data
      const { data: trainingRows } = await supabase
        .from('product_training_data')
        .select('*');

      if (trainingRows) {
        const dataMap = new Map<string, ProductTrainingData>();
        trainingRows.forEach((row: any) => {
          dataMap.set(row.product_id, {
            productId: row.product_id,
            productName: row.product_name,
            category: row.category,
            imageUrls: row.image_urls || [],
            labels: row.labels || []
          });
        });
        setTrainingData(dataMap);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    const existing = trainingData.get(product.id);
    
    if (existing) {
      setCurrentCaptures(existing.imageUrls);
      setCustomLabels(existing.labels);
    } else {
      setCurrentCaptures([]);
      setCustomLabels([]);
      // Auto-generate labels from product data
      const autoLabels = [
        product.name.toLowerCase(),
        product.category?.toLowerCase(),
        'ayurvedic',
        'product'
      ].filter(Boolean);
      setCustomLabels(autoLabels);
    }
  };

  const handleCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      setCurrentCaptures(prev => [...prev, url]);
    });

    haptics.success();
  };

  const handleRemoveCapture = (index: number) => {
    setCurrentCaptures(prev => prev.filter((_, i) => i !== index));
    haptics.light();
  };

  const handleAddLabel = () => {
    if (newLabel.trim() && !customLabels.includes(newLabel.trim().toLowerCase())) {
      setCustomLabels(prev => [...prev, newLabel.trim().toLowerCase()]);
      setNewLabel('');
      haptics.light();
    }
  };

  const handleRemoveLabel = (label: string) => {
    setCustomLabels(prev => prev.filter(l => l !== label));
    haptics.light();
  };

  const handleSave = async () => {
    if (!selectedProduct || currentCaptures.length === 0) {
      toast.error('Please select a product and capture at least one image');
      return;
    }

    setIsSaving(true);
    try {
      // Upload images to storage
      const uploadedUrls: string[] = [];
      
      for (const captureUrl of currentCaptures) {
        if (captureUrl.startsWith('blob:')) {
          // Upload new image
          const response = await fetch(captureUrl);
          const blob = await response.blob();
          const fileName = `training/${selectedProduct.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
          
          const { data, error } = await supabase.storage
            .from('product-images')
            .upload(fileName, blob, {
              contentType: 'image/jpeg'
            });

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);

          uploadedUrls.push(publicUrl);
        } else {
          // Already uploaded
          uploadedUrls.push(captureUrl);
        }
      }

      // Save training data
      const { error } = await supabase
        .from('product_training_data')
        .upsert({
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          category: selectedProduct.category,
          image_urls: uploadedUrls,
          labels: customLabels,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update local state
      setTrainingData(prev => new Map(prev.set(selectedProduct.id, {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        category: selectedProduct.category,
        imageUrls: uploadedUrls,
        labels: customLabels
      })));

      toast.success('Training data saved successfully');
      haptics.success();
      
      // Reset for next product
      setSelectedProduct(null);
      setCurrentCaptures([]);
      setCustomLabels([]);
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save training data');
      haptics.error();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Smart Camera Training"
      maxHeight="95vh"
    >
      <div className="p-4 space-y-4">
        {/* Instructions */}
        <div className="p-3 bg-brand-500/10 rounded-lg border border-brand-500/30">
          <p className="text-sm text-brand-400">
            <strong>Train the AI:</strong> Take 5-10 photos of each product from different angles. 
            Add relevant labels to improve recognition accuracy.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !selectedProduct ? (
          // Product Selection
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300">Select a product to train:</h3>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {products.map(product => {
                const hasTraining = trainingData.has(product.id);
                const trainingCount = trainingData.get(product.id)?.imageUrls.length || 0;
                
                return (
                  <button
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors",
                      "bg-dark-200 hover:bg-dark-300",
                      hasTraining && "border border-brand-500/30"
                    )}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-dark-300 flex items-center justify-center">
                        <Camera size={20} className="text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{product.name}</p>
                      <p className="text-xs text-gray-400">{product.category || 'No category'}</p>
                    </div>
                    {hasTraining && (
                      <div className="flex items-center gap-1 text-xs text-brand-400">
                        <CheckCircle size={14} />
                        <span>{trainingCount} photos</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          // Training Interface
          <div className="space-y-4">
            {/* Selected Product Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">{selectedProduct.name}</h3>
                <p className="text-sm text-gray-400">{selectedProduct.category}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setCurrentCaptures([]);
                  setCustomLabels([]);
                }}
                className="p-2 text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Capture Area */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-300">
                  Photos ({currentCaptures.length})
                </h4>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 rounded-lg text-sm text-white"
                >
                  <Plus size={16} />
                  <span>Add Photos</span>
                </button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleCapture}
                className="hidden"
              />

              <div className="grid grid-cols-3 gap-2">
                {currentCaptures.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                    <img
                      src={url}
                      alt={`Capture ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleRemoveCapture(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                
                {/* Add more button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center text-gray-400 hover:border-brand-500 hover:text-brand-400"
                >
                  <Camera size={24} />
                </button>
              </div>
            </div>

            {/* Labels */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Recognition Labels</h4>
              <div className="flex flex-wrap gap-2 mb-2">
                {customLabels.map(label => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-dark-300 rounded text-sm text-gray-300"
                  >
                    {label}
                    <button
                      onClick={() => handleRemoveLabel(label)}
                      className="text-gray-500 hover:text-red-400"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddLabel()}
                  placeholder="Add label (e.g., powder, bottle, herbal)"
                  className="flex-1 px-3 py-2 bg-dark-300 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  onClick={handleAddLabel}
                  className="px-3 py-2 bg-brand-500 rounded-lg text-white text-sm"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving || currentCaptures.length === 0}
              className="w-full py-3 px-4 bg-brand-500 rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>Save Training Data</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </MobileBottomSheet>
  );
}

// Usage stats component
export function TrainingStats() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    trainedProducts: 0,
    totalImages: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: products } = await supabase.from('products').select('id');
      const { data: training } = await supabase.from('product_training_data').select('*');
      
      const totalImages = training?.reduce((acc, t) => acc + (t.image_urls?.length || 0), 0) || 0;
      
      setStats({
        totalProducts: products?.length || 0,
        trainedProducts: training?.length || 0,
        totalImages
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="p-3 bg-dark-200 rounded-lg text-center">
        <p className="text-2xl font-bold text-white">{stats.totalProducts}</p>
        <p className="text-xs text-gray-400">Total Products</p>
      </div>
      <div className="p-3 bg-dark-200 rounded-lg text-center">
        <p className="text-2xl font-bold text-brand-400">{stats.trainedProducts}</p>
        <p className="text-xs text-gray-400">Trained</p>
      </div>
      <div className="p-3 bg-dark-200 rounded-lg text-center">
        <p className="text-2xl font-bold text-emerald-400">{stats.totalImages}</p>
        <p className="text-xs text-gray-400">Training Images</p>
      </div>
    </div>
  );
}