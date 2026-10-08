import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useT } from '../../i18n';
import { listZones, setMyHome, errorMessage } from '../../data/db';
import { roleHome } from '../../config/society';
import { Button, Field, Logo, Spinner, AlertBanner } from '../../components/ui';

// First run for residents: pick tower, floor and flat number.
export default function Welcome() {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const { t } = useT();
  const navigate = useNavigate();

  const [towers, setTowers] = useState(null);
  const [form, setForm] = useState({ zoneId: '', floor: '', flat: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile?.society_id) return;
    listZones()
      .then(zs => setTowers(zs.filter(z => z.kind === 'tower')))
      .catch(err => { setTowers([]); showToast(errorMessage(err, t), 'error'); });
  }, [profile?.society_id, showToast, t]);

  if (profile && profile.role !== 'resident') return <Navigate to={roleHome(profile.role)} replace />;

  const tower = towers?.find(z => z.id === form.zoneId);
  const floors = tower?.floors ? Array.from({ length: tower.floors + 1 }, (_, i) => i) : [];

  const submit = async (e) => {
    e.preventDefault();
    const next = {
      zoneId: form.zoneId ? '' : t('auth.errTowerRequired'),
      flat: form.flat.trim() ? '' : t('auth.errFlatRequired'),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setBusy(true);
    try {
      await setMyHome({ zoneId: form.zoneId, floor: form.floor === '' ? null : Number(form.floor), flatNumber: form.flat.trim() });
      await refreshProfile();
      showToast(t('auth.homeSaved'), 'success');
      navigate('/resident', { replace: true });
    } catch (err) {
      showToast(errorMessage(err, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page page--center">
      <div className="stack-lg" style={{ width: '100%', maxWidth: 420, margin: '0 auto' }}>
        <div className="stack-sm center" style={{ alignItems: 'center' }}>
          <Logo size={56} />
          <h1 className="page-header__title">{t('auth.welcomeTitle')}</h1>
          <p className="muted">{t('auth.welcomeText')}</p>
          {profile?.society?.name && <p className="semibold">{profile.society.name}</p>}
        </div>

        {!profile?.society_id ? (
          <AlertBanner tone="var(--orange)" role="alert">{t('auth.noSociety')}</AlertBanner>
        ) : towers === null ? (
          <div className="center"><Spinner /></div>
        ) : (
          <form className="stack" onSubmit={submit} noValidate>
            <Field label={t('auth.chooseTower')} htmlFor="tower" error={errors.zoneId}>
              <select id="tower" className="select" value={form.zoneId}
                onChange={e => setForm(f => ({ ...f, zoneId: e.target.value, floor: '' }))}>
                <option value="">—</option>
                {towers.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </Field>
            {floors.length > 0 && (
              <Field label={t('auth.chooseFloor')} htmlFor="floor">
                <select id="floor" className="select" value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}>
                  <option value="">—</option>
                  {floors.map(n => <option key={n} value={n}>{n === 0 ? t('common.groundFloor') : n}</option>)}
                </select>
              </Field>
            )}
            <Field label={t('auth.flatNumber')} htmlFor="flat" error={errors.flat} hint={t('auth.flatNumberHint')}>
              <input id="flat" className="input" inputMode="numeric" autoComplete="off" value={form.flat}
                onChange={e => setForm(f => ({ ...f, flat: e.target.value }))} />
            </Field>
            <Button type="submit" size="lg" block loading={busy}>{t('auth.saveHome')}</Button>
          </form>
        )}
      </div>
    </main>
  );
}
