import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { useAuthStore } from '../../store/authStore';
import { Button, ButtonLink } from '../ui/Button';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';

const LINKS = [
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/features', label: 'Features' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export function Navbar() {
  const { user, status, logout, homePath } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled ? 'bg-void/80 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' : 'bg-transparent',
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-[72px] flex items-center justify-between gap-4">
        <Logo />

        <div className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  'px-4 py-2 rounded-xl text-sm font-display font-500 transition-colors',
                  isActive ? 'text-neon bg-neon/10' : 'text-muted hover:text-cream hover:bg-white/5',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          {status === 'authed' && user ? (
            <>
              <NotificationBell />
              <Link
                to={homePath()}
                className="hidden sm:inline-flex items-center gap-2 glass px-3.5 py-2 rounded-xl text-sm font-display font-600 text-cream hover:border-neon/40 transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-neon-dim to-cyan-dim flex items-center justify-center text-[10px] font-bold text-void">
                  {user.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                </span>
                Dashboard
              </Link>
              <Button variant="ghost" size="sm" onClick={() => void logout()} className="hidden md:inline-flex">
                Sign out
              </Button>
            </>
          ) : (
            <>
              <ButtonLink to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">Sign in</ButtonLink>
              <ButtonLink to="/register" size="sm">Get Started</ButtonLink>
            </>
          )}

          <button
            className="md:hidden w-10 h-10 glass rounded-xl flex flex-col items-center justify-center gap-1.5"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span className={cn('w-5 h-0.5 bg-cream transition-transform', menuOpen && 'rotate-45 translate-y-1')} />
            <span className={cn('w-5 h-0.5 bg-cream transition-opacity', menuOpen && 'opacity-0')} />
            <span className={cn('w-5 h-0.5 bg-cream transition-transform', menuOpen && '-rotate-45 -translate-y-1.5')} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden glass-strong border-t border-white/10 rounded-none px-4 py-4 space-y-1 animate-fade-up">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn('block px-4 py-3 rounded-xl text-sm font-display font-500', isActive ? 'text-neon bg-neon/10' : 'text-muted hover:text-cream')
              }
            >
              {l.label}
            </NavLink>
          ))}
          {status === 'authed' ? (
            <>
              <Link to={homePath()} className="block px-4 py-3 rounded-xl text-sm font-display font-600 text-neon bg-neon/10">
                → My Dashboard
              </Link>
              <button onClick={() => void logout()} className="w-full text-left px-4 py-3 rounded-xl text-sm text-danger">
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login" className="block px-4 py-3 rounded-xl text-sm font-display font-500 text-muted">
              Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
