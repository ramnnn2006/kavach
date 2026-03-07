import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { isFirebaseConfigured } from '../firebase/config';

export default function Login() {
  const { login, signup, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      let profile;
      if (isSignup) {
        profile = await signup(email, password, name, 'student');
      } else {
        profile = await login(email, password);
      }
      // Navigate based on the actual profile role from Firestore
      const targetRole = profile?.role || role;
      navigate(`/${targetRole}`);
    } catch (err) {
      // Map Firebase error codes to user-friendly messages
      const code = err.code || '';
      const messages = {
        'auth/invalid-credential': 'Invalid email or password. Please try again.',
        'auth/user-not-found': 'No account found with this email. Sign up first!',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/email-already-in-use': 'This email is already registered. Try logging in.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Check your internet connection.',
      };
      setError(messages[code] || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemo = () => {
    demoLogin(role);
    navigate(`/${role}`);
  };

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '2rem', minHeight: '100dvh' }}>
      <div style={{ width: '100%', maxWidth: '24rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ width: '4rem', height: '4rem', border: '2px solid var(--text-main)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <span className="material-symbols-outlined notranslate notranslate" style={{ fontSize: '2rem' }}>shield</span>
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.025em', textTransform: 'uppercase' }}>KAVACH</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500, marginTop: '0.25rem' }}>Campus Emergency Management</p>
          {isFirebaseConfigured && (
            <div className="badge badge-green" style={{ marginTop: '0.75rem' }}>
              <span style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: '#22C55E' }} />
              Firebase Connected
            </div>
          )}
        </div>

        {isSignup && (
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <span className="badge badge-gray">Sign Up as Student</span>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Admins and Responders must be authorized by campus IT.</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <div className="input-group">
              <span className="material-symbols-outlined notranslate notranslate">person</span>
              <input className="input-field" type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div className="input-group">
            <span className="material-symbols-outlined notranslate notranslate">mail</span>
            <input className="input-field" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="input-group" style={{ position: 'relative' }}>
            <span className="material-symbols-outlined notranslate notranslate">lock</span>
            <input className="input-field" type={showPass ? 'text' : 'password'} placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={{ paddingRight: '3rem' }} />
            <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <span className="material-symbols-outlined notranslate notranslate" style={{ fontSize: '1.25rem' }}>{showPass ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined notranslate notranslate" style={{ fontSize: '1.125rem', color: '#DC2626' }}>error</span>
              <p style={{ color: '#DC2626', fontSize: '0.75rem', fontWeight: 500 }}>{error}</p>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ marginBottom: '1rem' }} disabled={submitting}>
            {submitting ? (
              <>
                <span className="material-symbols-outlined notranslate notranslate" style={{ fontSize: '1.125rem', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                {isSignup ? 'Creating...' : 'Signing in...'}
              </>
            ) : (
              <>
                {isSignup ? 'Create Account' : 'Login'}
                <span className="material-symbols-outlined notranslate notranslate" style={{ fontSize: '1.125rem' }}>arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.875rem', marginBottom: '2rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>{isSignup ? 'Already have an account?' : 'New to the platform?'}</span>
          <button onClick={() => { setIsSignup(!isSignup); setError(''); }} style={{ color: 'var(--primary)', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer', marginLeft: '0.25rem', fontFamily: 'inherit' }}>
            {isSignup ? 'Login' : 'Create Account'}
          </button>
        </p>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ padding: '0 1rem', fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Or quick demo</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div className="role-picker">
            {['student', 'responder', 'admin'].map(r => (
              <button key={r} type="button" className={`role-btn ${role === r ? 'active' : ''}`} onClick={() => setRole(r)}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="btn btn-outline" onClick={handleDemo}>
          <span className="material-symbols-outlined notranslate notranslate" style={{ fontSize: '1.125rem' }}>play_arrow</span>
          Demo as {role}
        </button>
      </div>
    </div>
  );
}
