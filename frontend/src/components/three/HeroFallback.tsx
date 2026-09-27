// CSS-only hero identity for the OFF perf tier / while the 3D chunk loads.
// Keeps the VORTEX visual language (aurora, grid, glow, floating orbs).
export function HeroFallback({ compact = false }: { compact?: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-aurora" />
      <div className="absolute inset-0 holo-grid" />
      {/* glow horizon */}
      <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-neon/[0.07] to-transparent" />
      {/* floating orbs */}
      <div className="absolute left-[14%] top-[22%] w-24 h-24 rounded-full bg-neon/10 blur-2xl animate-float-slow" />
      <div className="absolute right-[18%] top-[30%] w-32 h-32 rounded-full bg-cyan/10 blur-3xl animate-float" />
      <div className="absolute left-[45%] bottom-[18%] w-40 h-40 rounded-full bg-neon/8 blur-3xl animate-float-slow" style={{ animationDelay: '1.4s' }} />
      {!compact && (
        <>
          {/* stylised plant silhouettes */}
          <svg className="absolute bottom-0 left-[6%] w-40 md:w-56 opacity-40" viewBox="0 0 200 300" fill="none">
            <path d="M100 300 C100 200 100 140 100 90" stroke="#1fd46b" strokeWidth="4" />
            <path d="M100 200 C60 190 40 150 44 110 C84 116 100 156 100 200Z" fill="#0b3d2e" stroke="#39ff88" strokeWidth="2" />
            <path d="M100 160 C140 150 160 110 156 70 C116 76 100 116 100 160Z" fill="#0b3d2e" stroke="#39ff88" strokeWidth="2" />
            <circle cx="100" cy="80" r="7" fill="#39ff88" opacity="0.9" />
          </svg>
          <svg className="absolute bottom-0 right-[8%] w-32 md:w-48 opacity-30" viewBox="0 0 200 300" fill="none">
            <path d="M100 300 C100 210 100 150 100 110" stroke="#0e7490" strokeWidth="4" />
            <path d="M100 220 C64 210 46 174 50 138 C86 144 100 180 100 220Z" fill="#04120a" stroke="#22d3ee" strokeWidth="2" />
            <path d="M100 180 C136 170 154 134 150 98 C114 104 100 140 100 180Z" fill="#04120a" stroke="#22d3ee" strokeWidth="2" />
          </svg>
        </>
      )}
    </div>
  );
}
