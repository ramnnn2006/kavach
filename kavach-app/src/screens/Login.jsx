import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

function getPasswordStrength(password) {
  if (!password) return { label: '', score: 0, color: 'var(--border)' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.match(/[A-Z]/)) score += 1;
  if (password.match(/[0-9]/)) score += 1;
  if (password.match(/[^A-Za-z0-9]/)) score += 1;

  if (score < 2) return { label: 'Weak', score, color: 'var(--sos-red)' };
  if (score < 4) return { label: 'Medium', score, color: 'var(--sos-amber)' };
  return { label: 'Strong', score, color: 'var(--success)' };
}

export default function Login({ onLoginSuccess }) {
  const { login, signup, demoLogin, resetPassword, isFirebaseConfigured } = useAuth();
  const { showToast } = useToast();

  // Onboarding vs Form views
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('kavach_onboarded') !== 'true';
  });
  const [currentSlide, setCurrentSlide] = useState(0);

  // Form states
  const [activeTab, setActiveTab] = useState('signin'); // 'signin' or 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Student' // Student, Responder, Admin
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const onboardingSlides = [
    {
      icon: 'shield',
      title: 'Your Campus Shield',
      description: 'Kavach links students, medical personnel, security teams, and facility responders instantly to ensure rapid response.'
    },
    {
      icon: 'bolt',
      title: 'One-Tap Emergency SOS',
      description: 'Quickly report fires, elevator blockages, power failures, or medical crises and watch responders coordinate on-screen.'
    },
    {
      icon: 'share_location',
      title: 'Real-time Coordination',
      description: 'Track responder distance, access campus-wide safety updates, and maintain high awareness under critical events.'
    }
  ];

  // Auto validate on input changes
  const validateField = (name, val) => {
    let err = '';
    if (name === 'email') {
      if (!val) err = 'Email is required.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) err = 'Enter a valid email address.';
    } else if (name === 'password') {
      if (!val) err = 'Password is required.';
      else if (val.length < 8) err = 'Must be at least 8 characters.';
    } else if (name === 'name' && activeTab === 'signup') {
      if (!val.trim()) err = 'Name is required.';
    }
    return err;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const isEmailValid = formData.email && !validateField('email', formData.email);
  const isPasswordValid = formData.password && !validateField('password', formData.password);
  const isNameValid = activeTab === 'signin' || (formData.name.trim() && !validateField('name', formData.name));

  const isFormValid = isEmailValid && isPasswordValid && isNameValid;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrors({});
    setTouched({});
    setFormData(prev => ({ ...prev, password: '' })); // clear password on tab switch
  };

  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();

    // Mark all as touched
    const allTouched = { email: true, password: true, name: true };
    setTouched(allTouched);

    const emailErr = validateField('email', formData.email);
    const passErr = validateField('password', formData.password);
    const nameErr = validateField('name', formData.name);

    const nextErrors = { email: emailErr, password: passErr };
    if (activeTab === 'signup') nextErrors.name = nameErr;

    setErrors(nextErrors);

    if (emailErr || passErr || (activeTab === 'signup' && nameErr)) {
      showToast('Please correct validation errors.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      if (activeTab === 'signin') {
        if (isFirebaseConfigured) {
          await login(formData.email, formData.password);
        } else {
          // Demo fallback
          await new Promise(r => setTimeout(r, 1000));
          demoLogin('student'); // default to student for generic sign in
        }
        showToast('Logged in successfully!', 'success');
      } else {
        // Sign Up
        if (isFirebaseConfigured) {
          await signup(formData.email, formData.password, formData.name, formData.role);
        } else {
          // Demo fallback
          await new Promise(r => setTimeout(r, 1000));
          demoLogin(formData.role.toLowerCase());
        }
        showToast(`Account registered as ${formData.role}!`, 'success');
      }
      if (onLoginSuccess) onLoginSuccess(formData.role);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Authentication failed. Please verify and retry.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoAccess = (role) => {
    setIsLoading(true);
    try {
      demoLogin(role.toLowerCase());
      showToast(`Logged in successfully as Demo ${role}!`, 'success');
      if (onLoginSuccess) onLoginSuccess(role);
    } catch (err) {
      console.error(err);
      showToast('Demo login failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      showToast('Please enter your email address in the field above first.', 'error');
      return;
    }
    const emailErr = validateField('email', formData.email);
    if (emailErr) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      if (isFirebaseConfigured) {
        await resetPassword(formData.email);
        showToast('Password reset link sent to your email!', 'success');
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
        showToast(`Demo Mode: Password reset link simulated successfully for ${formData.email}!`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to send password reset email.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishOnboarding = () => {
    localStorage.setItem('kavach_onboarded', 'true');
    setShowOnboarding(false);
  };

  const strength = getPasswordStrength(formData.password);

  if (showOnboarding) {
    const slide = onboardingSlides[currentSlide];
    return (
      <div className="page fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '1.5rem', background: 'var(--bg)' }}>
        <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          
          {/* Neon Pulse Backdrop */}
          <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '120%', height: '50%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

          {/* Logo Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', zIndex: 1 }}>
            <span className="material-symbols-outlined notranslate filled" style={{ color: 'var(--primary)', fontSize: '2.25rem' }}>shield</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.05em', color: 'var(--text-main)' }}>KAVACH</span>
          </div>

          {/* Animated Slide Icon */}
          <div style={{
            width: '6.5rem', height: '6.5rem', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem',
            border: '2px solid rgba(59, 130, 246, 0.15)', zIndex: 1
          }}>
            <span className="material-symbols-outlined notranslate filled" style={{ fontSize: '3rem', color: 'var(--primary)', animation: 'pulse 2.5s infinite' }}>{slide.icon}</span>
          </div>

          {/* Texts */}
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)', zIndex: 1 }}>{slide.title}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', minHeight: '4.5rem', zIndex: 1 }}>{slide.description}</p>

          {/* Pagination Indicators */}
          <div style={{ display: 'flex', gap: '0.5rem', margin: '2rem 0 1rem' }}>
            {onboardingSlides.map((_, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                style={{
                  width: idx === currentSlide ? '1.5rem' : '0.5rem',
                  height: '0.5rem',
                  borderRadius: '9999px',
                  background: idx === currentSlide ? 'var(--primary)' : 'var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>

          {/* Interaction controls */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', zIndex: 1 }}>
            {currentSlide < onboardingSlides.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setCurrentSlide(prev => prev + 1)}>
                Next
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleFinishOnboarding}>
                Get Started
              </button>
            )}
            
            <button className="btn btn-outline" style={{ border: 'none', textTransform: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem' }} onClick={handleFinishOnboarding}>
              Skip Tutorial
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '2rem 1.5rem', background: 'var(--bg)' }}>
      
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <span className="material-symbols-outlined notranslate filled" style={{ color: 'var(--primary)', fontSize: '2.5rem' }}>shield</span>
        <span style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.05em', color: 'var(--text-main)' }}>KAVACH</span>
      </div>

      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', marginBottom: '1.5rem', overflow: 'hidden', position: 'relative' }}>
        
        {/* Dynamic sliding indicator tabs */}
        <div style={{ display: 'flex', background: 'var(--tab-bg)', borderRadius: '0.75rem', padding: '0.25rem', marginBottom: '2rem', border: '1px solid var(--border)', position: 'relative' }}>
          <div style={{
            position: 'absolute', top: '0.25rem', bottom: '0.25rem',
            left: activeTab === 'signin' ? '0.25rem' : '50%',
            right: activeTab === 'signin' ? '50%' : '0.25rem',
            background: 'var(--card-bg)', borderRadius: '0.5rem',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)',
            border: '1px solid var(--card-border)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 0
          }} />

          <button 
            type="button" 
            onClick={() => handleTabChange('signin')}
            style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', fontSize: '0.85rem', fontWeight: 700, color: activeTab === 'signin' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', zIndex: 1, transition: 'color 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Sign In
          </button>
          <button 
            type="button" 
            onClick={() => handleTabChange('signup')}
            style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', fontSize: '0.85rem', fontWeight: 700, color: activeTab === 'signup' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', zIndex: 1, transition: 'color 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Register
          </button>
        </div>

        {/* Dynamic Forms */}
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {activeTab === 'signup' && (
            <div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <span className="material-symbols-outlined notranslate">person</span>
                <input
                  type="text"
                  name="name"
                  className="input-field"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  disabled={isLoading}
                />
              </div>
              {touched.name && errors.name && (
                <p style={{ color: 'var(--sos-red)', fontSize: '0.75rem', marginTop: '0.25rem', paddingLeft: '1rem', fontWeight: '500' }}>
                  {errors.name}
                </p>
              )}
            </div>
          )}

          <div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <span className="material-symbols-outlined notranslate">mail</span>
              <input
                type="email"
                name="email"
                className="input-field"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={handleBlur}
                disabled={isLoading}
              />
              {isEmailValid && (
                <span className="material-symbols-outlined notranslate" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--success)', pointerEvents: 'none' }}>
                  check_circle
                </span>
              )}
            </div>
            {touched.email && errors.email && (
              <p style={{ color: 'var(--sos-red)', fontSize: '0.75rem', marginTop: '0.25rem', paddingLeft: '1rem', fontWeight: '500' }}>
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <span className="material-symbols-outlined notranslate">lock</span>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="input-field"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                onBlur={handleBlur}
                disabled={isLoading}
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
                }}
              >
                <span className="material-symbols-outlined notranslate">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>

            {/* Password strength meter — HIDE ON SIGN IN, ONLY SHOW ON SIGN UP */}
            {activeTab === 'signup' && formData.password.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', paddingLeft: '1rem' }}>
                <div style={{ flex: 1, height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(strength.score / 4) * 100}%`, background: strength.color, transition: 'all 0.3s ease' }} />
                </div>
                <span style={{ fontSize: '0.7rem', color: strength.color, fontWeight: '700' }}>{strength.label}</span>
              </div>
            )}

            {touched.password && errors.password && (
              <p style={{ color: 'var(--sos-red)', fontSize: '0.75rem', marginTop: '0.25rem', paddingLeft: '1rem', fontWeight: '500' }}>
                {errors.password}
              </p>
            )}
            
            {activeTab === 'signin' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                <button 
                  type="button" 
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </div>

          {activeTab === 'signup' && (
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>SELECT SYSTEM ROLE</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {['Student', 'Responder', 'Admin'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role }))}
                    style={{
                      padding: '0.6rem 0.25rem',
                      borderRadius: '0.5rem',
                      background: formData.role === role ? 'rgba(59, 130, 246, 0.1)' : 'var(--tab-bg)',
                      border: formData.role === role ? '2px solid var(--primary)' : '1px solid var(--border)',
                      color: formData.role === role ? 'var(--primary)' : 'var(--text-main)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {role === 'Student' && '🎓'}
                    {role === 'Responder' && '🛡️'}
                    {role === 'Admin' && '🏫'}
                    {role}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
            disabled={!isFormValid || isLoading}
            style={{ marginTop: '0.5rem' }}
          >
            {activeTab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>

      {/* Modern Developer Sandbox / Quick Demo Login Section */}
      <div className="glass-card fade-up" style={{
        width: '100%', maxWidth: '400px', padding: '1.25rem 1.5rem',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        boxShadow: '0 4px 20px rgba(59, 130, 246, 0.05)',
        background: 'var(--card-bg)',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%) translateY(-50%)', padding: '0.25rem 0.75rem', borderRadius: '9999px', background: 'var(--primary)', color: 'white', fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)' }}>
          Sandbox Dev Tools
        </div>

        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem', marginBottom: '0.25rem' }}>
          ⚡ Immediate One-Click Demo access
        </p>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Skip authentication to test the app across different workspace views:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          <button 
            className="btn btn-outline" 
            onClick={() => handleQuickDemoAccess('Student')}
            style={{ padding: '0.5rem 0.25rem', fontSize: '0.7rem', textTransform: 'none', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.25rem', height: 'auto', borderRadius: '0.5rem' }}
            disabled={isLoading}
          >
            <span style={{ fontSize: '1.25rem' }}>🎓</span>
            <span>Student</span>
          </button>
          <button 
            className="btn btn-outline" 
            onClick={() => handleQuickDemoAccess('Responder')}
            style={{ padding: '0.5rem 0.25rem', fontSize: '0.7rem', textTransform: 'none', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.25rem', height: 'auto', borderRadius: '0.5rem' }}
            disabled={isLoading}
          >
            <span style={{ fontSize: '1.25rem' }}>🛡️</span>
            <span>Responder</span>
          </button>
          <button 
            className="btn btn-outline" 
            onClick={() => handleQuickDemoAccess('Admin')}
            style={{ padding: '0.5rem 0.25rem', fontSize: '0.7rem', textTransform: 'none', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.25rem', height: 'auto', borderRadius: '0.5rem' }}
            disabled={isLoading}
          >
            <span style={{ fontSize: '1.25rem' }}>🏫</span>
            <span>Admin</span>
          </button>
        </div>
      </div>

      {/* Option to replay onboarding slider */}
      <button 
        type="button" 
        onClick={() => {
          localStorage.removeItem('kavach_onboarded');
          setShowOnboarding(true);
        }}
        style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          fontSize: '0.75rem', cursor: 'pointer', marginTop: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600
        }}
      >
        <span className="material-symbols-outlined notranslate" style={{ fontSize: '1rem' }}>help</span>
        Replay Welcome Walkthrough
      </button>
    </div>
  );
}
