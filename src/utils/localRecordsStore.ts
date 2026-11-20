import { generateSyntheticFundusDataUrl } from './fundusGenerator';
import type {
  DoctorReviewData,
  LocalScreeningRecord,
  ReferralRecord,
  RetinaAnalysisResult,
} from '../types/retina';

const RECORDS_STORAGE_KEY = 'irideon_local_screening_records_v1';
const REFERRALS_STORAGE_KEY = 'irideon_local_referrals_v1';

export function deriveRiskTier(
  analysis: RetinaAnalysisResult
): LocalScreeningRecord['riskTier'] {
  if (analysis.reliabilityStatus === 'professional_review_required') {
    return 'Uncertain / Review Required';
  }
  if (analysis.prediction === 'Severe' || analysis.prediction === 'Proliferative') {
    return 'High Risk';
  }
  if (analysis.prediction === 'Moderate' || analysis.prediction === 'Mild') {
    return 'Moderate Risk';
  }
  return 'Low Risk';
}

export function deriveDefaultReferralReason(analysis: RetinaAnalysisResult): string {
  if (analysis.reliabilityStatus === 'professional_review_required') {
    return 'AI unable to provide a reliable screening result (High uncertainty / quality concern) — specialist evaluation required.';
  }
  if (analysis.prediction === 'Severe' || analysis.prediction === 'Proliferative') {
    return `Referable high-severity pattern (${analysis.prediction}, Proliferation Level ${analysis.proliferationGrading.level}/4) detected on prototype screening.`;
  }
  if (analysis.prediction === 'Moderate') {
    return `Moderate retinal pattern with ${analysis.uncertainty.toLowerCase()} uncertainty — routine ophthalmology follow-up advised.`;
  }
  return 'Baseline/low-risk prototype screening — routine periodic review.';
}

