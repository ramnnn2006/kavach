import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from './motionHooks';

// Alpha Residency, Towers A–D, drawn as CSS 3D boxes. Sizes are in px of the ground plane.
const TOWERS = [
  { id: 'A', x: 30, y: 30, w: 120, d: 120, h: 230 },
  { id: 'C', x: 250, y: 30, w: 120, d: 120, h: 290, lift: { col: 1 } },
  { id: 'D', x: 40, y: 244, w: 120, d: 120, h: 150 },
  { id: 'B', x: 250, y: 244, w: 120, d: 120, h: 200, stuck: { col: 2, row: 4 } },
];
const COLS = 4;
const ROW_H = 30;

// Deterministic "lit window" pattern so it doesn't flicker between renders
const hash = (t, face, r, c) => t.id.charCodeAt(0) * 31 + face * 17 + r * 7 + c * 13;
const lit = (t, face, r, c) => (hash(t, face, r, c) % 5) === 0;

// Geometry of the window grid (matches .tface__windows: inset 12px 10px, gap 7px, 4 columns)
const GAP = 7;
function grid(t) {
  const rows = Math.floor(t.h / ROW_H) - 1;
  const innerH = t.h - 24;
  const rowH = (innerH - GAP * (rows - 1)) / rows;
  const colW = (t.w - 20 - GAP * (COLS - 1)) / COLS;
  return {
    rows, rowH, colW,
    top: (r) => 12 + (rows - 1 - r) * (rowH + GAP),
    left: (c) => 10 + c * (colW + GAP),
  };
}

// A lift cabin riding up the face. `stuck` stops at a floor and flashes red during the alert.
function Cabin({ tower }) {
  const g = grid(tower);
  const spec = tower.stuck || tower.lift;
  const rowTop = tower.stuck ? tower.stuck.row : g.rows - 1;
  const travel = g.top(0) - g.top(rowTop);
  return (
    <i
      className={`tcab ${tower.stuck ? 'tcab--stuck' : 'tcab--run'}`}
      style={{ left: g.left(spec.col), top: g.top(0), width: g.colW, height: g.rowH, '--travel': `${travel}px` }}
    />
  );
}

function Windows({ tower, face }) {
  const rows = Math.floor(tower.h / ROW_H) - 1;
  const cells = [];
  for (let r = rows - 1; r >= 0; r--) {
    for (let c = 0; c < COLS; c++) {
      const on = lit(tower, face, r, c);
      const style = on ? { animationDelay: `${(hash(tower, face, r, c) % 7) * -0.9}s`, animationDuration: `${3 + (hash(tower, face, r, c) % 4)}s` } : undefined;
      cells.push(<i key={`${r}-${c}`} className={on ? 'tw tw--lit' : 'tw'} style={style} />);
    }
  }
  return <div className="tface__windows" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>{cells}</div>;
}

function Tower({ t }) {
  return (
    <div className="tower" style={{ '--x': `${t.x}px`, '--y': `${t.y}px`, '--w': `${t.w}px`, '--d': `${t.d}px`, '--h': `${t.h}px` }}>
      <div className="tface tface--top"><span>{t.id}</span></div>
      <div className="tface tface--s">
        <Windows tower={t} face={0} />
        {(t.stuck || t.lift) && <Cabin tower={t} />}
      </div>
      <div className="tface tface--e"><Windows tower={t} face={1} /></div>
      <div className="tface tface--w" />
      <div className="tface tface--n" />
    </div>
  );
}

// Things that stand up always face the camera (billboards), so they stay upright while the scene turns.
const TREES = [[14, 28], [14, 160], [14, 222], [14, 402], [402, 28], [402, 165], [402, 228], [402, 402], [88, 404], [350, 406], [100, 12], [312, 10]];
const WALKERS = [
  { from: [166, 0], to: [166, 420], dur: 26, tone: 'var(--orange)', delay: 0 },
  { from: [236, 420], to: [236, 0], dur: 31, tone: 'var(--pink)', delay: -9 },
  { from: [0, 160], to: [420, 160], dur: 36, tone: 'var(--purple)', delay: -14 },
  { from: [420, 222], to: [0, 222], dur: 29, tone: 'var(--green)', delay: -4 },
];

// A plain coloured block (same five faces as a tower, no windows)
function Block({ x = 0, y = 0, z = 0, w, d, h, color, className = '', style }) {
  return (
    <div className={`tower tblock ${className}`} style={{ '--x': `${x}px`, '--y': `${y}px`, '--z': `${z}px`, '--w': `${w}px`, '--d': `${d}px`, '--h': `${h}px`, '--c': color, ...style }}>
      <div className="tface tface--top" />
      <div className="tface tface--s" />
      <div className="tface tface--e" />
      <div className="tface tface--w" />
      <div className="tface tface--n" />
    </div>
  );
}

function Tree({ x, y, i }) {
  return (
    <div className="ttree" style={{ left: x, top: y, animationDelay: `${i * -0.7}s` }}>
      <Block x={-3} y={-3} w={6} d={6} h={10} color="color-mix(in srgb, var(--orange) 35%, #3a2a1a)" />
      <Block x={-11} y={-11} z={9} w={22} d={22} h={22} color="color-mix(in srgb, var(--green) 80%, #000)" />
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
      <div className="tcloud tcloud--1" />
      <div className="tcloud tcloud--2" />
      <div className="tcloud tcloud--3" />
      <div className="tworld">
        <div className="tground" />
        <div className="troad troad--v" />
        <div className="troad troad--h" />

        {/* Traffic */}
        <div className="tcar tcar--h" style={{ '--c': 'var(--teal)' }} />
        <div className="tcar tcar--h tcar--rev" style={{ '--c': 'var(--yellow)' }} />
        <div className="tcar tcar--v" style={{ '--c': 'var(--purple)' }} />

        {/* The Tower B story, one 14 s loop: lift sticks, alert pulses, van arrives, technician goes in */}
        <div className="tpulse" style={{ '--x': '310px', '--y': '304px' }}><i /><i /><i /></div>
        <div className="tunit"><i /></div>

        {TOWERS.map(t => <Tower key={t.id} t={t} />)}

        {TREES.map(([x, y], i) => <Tree key={`tree${i}`} x={x} y={y} i={i} />)}
        {WALKERS.map((w, i) => (
          <div key={`w${i}`} className="twalk" style={{ '--x0': `${w.from[0]}px`, '--y0': `${w.from[1]}px`, '--x1': `${w.to[0]}px`, '--y1': `${w.to[1]}px`, animationDuration: `${w.dur}s`, animationDelay: `${w.delay}s` }}>
            <Block x={-3} y={-3} w={6} d={6} h={14} color={w.tone} className="tperson" style={{ animationDelay: `${i * -0.3}s` }} />
          </div>
        ))}
        <div className="ttech"><Block x={-3} y={-3} w={6} d={6} h={14} color="var(--primary)" /></div>
      </div>
    </div>
  );
}
