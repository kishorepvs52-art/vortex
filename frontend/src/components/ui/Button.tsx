import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'cyan';
type Size = 'sm' | 'md' | 'lg';

const base =
  'relative inline-flex items-center justify-center gap-2 font-display font-600 rounded-xl transition-all duration-200 ease-expo select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/60';

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-neon-dim to-leaf text-void shadow-neon hover:shadow-neon-strong hover:brightness-110',
  secondary:
    'glass text-cream border-neon/25 hover:border-neon/60 hover:shadow-neon hover:text-neon',
  ghost: 'text-muted hover:text-cream hover:bg-white/5',
  danger: 'bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25 hover:shadow-[0_0_16px_rgba(255,92,92,0.35)]',
  cyan: 'bg-cyan-dim/25 text-cyan border border-cyan/40 hover:bg-cyan-dim/40 hover:shadow-cyan',
};

const sizes: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-5 py-2.5',
  lg: 'text-base px-7 py-3.5',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

export interface ButtonLinkProps {
  to: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export function ButtonLink({ to, variant = 'primary', size = 'md', className, children, onClick }: ButtonLinkProps) {
  return (
    <Link to={to} onClick={onClick} className={cn(base, variants[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}