export function createSeededDemoRecords(): LocalScreeningRecord[] {
  const thumbA = generateSyntheticFundusDataUrl('demo-a');
  const thumbB = generateSyntheticFundusDataUrl('demo-b');
  const thumbC = generateSyntheticFundusDataUrl('demo-c');

  const mkQuality = (sharp: number) => ({
    brightness: { label: 'Brightness', score: 86, status: 'Good' as const },
    contrast: { label: 'Contrast', score: 84, status: 'Good' as const },
    sharpness: { label: 'Sharpness', score: sharp, status: 'Good' as const },
    fieldOfView: { label: 'Field of View', score: 90, status: 'Excellent' as const },
    retinalVisibility: { label: 'Retinal Visibility', score: 88, status: 'Good' as const },
    artifacts: { label: 'Artifacts', score: 85, status: 'Good' as const },
    overall: 'Good' as const,
    suitable: true,
    suitabilityStatus: 'Suitable for screening' as const,
    suitabilityMessage: 'Image suitable for AI screening',
    unsuitableReasons: [],
    actionRequired: null,
    warning: null,
    dimensions: { width: 768, height: 768 },
    mimeType: 'image/png',
  });

  const baseDisclaimer =
    'Research and educational use only. Screening support — not a standalone diagnosis.';

  const makeAnalysis = (
    caseId: string,
    analyzedAt: string,
    demoCaseId: 'demo-a' | 'demo-b' | 'demo-c',
    prediction: RetinaAnalysisResult['prediction'],
    confidence: number,
    uncertainty: RetinaAnalysisResult['uncertainty'],
    entropyScore: number,
    level: 1 | 2 | 3
  ): RetinaAnalysisResult => ({
    caseId,
    analyzedAt,
    sourceType: 'demo',
    demoCaseId,
    demoLabel: `Seeded Demo Record (${demoCaseId.toUpperCase()})`,
    prediction,
    confidence,
    uncertainty,
    entropyScore,
    reliabilityStatus:
      uncertainty === 'Low' ? 'reliable_screening' : 'uncertain_result',
    reliabilityLabel:
      uncertainty === 'Low' ? 'AI Screening Result' : 'AI Uncertain Result',
    reliabilityMessage:
      uncertainty === 'Low'
        ? 'Prototype screening signal within expected bounds. Screening support — not a standalone diagnosis.'
        : 'Borderline prototype severity overlap — specialist review recommended.',
    uncertaintyFactors: [
      {
        factor: 'Demo Longitudinal Record',
        impact: 'Low',
        active: true,
        description: 'Clearly labeled synthetic demo record for specialist workflow demonstration.',
      },
    ],
    imageQuality: mkQuality(level === 1 ? 92 : level === 2 ? 87 : 81),
    detectedFeatures: [
      {
        id: 'microaneurysms',
        name: 'Microaneurysms',
        detected: level >= 2,
        importance: level >= 2 ? 'High' : 'Low',
        approximateLocation: 'Superior-temporal macula',
        explanation: 'Synthetic reference feature.',
        coordinates: { x: 37, y: 38, radius: 10 },
      },
      {
        id: 'hard-exudates',
        name: 'Hard exudates',
        detected: level >= 2,
        importance: level === 3 ? 'High' : 'Medium',
        approximateLocation: 'Parafoveal ring',
        explanation: 'Synthetic reference feature.',
        coordinates: { x: 52, y: 56, radius: 11 },
      },
      {
        id: 'hemorrhages',
        name: 'Hemorrhages',
        detected: level >= 3,
        importance: level === 3 ? 'High' : 'Low',
        approximateLocation: 'Inferior-temporal quadrant',
        explanation: 'Synthetic reference feature.',
        coordinates: { x: 33, y: 61, radius: 13 },
      },
    ],
    featureContributions: [
      {
        id: 's1',
        label: 'Macular & vascular pattern weighting',
        category: 'Synthetic Demo',
        weight: 64,
        importance: 'High',
        description: 'Synthetic prototype demonstration weight.',
      },
    ],
    evidenceTrail: [
      {
        id: 'sev-1',
        step: 1,
        region: level === 1 ? 'Optic Disc' : 'Superior Macula',
        feature: level === 1 ? 'Clear baseline vessels' : 'Punctate & exudate cluster',
        contribution: 'High',
        coordinates: { x: level === 1 ? 74 : 37, y: level === 1 ? 50 : 38, zoom: 2.3 },
        rationale: 'Synthetic demonstration region.',
      },
    ],
    explanation: {
      summary: 'Seeded synthetic demo case illustrating the doctor review and longitudinal workflow.',
      reasoningSteps: [],
      limitations: ['Clearly labeled synthetic demonstration record — not a real clinical patient.'],
    },
    heatmapData: {
      regions:
        level === 1
          ? [{ x: 74, y: 50, radius: 13, intensity: 0.4, label: 'Optic Disc Baseline', featureType: 'Landmark' }]
          : level === 2
            ? [
                { x: 37, y: 38, radius: 13, intensity: 0.88, label: 'Punctate Cluster', featureType: 'Microaneurysm-like' },
                { x: 54, y: 57, radius: 11, intensity: 0.72, label: 'Parafoveal Specks', featureType: 'Exudate-like' },
              ]
            : [
                { x: 32, y: 60, radius: 15, intensity: 0.94, label: 'Inferior Blot Cluster', featureType: 'Hemorrhage-like' },
                { x: 50, y: 54, radius: 13, intensity: 0.86, label: 'Macular Ring', featureType: 'Exudate-like' },
              ],
      attentionGridSummary: 'Synthetic demo spatial overlay.',
    },
    severityDistribution: [
      { grade: 'No apparent DR', probability: level === 1 ? 92 : 4 },
      { grade: 'Mild', probability: level === 1 ? 6 : 14 },
      { grade: 'Moderate', probability: level === 2 ? 64 : 12 },
      { grade: 'Severe', probability: level === 3 ? 69 : 2 },
      { grade: 'Proliferative', probability: level === 3 ? 15 : 0 },
    ],
    systemicEstimates: {
      bloodSugar: {
        estimatedRangeMgDl: level === 1 ? '90–108 mg/dL (Est.)' : '165–220 mg/dL (Est.)',
        status: level === 1 ? 'Normal-like Baseline' : 'Elevated Glycemic Pattern',
        educationalNote: 'Educational demo only.',
      },
      bloodPressure: {
        estimatedRangeMmHg: level === 1 ? '116/74 mmHg (Est.)' : '142/88 mmHg (Est.)',
        avRatioEstimate: level === 1 ? '0.67' : '0.54',
        status: level === 1 ? 'Balanced Vascular Tone' : 'Elevated Vascular Stress',
        educationalNote: 'Educational demo only.',
      },
    },
    proliferationGrading: {
      level,
      label: `Level ${level} · Prototype Grade`,
      overallPercent: level === 1 ? 12 : level === 2 ? 48 : 74,
      description: 'Synthetic demo grade.',
      levelsBreakdown: [
        { level: 1, title: 'Level 1', percent: level === 1 ? 88 : 10, active: level === 1 },
        { level: 2, title: 'Level 2', percent: level === 2 ? 64 : 18, active: level === 2 },
        { level: 3, title: 'Level 3', percent: level === 3 ? 69 : 8, active: level === 3 },
        { level: 4, title: 'Level 4', percent: level === 3 ? 15 : 0, active: false },
      ],
    },
    symptoms: {
      insideRetina: [{ title: 'Synthetic demo vascular sign', detail: 'Educational illustration.' }],
      outsidePerson: [{ title: 'No real patient symptoms', detail: 'Synthetic demo case.' }],
      eyePainGuidance: 'Seek an ophthalmologist for real eye pain.',
    },
    modelMetadata: {
      modelName: 'IRIDEON Prototype / Demonstration Model',
      mode: 'DEMO_EDUCATIONAL',
      attributionNotice:
        'The highlighted regions indicate areas that influenced the model’s prediction. This visualization is an AI explanation aid and is not clinical proof.',
      explainabilityMethod: 'Synthetic Demo Attribution',
      disclaimer: baseDisclaimer,
    },
  });

  return [
    {
      recordId: 'REC-DEMO-101-A',
      patientDemoId: 'DEMO-PT-101',
      createdAt: '2026-08-12T09:15:00.000Z',
      isDemoRecord: true,
      offlineCaptured: false,
      syncStatus: 'synced',
      syncedAt: '2026-08-12T09:16:00.000Z',
      riskTier: 'Low Risk',
      imageThumbnailUrl: thumbA,
      analysis: makeAnalysis('IRX-D101A', '2026-08-12T09:15:00.000Z', 'demo-a', 'No apparent DR', 92, 'Low', 18, 1),
      doctorReview: {
        reviewStatus: 'Completed',
        reviewerName: 'Dr. A. Mehta (Prototype Reviewer)',
        reviewNotes: 'Synthetic baseline demo image appears clear; scheduled routine annual demo check.',
        followUpDecision: 'Routine 12-month rescreening',
        referralReason: 'Baseline check',
        reviewedAt: '2026-08-12T11:30:00.000Z',
      },
    },
    {
      recordId: 'REC-DEMO-102-B',
      patientDemoId: 'DEMO-PT-102',
      createdAt: '2026-09-20T14:20:00.000Z',
      isDemoRecord: true,
      offlineCaptured: true,
      syncStatus: 'pending_sync',
      syncedAt: null,
      riskTier: 'Moderate Risk',
      imageThumbnailUrl: thumbB,
      analysis: makeAnalysis('IRX-D102B', '2026-09-20T14:20:00.000Z', 'demo-b', 'Moderate', 87, 'Moderate', 48, 2),
      doctorReview: {
        reviewStatus: 'Pending Review',
        reviewerName: '',
        reviewNotes: '',
        followUpDecision: '',
        referralReason: 'Moderate pattern with parafoveal exudate-like specks on offline demo screening.',
        reviewedAt: null,
      },
    },
    {
      recordId: 'REC-DEMO-103-C',
      patientDemoId: 'DEMO-PT-103',
      createdAt: '2026-10-18T10:05:00.000Z',
      isDemoRecord: true,
      offlineCaptured: false,
      syncStatus: 'synced',
      syncedAt: '2026-10-18T10:08:00.000Z',
      riskTier: 'High Risk',
      imageThumbnailUrl: thumbC,
      analysis: makeAnalysis('IRX-D103C', '2026-10-18T10:05:00.000Z', 'demo-c', 'Severe', 84, 'Moderate', 51, 3),
      doctorReview: {
        reviewStatus: 'Referral Recommended',
        reviewerName: 'Dr. R. Nair (Prototype Reviewer)',
        reviewNotes: 'High-priority prototype demo case flagged for specialist macular & vascular evaluation.',
        followUpDecision: 'Refer to Regional Ophthalmology Unit',
        referralReason: 'Multi-quadrant severe pattern (Proliferation Level 3/4) on synthetic demo.',
        reviewedAt: '2026-10-18T13:10:00.000Z',
      },
    },
  ];
}

