import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, ArrowUpDown, Zap, MessagesSquare, WifiOff, Brain, XCircle,
  Network, Radio, Map as MapIcon, PlugZap, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Logo } from '../components/ui';
import { roleHome } from '../config/society';

const PROBLEMS = [
  { icon: ArrowUpDown, tone: 'var(--indigo)', title: 'The Lift Hazard', desc: 'Average rescue times exceed 45 minutes with zero automated escalation.' },
  { icon: Zap, tone: 'var(--orange)', title: 'Blind Outages', desc: 'Generators run blindly without grid priority. Exam halls go dark.' },
  { icon: MessagesSquare, tone: 'var(--green)', title: 'Comms Chaos', desc: 'Alerts travel via uncoordinated WhatsApp groups.' },
  { icon: WifiOff, tone: 'var(--gray)', title: 'Offline Failure', desc: 'Outages kill local WiFi, rendering web systems useless.' },
  { icon: Brain, tone: 'var(--purple)', title: 'Manual Dispatch', desc: 'Dispatchers guess which emergency to handle first under panic.' },
];

const FAILED_TOOLS = [
  { tool: '112 / National Apps', flaw: 'Built for macro national disasters; lacks geofenced building routing.' },
  { tool: 'WhatsApp Streams', flaw: 'No structured tracking, no priority sorting, zero status feedback.' },
  { tool: 'Standard Lift Lines', flaw: 'Hardwired lines to unoccupied gates with zero backup triggers.' },
  { tool: 'Enterprise Software', flaw: 'Prohibitively expensive, lacks local offline resilience.' },
];

const PILLARS = [
  { icon: Network, tone: 'var(--blue)', title: 'Smart Dispatch', desc: 'Sorts incident categories and auto-escalates delays.' },
  { icon: Radio, tone: 'var(--teal)', title: 'Offline Stack', desc: 'Keeps emergency messaging functional during network dropouts.' },
  { icon: MapIcon, tone: 'var(--green)', title: 'Live Command', desc: 'Coordinates real-time active responder geolocations.' },
  { icon: PlugZap, tone: 'var(--orange)', title: 'Power Routing', desc: 'Intelligently prioritizes grids during loadshedding.' },
];

