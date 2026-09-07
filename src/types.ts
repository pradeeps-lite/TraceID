export type MatchType = 'exact' | 'near' | 'related';

export interface SearchResult {
  id: string;
  title: string | null;
  description: string | null;
  sourceUrl: string;
  domain: string;
  platform: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  matchType: MatchType;
  similarityScore: number | null;
  metadata: Record<string, any>;
}

export interface ProviderExecutionStatus {
  name: string;
  status: 'success' | 'no_results' | 'error' | 'not_configured';
  resultsCount: number;
  durationMs: number;
  error?: string;
}

export interface FaceLandmark {
  type: 'eye_left' | 'eye_right' | 'eye' | 'center';
  x: number;
  y: number;
  width: number;
  height: number;
  xRatio: number;
  yRatio: number;
}

export interface FaceRegion {
  id: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
  confidence: number;
  areaPercentage: number;
  aspectRatio: number;
  sharpnessScore: number;
  isSharp: boolean;
  brightnessScore: number;
  contrastScore: number;
  landmarks: FaceLandmark[];
  cropDataUrl?: string;
  facialPose?: 'frontal' | 'profile_left' | 'profile_right' | 'angled';
  facialNotes?: string;
}

export interface FaceDetectionResult {
  hasFaces: boolean;
  faceCount: number;
  detectedAt: string;
  detectionDurationMs: number;
  regions: FaceRegion[];
  summary: string;
  focusTarget: 'face' | 'scene';
  engine: string;
}

export interface ImageAnalysisData {
  imageType: string;
  objects: string[];
  textDetected: string[];
  sceneDescription: string;
  landmarks?: string[];
  logos?: string[];
  visualCharacteristics?: {
    dominantColors?: string[];
    lighting?: string;
    aspectRatioDescription?: string;
  };
  faceAnalysis?: {
    facialFraming?: string;
    facialExpression?: string;
    gazeOrientation?: string;
    lightingQuality?: string;
    featuresObserved?: string[];
    note?: string;
  };
}

export interface AnalyzeResponse {
  imageId: string;
  imageHash: string;
  width: number;
  height: number;
  format: string;
  fileSizeBytes: number;
  uploadedAt: string;
  analysis: ImageAnalysisData;
  faceDetection?: FaceDetectionResult;
}

export interface SearchResponse {
  status: 'success' | 'no_results' | 'provider_not_configured' | 'error';
  provider: string;
  searchedAt: string;
  providersSearched: ProviderExecutionStatus[];
  totalMatches: number;
  results: SearchResult[];
  message?: string;
  error?: string;
}

export interface ProviderConfigStatus {
  configuredProvider: string;
  activeProviderDescription?: string;
  serpApiKeyStatus?: string;
  googleVisionStatus?: string;
  tineyeStatus?: string;
  googleConfigured: boolean;
  tineyeConfigured: boolean;
  serpApiConfigured: boolean;
  geminiConfigured: boolean;
  searchTimeoutSeconds: number;
  maxResults: number;
}
