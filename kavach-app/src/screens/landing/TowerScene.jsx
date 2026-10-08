import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from './motionHooks';

// Alpha Residency, Towers A–D, drawn as CSS 3D boxes. Sizes are in px of the ground plane.
const TOWERS = [
  { id: 'A', x: 30, y: 40, w: 120, d: 120, h: 190 },
  { id: 'B', x: 250, y: 30, w: 120, d: 120, h: 290, alert: { col: 2, row: 4 } },
  { id: 'C', x: 40, y: 250, w: 120, d: 120, h: 230 },
  { id: 'D', x: 250, y: 260, w: 120, d: 120, h: 150 },
];
const COLS = 4;
const ROW_H = 30;

// Deterministic "lit window" pattern so it doesn't flicker between renders
const lit = (t, face, r, c) => ((t.id.charCodeAt(0) * 31 + face * 17 + r * 7 + c * 13) % 5) === 0;

function Windows({ tower, face }) {
  const rows = Math.floor(tower.h / ROW_H) - 1;
  const cells = [];
  for (let r = rows - 1; r >= 0; r--) {
    for (let c = 0; c < COLS; c++) {
      const isAlert = face === 0 && tower.alert && tower.alert.col === c && tower.alert.row === r;
      const cls = isAlert ? 'tw tw--alert' : lit(tower, face, r, c) ? 'tw tw--lit' : 'tw';
      cells.push(<i key={`${r}-${c}`} className={cls} />);
    }
  }
  return <div className="tface__windows" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>{cells}</div>;
}

function Tower({ t }) {
  return (
    <div className="tower" style={{ '--x': `${t.x}px`, '--y': `${t.y}px`, '--w': `${t.w}px`, '--d': `${t.d}px`, '--h': `${t.h}px` }}>
      <div className="tface tface--top"><span>{t.id}</span></div>
      <div className="tface tface--s"><Windows tower={t} face={0} /></div>
      <div className="tface tface--e"><Windows tower={t} face={1} /></div>
      <div className="tface tface--w" />
      <div className="tface tface--n" />
    </div>
  );
}

export default function TowerScene() {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();

  // Pointer and scroll gently turn the whole scene. One rAF writes two CSS variables.
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return undefined;
    let px = 0;
    let py = 0;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const scroll = Math.min(1, window.scrollY / 700);
      el.style.setProperty('--rx', `${60 + py * -6 + scroll * 6}deg`);
      el.style.setProperty('--rz', `${-38 + px * 12 + scroll * 24}deg`);
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(apply); };
    const onMove = (e) => {
      px = (e.clientX / window.innerWidth - 0.5) * 2;
      py = (e.clientY / window.innerHeight - 0.5) * 2;
      queue();
    };
    const fine = window.matchMedia && window.matchMedia('(hover: hover)').matches;
    if (fine) window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', queue, { passive: true });
    apply();
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', queue);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <div className="tscene" ref={ref} aria-hidden="true">
      <div className="tworld">
        <div className="tground" />
        {/* Alert ripples on the ground around Tower B, and a responder driving in */}
        <div className="tpulse" style={{ '--x': '310px', '--y': '90px' }}><i /><i /><i /></div>
        <div className="tunit"><i /></div>
        {TOWERS.map(t => <Tower key={t.id} t={t} />)}
      </div>
    </div>
  );
}
