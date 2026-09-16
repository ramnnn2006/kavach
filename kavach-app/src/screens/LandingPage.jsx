import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleEnterPlatform = () => {
    navigate(user ? '/student' : '/login');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') setCurrentSlide((prev) => Math.min(prev + 1, 4));
      else if (e.key === 'ArrowLeft') setCurrentSlide((prev) => Math.max(prev - 1, 0));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const slides = [
    // Slide 1: Hero
    {
      id: 'hero',
      render: () => (
        <div style={{ textAlign: 'center' }}>
          <div className="icon-wrapper" style={{ margin: '0 auto 1.5rem', width: '4rem', height: '4rem', borderRadius: '1rem', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined notranslate" style={{ fontSize: '2rem', color: 'var(--primary)' }}>shield</span>
          </div>
          <h1 className="slide-title" style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.05em', lineHeight: 1.1, marginBottom: '1rem' }}>
            Campus Safety,<br />Rebuilt for Speed.
          </h1>
          <p className="slide-desc" style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '80%', margin: '0 auto 2rem', fontWeight: 500, lineHeight: 1.5 }}>
            Kavach is a fast, role-based safety platform connecting students and emergency responders in real time.
          </p>
          <button onClick={handleEnterPlatform} className="btn btn-primary" style={{ padding: '1rem 2rem', borderRadius: '999px', fontSize: '1rem' }}>
            Enter Platform
          </button>
        </div>
      )
    },
    // Slide 2: The Need
    {
      id: 'need',
      render: () => (
        <div style={{ textAlign: 'center' }}>
          <h2 className="slide-title" style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
            Why We Built Kavach
          </h2>
          <div className="glass-card glass-card-landing" style={{ padding: '1.5rem', textAlign: 'left', borderLeft: '4px solid var(--sos-red)' }}>
            <p className="slide-desc" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
              "A student collapses. The power grid fails. A fire breaks out in the labs."
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              In these critical seconds, traditional walkie-talkies, WhatsApp groups, and landlines create chaos. Dispatchers guess priorities. Responders lose time finding exact locations.
              <br /><br />
              <strong>Kavach replaces the noise with targeted, priority-sorted intelligence.</strong>
            </p>
          </div>
        </div>
      )
    },
    // Slide 3: The Five Problems
    {
      id: 'problems',
      render: () => (
        <div style={{ textAlign: 'center', width: '100%' }}>
          <h2 className="slide-title" style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            Five Problems, One Campus
          </h2>
          <p className="slide-desc" style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '2rem', fontWeight: 500 }}>
            Campuses suffer from five critical emergency issues happening simultaneously:
          </p>
          <div className="landing-grid">
            {[
              { icon: 'elevator', title: 'The Lift Hazard', desc: 'Average rescue times exceed 45 minutes with zero automated escalation.' },
              { icon: 'bolt', title: 'Blind Outages', desc: 'Generators run blindly without grid priority. Exam halls go dark.' },
              { icon: 'forum', title: 'Comms Chaos', desc: 'Alerts travel via uncoordinated WhatsApp groups.' },
              { icon: 'wifi_off', title: 'Offline Failure', desc: 'Outages kill local WiFi, rendering web systems useless.' },
              { icon: 'psychology', title: 'Manual Dispatch', desc: 'Dispatchers guess which emergency to handle first under panic.' }
            ].map((p, idx) => (
              <div key={idx} className="glass-card glass-card-landing" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', textAlign: 'left' }}>
                <div className="icon-wrapper" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: 'rgba(59, 130, 246, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined notranslate" style={{ color: 'var(--primary)', fontSize: '1.35rem' }}>{p.icon}</span>
                </div>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>{p.title}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: '1.4' }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    // Slide 4: Failed Solutions
    {
      id: 'solutions',
      render: () => (
        <div style={{ textAlign: 'center', width: '100%' }}>
          <h2 className="slide-title" style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            Misfitted Existing Systems
          </h2>
          <p className="slide-desc" style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '2rem', fontWeight: 500 }}>
            Standard tools were designed for alternative scales and fail campus needs:
          </p>
          <div className="landing-grid landing-grid-4">
            {[
              { tool: '112 / National Apps', flaw: 'Built for macro national disasters; lacks geofenced building routing.' },
              { tool: 'WhatsApp Streams', flaw: 'No structured tracking, no priority sorting, zero status feedback.' },
              { tool: 'Standard Lift Lines', flaw: 'Hardwired lines to unoccupied gates with zero backup triggers.' },
              { tool: 'Enterprise Software', flaw: 'Prohibitively expensive, lacks local offline resilience.' }
            ].map((s, idx) => (
              <div key={idx} className="glass-card glass-card-landing" style={{ padding: '1rem', borderLeft: '3px solid var(--sos-amber)', textAlign: 'left' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className="material-symbols-outlined notranslate" style={{ color: 'var(--sos-amber)', fontSize: '1.15rem' }}>cancel</span>
                  {s.tool}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{s.flaw}</p>
              </div>
            ))}
          </div>
        </div>
      )
    },
    // Slide 5: The Solution
    {
      id: 'kavach_system',
      render: () => (
        <div style={{ textAlign: 'center', width: '100%' }}>
          <h2 className="slide-title" style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>
            Kavach: Unified Safety
          </h2>
          <p className="slide-desc" style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '2rem', fontWeight: 500 }}>
            One system. Three customized user roles. Every campus hazard covered.
          </p>
          <div className="landing-grid landing-grid-4">
            {[
              { icon: 'hub', title: 'Smart Dispatch', desc: 'Sorts incident categories and auto-escalates delays.' },
              { icon: 'rss_feed', title: 'Offline Stack', desc: 'Keeps emergency messaging functional during network dropouts.' },
              { icon: 'map', title: 'Live Command', desc: 'Coordinates real-time active responder geolocations.' },
              { icon: 'electrical_services', title: 'Power Routing', desc: 'Intelligently prioritizes grids during loadshedding.' }
            ].map((pillar, idx) => (
              <div key={idx} className="glass-card glass-card-landing" style={{ padding: '1rem', textAlign: 'left', minHeight: '120px' }}>
                <span className="material-symbols-outlined notranslate" style={{ color: 'var(--primary)', fontSize: '1.75rem', marginBottom: '0.75rem', display: 'block' }}>{pillar.icon}</span>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>{pillar.title}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: '1.4' }}>{pillar.desc}</p>
              </div>
            ))}
          </div>
          <button onClick={handleEnterPlatform} className="btn btn-primary" style={{ marginTop: '2rem', padding: '1rem 2rem', background: 'var(--success)', borderRadius: '999px', fontSize: '1rem' }}>
            <span className="material-symbols-outlined notranslate" style={{ marginRight: '8px', verticalAlign: 'middle' }}>shield</span>
            Launch Safety Platform
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="page-landing fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', padding: '1.5rem', background: 'var(--bg)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', marginBottom: '2rem', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined notranslate filled" style={{ color: 'var(--primary)', fontSize: '1.75rem' }}>shield</span>
          <span style={{ fontSize: '1.15rem', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-main)' }}>KAVACH</span>
        </div>
        <button onClick={handleEnterPlatform} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase' }}>
          Launch
        </button>
      </header>

      <main className="landing-main" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '100%', margin: '0 auto', zIndex: 1 }}>
        <div style={{ width: '100%' }}>{slides[currentSlide].render()}</div>
      </main>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', margin: '2.5rem 0 1rem', zIndex: 10 }}>
        {slides.map((_, idx) => (
          <button key={idx} onClick={() => setCurrentSlide(idx)} style={{ width: idx === currentSlide ? '1.5rem' : '0.5rem', height: '0.5rem', borderRadius: '999px', border: 'none', background: idx === currentSlide ? 'var(--primary)' : 'var(--border)', cursor: 'pointer', transition: 'all 0.3s' }} />
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '320px', margin: '0 auto', zIndex: 10 }}>
        <button onClick={() => setCurrentSlide(prev => Math.max(prev - 1, 0))} disabled={currentSlide === 0} style={{ background: 'none', border: 'none', color: currentSlide === 0 ? 'var(--border)' : 'var(--text-muted)', cursor: currentSlide === 0 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span className="material-symbols-outlined notranslate" style={{ fontSize: '1.1rem' }}>arrow_back_ios</span> Prev
        </button>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>{currentSlide + 1} / {slides.length}</span>
        <button onClick={() => setCurrentSlide(prev => Math.min(prev + 1, 4))} disabled={currentSlide === 4} style={{ background: 'none', border: 'none', color: currentSlide === 4 ? 'var(--border)' : 'var(--text-muted)', cursor: currentSlide === 4 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          Next <span className="material-symbols-outlined notranslate" style={{ fontSize: '1.1rem' }}>arrow_forward_ios</span>
        </button>
      </div>
    </div>
  );
}
