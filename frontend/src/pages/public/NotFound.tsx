import { Link } from 'react-router-dom';
import { ButtonLink } from '../../components/ui/Button';
import { HeroFallback } from '../../components/three/HeroFallback';
import { Logo } from '../../components/layout/Logo';

export default function NotFound() {
  return (
    <div className="min-h-screen relative flex items-center justify-center px-4">
      <HeroFallback compact />
      <div className="absolute top-5 left-5 z-10">
        <Logo />
      </div>
      <div className="relative z-10 text-center">
        <p className="font-mono text-neon text-sm tracking-[0.4em] mb-4">ERROR 404 · SIGNAL LOST</p>
        <h1 className="font-display font-700 text-[clamp(4rem,15vw,9rem)] leading-none text-cream">
          4<span className="gradient-text text-glow">0</span>4
        </h1>
        <p className="mt-4 text-muted max-w-md mx-auto">
          This field doesn't exist. The page you're looking for may have been moved, or the link is broken.
        </p>
        <div className="mt-8 flex gap-4 justify-center flex-wrap">
          <ButtonLink to="/" size="lg">← Back to VORTEX</ButtonLink>
          <Link to="/how-it-works" className="inline-flex items-center px-5 py-3 rounded-xl glass text-sm font-display font-600 text-cream hover:border-neon/40 transition-colors">
            How it works
          </Link>
        </div>
      </div>
    </div>
  );
}
