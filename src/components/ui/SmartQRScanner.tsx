import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Flashlight, Camera, Scan } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/offline/haptics';
import { parseQRCodeData } from '@/services/qrCodeService';
import { 
  generateWorkflowData, 
  executeWorkflowAction, 
  QRWorkflowData,
  WorkflowAction 
} from '@/services/qrWorkflowService';
import { MobileBottomSheet } from './MobileBottomSheet';

interface SmartQRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: QRWorkflowData) => void;
  onError?: (error: string) => void;
}

export function SmartQRScanner({ isOpen, onClose, onScan, onError }: SmartQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scannedData, setScannedData] = useState<QRWorkflowData | null>(null);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize camera
  useEffect(() => {
    if (isOpen) {
      initializeCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setHasPermission(true);
        setIsScanning(true);
        startScanning();
      }
    } catch (error) {
      console.error('[QRScanner] Camera access denied:', error);
      setHasPermission(false);
      onError?.('Camera access denied. Please enable camera permissions.');
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsScanning(false);
    setHasPermission(null);
  };

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scan = () => {
      if (!isScanning || !videoRef.current) return;

      try {
        // Draw video frame to canvas
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        // Get image data for QR detection
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Use jsQR library (dynamically imported)
        detectQRCode(imageData);
      } catch (error) {
        console.error('[QRScanner] Scan error:', error);
      }

      animationFrameRef.current = requestAnimationFrame(scan);
    };

    scan();
  };

  const detectQRCode = async (imageData: ImageData) => {
    try {
      // Dynamically import jsQR
      const jsQR = (await import('jsqr')).default;
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        haptics.success();
        handleQRCodeDetected(code.data);
      }
    } catch (error) {
      // jsQR not available, try alternative detection
      console.log('[QRScanner] jsQR not available, using fallback');
    }
  };

  const handleQRCodeDetected = async (qrData: string) => {
    setIsScanning(false);
    
    try {
      // Parse QR code
      const parsed = parseQRCodeData(qrData);
      
      if (!parsed) {
        throw new Error('Invalid QR code format');
      }

      // Fetch entity data and generate workflow
      const entityData = await fetchEntityData(parsed.t, parsed.id);
      
      if (!entityData) {
        throw new Error('Entity not found');
      }

      const workflowData = await generateWorkflowData(parsed.t, entityData);
      setScannedData(workflowData);
      setShowWorkflow(true);
      
      // Also call the onScan callback
      onScan(workflowData);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to process QR code';
      onError?.(errorMsg);
      haptics.error();
    }
  };

  const fetchEntityData = async (type: string, id: string) => {
    // In real implementation, fetch from Supabase
    // For now, return mock data
    return {
      id,
      name: 'Sample Entity',
      status: 'active'
    };
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      
      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !torchEnabled }] as any
        });
        setTorchEnabled(!torchEnabled);
        haptics.light();
      }
    } catch (error) {
      console.error('[QRScanner] Torch error:', error);
    }
  };

  const handleWorkflowAction = async (action: WorkflowAction) => {
    if (!scannedData) return;

    const result = await executeWorkflowAction(action, scannedData.entityData);
    
    if (result.success) {
      haptics.success();
      setShowWorkflow(false);
      setScannedData(null);
      onClose();
    } else {
      haptics.error();
      onError?.(result.error || 'Action failed');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <h2 className="text-white font-semibold">Scan QR Code</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Camera View */}
      <div className="relative w-full h-full">
        {hasPermission === null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-white text-center">
              <Camera size={48} className="mx-auto mb-4 opacity-50" />
              <p>Requesting camera access...</p>
            </div>
          </div>
        )}

        {hasPermission === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-black p-4">
            <div className="text-white text-center">
              <Scan size={48} className="mx-auto mb-4 text-red-400" />
              <p className="text-lg font-semibold mb-2">Camera Access Denied</p>
              <p className="text-gray-400 mb-4">Please enable camera permissions to scan QR codes</p>
              <button
                onClick={initializeCamera}
                className="px-4 py-2 bg-brand-500 rounded-lg text-white font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {hasPermission === true && (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            
            {/* Scanner Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-64">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-brand-400" />
                <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-brand-400" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-brand-400" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-brand-400" />
                
                {/* Scanning line */}
                {isScanning && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-brand-400 shadow-[0_0_10px_rgba(234,179,8,0.8)] animate-scan" />
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
              <button
                onClick={toggleTorch}
                className={cn(
                  "p-4 rounded-full transition-colors",
                  torchEnabled ? "bg-brand-500 text-white" : "bg-black/50 text-white"
                )}
              >
                <Flashlight size={24} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Workflow Action Sheet */}
      {scannedData && (
        <MobileBottomSheet
          isOpen={showWorkflow}
          onClose={() => {
            setShowWorkflow(false);
            setScannedData(null);
            setIsScanning(true);
          }}
          title={`${scannedData.entityData.name || 'Scanned Item'}`}
        >
          <div className="p-4 space-y-3">
            <p className="text-sm text-gray-400 mb-4">
              {scannedData.entityData.code && (
                <span className="font-mono text-brand-400">{scannedData.entityData.code}</span>
              )}
            </p>
            
            {scannedData.suggestedActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleWorkflowAction(action)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl transition-colors",
                  action.bgColor || "bg-dark-200",
                  "hover:opacity-80"
                )}
              >
                <span className={action.color || "text-white"}>{action.label}</span>
              </button>
            ))}
          </div>
        </MobileBottomSheet>
      )}

      {/* Scan animation style */}
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>,
    document.body
  );
}

// QR Display Component (for generating and showing QR codes)
interface QRCodeDisplayProps {
  data: string;
  title?: string;
  size?: number;
  onDownload?: () => void;
  onPrint?: () => void;
}

export function QRCodeDisplay({ data, title, size = 200, onDownload, onPrint }: QRCodeDisplayProps) {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    generateQRCode(data, { width: size }).then(setQrUrl);
  }, [data, size]);

  return (
    <div className="flex flex-col items-center gap-4">
      {title && <h4 className="text-white font-medium">{title}</h4>}
      
      {qrUrl && (
        <img 
          src={qrUrl} 
          alt="QR Code" 
          className="rounded-lg"
          style={{ width: size, height: size }}
        />
      )}

      <div className="flex gap-2">
        {onDownload && (
          <button
            onClick={onDownload}
            className="px-3 py-1.5 text-sm bg-dark-200 rounded-lg hover:bg-dark-300 transition-colors"
          >
            Download
          </button>
        )}
        {onPrint && (
          <button
            onClick={onPrint}
            className="px-3 py-1.5 text-sm bg-dark-200 rounded-lg hover:bg-dark-300 transition-colors"
          >
            Print
          </button>
        )}
      </div>
    </div>
  );
}

// Helper function import
async function generateQRCode(data: string, options: { width?: number } = {}): Promise<string> {
  const QRCode = (await import('qrcode')).default;
  return QRCode.toDataURL(data, { width: options.width || 200 });
}