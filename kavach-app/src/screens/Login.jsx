import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, User, Mail, Lock, HelpCircle, Zap, GraduationCap, ShieldCheck, Building2 } from 'lucide-react';

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

  const [showOnboarding, setShowOnboarding] = useState(() => localStorage.getItem('kavach_onboarded') !== 'true');
  const [currentSlide, setCurrentSlide] = useState(0);

  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'Student' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const onboardingSlides = [
    { id: 1, title: 'Instant SOS', desc: 'Trigger campus-wide emergencies in 2 taps. Alerts bypass WhatsApp delays.', icon: <Zap size={48} color="var(--primary)" /> },
    { id: 2, title: 'Smart Dispatch', desc: 'Responders are auto-assigned based on incident type and priority.', icon: <Shield size={48} color="var(--primary)" /> },
    { id: 3, title: 'Power Grid Failures', desc: 'Admins instantly reroute power to exam halls during loadshedding.', icon: <Building2 size={48} color="var(--primary)" /> },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name]) setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

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
    setFormData(prev => ({ ...prev, password: '' }));
  };

  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();
    const allTouched = { email: true, password: true, name: true };
    setTouched(allTouched);

    const emailErr = validateField('email', formData.email);
    const passErr = validateField('password', formData.password);
    const nameErr = validateField('name', formData.name);

    const nextErrors = { email: emailErr, password: passErr };
    if (activeTab === 'signup') nextErrors.name = nameErr;
    setErrors(nextErrors);

    if (emailErr || passErr || (activeTab === 'signup' && nameErr)) return;

    setIsLoading(true);
    try {
      if (activeTab === 'signin') {
        if (isFirebaseConfigured) await login(formData.email, formData.password);
        else { await new Promise(r => setTimeout(r, 1000)); demoLogin('student'); }
        showToast('Logged in successfully!', 'success');
      } else {
        if (isFirebaseConfigured) await signup(formData.email, formData.password, formData.name, formData.role);
        else { await new Promise(r => setTimeout(r, 1000)); demoLogin(formData.role.toLowerCase()); }
        showToast('Account created successfully!', 'success');
      }
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Authentication failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoAccess = async (role) => {
    setIsLoading(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      demoLogin(role.toLowerCase());
      showToast(`Demo mode activated as ${role}`, 'success');
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      showToast('Failed to enter demo mode.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email || errors.email) {
      showToast('Please enter a valid email address first.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      if (isFirebaseConfigured) {
        await resetPassword(formData.email);
        showToast(`Password reset link sent to ${formData.email}`, 'success');
      } else {
        await new Promise(r => setTimeout(r, 800));
        showToast(`Demo Mode: Password reset link simulated successfully for ${formData.email}!`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to send password reset email.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const strength = getPasswordStrength(formData.password);

  if (showOnboarding) {
    const slide = onboardingSlides[currentSlide];
    return (
      <div className="page-login fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '1.5rem', background: 'var(--bg)' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxWidth: '340px', textAlign: 'center', width: '100%' }}>
          <div style={{ width: '6rem', height: '6rem', borderRadius: '1.5rem', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
            {slide.icon}
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>{slide.title}</h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{slide.desc}</p>
        </div>
        <div style={{ width: '100%', maxWidth: '340px', paddingBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
            {onboardingSlides.map((_, idx) => (
              <div key={idx} style={{ width: idx === currentSlide ? '1.5rem' : '0.5rem', height: '0.5rem', borderRadius: '1rem', background: idx === currentSlide ? 'var(--primary)' : 'var(--border)', transition: 'all 0.3s' }} />
            ))}
          </div>
          <button 
            onClick={() => {
              if (currentSlide < onboardingSlides.length - 1) setCurrentSlide(prev => prev + 1);
              else {
                localStorage.setItem('kavach_onboarded', 'true');
                setShowOnboarding(false);
              }
            }}
            className="btn btn-primary"
            style={{ width: '100%', padding: '1.25rem', borderRadius: '1rem', fontSize: '1.1rem' }}
          >
            {currentSlide < onboardingSlides.length - 1 ? 'Next' : 'Get Started'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-login fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100dvh', padding: '2rem 1.5rem', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem', marginTop: '1rem' }}>
        <Shield size={36} color="var(--primary)" strokeWidth={2.5} />
        <span style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-main)' }}>KAVACH</span>
      </div>

      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', background: 'var(--tab-bg)', borderRadius: '1rem', padding: '0.25rem', marginBottom: '1.5rem' }}>
          <button 
            className={`tab-btn ${activeTab === 'signin' ? 'active' : ''}`}
            onClick={() => handleTabChange('signin')}
            style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: 'none', background: activeTab === 'signin' ? 'var(--card-bg)' : 'transparent', color: activeTab === 'signin' ? 'var(--text-main)' : 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === 'signin' ? 'var(--shadow-sm)' : 'none' }}
          >
            SIGN IN
          </button>
          <button 
            className={`tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => handleTabChange('signup')}
            style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: 'none', background: activeTab === 'signup' ? 'var(--card-bg)' : 'transparent', color: activeTab === 'signup' ? 'var(--text-main)' : 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === 'signup' ? 'var(--shadow-sm)' : 'none' }}
          >
            REGISTER
          </button>
        </div>

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {activeTab === 'signup' && (
            <div>
              <div style={{ position: 'relative' }}>
                <User size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  disabled={isLoading}
                  style={{ paddingLeft: '3rem', width: '100%', padding: '16px 16px 16px 3rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card-bg)', fontSize: '16px', color: 'var(--text-main)' }}
                />
              </div>
              {touched.name && errors.name && <p style={{ color: 'var(--sos-red)', fontSize: '0.75rem', marginTop: '0.25rem', paddingLeft: '1rem', fontWeight: '500' }}>{errors.name}</p>}
            </div>
          )}

          <div>
            <div style={{ position: 'relative' }}>
              <Mail size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={handleBlur}
                disabled={isLoading}
                style={{ paddingLeft: '3rem', width: '100%', padding: '16px 16px 16px 3rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card-bg)', fontSize: '16px', color: 'var(--text-main)', borderColor: (touched.email && errors.email) ? 'var(--sos-red)' : 'var(--border)', backgroundColor: (touched.email && errors.email) ? 'rgba(239, 68, 68, 0.05)' : 'var(--card-bg)' }}
              />
            </div>
            {touched.email && errors.email && <p style={{ color: 'var(--sos-red)', fontSize: '0.75rem', marginTop: '0.25rem', paddingLeft: '1rem', fontWeight: '500' }}>{errors.email}</p>}
          </div>

          <div>
            <div style={{ position: 'relative' }}>
              <Lock size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                onBlur={handleBlur}
                disabled={isLoading}
                style={{ paddingLeft: '3rem', paddingRight: '3rem', width: '100%', padding: '16px 48px 16px 3rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card-bg)', fontSize: '16px', color: 'var(--text-main)', borderColor: (touched.password && errors.password) ? 'var(--sos-red)' : 'var(--border)', backgroundColor: (touched.password && errors.password) ? 'rgba(239, 68, 68, 0.05)' : 'var(--card-bg)' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? <EyeOff size={20} color="var(--text-muted)" /> : <Eye size={20} color="var(--text-muted)" />}
              </button>
            </div>

            {activeTab === 'signup' && formData.password.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', paddingLeft: '1rem' }}>
                <div style={{ flex: 1, height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(strength.score / 4) * 100}%`, background: strength.color, transition: 'all 0.3s ease' }} />
                </div>
                <span style={{ fontSize: '0.7rem', color: strength.color, fontWeight: '700' }}>{strength.label}</span>
              </div>
            )}

            {touched.password && errors.password && <p style={{ color: 'var(--sos-red)', fontSize: '0.75rem', marginTop: '0.25rem', paddingLeft: '1rem', fontWeight: '500' }}>{errors.password}</p>}
            
            {activeTab === 'signin' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                <button type="button" onClick={handleForgotPassword} disabled={isLoading} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
                  Forgot Password?
                </button>
              </div>
            )}
          </div>

          {activeTab === 'signup' && (
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', paddingLeft: '0.25rem' }}>SELECT SYSTEM ROLE</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {[
                  { name: 'Student', icon: <GraduationCap size={16} /> },
                  { name: 'Responder', icon: <ShieldCheck size={16} /> },
                  { name: 'Admin', icon: <Building2 size={16} /> }
                ].map((role) => (
                  <button
                    key={role.name}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: role.name }))}
                    style={{
                      padding: '0.75rem 0.25rem', borderRadius: '0.5rem',
                      background: formData.role === role.name ? 'rgba(59, 130, 246, 0.1)' : 'var(--tab-bg)',
                      border: formData.role === role.name ? '2px solid var(--primary)' : '1px solid var(--border)',
                      color: formData.role === role.name ? 'var(--primary)' : 'var(--text-main)',
                      fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', transition: 'all 0.2s'
                    }}
                  >
                    {role.icon}
                    {role.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="submit" className={`btn btn-primary ${isLoading ? 'loading' : ''}`} disabled={!isFormValid || isLoading} style={{ marginTop: '0.5rem', padding: '16px', borderRadius: '12px' }}>
            {activeTab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>

      <div className="glass-card fade-up" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', border: '1px solid rgba(59, 130, 246, 0.2)', boxShadow: '0 4px 20px rgba(59, 130, 246, 0.05)', background: 'var(--card-bg)', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%) translateY(-50%)', padding: '0.25rem 0.75rem', borderRadius: '999px', background: 'var(--primary)', color: 'white', fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)' }}>
          Sandbox Dev Tools
        </div>

        <p style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
          <Zap size={16} color="var(--sos-amber)" fill="var(--sos-amber)" /> Immediate One-Click Demo
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Skip authentication to test the app across different workspace views:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {[
            { name: 'Student', icon: <GraduationCap size={20} /> },
            { name: 'Responder', icon: <ShieldCheck size={20} /> },
            { name: 'Admin', icon: <Building2 size={20} /> }
          ].map((role) => (
            <button 
              key={role.name}
              onClick={() => handleQuickDemoAccess(role.name)}
              disabled={isLoading}
              style={{ padding: '0.75rem 0.25rem', fontSize: '0.75rem', fontWeight: 700, background: 'var(--tab-bg)', border: '1px solid var(--border)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', borderRadius: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {role.icon}
              {role.name}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={() => { localStorage.removeItem('kavach_onboarded'); setShowOnboarding(true); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
        <HelpCircle size={16} /> Replay Welcome Walkthrough
      </button>
    </div>
  );
}
