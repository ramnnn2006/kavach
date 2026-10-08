import { useEffect, useRef, useState } from 'react';
import { useInView, usePrefersReducedMotion } from './motionHooks';

/** Fades and lifts its children in the first time they scroll into view. */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null);
  const seen = useInView(ref, { threshold: 0.12 });
  return (
    <Tag ref={ref} className={`reveal${seen ? ' is-in' : ''} ${className}`.trim()} style={{ '--d': `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}

/** Counts the first number in a string up from zero when it scrolls into view ("2.5 years", "31%"). */
export function CountUp({ text, className }) {
  const ref = useRef(null);
  const seen = useInView(ref, { threshold: 0.6 });
  const reduced = usePrefersReducedMotion();
  const match = /\d+(?:\.\d+)?/.exec(text);
  const [shown, setShown] = useState(text);

  useEffect(() => {
    if (!match) { setShown(text); return undefined; }
    if (!seen || reduced) { setShown(text); return undefined; }
    const target = parseFloat(match[0]);
    const decimals = (match[0].split('.')[1] || '').length;
    const start = performance.now();
    const DURATION = 1100;
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / DURATION);
      const eased = 1 - (1 - p) ** 3;
      const v = (target * eased).toFixed(decimals);
      setShown(text.replace(match[0], v));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setShown(text.replace(match[0], (0).toFixed(decimals)));
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, reduced, text]);

  return <span ref={ref} className={className} aria-label={text}><span aria-hidden="true">{shown}</span></span>;
}

/** Thin bar under the header that fills as the page scrolls. */
export function ScrollProgress() {
  const ref = useRef(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (ref.current) ref.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);
  return <div className="landing__progress" aria-hidden="true"><span ref={ref} /></div>;
}
