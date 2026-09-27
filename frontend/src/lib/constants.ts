export const API_BASE = '/api/v1';

export const MAX_UPLOAD_MB = 8;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ACCEPT_ATTR = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

export const ROLE_HOME: Record<string, string> = {
  FARMER: '/app',
  EXPERT: '/expert',
  ADMIN: '/admin',
};

export const DEMO_ACCOUNTS = [
  { role: 'Farmer', email: 'farmer@vortex.app', password: 'Farmer@1234', desc: 'Ravi Kumar · Sulur, Coimbatore' },
  { role: 'Expert', email: 'expert@vortex.app', password: 'Expert@1234', desc: 'Dr. Meera Krishnan · Plant Pathology' },
  { role: 'Admin', email: 'admin@vortex.app', password: 'Admin@1234', desc: 'Arjun Nair · Platform Admin' },
] as const;
