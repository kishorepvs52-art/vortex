// Typed endpoint modules — one function per API call used by the UI.
import { api, uploadWithProgress, downloadFile } from './client';
import type {
  ActivityItem, AdminExpertItem, AdminStats, AdminUserItem, AnalysisDetail, AnalysisSummary,
  AuthUser, CropSummary, DiseaseInfo, ExpertStats, HealthData, NotificationItem,
  PaginationMeta, ReviewListItem, SettingItem,
} from '../types/api';

export type WithMeta<T> = T & { __meta?: PaginationMeta };

// ── Health & catalogue ──
export const getHealth = () => api.get<HealthData>('/health');
export const getCrops = () => api.get<CropSummary[]>('/crops');
export const getCrop = (id: string) => api.get<CropSummary & { diseases: DiseaseInfo[] }>(`/crops/${id}`);
export const getCropDiseases = (id: string) => api.get<DiseaseInfo[]>(`/crops/${id}/diseases`);
export const getDiseases = (cropId?: string) => api.get<DiseaseInfo[]>(`/diseases${cropId ? `?cropId=${cropId}` : ''}`);

// ── Auth & profile ──
export const getMe = () => api.get<AuthUser>('/auth/me');
export const updateProfile = (data: Record<string, unknown>) => api.patch<AuthUser>('/users/me', data);
export const changePassword = (currentPassword: string, newPassword: string) =>
  api.patch<{ message: string }>('/users/me/password', { currentPassword, newPassword });

// ── Farmer analyses ──
export const listAnalyses = (params: { page?: number; pageSize?: number; status?: string; cropTypeId?: string } = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && qs.set(k, String(v)));
  return api.get<WithMeta<AnalysisSummary[]>>(`/analyses?${qs}`);
};
export const getAnalysis = (id: string) => api.get<AnalysisDetail>(`/analyses/${id}`);
export const createAnalysis = (form: FormData, onProgress: (pct: number) => void) =>
  uploadWithProgress<{ id: string; status: string; createdAt: string }>('/analyses', form, onProgress);
export const requestReview = (id: string) =>
  api.post<{ reviewId: string; status: string }>(`/analyses/${id}/request-review`);

// ── Expert ──
export const listReviews = (params: { status?: string; page?: number; pageSize?: number; mine?: boolean } = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && qs.set(k, String(v)));
  return api.get<WithMeta<ReviewListItem[]>>(`/expert/reviews?${qs}`);
};
export const getReviewCase = (id: string) =>
  api.get<{ review: ReviewListItem & Record<string, unknown>; analysis: AnalysisDetail }>(`/expert/reviews/${id}`);
export const claimReview = (id: string) => api.post<{ id: string; status: string }>(`/expert/reviews/${id}/claim`);
export const submitReview = (id: string, data: Record<string, unknown>) => api.put<{ id: string; status: string }>(`/expert/reviews/${id}`, data);
export const getExpertStats = () => api.get<ExpertStats>('/expert/reviews/stats');

// ── Notifications ──
export const listNotifications = (page = 1) =>
  api.get<WithMeta<NotificationItem[]>>(`/notifications?page=${page}&pageSize=20`);
export const unreadCount = () => api.get<{ count: number }>('/notifications/unread-count');
export const markRead = (id: string) => api.patch(`/notifications/${id}/read`);
export const markAllRead = () => api.patch<{ markedRead: number }>('/notifications/read-all');

// ── Admin ──
export const adminStats = () => api.get<AdminStats>('/admin/stats');
export const adminActivity = (limit = 30) => api.get<ActivityItem[]>(`/admin/activity?limit=${limit}`);
export const adminUsers = (params: { page?: number; role?: string; active?: string; q?: string } = {}) => {
  const qs = new URLSearchParams({ pageSize: '20' });
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && qs.set(k, String(v)));
  return api.get<WithMeta<AdminUserItem[]>>(`/admin/users?${qs}`);
};
export const adminUpdateUser = (id: string, data: Record<string, unknown>) =>
  api.patch<AdminUserItem>(`/admin/users/${id}`, data);
export const adminExperts = (status: 'pending' | 'active' | 'all' = 'all') =>
  api.get<AdminExpertItem[]>(`/admin/experts?status=${status}`);
export const adminApproveExpert = (id: string) => api.post(`/admin/experts/${id}/approve`);
export const adminDeactivateExpert = (id: string) => api.post(`/admin/experts/${id}/deactivate`);
export const adminCrops = () => api.get<(CropSummary & { id: string; isActive: boolean; diseaseCount: number; analysisCount: number })[]>('/admin/crops');
export const adminCreateCrop = (data: Record<string, unknown>) => api.post('/admin/crops', data);
export const adminUpdateCrop = (id: string, data: Record<string, unknown>) => api.patch(`/admin/crops/${id}`, data);
export const adminDeleteCrop = (id: string) => api.del<{ message?: string }>(`/admin/crops/${id}`);
export const adminDiseases = (cropTypeId?: string) =>
  api.get<(DiseaseInfo & { id: string; isActive: boolean; cropTypeId: string })[]>(`/admin/diseases${cropTypeId ? `?cropTypeId=${cropTypeId}` : ''}`);
export const adminCreateDisease = (data: Record<string, unknown>) => api.post('/admin/diseases', data);
export const adminUpdateDisease = (id: string, data: Record<string, unknown>) => api.patch(`/admin/diseases/${id}`, data);
export const adminDeleteDisease = (id: string) => api.del<{ message?: string }>(`/admin/diseases/${id}`);
export const adminAnalyses = (params: { page?: number; status?: string; provider?: string } = {}) => {
  const qs = new URLSearchParams({ pageSize: '20' });
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && qs.set(k, String(v)));
  return api.get<WithMeta<(AnalysisSummary & { farmer: { fullName: string; email: string }; reviewStatus: string | null })[]>>(`/admin/analyses?${qs}`);
};
export const adminAnalysisDetail = (id: string) => api.get<AnalysisDetail>(`/admin/analyses/${id}`);
export const adminReviews = (params: { status?: string; page?: number } = {}) => {
  const qs = new URLSearchParams({ pageSize: '20' });
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && qs.set(k, String(v)));
  return api.get<WithMeta<ReviewListItem[]>>(`/admin/reviews?${qs}`);
};
export const adminSettings = () => api.get<SettingItem[]>('/admin/settings');
export const adminPutSetting = (key: string, value: string) => api.put<SettingItem>('/admin/settings', { key, value });
export const downloadReport = (
  type: 'analyses' | 'users' | 'diseases',
  params?: { from?: string; to?: string },
) => {
  const qs = new URLSearchParams({ type });
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  return downloadFile(`/admin/reports?${qs}`, `vortex-${type}-report.csv`);
};

// ── Public contact ──
export const sendContact = (data: { name: string; email: string; message: string }) =>
  api.post<{ message: string }>('/contact', data);
