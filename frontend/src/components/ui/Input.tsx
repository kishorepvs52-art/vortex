import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';

interface FieldWrapProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (id: string) => React.ReactNode;
  className?: string;
}

export function Field({ label, error, hint, required, children, className }: FieldWrapProps) {
  const id = useId();
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-xs font-display font-600 uppercase tracking-[0.12em] text-muted">
          {label} {required && <span className="text-neon">*</span>}
        </label>
      )}
      {children(id)}
      {error ? (
        <p className="text-xs text-danger flex items-center gap-1">
          <span aria-hidden>⚠</span> {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted/70">{hint}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, invalid, ...props }, ref) => (
  <input
    ref={ref}
    className={cn('input-glass', invalid && 'border-danger/60 focus:border-danger/70 focus:shadow-[0_0_0_3px_rgba(255,92,92,0.12)]', className)}
    {...props}
  />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn('input-glass resize-y min-h-[96px]', invalid && 'border-danger/60', className)}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  ({ className, invalid, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn('input-glass appearance-none cursor-pointer pr-10', invalid && 'border-danger/60', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2339ff88' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 14px center',
      }}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export function Checkbox({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn('flex items-start gap-3 cursor-pointer group select-none', className)}>
      <input
        type="checkbox"
        className="mt-0.5 w-4 h-4 rounded accent-[#39ff88] bg-white/5 border-white/20 cursor-pointer"
        {...props}
      />
      <span className="text-sm text-muted group-hover:text-cream transition-colors">{label}</span>
    </label>
  );
}