export function createSeededDemoReferrals(): ReferralRecord[] {
  return [
    {
      referralId: 'REF-DEMO-901',
      recordId: 'REC-DEMO-103-C',
      patientDemoId: 'DEMO-PT-103',
      screeningDate: '2026-10-18',
      screeningResult: 'Severe (Proliferation Level 3/4 · Prototype)',
      referralReason: 'Multi-quadrant blot hemorrhage & macular exudate pattern (Synthetic Demo).',
      priority: 'Priority Specialist',
      healthcareFacility: 'Prototype District Eye Care Center (Demo Facility)',
      specialist: 'Ophthalmology Retina Clinic (Demo)',
      referralDate: '2026-10-18',
      referralStatus: 'Referred',
      followUpStatus: 'Appointment awaiting confirmation (Demo)',
      notes: 'Synthetic demo referral illustrating Smart Referral tracking.',
      isDemoRecord: true,
      syncStatus: 'synced',
    },
  ];
}

export function loadLocalRecords(): LocalScreeningRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_STORAGE_KEY);
    if (!raw) {
      const seeded = createSeededDemoRecords();
      localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as LocalScreeningRecord[];
    return Array.isArray(parsed) ? parsed : createSeededDemoRecords();
  } catch {
    return createSeededDemoRecords();
  }
}

