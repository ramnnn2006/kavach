import React, { useState } from 'react';
import useFormValidation from '../hooks/useFormValidation';
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
  const { login, demoLogin, isFirebaseConfigured, updateProfileLocally } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const { showToast } = useToast();

  const { values, errors, touched, handleChange, handleBlur, handleSubmit } = useFormValidation({
    initialValues: { email: '', password: '' },
    validate: {
      email: ['required', 'email'],
      password: ['required', { minLength: 8 }]
    },
    onSubmit: async () => {
      setIsLoading(true);
      try {
        if (isFirebaseConfigured) {
          await login(values.email, values.password);
        } else {
          // Fake network delay in demo mode
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        setShowRoleModal(true);
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Login failed. Please check your credentials.', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  });

  const strength = getPasswordStrength(values.password);
  const isEmailValid = values.email && !errors.email;
  const isFormValid = values.email && values.password && Object.keys(errors).length === 0;

  const handleRoleSelect = async (role) => {
    setShowRoleModal(false);
    setIsLoading(true);
    try {
      if (isFirebaseConfigured) {
        await updateProfileLocally({ role });
      } else {
        demoLogin(role.toLowerCase());
      }
      showToast(`Logged in successfully as ${role}`, 'success');
      if (onLoginSuccess) onLoginSuccess(role);
    } catch (err) {
      console.error(err);
      showToast('Failed to set user role.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '1.5rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="page-title">Welcome Back</h1>
          <p className="page-subtitle">Enter your credentials to access Kavach</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <span className="material-symbols-outlined">mail</span>
              <input
                type="email"
                name="email"
                className="input-field"
                placeholder="Email Address"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading}
              />
              {isEmailValid && (
                <span className="material-symbols-outlined" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--success)', pointerEvents: 'none' }}>
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
              <span className="material-symbols-outlined">lock</span>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="input-field"
                placeholder="Password"
                value={values.password}
                onChange={handleChange}
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
                <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
            
            {values.password.length > 0 && (
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
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
                Forgot Password?
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
            disabled={!isFormValid || isLoading}
            style={{ marginTop: '0.5rem' }}
          >
            Sign In
          </button>
        </form>
      </div>

      {showRoleModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)', padding: '1.5rem'
        }}>
          <div className="glass-card fade-up" style={{ width: '100%', maxWidth: '340px', padding: '2rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>Select Role</h2>
            <p className="page-subtitle" style={{ marginBottom: '1.5rem' }}>Choose your view for testing</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button className="btn btn-outline" onClick={() => handleRoleSelect('Student')}>🎓 Student</button>
              <button className="btn btn-outline" onClick={() => handleRoleSelect('Responder')}>🛡️ Responder</button>
              <button className="btn btn-outline" onClick={() => handleRoleSelect('Admin')}>🏫 Admin</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
