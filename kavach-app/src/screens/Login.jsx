import { useState } from 'react';
import {
  Mail, Lock, User, Eye, EyeOff, HelpCircle, Siren, UserCheck, LayoutDashboard,
  GraduationCap, ShieldCheck, Building2,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Field, Segmented, Logo } from '../components/ui';

const ONBOARDED_KEY = 'kavach_onboarded';

const ONBOARDING_SLIDES = [
  { title: 'Report an emergency fast', desc: 'Pick what is happening and where, and your report goes straight to the people who can help.', icon: Siren },
  { title: 'Help that keeps you posted', desc: 'The right responder claims your report and updates its status, so you can follow along live.', icon: UserCheck },
  { title: 'Everything in one place', desc: 'Admins see every open and resolved report together, so nothing slips through the cracks.', icon: LayoutDashboard },
];

const DEMO_ROLES = [
  { value: 'student', label: 'Student', icon: GraduationCap },
  { value: 'responder', label: 'Responder', icon: ShieldCheck },
  { value: 'admin', label: 'Admin', icon: Building2 },
];

const AUTH_ERRORS = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'Wrong email or password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
  'auth/weak-password': 'Choose a stronger password (at least 8 characters).',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
};

function friendlyError(err) {
  return AUTH_ERRORS[err?.code] || 'Something went wrong. Try again.';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readOnboarded() {
  try { return localStorage.getItem(ONBOARDED_KEY) === 'true'; } catch { return true; }
}
function writeOnboarded(value) {
  try {
    if (value) localStorage.setItem(ONBOARDED_KEY, 'true');
    else localStorage.removeItem(ONBOARDED_KEY);
  } catch { /* storage unavailable */ }
}

function Onboarding({ onDone }) {
  const [index, setIndex] = useState(0);
  const slide = ONBOARDING_SLIDES[index];
  const Icon = slide.icon;
  const isLast = index === ONBOARDING_SLIDES.length - 1;

  return (
    <main className="page page--center fade-in">
      <div style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
        <Card className="stack center" style={{ alignItems: 'center', padding: 'var(--s-5) var(--s-4)' }}>
          <span className="type-icon type-icon--lg" style={{ '--tone': 'var(--primary)' }} aria-hidden="true">
            <Icon size={28} />
          </span>
          <h1 className="text-lg bold" aria-live="polite">{slide.title}</h1>
          <p className="muted">{slide.desc}</p>
          <div className="row" style={{ justifyContent: 'center' }} aria-label={`Step ${index + 1} of ${ONBOARDING_SLIDES.length}`} role="img">
            {ONBOARDING_SLIDES.map((s, i) => (
              <span
                key={s.title}
                aria-hidden="true"
                className="type-icon"
                style={{ '--tone': i === index ? 'var(--primary)' : 'var(--border)', width: i === index ? 20 : 8, height: 8, borderRadius: 4 }}
              />
            ))}
          </div>
          <Button block size="lg" onClick={() => (isLast ? onDone() : setIndex(i => i + 1))}>
            {isLast ? 'Get started' : 'Next'}
          </Button>
          {!isLast && (
            <Button variant="ghost" size="sm" onClick={onDone}>Skip</Button>
          )}
        </Card>
      </div>
    </main>
  );
}

export default function Login() {
  const { login, signup, demoLogin, resetPassword, isFirebaseConfigured } = useAuth();
  const { showToast } = useToast();

  const [showOnboarding, setShowOnboarding] = useState(() => !readOnboarded());
  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const isSignup = activeTab === 'signup';

  const validateField = (name, val) => {
    if (name === 'email') {
      if (!val) return 'Email is required.';
      if (!EMAIL_RE.test(val)) return 'Enter a valid email address.';
    } else if (name === 'password') {
      if (!val) return 'Password is required.';
      if (isSignup && val.length < 8) return 'Must be at least 8 characters.';
    } else if (name === 'name' && isSignup) {
      if (!val.trim()) return 'Name is required.';
    }
    return '';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name]) setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrors({});
    setTouched({});
    setFormData(prev => ({ ...prev, password: '' }));
  };

  const handleFormSubmit = async (e) => {
    e?.preventDefault();
    setTouched({ email: true, password: true, name: true });

    const nextErrors = {
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
    };
    if (isSignup) nextErrors.name = validateField('name', formData.name);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setIsLoading(true);
    try {
      if (!isSignup) {
        if (isFirebaseConfigured) await login(formData.email, formData.password);
        else demoLogin('student');
        showToast('Signed in', 'success');
      } else {
        if (isFirebaseConfigured) await signup(formData.email, formData.password, formData.name.trim());
        else demoLogin(formData.role);
        showToast('Account created', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast(friendlyError(err), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemo = (role) => {
    try {
      demoLogin(role.value);
      showToast(`Signed in as demo ${role.label.toLowerCase()}`, 'success');
    } catch {
      showToast('Could not start the demo.', 'error');
    }
  };

  const handleForgotPassword = async () => {
    const emailErr = validateField('email', formData.email);
    setTouched(prev => ({ ...prev, email: true }));
    setErrors(prev => ({ ...prev, email: emailErr }));
    if (emailErr) {
      showToast('Enter your email address first.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      if (isFirebaseConfigured) {
        await resetPassword(formData.email);
        showToast(`Reset link sent to ${formData.email}`, 'success');
      } else {
        showToast('Demo mode: no email is sent.', 'info');
      }
    } catch (err) {
      showToast(friendlyError(err), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (showOnboarding) {
    return <Onboarding onDone={() => { writeOnboarded(true); setShowOnboarding(false); }} />;
  }

  const err = (name) => (touched[name] && errors[name]) || '';

  return (
    <main className="page page--center fade-in">
      <div className="stack-lg" style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
        <div className="stack-sm" style={{ alignItems: 'center' }}>
          <Logo size={56} />
          <h1 className="text-xl bold">Kavach</h1>
          <p className="muted text-sm center">Report emergencies and get help fast.</p>
        </div>

        <Segmented
          label="Account"
          value={activeTab}
          onChange={handleTabChange}
          options={[{ value: 'signin', label: 'Sign in' }, { value: 'signup', label: 'Register' }]}
        />

        <form onSubmit={handleFormSubmit} className="stack" noValidate>
          {isSignup && (
            <Field label="Full name" htmlFor="login-name" error={err('name')}>
              <div className="input-wrap">
                <span className="input-wrap__icon" aria-hidden="true"><User size={18} /></span>
                <input
                  id="login-name"
                  className={`input${err('name') ? ' input--error' : ''}`}
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  disabled={isLoading}
                  aria-invalid={!!err('name')}
                />
              </div>
            </Field>
          )}

          <Field label="Email" htmlFor="login-email" error={err('email')}>
            <div className="input-wrap">
              <span className="input-wrap__icon" aria-hidden="true"><Mail size={18} /></span>
              <input
                id="login-email"
                className={`input${err('email') ? ' input--error' : ''}`}
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={handleBlur}
                disabled={isLoading}
                aria-invalid={!!err('email')}
              />
            </div>
          </Field>

          <Field
            label="Password"
            htmlFor="login-password"
            error={err('password')}
            hint={isSignup ? 'At least 8 characters.' : undefined}
          >
            <div className="input-wrap">
              <span className="input-wrap__icon" aria-hidden="true"><Lock size={18} /></span>
              <input
                id="login-password"
                className={`input input--trail${err('password') ? ' input--error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                value={formData.password}
                onChange={handleInputChange}
                onBlur={handleBlur}
                disabled={isLoading}
                aria-invalid={!!err('password')}
              />
              <span className="input-wrap__trail">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                </button>
              </span>
            </div>
          </Field>

          {/* Real accounts always register as student; role picking is demo-only */}
          {isSignup && !isFirebaseConfigured && (
            <div className="field">
              <span className="field__label">Role (demo)</span>
              <Segmented
                label="Role (demo)"
                value={formData.role}
                onChange={(role) => setFormData(prev => ({ ...prev, role }))}
                options={DEMO_ROLES.map(r => ({ value: r.value, label: r.label }))}
              />
            </div>
          )}

          <Button type="submit" block size="lg" loading={isLoading}>
            {isSignup ? 'Create account' : 'Sign in'}
          </Button>

          {!isSignup && (
            <Button type="button" variant="ghost" onClick={handleForgotPassword} disabled={isLoading}>
              Forgot password?
            </Button>
          )}
        </form>

        {!isFirebaseConfigured && (
          <section aria-labelledby="demo-title">
            <h2 id="demo-title" className="section-title">Try a demo</h2>
            <Card className="stack-sm">
              <p className="muted text-sm">Explore the app without an account. Pick a view:</p>
              {DEMO_ROLES.map(role => {
                const Icon = role.icon;
                return (
                  <Button key={role.value} variant="secondary" block onClick={() => handleDemo(role)} disabled={isLoading}>
                    <Icon size={20} aria-hidden="true" />
                    {role.label}
                  </Button>
                );
              })}
            </Card>
          </section>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => { writeOnboarded(false); setShowOnboarding(true); }}
          style={{ alignSelf: 'center', minHeight: 44 }}
        >
          <HelpCircle size={18} aria-hidden="true" />
          Replay walkthrough
        </Button>
      </div>
    </main>
  );
}
