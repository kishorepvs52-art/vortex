// Types mirroring the VORTEX API DTOs
export type Role = 'FARMER' | 'EXPERT' | 'ADMIN';
export type AnalysisStatus =
  | 'PROCESSING'
  | 'AI_COMPLETED'
  | 'EXPERT_REVIEW_PENDING'
  | 'EXPERT_REVIEWED'
  | 'FAILED';
export type Severity = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type ReviewStatus = 'PENDING' | 'CLAIMED' | 'COMPLETED';
export type ReviewDecision = 'APPROVE_AI' | 'CORRECTED';
export type PathogenType =
  | 'FUNGAL' | 'BACTERIAL' | 'VIRAL' | 'NUTRITIONAL' | 'PEST' | 'PHYSIOLOGICAL' | 'HEALTHY' | 'UNKNOWN';
export type NotificationType =
  | 'ANALYSIS_COMPLETE' | 'ANALYSIS_FAILED' | 'EXPERT_REVIEW_NEEDED'
  | 'EXPERT_REVIEW_ASSIGNED' | 'EXPERT_REVIEW_COMPLETED' | 'SYSTEM';

export interface FarmerProfile {
  id: string;
  village: string | null;
  district: string | null;
  state: string | null;
  farmSizeAcres: number | null;
  preferredLanguage: string;
  bio: string | null;
}

export interface ExpertProfile {
  id: string;
  specialization: string;
  qualification: string | null;
  licenseNumber: string | null;
  yearsExperience: number | null;
  bio: string | null;
  rating: number | null;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  farmerProfile?: FarmerProfile | null;
  expertProfile?: ExpertProfile | null;
}

export interface SessionResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  pendingApproval?: boolean;
  message?: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta & Record<string, unknown>;
  error?: { code: string; message: string; details?: { field: string; message: string }[] };
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  unreadCount?: number;
}

export interface CropSummary {
  id: string;
  name: string;
  scientificName: string | null;
  family?: string | null;
  description: string | null;
  emoji: string | null;
  imageUrl?: string | null;
  diseaseCount?: number;
}

export interface DiseaseInfo {
  id: string;
  name: string;
  pathogenType: PathogenType;
  description: string;
  symptoms: string;
  visibleSigns: string | null;
  defaultSeverity: Severity;
  treatmentSummary: string;
  preventiveSummary: string;
  cropName?: string;
  cropEmoji?: string;
  cropType?: { id: string; name: string; emoji: string | null };
}

export interface AnalysisSummary {
  id: string;
  status: AnalysisStatus;
  createdAt: string;
  cropType: { id: string; name: string; emoji: string | null };
  thumbUrl: string;
  aiSummary: {
    predictedLabel: string;
    confidence: number;
    severity: Severity;
    healthy: boolean;
    isMock: boolean;
  } | null;
  reviewStatus: ReviewStatus | null;
}

export interface GuidanceSteps {
  treatment?: string[];
  prevention?: string[];
  safety?: string[];
  expertComments?: string[];
  disclaimer?: string | null;
}

export interface TimelineEntry {
  key: string;
  label: string;
  at: string | null;
  done: boolean;
  active?: boolean;
}

export interface AnalysisDetail {
  id: string;
  status: AnalysisStatus;
  createdAt: string;
  updatedAt: string;
  symptoms: string | null;
  locationText: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  failureReason: string | null;
  cropType: { id: string; name: string; scientificName: string | null; emoji: string | null };
  image: { url: string; thumbUrl: string; originalName: string; width: number | null; height: number | null };
  farmer?: { id: string; fullName: string; location: string | null };
  aiResult: {
    provider: string;
    isMock: boolean;
    modelVersion: string | null;
    predictedLabel: string;
    confidence: number;
    severity: Severity;
    healthy: boolean;
    indicators: string[];
    reasoning: string | null;
    needsExpertReview: boolean;
    processingTimeMs: number | null;
    createdAt: string;
    disease: DiseaseInfo | null;
  } | null;
  expertReview: {
    id: string;
    status: ReviewStatus;
    decision: ReviewDecision | null;
    requestedByFarmer: boolean;
    confidenceNote: string | null;
    treatmentGuidance: string | null;
    preventiveAdvice: string | null;
    comments: string | null;
    finalSeverity: Severity | null;
    finalDisease: DiseaseInfo | null;
    expert: { id: string; fullName: string; specialization: string | null } | null;
    claimedAt: string | null;
    completedAt: string | null;
    createdAt: string;
  } | null;
  guidances: { id: string; source: 'AI' | 'EXPERT'; title: string | null; steps: GuidanceSteps; createdAt: string }[];
  timeline: TimelineEntry[];
}

export interface ReviewListItem {
  id: string;
  status: ReviewStatus;
  decision: ReviewDecision | null;
  requestedByFarmer: boolean;
  createdAt: string;
  claimedAt: string | null;
  completedAt: string | null;
  expert: { id: string; fullName: string; specialization: string | null } | null;
  isMine: boolean;
  analysis: {
    id: string;
    status: AnalysisStatus;
    createdAt: string;
    cropType: { id: string; name: string; emoji: string | null };
    farmerName: string;
    symptoms: string | null;
    locationText: string | null;
    thumbUrl: string;
    ai: {
      predictedLabel: string;
      confidence: number;
      severity: Severity;
      isMock: boolean;
      provider: string;
    } | null;
  };
  finalDisease: { id: string; name: string } | null;
}

export interface ExpertStats {
  pending: number;
  claimedMine: number;
  completedMine: number;
  completedTotal: number;
  recent: { id: string; analysisId: string; decision: ReviewDecision | null; cropName: string; emoji: string | null; completedAt: string | null }[];
}

export interface AdminStats {
  users: { total: number; farmers: number; experts: number; admins: number; pendingExperts: number };
  analyses: { total: number; processing: number; aiCompleted: number; reviewPending: number; reviewDone: number; failed: number };
  reviews: { pending: number; claimed: number; completed: number };
  diseaseStats: { id: string; name: string; cropName: string; emoji: string | null; count: number }[];
  analysesPerDay: { date: string; count: number }[];
  aiProviders: { mock: number; real: number };
}

export interface ActivityItem {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  actor: { fullName: string; role: Role } | null;
  createdAt: string;
}

export interface AdminUserItem {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  phone: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  location: string | null;
  specialization: string | null;
  analysesCount: number;
  reviewsCount: number;
}

export interface AdminExpertItem {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  reviewsCompleted: number;
  profile: {
    specialization: string;
    qualification: string | null;
    licenseNumber: string | null;
    yearsExperience: number | null;
    bio: string | null;
    rating: number | null;
  } | null;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  analysisId: string | null;
  read: boolean;
  createdAt: string;
}

export interface SettingItem {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
  updatedBy: { fullName: string } | null;
}

export interface HealthData {
  status: string;
  service: string;
  version: string;
  database: string;
  ai: { provider: string; isMock: boolean; configured: string };
  uptimeSec: number;
  timestamp: string;
}
