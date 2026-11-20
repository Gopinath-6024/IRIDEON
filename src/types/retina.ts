export type DRGrade =
  | 'No apparent DR'
  | 'Mild'
  | 'Moderate'
  | 'Severe'
  | 'Proliferative';

export type QualityRating = 'Good' | 'Acceptable' | 'Poor';
export type QualityTierLabel = 'Good' | 'Needs better image' | 'Invalid image';
export type DecisionRiskLevel = 'LOW RISK' | 'REVIEW RECOMMENDED' | 'URGENT REVIEW';
export type ClinicianDecision = 'Agree with AI' | 'Needs review' | 'Disagree with AI';
export type UncertaintyLevel = 'Low' | 'Moderate' | 'High';
export type ImportanceLevel = 'Low' | 'Medium' | 'High';
export type DemoCaseId = 'demo-a' | 'demo-b' | 'demo-c';
export type ExplainMode = 'beginner' | 'technical';
export type ThemeMode = 'light' | 'dark' | 'system';
export type EyeLaterality = 'OD' | 'OS';
export type AcquisitionSource =
  | 'fundus_upload'
  | 'webcam_assisted_device_import'
  | 'demo_synthetic';

export type ReliabilityStatus =
  | 'reliable_screening'
  | 'uncertain_result'
  | 'professional_review_required';

export type SyncStatus = 'pending_sync' | 'synced';

export type DoctorReviewStatus =
  | 'Pending Review'
  | 'Under Review'
  | 'Reviewed'
  | 'Follow-up Required'
  | 'Referral Recommended'
  | 'Completed';

export type ReferralStatus =
  | 'Pending'
  | 'Referred'
  | 'Under Review'
  | 'Follow-up Required'
  | 'Completed';

export type ReferralPriority = 'Routine' | 'Urgent' | 'Priority Specialist';

export type AppPage =
  | 'landing'
  | 'dashboard'
  | 'analyze'
  | 'webcam-scan'
  | 'explainability'
  | 'feature-explorer'
  | 'comparison'
  | 'reports'
  | 'learn'
  | 'about'
  | 'settings'
  | 'privacy'
  | 'time-machine'
  | 'doctor-review'
  | 'referrals'
  | 'fair-eye';

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
  qualityTier?: QualityTierLabel;
  qualityBadgeText?: '✓ Good' | '⚠ Needs better image' | '✕ Invalid image';
  assessmentLabel?: string;
  suitable: boolean;
  suitabilityStatus: 'Suitable for screening' | 'Unsuitable';
  suitabilityMessage: string;
  unsuitableReasons: string[];
  actionRequired: string | null;
  warning: string | null;
  dimensions: {
    width: number;
    height: number;
  };
  mimeType: string;
}

export interface DecisionSupportSummary {
  riskLevel: DecisionRiskLevel;
  interpretation: string;
  suggestedAction: string;
  disclaimer: string;
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
  mode: 'DEMO_EDUCATIONAL' | 'EXTERNAL_ML_ENDPOINT' | 'OFFLINE_LOCAL_PROTOTYPE';
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
  entropyScore: number; // 0-100 normalized Shannon entropy
  reliabilityStatus: ReliabilityStatus;
  reliabilityLabel: 'AI Screening Result' | 'AI Uncertain Result' | 'Professional Review Required';
  reliabilityMessage: string;
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
    pixelGrid?: number[][]; // 24x24 computed spatial activation grid [0..1]
  };
  severityDistribution: SeverityProbability[];
  systemicEstimates: SystemicEstimates;
  proliferationGrading: ProliferationGrading;
  symptoms: SymptomsBreakdown;
  decisionSupport?: DecisionSupportSummary;
  modelMetadata: ModelMetadata;
  offlineGenerated?: boolean;
  patientId?: string;
  eyeLaterality?: EyeLaterality;
  acquisitionSource?: AcquisitionSource;
  imageMetadata?: {
    width: number;
    height: number;
    mimeType: string;
    fileSizeBytes?: number;
    deviceLabel?: string;
  };
  externalEyeReference?: {
    captureId: string;
    eyeLaterality: EyeLaterality;
    capturedAt: string;
    detectorEngine: string;
    consentConfirmed: boolean;
    thumbnailUrl?: string;
  };
}

export interface ExternalEyeCapture {
  captureId: string;
  imageDataUrl: string;
  eyeLaterality: EyeLaterality;
  capturedAt: string;
  patientId: string;
  sourceType: 'external_webcam_reference';
  detectorEngine: string;
  alignmentScore: number;
  consentConfirmed: boolean;
}

export interface ClientPixelStats {
  width: number;
  height: number;
  meanBrightness: number; // 0-255
  contrastStdDev: number; // 0-128
  edgeSharpness: number; // 0-100
  centerToEdgeRatio: number;
  redChannelDominance: number; // 0-1
  greenChannelDominance?: number; // 0-1
  blueChannelDominance?: number; // 0-1
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

export interface DoctorReviewData {
  reviewStatus: DoctorReviewStatus;
  clinicianDecision?: ClinicianDecision | null;
  reviewerName: string;
  reviewNotes: string;
  followUpDecision: string;
  referralReason: string;
  reviewedAt: string | null;
}

export interface LocalScreeningRecord {
  recordId: string;
  patientDemoId: string;
  createdAt: string;
  isDemoRecord: boolean;
  offlineCaptured: boolean;
  syncStatus: SyncStatus;
  syncedAt: string | null;
  riskTier: 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Uncertain / Review Required';
  imageThumbnailUrl: string;
  externalEyeThumbnailUrl?: string;
  eyeLaterality?: EyeLaterality;
  acquisitionSource?: AcquisitionSource;
  analysis: RetinaAnalysisResult;
  doctorReview: DoctorReviewData;
}

export interface ReferralRecord {
  referralId: string;
  recordId: string;
  patientDemoId: string;
  screeningDate: string;
  screeningResult: string;
  referralReason: string;
  priority: ReferralPriority;
  healthcareFacility: string;
  specialist: string;
  referralDate: string;
  referralStatus: ReferralStatus;
  followUpStatus: string;
  notes: string;
  isDemoRecord: boolean;
  syncStatus: SyncStatus;
}

export interface TimeMachineVisit {
  visitId: string;
  label: string;
  date: string;
  imageUrl: string;
  prediction: DRGrade;
  riskTier: string;
  proliferationLevel: 1 | 2 | 3 | 4;
  confidence: number;
  uncertainty: UncertaintyLevel;
  heatmapRegions: HeatmapRegion[];
  summary: string;
  isDemo: boolean;
}

export interface TimeMachineCohort {
  cohortId: string;
  patientDemoId: string;
  title: string;
  description: string;
  isDemo: boolean;
  visits: TimeMachineVisit[];
}

export interface FairEyeGroupResult {
  groupId: string;
  groupName: string;
  datasetSource: string;
  sampleCount: number;
  sufficientSampleSize: boolean;
  accuracy: number | null;
  sensitivity: number | null;
  specificity: number | null;
  errorRate: number | null;
  falsePositives: number;
  falseNegatives: number;
  truePositives: number;
  trueNegatives: number;
  limitationNote: string;
}

export interface FairEyeEvaluationReport {
  evaluatedAt: string;
  totalSamples: number;
  overallAccuracy: number;
  overallSensitivity: number;
  overallSpecificity: number;
  performanceGapDetected: boolean;
  maxSensitivityGap: number;
  groups: FairEyeGroupResult[];
  summaryNotice: string;
}
