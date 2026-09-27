import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { useAuthStore } from '../../store/authStore';
import { getHealth } from '../../api/endpoints';
import { useQuery } from '@tanstack/react-query';

export function Footer() {
  const { status } = useAuthStore();
  const { data: health } = useQuery({ queryKey: ['health'], queryFn: getHealth, staleTime: 60_000 });

  return (
    <footer className="relative border-t border-white/10 bg-[#04120a]/80 mt-24">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon/40 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-14">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 text-sm text-muted leading-relaxed max-w-sm">
              AI-Powered Crop Disease Guidance System. Healthy Crops Today, Better Harvests Tomorrow —
              connecting farmers, AI and plant pathology experts across India.
            </p>
            {health && (
              <p className="mt-4 text-[11px] font-mono text-muted/60 flex items-center gap-2">
                <span className={health.ai.isMock ? 'text-amber' : 'text-neon'}>●</span>
                API {health.status} · DB {health.database} · AI: {health.ai.provider}
                {health.ai.isMock && ' (simulated dev fallback)'}
              </p>
            )}
          </div>
          <div>
            <h4 className="text-xs font-display font-700 uppercase tracking-[0.2em] text-cream mb-4">Platform</h4>
            <ul className="space-y-2.5 text-sm text-muted">
              <li><Link className="hover:text-neon transition-colors" to="/how-it-works">How It Works</Link></li>
              <li><Link className="hover:text-neon transition-colors" to="/features">Features</Link></li>
              <li><Link className="hover:text-neon transition-colors" to="/about">About VORTEX</Link></li>
              <li><Link className="hover:text-neon transition-colors" to="/contact">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-display font-700 uppercase tracking-[0.2em] text-cream mb-4">Get Started</h4>
            <ul className="space-y-2.5 text-sm text-muted">
              {status === 'authed' ? (
                <li><Link className="hover:text-neon transition-colors" to="/app">My Dashboard</Link></li>
              ) : (
                <>
                  <li><Link className="hover:text-neon transition-colors" to="/register">Farmer Registration</Link></li>
                  <li><Link className="hover:text-neon transition-colors" to="/register">Expert Registration</Link></li>
                  <li><Link className="hover:text-neon transition-colors" to="/login">Sign In</Link></li>
                </>
              )}
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted/60">
          <p>© {new Date().getFullYear()} VORTEX · Built for the farmers of India</p>
          <p className="font-mono">ASK → ANALYZE → IDENTIFY → GUIDE → ACT</p>
        </div>
      </div>
    </footer>
  );
}
