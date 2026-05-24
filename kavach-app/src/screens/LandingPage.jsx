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

  // Keyboard navigation for presentation feel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setCurrentSlide((prev) => Math.min(prev + 1, 4));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const slides = [
    // Slide 1: Hero
    {
      id: 'hero',
      render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '65vh', position: 'relative' }}>
          {/* Pulsing Shield Illustration */}
          <div style={{ position: 'relative', width: '8.5rem', height: '8.5rem', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
              animation: 'pulse-ring 3s ease-in-out infinite'
            }} />
            <div style={{
              width: '6.5rem', height: '6.5rem', borderRadius: '2.5rem',
              background: 'var(--card-bg)', border: '2px solid rgba(59, 130, 246, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
              animation: 'float 5s ease-in-out infinite'
            }}>
              <span className="material-symbols-outlined notranslate filled" style={{ fontSize: '3.5rem', color: 'var(--primary)' }}>shield</span>
            </div>
          </div>

          <h1 style={{ fontSize: '2.1rem', fontWeight: 900, lineHeight: '1.2', letterSpacing: '-0.04em', color: 'var(--text-main)', marginBottom: '1rem', maxWidth: '600px' }}>
            Kavach
          </h1>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            Intelligent Campus Emergency Management System
          </p>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', maxWidth: '480px', lineHeight: '1.6', marginBottom: '2.5rem' }}>
            When the power goes out, Kavach stays on. A unified safety network bridging the gap between campus hazards and response coordinates.
          </p>

          <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '320px' }}>
            <button onClick={handleEnterPlatform} className="btn btn-primary" style={{ boxShadow: '0 4px 18px rgba(59, 130, 246, 0.3)' }}>
              Enter Platform
              <span className="material-symbols-outlined notranslate" style={{ fontSize: '1.1rem' }}>arrow_forward</span>
            </button>
            <button onClick={() => setCurrentSlide(1)} className="btn btn-outline">
              Start Tour
            </button>
          </div>
        </div>
      )
    },
    // Slide 2: Chennai Incident Case Study
    {
      id: 'chennai',
      render: () => (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', padding: '1rem 0' }}>
          <div className="glass-card" style={{ padding: '2rem', borderLeft: '4px solid var(--sos-red)', position: 'relative', overflow: 'hidden' }}>
            {/* Warning siren glow */}
            <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(239, 68, 68, 0.12) 0%, transparent 70%)', animation: 'pulse-ring 2.5s infinite' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <span className="material-symbols-outlined notranslate" style={{ color: 'var(--sos-red)', fontSize: '1.75rem' }}>emergency_home</span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>This Happened. Right Here. In Chennai.</h2>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.7', textAlign: 'left', marginBottom: '1.25rem', fontWeight: 500 }}>
              A student was trapped inside a lift at a Chennai college for 47 minutes. She pressed the emergency call button repeatedly. Nobody answered. 
              The button wired directly to an unmanned security desk. By the time help arrived, she had suffered a severe panic attack.
            </p>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.7', textAlign: 'left', marginBottom: '1.5rem' }}>
              This is not a rare incident. Elevator trapping and response failures occur regularly across Indian university campuses. Unmanaged communication channels leave safety grids unresponsive in critical moments.
            </p>

            <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.05)', display: 'inline-block', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--sos-red)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                * This is the problem Kavach was built to solve *
              </span>
            </div>
          </div>
        </div>
      )
    },
    // Slide 3: The Five Problems
    {
      id: 'problems',
      render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em', marginBottom: '0.5rem', textAlign: 'center' }}>
            Five Problems, One Campus
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', textAlign: 'center', fontWeight: 500 }}>
            Campuses suffer from five critical emergency issues happening simultaneously:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { icon: 'elevator', title: 'The Lift Hazard', desc: 'Emergency buttons connect to unmanned desks. Average rescue times exceed 45 minutes, with zero automated escalation protocols.' },
              { icon: 'bolt', title: 'Blind Outage Management', desc: 'Generators run blindly without grid priority. Exam halls go dark, laboratories lose test samples, and hostels sit in heat.' },
              { icon: 'forum', title: 'Communication Chaos', desc: 'Alerts travel via uncoordinated WhatsApp groups. Dozens of people forward conflicting reports to the same security desk.' },
              { icon: 'wifi_off', title: 'Offline Failure', desc: 'Outages kill local WiFi connections, rendering standard web-based security and reporting systems completely useless.' },
              { icon: 'psychology', title: 'Manual Dispatch Guesswork', desc: 'Under extreme panic, dispatchers are forced to manually guess which emergency to handle first without active triage intelligence.' }
            ].map((p, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: 'rgba(59, 130, 246, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined notranslate" style={{ color: 'var(--primary)', fontSize: '1.35rem' }}>{p.icon}</span>
                </div>
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>{p.title}</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', lineHeight: '1.4' }}>{p.desc}</p>
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
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em', marginBottom: '0.5rem', textAlign: 'center' }}>
            Misfitted Existing Systems
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', textAlign: 'center', fontWeight: 500 }}>
            Standard tools were designed for alternative scales and fail campus needs:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            {[
              { tool: '112 India & National Apps', flaw: 'Built for macro national disasters; lacks geofenced building routing or local campus response coordination.' },
              { tool: 'WhatsApp Chat Streams', flaw: 'No structured tracking, no priority sorting, no dispatcher accountability, and zero status feedback.' },
              { tool: 'Standard Lift Emergency Lines', flaw: 'Hardwired lines that lead to unoccupied guard gates with zero backup triggers or status escalations.' },
              { tool: 'Western Enterprise Software', flaw: 'Prohibitively expensive, built for corporate high-connectivity zones, and lacks local offline resilience.' }
            ].map((s, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '1rem', borderLeft: '3px solid var(--sos-amber)' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined notranslate" style={{ color: 'var(--sos-amber)', fontSize: '1.15rem' }}>cancel</span>
                  {s.tool}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: '1.4', paddingLeft: '1.65rem' }}>
                  {s.flaw}
                </p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '0.75rem', background: 'rgba(245, 158, 11, 0.04)', border: '1px dashed var(--sos-amber)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--sos-amber)' }}>
              India has 42,000+ colleges. Zero have dedicated campus emergency routing. Kavach fills this gap.
            </p>
          </div>
        </div>
      )
    },
    // Slide 5: The Kavach Solution
    {
      id: 'kavach_system',
      render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em', marginBottom: '0.25rem', textAlign: 'center' }}>
            Kavach: Unified Safety
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', textAlign: 'center', fontWeight: 500 }}>
            One system. Three customized user roles. Every campus hazard covered.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[
              { icon: 'hub', title: 'Smart Dispatch Engine', desc: 'Sorts incident categories, auto-escalates delays, and guides responders.' },
              { icon: 'rss_feed', title: 'Five-Layer Offline Stack', desc: 'Keeps emergency messaging fully functional during heavy network dropouts.' },
              { icon: 'map', title: 'Live Campus Command', desc: 'Coordinates real-time active responder geolocations and grid status.' },
              { icon: 'electrical_services', title: 'Smart Power Routing', desc: 'Intelligently manages grids, prioritizing exam blocks during loadshedding.' }
            ].map((pillar, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '120px' }}>
                <span className="material-symbols-outlined notranslate" style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>{pillar.icon}</span>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)' }}>{pillar.title}</h3>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>{pillar.desc}</p>
              </div>
            ))}
          </div>

          <button
            onClick={handleEnterPlatform}
            className="btn btn-primary"
            style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--success)', color: 'white', boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)' }}
          >
            <span className="material-symbols-outlined notranslate">shield</span>
            Launch Safety Platform
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="page fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', padding: '1.5rem', background: 'var(--bg)' }}>
      {/* Dynamic inline keyframes style block */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.92); opacity: 0.15; }
          50% { transform: scale(1.08); opacity: 0.45; }
          100% { transform: scale(0.92); opacity: 0.15; }
        }
        .slide-container {
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
        }
      `}</style>

      {/* Modern Top Navigation Header */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.5rem 0', marginBottom: '2rem', borderBottom: '1px solid var(--border)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined notranslate filled" style={{ color: 'var(--primary)', fontSize: '1.75rem' }}>shield</span>
          <span style={{ fontSize: '1.15rem', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-main)' }}>KAVACH</span>
        </div>
        
        <button
          onClick={handleEnterPlatform}
          style={{
            padding: '0.5rem 1rem', borderRadius: '0.5rem',
            background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--primary)',
            color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 800,
            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
            transition: 'all 0.2s'
          }}
        >
          Launch
        </button>
      </header>

      {/* Main Slides Content Section */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '440px', margin: '0 auto', zIndex: 1 }}>
        <div style={{ width: '100%' }}>
          {slides[currentSlide].render()}
        </div>
      </main>

      {/* Side Slide Navigation Indicators (Floating Bullet Dots) */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem',
        margin: '2.5rem 0 1rem', zIndex: 10
      }}>
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            style={{
              width: idx === currentSlide ? '1.5rem' : '0.5rem',
              height: '0.5rem',
              borderRadius: '9999px',
              border: 'none',
              background: idx === currentSlide ? 'var(--primary)' : 'var(--border)',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        ))}
      </div>

      {/* Floating Presentation Controls */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        width: '100%', maxWidth: '320px', margin: '0 auto', zIndex: 10
      }}>
        <button
          onClick={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
          disabled={currentSlide === 0}
          style={{
            background: 'none', border: 'none', color: currentSlide === 0 ? 'var(--border)' : 'var(--text-muted)',
            cursor: currentSlide === 0 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: '0.25rem', transition: 'color 0.2s'
          }}
        >
          <span className="material-symbols-outlined notranslate" style={{ fontSize: '1.1rem' }}>arrow_back_ios</span>
          Prev
        </button>
        
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          {currentSlide + 1} / {slides.length}
        </span>

        <button
          onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, 4))}
          disabled={currentSlide === slides.length - 1}
          style={{
            background: 'none', border: 'none', color: currentSlide === slides.length - 1 ? 'var(--border)' : 'var(--text-muted)',
            cursor: currentSlide === slides.length - 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: '0.25rem', transition: 'color 0.2s'
          }}
        >
          Next
          <span className="material-symbols-outlined notranslate" style={{ fontSize: '1.1rem' }}>arrow_forward_ios</span>
        </button>
      </div>
    </div>
  );
}
