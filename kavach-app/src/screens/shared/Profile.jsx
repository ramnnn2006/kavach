import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, PersonStanding, Accessibility, Activity, Baby, Stethoscope, BadgeCheck, Tags,
  Bell, Moon, ALargeSmall, LogOut,
} from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { PageHeader, Card, Avatar, Badge, Button, Field, Switch, Segmented, Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/DialogContext';
import { useT, LANGUAGES } from '../../i18n';
import { updateMyProfile, setOnDuty, errorMessage } from '../../data/db';
import { isPushSupported, getPushState, enablePush, disablePush } from '../../lib/push';
import { APP_VERSION, getType } from '../../config/society';
import '../../styles/profile.css';

const ROLE_TONE = { resident: 'var(--blue)', responder: 'var(--orange)', admin: 'var(--indigo)' };
const PHONE_RE = /^(\+91[\s-]?)?[6-9]\d{9}$/;
const NOTE_MAX = 120;
const VULN_FLAGS = [
  { key: 'elderly', icon: PersonStanding, tone: 'var(--teal)', labelKey: 'profile.vulnElderly' },
  { key: 'mobility', icon: Accessibility, tone: 'var(--blue)', labelKey: 'profile.vulnMobility' },
  { key: 'medical_device', icon: Activity, tone: 'var(--pink)', labelKey: 'profile.vulnMedicalDevice' },
  { key: 'infant', icon: Baby, tone: 'var(--purple)', labelKey: 'profile.vulnInfant' },
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

function Tile({ icon: Icon, tone }) {
  return (
    <span className="type-icon type-icon--sm" style={{ '--tone': tone }} aria-hidden="true">
      <Icon size={18} />
    </span>
  );
}

function Section({ id, title, footnote, children }) {
  return (
    <section className="profile-section" aria-labelledby={id}>
      <h2 id={id} className="section-title">{title}</h2>
      {children}
      {footnote && <p className="profile-footnote">{footnote}</p>}
    </section>
  );
}

function SwitchRow({ icon, tone, label, hint, checked, onChange, disabled }) {
  return (
    <div className="settings-row">
      <Tile icon={icon} tone={tone} />
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
    <Card as="form" className="profile-form" onSubmit={save} noValidate>
      <Field label={t('common.name')} htmlFor="pf-name" error={errors.name}>
        <input id="pf-name" name="name" className={`input ${errors.name ? 'input--error' : ''}`} autoComplete="name"
          maxLength={80} value={form.name} onChange={onChange} aria-invalid={!!errors.name} />
      </Field>
      <Field label={t('common.phone')} htmlFor="pf-phone" error={errors.phone} hint={t('profile.phoneHint')}>
        <input id="pf-phone" name="phone" type="tel" inputMode="tel" className={`input ${errors.phone ? 'input--error' : ''}`}
          autoComplete="tel" value={form.phone} onChange={onChange} aria-invalid={!!errors.phone} />
      </Field>
      <div>
        <p className="profile-readonly__label">{t('common.email')}</p>
        <p className="profile-readonly__value">{profile.email || t('profile.noEmail')}</p>
      </div>
      {dirty && (
        <div className="profile-actions">
          <Button type="button" variant="secondary" onClick={reset} disabled={busy}>{t('common.cancel')}</Button>
          <Button type="submit" loading={busy}>{t('profile.saveChanges')}</Button>
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
          icon={f.icon}
          tone={f.tone}
          label={t(f.labelKey)}
          checked={form[f.key]}
          onChange={(on) => setForm(s => ({ ...s, [f.key]: on }))}
          disabled={busy}
        />
      ))}
      <div className="profile-group__field">
        <Field label={t('profile.vulnNote')} htmlFor="pf-note" hint={t('profile.vulnNoteHint')}>
          <input id="pf-note" className="input" maxLength={NOTE_MAX} value={form.note}
            placeholder={t('profile.vulnNotePlaceholder')} aria-describedby="pf-note-count"
            onChange={(e) => setForm(s => ({ ...s, note: e.target.value.slice(0, NOTE_MAX) }))} disabled={busy} />
        </Field>
        <p id="pf-note-count" className="profile-count">{t('profile.charCount', { n: form.note.length })}</p>
      </div>
      {dirty && (
        <div className="profile-group__actions">
          <Button variant="secondary" onClick={() => setForm(initial)} disabled={busy}>{t('common.cancel')}</Button>
          <Button onClick={save} loading={busy}>{t('profile.saveSafety')}</Button>
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
    <Card className="profile-form">
      <Field label={t('profile.frLabel')} htmlFor="pf-skill">
        <div className="profile-select-wrap">
          <span className="profile-select-wrap__icon"><Stethoscope size={18} aria-hidden="true" /></span>
          <select id="pf-skill" className="select" value={value} onChange={change} disabled={busy} aria-busy={busy || undefined}>
            {SKILLS.map(s => <option key={s.value || 'none'} value={s.value}>{t(s.labelKey)}</option>)}
          </select>
        </div>
      </Field>
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
          icon={BadgeCheck}
          tone="var(--green)"
          label={t('profile.onDuty')}
          hint={t(onDuty ? 'profile.onDutyHintOn' : 'profile.onDutyHintOff')}
          checked={onDuty}
          onChange={toggle}
          disabled={busy}
        />
        <div className="settings-row">
          <Tile icon={Tags} tone="var(--orange)" />
          <div className="profile-row__body">
            <p className="profile-row__label">{t('profile.specialties')}</p>
            {specialties.length > 0 && (
              <div className="profile-chips">
                {specialties.map(type => {
                  const { icon: Icon, tone } = getType(type);
                  return (
                    <Badge key={type} tone={tone}>
                      <Icon size={14} aria-hidden="true" />
                      {t(`common.typeShort_${type}`)}
                    </Badge>
                  );
                })}
              </div>
            )}
            {isAdmin && <p className="profile-row__hint">{t('profile.specialtiesAdmin')}</p>}
            {!isAdmin && specialties.length === 0 && <p className="profile-row__hint">{t('profile.specialtiesNone')}</p>}
          </div>
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
          icon={Bell}
          tone="var(--red)"
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
    const ok = await confirm(t('common.logOutConfirmTitle'), t('common.logOutConfirmText'), {
      confirmLabel: t('common.logOut'),
      destructive: true,
    });
    if (!ok) return;
    // Stop this device getting the previous user's alerts (needs the session, so before sign-out)
    if (push === 'enabled') {
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
            <div className="profile-hero__meta">
              <Badge tone={ROLE_TONE[role]}>{t(`common.role_${role}`)}</Badge>
              {society?.name && (
                <span className="profile-hero__sub">{[society.name, society.city].filter(Boolean).join(', ')}</span>
              )}
            </div>
            {isResident && homeLine && <p className="profile-hero__sub">{homeLine}</p>}
          </div>
        </Card>

        <Section id="pf-personal" title={t('profile.sectionPersonal')}>
          <PersonalForm key={`${profile.full_name}|${profile.phone}`} profile={profile} onSaved={refreshProfile} />
        </Section>

        {isResident && (
          <Section id="pf-home" title={t('common.home')}>
            <Card className="settings-group">
              <div className="settings-row">
                <Tile icon={Building2} tone="var(--blue)" />
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
                <Button variant="secondary" size="sm" className="profile-row__action" onClick={() => navigate('/welcome')}>
                  {flat ? t('profile.homeChange') : t('profile.homeAdd')}
                </Button>
              </div>
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
            <SwitchRow icon={Moon} tone="var(--indigo)" label={t('common.darkMode')} checked={dark} onChange={setDark} />
            <SwitchRow icon={ALargeSmall} tone="var(--blue)" label={t('common.largerText')} checked={largeText} onChange={setLargeText} />
          </Card>
        </Section>

        <Section id="pf-account" title={t('common.account')}>
          <Card className="settings-group">
            <button type="button" className="settings-row profile-logout" onClick={logOut}>
              <LogOut size={20} aria-hidden="true" />
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