export function saveLocalRecords(records: LocalScreeningRecord[]): void {
  try {
    // Strip oversized raw pixel grids if storage nears quota while preserving regions & metadata
    const compact = records.slice(0, 30).map((rec) => ({
      ...rec,
      analysis: {
        ...rec.analysis,
        heatmapData: {
          regions: rec.analysis.heatmapData.regions,
          attentionGridSummary: rec.analysis.heatmapData.attentionGridSummary,
        },
      },
    }));
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(compact));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function loadLocalReferrals(): ReferralRecord[] {
  try {
    const raw = localStorage.getItem(REFERRALS_STORAGE_KEY);
    if (!raw) {
      const seeded = createSeededDemoReferrals();
      localStorage.setItem(REFERRALS_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as ReferralRecord[];
    return Array.isArray(parsed) ? parsed : createSeededDemoReferrals();
  } catch {
    return createSeededDemoReferrals();
  }
}

export function saveLocalReferrals(referrals: ReferralRecord[]): void {
  try {
    localStorage.setItem(REFERRALS_STORAGE_KEY, JSON.stringify(referrals.slice(0, 50)));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function buildLocalRecordFromAnalysis(params: {
  analysis: RetinaAnalysisResult;
  thumbnailUrl: string;
  patientDemoId?: string;
  offlineCaptured: boolean;
}): LocalScreeningRecord {
  const { analysis, thumbnailUrl, offlineCaptured } = params;
  const riskTier = deriveRiskTier(analysis);
  const referralReason = deriveDefaultReferralReason(analysis);

  const needsReview =
    analysis.reliabilityStatus !== 'reliable_screening' ||
    analysis.prediction !== 'No apparent DR';

  const reviewData: DoctorReviewData = {
    reviewStatus: needsReview ? 'Pending Review' : 'Reviewed',
    reviewerName: needsReview ? '' : 'Auto-Logged Baseline (Prototype)',
    reviewNotes: '',
    followUpDecision: needsReview ? 'Awaiting specialist evaluation' : 'Routine follow-up',
    referralReason,
    reviewedAt: null,
  };

  return {
    recordId: `REC-${analysis.caseId}`,
    patientDemoId:
      params.patientDemoId?.trim() ||
      analysis.patientId?.trim() ||
      (analysis.sourceType === 'demo'
        ? `DEMO-${(analysis.demoCaseId ?? 'case').toUpperCase()}`
        : `LOCAL-${analysis.caseId.slice(-4)}`),
    createdAt: analysis.analyzedAt,
    isDemoRecord: analysis.sourceType === 'demo',
    offlineCaptured,
    syncStatus: 'pending_sync',
    syncedAt: null,
    riskTier,
    imageThumbnailUrl: thumbnailUrl,
    externalEyeThumbnailUrl: analysis.externalEyeReference?.thumbnailUrl,
    eyeLaterality: analysis.eyeLaterality,
    acquisitionSource:
      analysis.acquisitionSource ??
      (analysis.sourceType === 'demo' ? 'demo_synthetic' : 'fundus_upload'),
    analysis,
    doctorReview: reviewData,
  };
}
