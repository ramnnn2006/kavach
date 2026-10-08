import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { PageHeader, Card, Avatar, Button, Switch, Segmented, Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/DialogContext';
import { useT, LANGUAGES } from '../../i18n';
import { updateMyProfile, setOnDuty, errorMessage } from '../../data/db';
import { isPushSupported, getPushState, enablePush, disablePush } from '../../lib/push';
import { listOutbox } from '../../data/outbox';
import { APP_VERSION } from '../../config/society';
import '../../styles/profile.css';

const PHONE_RE = /^(\+91[\s-]?)?[6-9]\d{9}$/;
const NOTE_MAX = 120;
const NOTE_WARN = 20; // show the characters-left count only near the limit
const VULN_FLAGS = [
  { key: 'elderly', labelKey: 'profile.vulnElderly' },
  { key: 'mobility', labelKey: 'profile.vulnMobility' },
  { key: 'medical_device', labelKey: 'profile.vulnMedicalDevice' },
  { key: 'infant', labelKey: 'profile.vulnInfant' },
];
const SKILLS = [
  { value: '', labelKey: 'profile.frNone' },
  { value: 'doctor', labelKey: 'profile.frDoctor' },
  { value: 'nurse', labelKey: 'profile.frNurse' },
  { value: 'paramedic', labelKey: 'profile.frParamedic' },
  { value: 'first_aid', labelKey: 'profile.frFirstAid' },
];
const IS_IOS = typeof navigator !== 'undefined'
  && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

const normPhone = (p) => (p || '').replace(/[\s-]/g, '');

function Section({ id, title, footnote, children }) {
  return (
    <section className="profile-section" aria-labelledby={id}>
      <h2 id={id} className="section-title">{title}</h2>
      {children}
      {footnote && <p className="profile-footnote">{footnote}</p>}
    </section>
  );
}

function SwitchRow({ label, hint, checked, onChange, disabled }) {
  return (
    <div className="settings-row">
      <div className="profile-row__body">
        <p className="profile-row__label">{label}</p>
        {hint && <p className="profile-row__hint">{hint}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} disabled={disabled} />
    </div>
  );
}

// Applies a class on <html> and remembers it (main.jsx restores it before first paint)
function useHtmlPref(className, storageKey) {
  const [on, setOn] = useState(() => document.documentElement.classList.contains(className));
  const set = (next) => {
    document.documentElement.classList.toggle(className, next);
    try { localStorage.setItem(storageKey, String(next)); } catch { /* storage unavailable */ }
    setOn(next);
  };
  return [on, set];
}

function PersonalForm({ profile, onSaved }) {
  const { t } = useT();
  const { showToast } = useToast();
  const initial = { name: profile.full_name || '', phone: profile.phone || '' };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const nameChanged = form.name.trim() !== initial.name.trim();
  const phoneChanged = normPhone(form.phone) !== normPhone(initial.phone);
  const dirty = nameChanged || phoneChanged;

  const validate = () => {
    const name = form.name.trim();
    const phone = normPhone(form.phone);
    return {
      name: !name ? t('profile.nameRequired') : name.length > 80 ? t('profile.nameTooLong') : '',
      phone: phoneChanged && phone && !PHONE_RE.test(phone) ? t('profile.phoneInvalid') : '',
    };
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(er => ({ ...er, [name]: '' }));
  };

  const reset = () => { setForm(initial); setErrors({}); };

  const save = async (e) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setBusy(true);
    try {
      const patch = {};
      if (nameChanged) patch.full_name = form.name.trim();
      if (phoneChanged) patch.phone = form.phone.trim() || null;
      await updateMyProfile(patch);
      await onSaved();
      showToast(t('common.saved'), 'success');
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card as="form" className="settings-group" onSubmit={save} noValidate>
      <div className="settings-row profile-field">
        <label className="profile-field__label" htmlFor="pf-name">{t('common.name')}</label>
        <div className="profile-field__control">
          <input id="pf-name" name="name" className="profile-field__input" autoComplete="name"
            maxLength={80} value={form.name} onChange={onChange} aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'pf-name-error' : undefined} />
          {errors.name && <p id="pf-name-error" className="profile-field__error" role="alert">{errors.name}</p>}
        </div>
      </div>
      <div className="settings-row profile-field">
        <label className="profile-field__label" htmlFor="pf-phone">{t('common.phone')}</label>
        <div className="profile-field__control">
          <input id="pf-phone" name="phone" type="tel" inputMode="tel" className="profile-field__input"
            autoComplete="tel" value={form.phone} onChange={onChange} aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'pf-phone-error' : undefined} />
          {errors.phone && <p id="pf-phone-error" className="profile-field__error" role="alert">{errors.phone}</p>}
        </div>
      </div>
      <div className="settings-row profile-field">
        <span className="profile-field__label">{t('common.email')}</span>
        <span className="profile-field__value">{profile.email || t('profile.noEmail')}</span>
      </div>
      {dirty && (
        <div className="profile-group__actions">
          <Button type="button" variant="ghost" size="sm" className="profile-btn-44" onClick={reset} disabled={busy}>{t('common.cancel')}</Button>
          <Button type="submit" size="sm" className="profile-btn-44" loading={busy}>{t('profile.saveChanges')}</Button>
        </div>
      )}
    </Card>
  );
}

