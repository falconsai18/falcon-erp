import React, { useState, useRef, useCallback } from 'react';
import { Camera, X, Scan, AlertCircle, CheckCircle, RefreshCw, Package, Search, Barcode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/offline/haptics';
import {
  analyzeImage,
  imageToBase64,
  matchProduct,
  analyzeQuality,
  extractBatchInfo,
  mockAnalyzeImage,
  getVisionApiUsage,
  trackVisionApiUsage,
  VisionResult,
  ProductMatch,
  QualityCheckResult
} from '@/services/smartCameraService';
import { scanAndFindProduct, BarcodeResult } from '@/services/barcodeService';
import { MobileBottomSheet } from './MobileBottomSheet';

interface SmartCameraProps {
  mode: 'recognition' | 'quality' | 'inventory';
  knownProducts?: Array<{
    id: string;
    name: string;
    category: string;
    trainingLabels: string[];
  }>;
  onProductDetected?: (match: ProductMatch, imageUrl: string) => void;
  onQualityCheck?: (result: QualityCheckResult, imageUrl: string) => void;
  onInventoryCount?: (count: number, imageUrl: string) => void;
  onBarcodeDetected?: (result: BarcodeResult) => void;
  onClose?: () => void;
  className?: string;
}

export function SmartCamera({
  mode,
  knownProducts = [],
  onProductDetected,
  onQualityCheck,
  onInventoryCount,
  onBarcodeDetected,
  onClose,
  className
}: SmartCameraProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    visionResult: VisionResult;
    productMatch: ProductMatch | null;
    qualityResult: QualityCheckResult | null;
    batchInfo: any;
  } | null>(null);
  const [barcodeResult, setBarcodeResult] = useState<BarcodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    haptics.medium();
    setError(null);
    
    // Create preview
    const imageUrl = URL.createObjectURL(file);
    setCapturedImage(imageUrl);
    setIsAnalyzing(true);

    try {
      // Check API usage
      const usage = getVisionApiUsage();
      if (usage.remainingFree <= 0) {
        throw new Error('Daily API limit reached. Please try again tomorrow.');
      }

      // Convert and analyze
      const base64 = await imageToBase64(file);
      
      // Use mock in development if no API key
      const visionResult = import.meta.env.VITE_GOOGLE_VISION_API_KEY 
        ? await analyzeImage(base64)
        : await mockAnalyzeImage();

      trackVisionApiUsage();

      // Process results based on mode
      let productMatch: ProductMatch | null = null;
      let qualityResult: QualityCheckResult | null = null;
      let batchInfo: any = null;

      if (mode === 'recognition' || mode === 'inventory') {
        productMatch = matchProduct(visionResult, knownProducts);
      }

      if (mode === 'quality' || mode === 'inventory') {
        qualityResult = analyzeQuality(visionResult, mode === 'quality' ? 'product' : 'packaging');
      }

      // Extract batch info from text
      batchInfo = extractBatchInfo(visionResult.text);

      setAnalysisResult({
        visionResult,
        productMatch,
        qualityResult,
        batchInfo
      });

      haptics.success();

      // Trigger callbacks
      if (productMatch && onProductDetected) {
        onProductDetected(productMatch, imageUrl);
      }
      if (qualityResult && onQualityCheck) {
        onQualityCheck(qualityResult, imageUrl);
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMsg);
      haptics.error();
    } finally {
      setIsAnalyzing(false);
    }
  }, [mode, knownProducts, onProductDetected, onQualityCheck]);

  const handleBarcodeCapture = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    haptics.medium();
    setError(null);
    setIsAnalyzing(true);

    try {
      const result = await scanAndFindProduct(file);
      if (result) {
        setBarcodeResult(result);
        haptics.success();
        if (onBarcodeDetected) {
          onBarcodeDetected(result);
        }
        // If product found, also fire onProductDetected for compatibility
        if (result.productId && onProductDetected) {
          onProductDetected(
            {
              productId: result.productId,
              productName: result.productName || result.barcode,
              confidence: 1.0,
              matchedLabels: [result.sku || result.barcode],
            },
            ''
          );
        }
      } else {
        setError('No barcode found in image. Try a clearer photo.');
        haptics.error();
      }
    } catch {
      setError('Barcode scan failed. Try again.');
      haptics.error();
    } finally {
      setIsAnalyzing(false);
      if (barcodeInputRef.current) barcodeInputRef.current.value = '';
    }
  }, [onBarcodeDetected, onProductDetected]);

  const handleReset = useCallback(() => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setBarcodeResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (barcodeInputRef.current) {
      barcodeInputRef.current.value = '';
    }
  }, []);

  const getModeTitle = () => {
    switch (mode) {
      case 'recognition': return 'Smart Product Recognition';
      case 'quality': return 'Quality Check Scanner';
      case 'inventory': return 'Inventory Scanner';
    }
  };

  const getModeDescription = () => {
    switch (mode) {
      case 'recognition': return 'Point camera at product to identify';
      case 'quality': return 'Scan product for quality verification';
      case 'inventory': return 'Scan multiple products to count inventory';
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all",
          "bg-brand-500 hover:bg-brand-600 text-white",
          className
        )}
      >
        <Camera size={20} />
        <span>Open Smart Camera</span>
      </button>

      {/* Camera Sheet */}
      <MobileBottomSheet
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          handleReset();
          onClose?.();
        }}
        title={getModeTitle()}
      >
        <div className="p-4 space-y-4">
          {/* Description */}
          <p className="text-sm text-gray-400 text-center">
            {getModeDescription()}
          </p>

          {/* Hidden File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapture}
            className="hidden"
          />
          {mode === 'inventory' && (
            <input
              ref={barcodeInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleBarcodeCapture}
              className="hidden"
            />
          )}

          {/* Capture Area */}
          {!capturedImage ? (
            <div className="relative space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-600 hover:border-brand-500 transition-colors flex flex-col items-center justify-center gap-3 bg-dark-200/50"
              >
                <div className="p-4 rounded-full bg-brand-500/20">
                  <Camera size={32} className="text-brand-400" />
                </div>
                <span className="text-gray-400">Tap to capture photo</span>
              </button>

              {mode === 'inventory' && (
                <button
                  onClick={() => barcodeInputRef.current?.click()}
                  disabled={isAnalyzing}
                  className="w-full py-3 px-4 rounded-xl border border-dashed border-amber-500/50 hover:border-amber-400 transition-colors flex items-center justify-center gap-3 bg-amber-500/5 hover:bg-amber-500/10 disabled:opacity-50"
                >
                  <Barcode size={20} className="text-amber-400" />
                  <span className="text-amber-300 text-sm font-medium">
                    {isAnalyzing ? 'Scanning barcode...' : 'Scan Barcode'}
                  </span>
                </button>
              )}

              {barcodeResult && (
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30">
                  <p className="text-xs text-amber-400 font-medium">Barcode Detected</p>
                  <p className="text-sm text-white font-mono mt-0.5">{barcodeResult.barcode}</p>
                  {barcodeResult.productName && (
                    <p className="text-xs text-emerald-400 mt-1">{barcodeResult.productName}</p>
                  )}
                  {!barcodeResult.productId && (
                    <p className="text-xs text-amber-500 mt-1">Product not found in system. Select manually.</p>
                  )}
                </div>
              )}

              {/* API Usage Warning */}
              {(() => {
                const usage = getVisionApiUsage();
                if (usage.remainingFree < 100) {
                  return (
                    <div className="text-center">
                      <span className="text-xs text-amber-400">
                        ⚠️ {usage.remainingFree} free scans remaining today
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Captured Image */}
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full aspect-square object-cover"
                />
                
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                    <RefreshCw size={32} className="text-brand-400 animate-spin" />
                    <span className="text-white font-medium">Analyzing...</span>
                  </div>
                )}

                {/* Reset button */}
                <button
                  onClick={handleReset}
                  className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/20 rounded-lg text-red-400 text-sm">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Analysis Results */}
              {analysisResult && (
                <div className="space-y-3">
                  {/* Product Match */}
                  {analysisResult.productMatch && (
                    <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                      <div className="flex items-start gap-3">
                        <CheckCircle size={24} className="text-emerald-400 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-white">
                            {analysisResult.productMatch.productName}
                          </h4>
                          <p className="text-sm text-emerald-400">
                            {Math.round(analysisResult.productMatch.confidence * 100)}% match
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Matched: {analysisResult.productMatch.matchedLabels.slice(0, 3).join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quality Result */}
                  {analysisResult.qualityResult && (
                    <div className={cn(
                      "p-4 rounded-xl border",
                      analysisResult.qualityResult.passed
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-red-500/10 border-red-500/30"
                    )}>
                      <div className="flex items-center gap-2">
                        {analysisResult.qualityResult.passed ? (
                          <CheckCircle size={20} className="text-emerald-400" />
                        ) : (
                          <AlertCircle size={20} className="text-red-400" />
                        )}
                        <span className={cn(
                          "font-medium",
                          analysisResult.qualityResult.passed ? "text-emerald-400" : "text-red-400"
                        )}>
                          {analysisResult.qualityResult.passed ? 'Quality Check Passed' : 'Issues Found'}
                        </span>
                      </div>
                      
                      {analysisResult.qualityResult.issues.length > 0 && (
                        <ul className="mt-2 text-sm text-red-400 list-disc list-inside">
                          {analysisResult.qualityResult.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Batch Info */}
                  {analysisResult.batchInfo && (
                    <div className="p-3 bg-dark-200 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-300 mb-2">Detected Information</h5>
                      <div className="space-y-1 text-sm">
                        {analysisResult.batchInfo.batchNumber && (
                          <p className="text-gray-400">
                            <span className="text-gray-500">Batch:</span> {analysisResult.batchInfo.batchNumber}
                          </p>
                        )}
                        {analysisResult.batchInfo.expiryDate && (
                          <p className="text-gray-400">
                            <span className="text-gray-500">Expiry:</span> {analysisResult.batchInfo.expiryDate}
                          </p>
                        )}
                        {analysisResult.batchInfo.manufacturingDate && (
                          <p className="text-gray-400">
                            <span className="text-gray-500">Mfg Date:</span> {analysisResult.batchInfo.manufacturingDate}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Detected Labels */}
                  {analysisResult.visionResult.labels.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-300 mb-2">What we see:</h5>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.visionResult.labels.slice(0, 8).map((label, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-dark-200 rounded text-xs text-gray-400"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Retake Button */}
                  <button
                    onClick={handleReset}
                    className="w-full py-3 px-4 bg-dark-200 rounded-xl text-white font-medium hover:bg-dark-300 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={18} />
                    <span>Scan Another Product</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </MobileBottomSheet>
    </>
  );
}

// Compact version for inline use
interface CompactSmartCameraProps {
  onCapture: (imageBase64: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function CompactSmartCamera({ onCapture, size = 'md' }: CompactSmartCameraProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    haptics.medium();
    const base64 = await imageToBase64(file);
    onCapture(base64);
  };

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "rounded-full bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center transition-colors",
          sizeClasses[size]
        )}
      >
        <Camera size={size === 'sm' ? 18 : size === 'md' ? 20 : 24} />
      </button>
    </>
  );
}