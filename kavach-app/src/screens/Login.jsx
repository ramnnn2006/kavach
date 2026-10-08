import { useState } from 'react';
import { Eye, EyeOff, Languages } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useT, LANGUAGES } from '../i18n';
import { APP_NAME } from '../config/society';
import { Button, Field, Segmented, Logo, AlertBanner } from '../components/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+91[\s-]?)?[6-9]\d{9}$/;

export default function Login() {
  const { signIn, signUp, resetPassword, isConfigured } = useAuth();
  const { showToast } = useToast();
  const { t, lang, setLang } = useT();

  const [tab, setTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const isSignup = tab === 'signup';

  const validate = (name, val) => {
    if (name === 'email') {
      if (!val.trim()) return t('auth.errEmailRequired');
      if (!EMAIL_RE.test(val.trim())) return t('auth.errEmailInvalid');
    }
    if (name === 'password') {
      if (!val) return t('auth.errPasswordRequired');
      if (isSignup && val.length < 8) return t('auth.errPasswordShort');
    }
    if (name === 'name' && isSignup && !val.trim()) return t('auth.errNameRequired');
    if (name === 'phone' && isSignup && !PHONE_RE.test(val.replace(/\s/g, ''))) return t('auth.errPhoneInvalid');
    return '';
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(er => ({ ...er, [name]: validate(name, value) }));
  };
  const onBlur = (e) => setErrors(er => ({ ...er, [e.target.name]: validate(e.target.name, e.target.value) }));

  const switchTab = (next) => {
    setTab(next);
    setErrors({});
    setNotice('');
    setForm(f => ({ ...f, password: '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const fields = isSignup ? ['name', 'phone', 'email', 'password'] : ['email', 'password'];
    const next = Object.fromEntries(fields.map(f => [f, validate(f, form[f])]));
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setBusy(true);
    setNotice('');
    try {
      if (isSignup) {
        const { needsConfirmation } = await signUp({
          email: form.email, password: form.password, fullName: form.name, phone: form.phone.replace(/\s/g, ''),
        });
        if (needsConfirmation) {
          setNotice(t('auth.confirmEmail'));
          switchTab('signin');
        } else {
          showToast(t('auth.accountCreated'), 'success');
        }
      } else {
        await signIn(form.email, form.password);
        showToast(t('auth.signedIn'), 'success');
      }
    } catch (err) {
      showToast(err.message || t('common.errorGeneric'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    const emailErr = validate('email', form.email);
    setErrors(er => ({ ...er, email: emailErr }));
    if (emailErr) {
      showToast(t('auth.enterEmailFirst'), 'error');
      return;
    }
    setBusy(true);
    try {
      await resetPassword(form.email);
      showToast(t('auth.resetSent', { email: form.email.trim() }), 'success');
    } catch (err) {
      showToast(err.message || t('common.errorGeneric'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const nextLang = LANGUAGES.find(l => l.code !== lang);

  return (
    <main className="page page--center">
      <div className="stack-lg" style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
        <div className="row-between">
          <span />
          <button className="btn btn--ghost btn--sm" onClick={() => setLang(nextLang.code)} aria-label={`${t('common.language')}: ${nextLang.label}`}>
            <Languages size={18} aria-hidden="true" /> {nextLang.label}
          </button>
        </div>

        <div className="stack-sm center" style={{ alignItems: 'center' }}>
          <Logo size={64} />
          <h1 className="page-header__title">{APP_NAME}</h1>
          <p className="muted">{t('auth.tagline')}</p>
        </div>

        {!isConfigured && <AlertBanner tone="var(--red)" role="alert">{t('auth.notConfigured')}</AlertBanner>}
        {notice && <AlertBanner tone="var(--blue)" role="status">{notice}</AlertBanner>}

        <Segmented
          label={t('auth.signIn')}
          value={tab}
          onChange={switchTab}
          options={[{ value: 'signin', label: t('auth.signIn') }, { value: 'signup', label: t('auth.register') }]}
        />

        <form className="stack" onSubmit={submit} noValidate>
          {isSignup && (
            <>
              <Field label={t('auth.fullName')} htmlFor="name" error={errors.name}>
                <input id="name" name="name" className={`input ${errors.name ? 'input--error' : ''}`} autoComplete="name"
                  value={form.name} onChange={onChange} onBlur={onBlur} aria-invalid={!!errors.name} />
              </Field>
              <Field label={t('auth.phone')} htmlFor="phone" error={errors.phone} hint={t('auth.phoneHint')}>
                <input id="phone" name="phone" type="tel" inputMode="tel" className={`input ${errors.phone ? 'input--error' : ''}`}
                  autoComplete="tel" value={form.phone} onChange={onChange} onBlur={onBlur} aria-invalid={!!errors.phone} />
              </Field>
            </>
          )}

          <Field label={t('auth.email')} htmlFor="email" error={errors.email}>
            <input id="email" name="email" type="email" inputMode="email" className={`input ${errors.email ? 'input--error' : ''}`}
              autoComplete="email" value={form.email} onChange={onChange} onBlur={onBlur} aria-invalid={!!errors.email} />
          </Field>

          <Field label={t('auth.password')} htmlFor="password" error={errors.password} hint={isSignup ? t('auth.passwordHint') : undefined}>
            <div className="input-wrap">
              <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                className={`input input--trail ${errors.password ? 'input--error' : ''}`}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                value={form.password} onChange={onChange} onBlur={onBlur} aria-invalid={!!errors.password}
                style={{ paddingLeft: 'var(--s-3)' }} />
              <span className="input-wrap__trail">
                <button type="button" className="icon-btn" onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')} aria-pressed={showPassword}>
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </span>
            </div>
          </Field>

          <Button type="submit" size="lg" block loading={busy} disabled={!isConfigured}>
            {isSignup ? t('auth.createAccount') : t('auth.signIn')}
          </Button>
          {!isSignup && (
            <Button type="button" variant="ghost" onClick={forgot} disabled={busy || !isConfigured}>
              {t('auth.forgotPassword')}
            </Button>
          )}
        </form>

        <p className="muted text-sm center">{t('auth.staffNote')}</p>
      </div>
    </main>
  );
}
