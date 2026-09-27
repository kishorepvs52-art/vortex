// Shared shell for farmer/expert/admin areas: collapsible sidebar,
// topbar with notifications, aurora backdrop, 3D-lite identity.
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { useAuthStore } from '../../store/authStore';
import { initials } from '../../lib/format';
import { LogoMark } from './Logo';
import { NotificationBell } from './NotificationBell';
import { MockBadge } from '../ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { getHealth } from '../../api/endpoints';

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const NAV: Record<string, NavItem[]> = {
  FARMER: [
    { to: '/app', label: 'Dashboard', icon: '◈', end: true },
    { to: '/app/analyze', label: 'Analyze Crop', icon: '🔬' },
    { to: '/app/history', label: 'Analysis History', icon: '🗂' },
    { to: '/app/notifications', label: 'Notifications', icon: '🔔' },
    { to: '/app/profile', label: 'Profile', icon: '👤' },
  ],
  EXPERT: [
    { to: '/expert', label: 'Dashboard', icon: '◈', end: true },
    { to: '/expert/cases', label: 'Pending Cases', icon: '📋' },
    { to: '/expert/reviewed', label: 'Reviewed Cases', icon: '✅' },
    { to: '/expert/profile', label: 'Profile', icon: '👤' },
  ],
  ADMIN: [
    { to: '/admin', label: 'Dashboard', icon: '◈', end: true },
    { to: '/admin/users', label: 'Users', icon: '👥' },
    { to: '/admin/experts', label: 'Experts', icon: '🎓' },
    { to: '/admin/crops', label: 'Crop Types', icon: '🌾' },
    { to: '/admin/diseases', label: 'Diseases', icon: '🦠' },
    { to: '/admin/analyses', label: 'Analyses', icon: '🔬' },
    { to: '/admin/reviews', label: 'Expert Reviews', icon: '📋' },
    { to: '/admin/reports', label: 'Reports', icon: '📊' },
    { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ],
};

const ROLE_LABEL: Record<string, string> = { FARMER: 'Farmer Console', EXPERT: 'Expert Console', ADMIN: 'Admin Console' };

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: health } = useQuery({ queryKey: ['health'], queryFn: getHealth, staleTime: 60_000 });

  if (!user) return null;
  const items = NAV[user.role] ?? [];

  return (
    <div className="min-h-screen bg-aurora relative">
      {/* Subtle grid identity */}
      <div className="fixed inset-0 holo-grid pointer-events-none opacity-60" aria-hidden />

      {/* Mobile sidebar backdrop */}
      {open && <div className="fixed inset-0 bg-void/70 backdrop-blur-sm z-40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 w-64 z-50 lg:z-30 glass-strong rounded-none border-y-0 border-l-0 flex flex-col transition-transform duration-300 ease-expo',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="p-5 flex items-center gap-3 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <div>
              <p className="font-display font-700 tracking-[0.12em] text-cream text-sm">VORTEX</p>
              <p className="text-[10px] text-neon uppercase tracking-[0.18em]">{ROLE_LABEL[user.role]}</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-display font-500 transition-all duration-200',
                  isActive
                    ? 'bg-neon/12 text-neon border border-neon/30 shadow-[0_0_16px_rgba(57,255,136,0.12)]'
                    : 'text-muted hover:text-cream hover:bg-white/5 border border-transparent',
                )
              }
            >
              <span className="text-base w-5 text-center" aria-hidden>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-2">
          {health?.ai.isMock && (
            <div className="px-1 pb-1">
              <MockBadge label="Simulated AI active" />
            </div>
          )}
          <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-muted hover:text-cream hover:bg-white/5 transition-colors">
            <span aria-hidden>🌐</span> Public site
          </Link>
          <button
            onClick={async () => { await logout(); navigate('/'); }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-danger/80 hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <span aria-hidden>⏻</span> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64 relative z-10">
        <header className="sticky top-0 z-20 bg-void/70 backdrop-blur-xl border-b border-white/10">
          <div className="px-4 md:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="lg:hidden w-10 h-10 glass rounded-xl flex items-center justify-center"
                onClick={() => setOpen(true)}
                aria-label="Open navigation"
              >
                <span className="flex flex-col gap-1">
                  <span className="w-4 h-0.5 bg-cream block" />
                  <span className="w-4 h-0.5 bg-cream block" />
                  <span className="w-4 h-0.5 bg-cream block" />
                </span>
              </button>
              <h1 className="text-sm md:text-base font-display font-600 text-cream truncate">
                Welcome back, <span className="text-neon">{user.fullName.split(' ')[0]}</span>
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <div className="hidden sm:flex items-center gap-2.5 glass px-3 py-1.5 rounded-xl">
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-neon-dim to-cyan-dim flex items-center justify-center text-[11px] font-bold text-void">
                  {initials(user.fullName)}
                </span>
                <span className="text-xs">
                  <span className="block text-cream font-600 leading-tight">{user.fullName}</span>
                  <span className="block text-muted/70 leading-tight capitalize">{user.role.toLowerCase()}</span>
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8 max-w-[1400px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