function SafetyForm({ value, onSaved }) {
  const { t } = useT();
  const { showToast } = useToast();
  const initial = {
    elderly: !!value.elderly,
    mobility: !!value.mobility,
    medical_device: !!value.medical_device,
    infant: !!value.infant,
    note: typeof value.note === 'string' ? value.note : '',
  };
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const dirty = VULN_FLAGS.some(f => form[f.key] !== initial[f.key]) || form.note.trim() !== initial.note.trim();

  const save = async () => {
    setBusy(true);
    try {
      const vulnerability = { ...value };
      VULN_FLAGS.forEach(f => {
        if (form[f.key]) vulnerability[f.key] = true;
        else delete vulnerability[f.key];
      });
      const note = form.note.trim().slice(0, NOTE_MAX);
      if (note) vulnerability.note = note;
      else delete vulnerability.note;
      await updateMyProfile({ vulnerability });
      await onSaved();
      showToast(t('common.saved'), 'success');
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="settings-group">
      {VULN_FLAGS.map(f => (
        <SwitchRow
          key={f.key}
          label={t(f.labelKey)}
          checked={form[f.key]}
          onChange={(on) => setForm(s => ({ ...s, [f.key]: on }))}
          disabled={busy}
        />
      ))}
      <div className="settings-row profile-note">
        <label className="profile-note__label" htmlFor="pf-note">{t('profile.vulnNote')}</label>
        <input id="pf-note" className="profile-field__input profile-note__input" maxLength={NOTE_MAX} value={form.note}
          placeholder={t('profile.vulnNotePlaceholder')}
          aria-describedby={NOTE_MAX - form.note.length <= NOTE_WARN ? 'pf-note-count' : undefined}
          onChange={(e) => setForm(s => ({ ...s, note: e.target.value.slice(0, NOTE_MAX) }))} disabled={busy} />
        {NOTE_MAX - form.note.length <= NOTE_WARN && (
          <p id="pf-note-count" className="profile-count">{t('profile.charCount', { n: form.note.length })}</p>
        )}
      </div>
      {dirty && (
        <div className="profile-group__actions">
          <Button variant="ghost" size="sm" className="profile-btn-44" onClick={() => setForm(initial)} disabled={busy}>{t('common.cancel')}</Button>
          <Button size="sm" className="profile-btn-44" onClick={save} loading={busy}>{t('profile.saveSafety')}</Button>
        </div>
      )}
    </Card>
  );
}

function FirstResponderRow({ skill, onSaved }) {
  const { t } = useT();
  const { showToast } = useToast();
  const [value, setValue] = useState(skill || '');
  const [busy, setBusy] = useState(false);

  const change = async (e) => {
    const next = e.target.value;
    const previous = value;
    setValue(next);
    setBusy(true);
    try {
      await updateMyProfile({ first_responder_skill: next || null });
      await onSaved();
      showToast(t('common.saved'), 'success');
    } catch (err) {
      setValue(previous);
      showToast(errorMessage(err, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="settings-group">
      <div className="settings-row profile-field">
        <label className="profile-field__label profile-field__label--grow" htmlFor="pf-skill">{t('profile.frLabel')}</label>
        <select id="pf-skill" className="profile-popup" value={value} onChange={change} disabled={busy} aria-busy={busy || undefined}>
          {SKILLS.map(s => <option key={s.value || 'none'} value={s.value}>{t(s.labelKey)}</option>)}
        </select>
      </div>
    </Card>
  );
}

function DutyGroup({ profile, onSaved }) {
  const { t } = useT();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const onDuty = !!profile.on_duty;
  const specialties = profile.specialties || [];
  const isAdmin = profile.role === 'admin';

  const toggle = async (next) => {
    setBusy(true);
    try {
      await setOnDuty(next);
      await onSaved();
      showToast(t(next ? 'profile.dutyOnToast' : 'profile.dutyOffToast'), 'success');
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section id="pf-duty" title={t('profile.sectionDuty')} footnote={isAdmin ? undefined : t('profile.specialtiesHint')}>
      <Card className="settings-group">
        <SwitchRow
          label={t('profile.onDuty')}
          hint={t(onDuty ? 'profile.onDutyHintOn' : 'profile.onDutyHintOff')}
          checked={onDuty}
          onChange={toggle}
          disabled={busy}
        />
        <div className="settings-row">
          <div className="profile-row__body">
            <p className="profile-row__label">{t('profile.specialties')}</p>
            {isAdmin && <p className="profile-row__hint">{t('profile.specialtiesAdmin')}</p>}
            {!isAdmin && specialties.length === 0 && <p className="profile-row__hint">{t('profile.specialtiesNone')}</p>}
          </div>
          {specialties.length > 0 && (
            <span className="profile-row__value">{specialties.map(type => t(`common.typeShort_${type}`)).join(', ')}</span>
          )}
        </div>
      </Card>
    </Section>
  );
}

function NotificationsGroup({ push, busy, onToggle }) {
  const { t } = useT();
  const unsupported = push === 'unsupported';
  const denied = push === 'denied';
  const loading = push === 'loading';
  const hint = loading ? t('profile.pushChecking')
    : push === 'enabled' ? t('profile.pushHintOn')
      : unsupported || denied ? undefined
        : t('profile.pushHintOff');
  const footnote = unsupported ? t(IS_IOS ? 'profile.pushUnsupportedIos' : 'profile.pushUnsupported')
    : denied ? t('profile.pushDenied') : undefined;

  return (
    <Section id="pf-push" title={t('profile.sectionNotifications')} footnote={footnote}>
      <Card className="settings-group">
        <SwitchRow
          label={t('profile.pushLabel')}
          hint={hint}
          checked={push === 'enabled'}
          onChange={onToggle}
          disabled={busy || loading || unsupported || denied}
        />
      </Card>
    </Section>
  );
}

export default function Profile() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { t, lang, setLang } = useT();
  const navigate = useNavigate();

  const [dark, setDark] = useHtmlPref('dark', 'kavach_dark');
  const [largeText, setLargeText] = useHtmlPref('large-text', 'kavach_largetext');

  const pushSupported = isPushSupported();
  const [push, setPush] = useState(pushSupported ? 'loading' : 'unsupported');
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported) return undefined;
    let active = true;
    getPushState()
      .then(state => { if (active) setPush(state); })
      .catch(err => {
        console.error('Could not read notification state:', err);
        if (active) setPush('disabled');
      });
    return () => { active = false; };
  }, [pushSupported]);

  const togglePush = async (next) => {
    setPushBusy(true);
    try {
      if (next) {
        const result = await enablePush();
        setPush(result);
        if (result === 'enabled') showToast(t('profile.pushOnToast'), 'success');
        else if (result === 'denied') showToast(t('profile.pushDenied'), 'error');
        else showToast(t(IS_IOS ? 'profile.pushUnsupportedIos' : 'profile.pushUnsupported'), 'error');
      } else {
        await disablePush();
        setPush('disabled');
        showToast(t('profile.pushOffToast'), 'success');
      }
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setPushBusy(false);
    }
  };

  const logOut = async () => {
    const queued = (await listOutbox().catch(() => [])).length;
    const text = queued ? t('common.logOutConfirmQueued', { n: queued }) : t('common.logOutConfirmText');
    const ok = await confirm(t('common.logOutConfirmTitle'), text, {
      confirmLabel: t('common.logOut'),
      destructive: true,
    });
    if (!ok) return;
    // Stop this device getting the previous user's alerts (needs the session, so before sign-out)
    // Any existing subscription, even if the toggle hasn't finished loading
    if (pushSupported) {
      try { await disablePush(); } catch (err) { console.error('Could not remove push subscription:', err); }
    }
    await signOut();
    showToast(t('common.loggedOut'), 'success');
    navigate('/login', { replace: true });
  };

  if (!profile) {
    return (
      <main className="page">
        <PageHeader title={t('common.profile')} />
        <div className="row" style={{ justifyContent: 'center', padding: 'var(--s-5) 0' }}>
          <Spinner large label={t('common.loading')} />
        </div>
        <BottomNav />
      </main>
    );
  }

  const role = profile.role;
  const isResident = role === 'resident';
  const isStaff = role === 'responder' || role === 'admin';
  const flat = profile.flat;
  const society = profile.society;
  const floorLabel = flat?.floor === 0 ? t('common.groundFloor') : flat?.floor;
  const homeParts = flat ? [
    t('profile.homeFlat', { flat: flat.number }),
    floorLabel != null && floorLabel !== '' ? t('profile.homeFloor', { floor: floorLabel }) : null,
  ].filter(Boolean) : [];
  const homeLine = flat ? [flat.zone?.name, ...homeParts].filter(Boolean).join(' · ') : '';

  return (
    <main className="page">
      <PageHeader title={t('common.profile')} />

      <div className="profile">
        <Card className="profile-hero">
          <Avatar name={profile.full_name} large />
          <div className="profile-hero__text">
            <p className="profile-hero__name">{profile.full_name}</p>
            <p className="profile-hero__sub">
              {[t(`common.role_${role}`), [society?.name, society?.city].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
            </p>
          </div>
        </Card>

        <Section id="pf-personal" title={t('profile.sectionPersonal')} footnote={t('profile.phoneHint')}>
          <PersonalForm key={`${profile.full_name}|${profile.phone}`} profile={profile} onSaved={refreshProfile} />
        </Section>

        {isResident && (
          <Section id="pf-home" title={t('common.home')}>
            <Card className="settings-group">
              <button
                type="button"
                className="settings-row profile-link-row"
                onClick={() => navigate('/welcome')}
                aria-label={flat ? `${homeLine} · ${t('profile.homeChange')}` : t('profile.homeAdd')}
              >
                <div className="profile-row__body">
                  {flat ? (
                    <>
                      <p className="profile-row__label">{flat.zone?.name || t('common.home')}</p>
                      {homeParts.length > 0 && <p className="profile-row__hint">{homeParts.join(' · ')}</p>}
                    </>
                  ) : (
                    <p className="profile-row__label">{t('profile.homeNone')}</p>
                  )}
                </div>
                <ChevronRight size={18} className="profile-chevron" aria-hidden="true" />
              </button>
            </Card>
          </Section>
        )}

        {isResident && (
          <Section id="pf-safety" title={t('profile.sectionSafety')} footnote={t('profile.safetyExplain')}>
            <SafetyForm key={JSON.stringify(profile.vulnerability || {})} value={profile.vulnerability || {}} onSaved={refreshProfile} />
          </Section>
        )}

        {isResident && (
          <Section id="pf-fr" title={t('profile.sectionFirstResponder')} footnote={t('profile.frExplain')}>
            <FirstResponderRow key={profile.first_responder_skill || 'none'} skill={profile.first_responder_skill} onSaved={refreshProfile} />
          </Section>
        )}

        {isStaff && <DutyGroup profile={profile} onSaved={refreshProfile} />}

        <NotificationsGroup push={push} busy={pushBusy} onToggle={togglePush} />

        <Section id="pf-lang" title={t('common.language')}>
          <Segmented
            label={t('common.language')}
            value={lang}
            onChange={setLang}
            options={LANGUAGES.map(l => ({ value: l.code, label: l.label }))}
          />
        </Section>

        <Section id="pf-display" title={t('common.display')}>
          <Card className="settings-group">
            <SwitchRow label={t('common.darkMode')} checked={dark} onChange={setDark} />
            <SwitchRow label={t('common.largerText')} checked={largeText} onChange={setLargeText} />
          </Card>
        </Section>

        <Section id="pf-account" title={t('common.account')}>
          <Card className="settings-group">
            <button type="button" className="settings-row profile-logout" onClick={logOut}>
              {t('common.logOut')}
            </button>
          </Card>
        </Section>

        <p className="profile-version">{t('common.version', { v: APP_VERSION })}</p>
      </div>

      <BottomNav />
    </main>
  );
}
