export type DRGrade =
  | 'No apparent DR'
  | 'Mild'
  | 'Moderate'
  | 'Severe'
  | 'Proliferative';

export type QualityRating = 'Good' | 'Acceptable' | 'Poor';
export type UncertaintyLevel = 'Low' | 'Moderate' | 'High';
export type ImportanceLevel = 'Low' | 'Medium' | 'High';
export type DemoCaseId = 'demo-a' | 'demo-b' | 'demo-c';
export type ExplainMode = 'beginner' | 'technical';
export type ThemeMode = 'light' | 'dark' | 'system';

export type AppPage =
  | 'landing'
  | 'dashboard'
  | 'analyze'
  | 'explainability'
  | 'feature-explorer'
  | 'comparison'
  | 'reports'
  | 'learn'
  | 'about'
  | 'settings'
  | 'privacy';

export interface ImageQualitySubMetric {
  label: string;
  score: number; // 0-100
  status: 'Excellent' | 'Good' | 'Acceptable' | 'Low' | 'Poor';
}

export interface ImageQualityMetrics {
  brightness: ImageQualitySubMetric;
  contrast: ImageQualitySubMetric;
  sharpness: ImageQualitySubMetric;
  fieldOfView: ImageQualitySubMetric;
  retinalVisibility: ImageQualitySubMetric;
  artifacts: ImageQualitySubMetric;
  overall: QualityRating;
  warning: string | null;
  dimensions: {
    width: number;
    height: number;
  };
  mimeType: string;
}

export interface DetectedFeature {
  id: string;
  name: string;
  detected: boolean;
  importance: ImportanceLevel;
  approximateLocation: string;
  explanation: string;
  coordinates: {
    x: number; // normalized 0-100
    y: number; // normalized 0-100
    radius: number; // normalized 0-50
  };
}

export interface FeatureContribution {
  id: string;
  label: string;
  category: string;
  weight: number; // 0-100
  importance: ImportanceLevel;
  description: string;
}

export interface EvidenceItem {
  id: string;
  step: number;
  region: string;
  feature: string;
  contribution: ImportanceLevel;
  coordinates: {
    x: number; // 0-100
    y: number; // 0-100
    zoom: number;
  };
  rationale: string;
}

export interface HeatmapRegion {
  x: number; // 0-100
  y: number; // 0-100
  radius: number; // 0-50
  intensity: number; // 0-1
  label: string;
  featureType: string;
}

export interface SeverityProbability {
  grade: DRGrade;
  probability: number; // 0-100
}

export interface UncertaintyFactor {
  factor: string;
  impact: ImportanceLevel;
  active: boolean;
  description: string;
}

export interface ModelMetadata {
  modelName: string;
  mode: 'DEMO_EDUCATIONAL' | 'EXTERNAL_ML_ENDPOINT';
  attributionNotice: string;
  explainabilityMethod: string;
  disclaimer: string;
}

export interface SystemicEstimates {
  bloodSugar: {
    estimatedRangeMgDl: string;
    status: 'Normal-like Baseline' | 'Borderline Glycemic Stress' | 'Elevated Glycemic Pattern';
    educationalNote: string;
  };
  bloodPressure: {
    estimatedRangeMmHg: string;
    avRatioEstimate: string;
    status: 'Balanced Vascular Tone' | 'Mild Arteriolar Narrowing' | 'Elevated Vascular Stress';
    educationalNote: string;
  };
}

export interface ProliferationLevelBar {
  level: 1 | 2 | 3 | 4;
  title: string;
  percent: number;
  active: boolean;
}

export interface ProliferationGrading {
  level: 1 | 2 | 3 | 4;
  label: string;
  overallPercent: number;
  description: string;
  levelsBreakdown: ProliferationLevelBar[];
}

export interface SymptomsBreakdown {
  insideRetina: {
    title: string;
    detail: string;
  }[];
  outsidePerson: {
    title: string;
    detail: string;
  }[];
  eyePainGuidance: string;
}

export interface RetinaAnalysisResult {
  caseId: string;
  analyzedAt: string;
  sourceType: 'demo' | 'upload';
  demoCaseId?: DemoCaseId;
  demoLabel?: string;
  prediction: DRGrade;
  confidence: number; // 0-100
  uncertainty: UncertaintyLevel;
  uncertaintyFactors: UncertaintyFactor[];
  imageQuality: ImageQualityMetrics;
  detectedFeatures: DetectedFeature[];
  featureContributions: FeatureContribution[];
  evidenceTrail: EvidenceItem[];
  explanation: {
    summary: string;
    reasoningSteps: {
      stageId: string;
      title: string;
      status: string;
      summary: string;
    }[];
    limitations: string[];
  };
  heatmapData: {
    regions: HeatmapRegion[];
    attentionGridSummary: string;
  };
  severityDistribution: SeverityProbability[];
  systemicEstimates: SystemicEstimates;
  proliferationGrading: ProliferationGrading;
  symptoms: SymptomsBreakdown;
  modelMetadata: ModelMetadata;
}

export interface ClientPixelStats {
  width: number;
  height: number;
  meanBrightness: number; // 0-255
  contrastStdDev: number; // 0-128
  edgeSharpness: number; // 0-100
  centerToEdgeRatio: number;
  redChannelDominance: number; // 0-1
  artifactScore: number; // 0-100 (higher = fewer artifacts)
}

export interface ResearcherSession {
  token: string;
  researcherId: string;
  displayName: string;
  role: string;
  institution: string;
  signedInAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode: ExplainMode;
  timestamp: string;
  error?: boolean;
}
