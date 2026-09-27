// Route guards — authentication + role-based access.
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { Role } from '../../types/api';
import { PageLoader } from '../ui/Feedback';
import { ROLE_HOME } from '../../lib/constants';

export function ProtectedRoute({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { status, user } = useAuthStore();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-void">
        <PageLoader label="Authenticating" />
      </div>
    );
  }

  if (status === 'anon' || !user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!roles.includes(user.role)) {
    // Authenticated but wrong role → send to their own console, never to another role's area
    return <Navigate to={ROLE_HOME[user.role] ?? '/'} replace />;
  }

  return <>{children}</>;
}

/** Redirect already-authenticated users away from login/register. */
export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuthStore();
  if (status === 'loading') return <div className="min-h-screen bg-void"><PageLoader label="Loading" /></div>;
  if (status === 'authed' && user) return <Navigate to={ROLE_HOME[user.role] ?? '/'} replace />;
  return <>{children}</>;
}
