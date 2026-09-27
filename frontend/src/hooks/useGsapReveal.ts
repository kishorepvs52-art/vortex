// GSAP ScrollTrigger reveal helper for landing sections.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Wraps a section ref; animates `[data-reveal]` children in on scroll.
 * Respects prefers-reduced-motion (elements simply become visible).
 */
export function useGsapReveal<T extends HTMLElement = HTMLDivElement>(deps: unknown[] = []) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = gsap.utils.toArray<HTMLElement>('[data-reveal]', el);

    if (reduced) {
      targets.forEach((t) => gsap.set(t, { opacity: 1, y: 0 }));
      return;
    }

    const ctx = gsap.context(() => {
      targets.forEach((t) => {
        gsap.fromTo(
          t,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: 'power3.out',
            delay: Number(t.dataset.revealDelay ?? 0),
            scrollTrigger: { trigger: t, start: 'top 88%', once: true },
          },
        );
      });
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

export { gsap, ScrollTrigger };