function Tile({ icon: Icon, tone, title, desc }) {
  return (
    <Card className="row" style={{ alignItems: 'flex-start', gap: 'var(--s-3)' }}>
      <span className="type-icon" style={{ '--tone': tone }} aria-hidden="true">
        <Icon size={22} />
      </span>
      <div className="grow">
        <h3 className="text-sm bold">{title}</h3>
        <p className="text-sm muted" style={{ marginTop: 'var(--s-1)' }}>{desc}</p>
      </div>
    </Card>
  );
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleEnterPlatform = () => {
    navigate(user ? roleHome(userProfile?.role) : '/login');
  };

  const slides = [
    {
      id: 'hero',
      render: () => (
        <div className="stack center" style={{ alignItems: 'center' }}>
          <span className="type-icon type-icon--lg" style={{ '--tone': 'var(--primary)' }} aria-hidden="true">
            <Shield size={28} />
          </span>
          <h1 className="text-xl bold">Campus Safety,<br />Rebuilt for Speed.</h1>
          <p className="muted" style={{ maxWidth: '40ch' }}>
            Kavach is a fast, role-based safety platform connecting students and emergency responders in real time.
          </p>
          <Button size="lg" onClick={handleEnterPlatform}>Enter platform</Button>
        </div>
      ),
    },
    {
      id: 'need',
      render: () => (
        <div className="stack">
          <h2 className="text-xl bold center">Why We Built Kavach</h2>
          <Card accent tone="var(--red)" className="stack-sm" style={{ maxWidth: 640, margin: '0 auto' }}>
            <p className="bold">&ldquo;A student collapses. The power grid fails. A fire breaks out in the labs.&rdquo;</p>
            <p className="text-sm muted">
              In these critical seconds, traditional walkie-talkies, WhatsApp groups, and landlines create chaos.
              Dispatchers guess priorities. Responders lose time finding exact locations.
            </p>
            <p className="text-sm bold">Kavach replaces the noise with targeted, priority-sorted intelligence.</p>
          </Card>
        </div>
      ),
    },
    {
      id: 'problems',
      render: () => (
        <div className="stack">
          <div className="stack-sm center">
            <h2 className="text-xl bold">Five Problems, One Campus</h2>
            <p className="muted">Campuses suffer from five critical emergency issues happening simultaneously:</p>
          </div>
          <div className="grid-auto">
            {PROBLEMS.map(p => <Tile key={p.title} {...p} />)}
          </div>
        </div>
      ),
    },
    {
      id: 'solutions',
      render: () => (
        <div className="stack">
          <div className="stack-sm center">
            <h2 className="text-xl bold">Misfitted Existing Systems</h2>
            <p className="muted">Standard tools were designed for alternative scales and fail campus needs:</p>
          </div>
          <div className="grid-auto">
            {FAILED_TOOLS.map(s => <Tile key={s.tool} icon={XCircle} tone="var(--orange)" title={s.tool} desc={s.flaw} />)}
          </div>
        </div>
      ),
    },
    {
      id: 'kavach_system',
      render: () => (
        <div className="stack">
          <div className="stack-sm center">
            <h2 className="text-xl bold">Kavach: Unified Safety</h2>
            <p className="muted">One system. Three customized user roles. Every campus hazard covered.</p>
          </div>
          <div className="grid-auto">
            {PILLARS.map(p => <Tile key={p.title} {...p} />)}
          </div>
          <div className="center">
            <Button size="lg" onClick={handleEnterPlatform}>
              <Shield size={20} aria-hidden="true" />
              Launch safety platform
            </Button>
          </div>
        </div>
      ),
    },
  ];

  const lastIndex = slides.length - 1;
  const goTo = (i) => setCurrentSlide(Math.min(Math.max(i, 0), lastIndex));

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key === 'ArrowRight') setCurrentSlide(prev => Math.min(prev + 1, lastIndex));
      else if (e.key === 'ArrowLeft') setCurrentSlide(prev => Math.max(prev - 1, 0));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lastIndex]);

  return (
    <div className="page page--wide fade-in stack-lg">
      <header className="row-between">
        <div className="row">
          <Logo size={32} />
          <span className="text-lg bold">Kavach</span>
        </div>
        <Button variant="secondary" size="sm" onClick={handleEnterPlatform}>Launch</Button>
      </header>

      <main aria-roledescription="carousel" aria-label="About Kavach">
        <section
          key={slides[currentSlide].id}
          className="fade-in"
          aria-roledescription="slide"
          aria-label={`${currentSlide + 1} of ${slides.length}`}
        >
          {slides[currentSlide].render()}
        </section>
      </main>

      <nav className="stack-sm" aria-label="Slides" style={{ alignItems: 'center' }}>
        <div className="row" style={{ gap: 0 }}>
          {slides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={idx === currentSlide ? 'step' : undefined}
              style={{ width: 44, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span
                className="type-icon"
                aria-hidden="true"
                style={{ '--tone': idx === currentSlide ? 'var(--primary)' : 'var(--border)', width: idx === currentSlide ? 20 : 8, height: 8, borderRadius: 4 }}
              />
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 'var(--s-3)' }}>
          <Button variant="secondary" onClick={() => goTo(currentSlide - 1)} disabled={currentSlide === 0} aria-label="Previous slide">
            <ChevronLeft size={20} aria-hidden="true" /> Prev
          </Button>
          <span className="text-sm muted" aria-live="polite">{currentSlide + 1} / {slides.length}</span>
          <Button variant="secondary" onClick={() => goTo(currentSlide + 1)} disabled={currentSlide === lastIndex} aria-label="Next slide">
            Next <ChevronRight size={20} aria-hidden="true" />
          </Button>
        </div>
      </nav>
    </div>
  );
}
