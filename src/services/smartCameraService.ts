// Google Vision API Service for Smart Camera
// Handles product recognition, quality checks, and OCR

const GOOGLE_VISION_API_KEY = import.meta.env.VITE_GOOGLE_VISION_API_KEY;
const GOOGLE_VISION_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';

export interface VisionResult {
  labels: string[];
  objects: Array<{
    name: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  text: string;
  safeSearch: {
    adult: string;
    violence: string;
  };
  quality: {
    brightness: number;
    sharpness: number;
  };
}

export interface ProductMatch {
  productId: string;
  productName: string;
  confidence: number;
  matchedLabels: string[];
}

export interface QualityCheckResult {
  passed: boolean;
  issues: string[];
  confidence: number;
}

// Convert image to base64
export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Analyze image with Google Vision
export async function analyzeImage(imageBase64: string): Promise<VisionResult> {
  if (!GOOGLE_VISION_API_KEY) {
    throw new Error('Google Vision API key not configured');
  }

  const requestBody = {
    requests: [{
      image: {
        content: imageBase64
      },
      features: [
        { type: 'LABEL_DETECTION', maxResults: 20 },
        { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
        { type: 'TEXT_DETECTION', maxResults: 10 },
        { type: 'SAFE_SEARCH_DETECTION' },
        { type: 'IMAGE_PROPERTIES' }
      ]
    }]
  };

  try {
    const response = await fetch(`${GOOGLE_VISION_ENDPOINT}?key=${GOOGLE_VISION_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Vision API request failed');
    }

    const data = await response.json();
    return parseVisionResponse(data);
  } catch (error) {
    console.error('[VisionAPI] Error:', error);
    throw error;
  }
}

// Parse Google Vision response
function parseVisionResponse(data: any): VisionResult {
  const result = data.responses[0];
  
  return {
    labels: result.labelAnnotations?.map((l: any) => l.description) || [],
    objects: result.localizedObjectAnnotations?.map((o: any) => ({
      name: o.name,
      confidence: o.score,
      boundingBox: o.boundingPoly?.normalizedVertices[0] || { x: 0, y: 0, width: 1, height: 1 }
    })) || [],
    text: result.fullTextAnnotation?.text || '',
    safeSearch: {
      adult: result.safeSearchAnnotation?.adult || 'UNKNOWN',
      violence: result.safeSearchAnnotation?.violence || 'UNKNOWN'
    },
    quality: {
      brightness: result.imagePropertiesAnnotation?.dominantColors?.colors[0]?.color?.red || 128,
      sharpness: 100 // Default, could calculate from image analysis
    }
  };
}

// Match detected labels with known products
export function matchProduct(
  visionResult: VisionResult,
  knownProducts: Array<{
    id: string;
    name: string;
    category: string;
    trainingLabels: string[];
  }>
): ProductMatch | null {
  let bestMatch: ProductMatch | null = null;
  let highestScore = 0;

  for (const product of knownProducts) {
    const matchedLabels = visionResult.labels.filter(label =>
      product.trainingLabels.some(trainingLabel =>
        label.toLowerCase().includes(trainingLabel.toLowerCase()) ||
        trainingLabel.toLowerCase().includes(label.toLowerCase())
      )
    );

    const score = matchedLabels.length / Math.max(product.trainingLabels.length, visionResult.labels.length);
    
    if (score > highestScore && score > 0.3) { // 30% threshold
      highestScore = score;
      bestMatch = {
        productId: product.id,
        productName: product.name,
        confidence: score,
        matchedLabels
      };
    }
  }

  return bestMatch;
}

// Quality check analysis
export function analyzeQuality(
  visionResult: VisionResult,
  checkType: 'packaging' | 'label' | 'product' = 'packaging'
): QualityCheckResult {
  const issues: string[] = [];
  let confidence = 1.0;

  // Check brightness
  if (visionResult.quality.brightness < 50) {
    issues.push('Image too dark');
    confidence -= 0.2;
  } else if (visionResult.quality.brightness > 200) {
    issues.push('Image overexposed');
    confidence -= 0.2;
  }

  // Check for damage indicators
  const damageLabels = ['damaged', 'broken', 'crack', 'tear', 'spill', 'leak'];
  const hasDamage = visionResult.labels.some(label =>
    damageLabels.some(damage => label.toLowerCase().includes(damage))
  );

  if (hasDamage) {
    issues.push('Possible packaging damage detected');
    confidence -= 0.4;
  }

  // Check for text readability (for labels)
  if (checkType === 'label') {
    if (!visionResult.text || visionResult.text.length < 5) {
      issues.push('Text not readable');
      confidence -= 0.3;
    }
  }

  // Check safe search (shouldn't trigger for normal products)
  if (visionResult.safeSearch.adult === 'LIKELY' || visionResult.safeSearch.adult === 'VERY_LIKELY') {
    issues.push('Inappropriate content detected');
    confidence = 0;
  }

  return {
    passed: issues.length === 0,
    issues,
    confidence: Math.max(0, confidence)
  };
}

// Extract batch/expiry info from text
export function extractBatchInfo(text: string): {
  batchNumber?: string;
  expiryDate?: string;
  manufacturingDate?: string;
} {
  const result: any = {};

  // Batch number patterns
  const batchPatterns = [
    /batch[\s#:]+([A-Z0-9-]+)/i,
    /batch\s*no[\s.:]*([A-Z0-9-]+)/i,
    /lot[\s#:]+([A-Z0-9-]+)/i,
    /mfg[\s\w]*[\s:]+([A-Z0-9-]+)/i
  ];

  for (const pattern of batchPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.batchNumber = match[1].trim();
      break;
    }
  }

  // Date patterns
  const datePatterns = [
    /exp(?:iry)?[\s\w]*[\s:]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /best[\s\w]*before[\s:]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /use[\s\w]*before[\s:]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      result.expiryDate = match[1];
      break;
    }
  }

  // Manufacturing date
  const mfgPatterns = [
    /mfg[\s\w]*[\s:]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /manufacturing[\s\w]*[\s:]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /mfd[\s.:]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
  ];

  for (const pattern of mfgPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.manufacturingDate = match[1];
      break;
    }
  }

  return result;
}

// Get usage stats (for monitoring API limits)
export function getVisionApiUsage(): {
  requestsToday: number;
  remainingFree: number;
  lastReset: Date;
} {
  const stored = localStorage.getItem('visionApiUsage');
  const today = new Date().toDateString();
  
  if (stored) {
    const data = JSON.parse(stored);
    if (data.date === today) {
      return {
        requestsToday: data.count,
        remainingFree: Math.max(0, 1000 - data.count),
        lastReset: new Date(data.date)
      };
    }
  }

  // Reset for new day
  return {
    requestsToday: 0,
    remainingFree: 1000,
    lastReset: new Date()
  };
}

// Track API usage
export function trackVisionApiUsage(): void {
  const today = new Date().toDateString();
  const stored = localStorage.getItem('visionApiUsage');
  
  let count = 1;
  if (stored) {
    const data = JSON.parse(stored);
    if (data.date === today) {
      count = data.count + 1;
    }
  }

  localStorage.setItem('visionApiUsage', JSON.stringify({
    date: today,
    count
  }));
}

// Mock mode for testing (when no API key)
export async function mockAnalyzeImage(): Promise<VisionResult> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        labels: ['bottle', 'container', 'packaging', 'product', 'ayurvedic'],
        objects: [{
          name: 'Bottle',
          confidence: 0.92,
          boundingBox: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }
        }],
        text: 'Batch: ABC123\nExp: 12/25\nAshwagandha Powder',
        safeSearch: { adult: 'VERY_UNLIKELY', violence: 'VERY_UNLIKELY' },
        quality: { brightness: 150, sharpness: 85 }
      });
    }, 1000);
  });
}