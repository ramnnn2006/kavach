import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

const Toggle = ({ value, onChange }) => (
  <button className={`toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)} />
);

export default function Settings() {
  const { userProfile, updateProfileLocally, logout } = useAuth();
  const navigate = useNavigate();
  const role = userProfile?.role || 'student';
  const name = userProfile?.name || 'User';

  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [largeText, setLargeText] = useState(() => document.documentElement.classList.contains('large-text'));
  const [highContrast, setHighContrast] = useState(() => document.documentElement.classList.contains('high-contrast'));
  const [reduceMotion, setReduceMotion] = useState(() => document.documentElement.classList.contains('reduce-motion'));
  const [haptic, setHaptic] = useState(true);
  const [silentSos, setSilentSos] = useState(true);
  const [shakeSos, setShakeSos] = useState(false);
  const [autoLocation, setAutoLocation] = useState(true);
  const [onDuty, setOnDuty] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [lang, setLang] = useState('en');

  const [contacts, setContacts] = useState(userProfile?.contacts || []);
  const [editingIndex, setEditingIndex] = useState(null);
  const [contactName, setContactName] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  const saveContacts = async (newContacts) => {
    setContacts(newContacts);
    if (updateProfileLocally) {
      await updateProfileLocally({ contacts: newContacts });
    }
  };

  const handleAddContact = () => {
    setEditingIndex(-1);
    setContactName('');
    setContactNumber('');
  };

  const handleSaveContact = () => {
    if (!contactName || !contactNumber) return;
    const newContact = { name: contactName, number: contactNumber };
    let newContacts = [...contacts];
    if (editingIndex === -1) {
      newContacts.push(newContact);
    } else {
      newContacts[editingIndex] = newContact;
    }
    saveContacts(newContacts);
    setEditingIndex(null);
  };

  const handleRemoveContact = (idx) => {
    const newContacts = contacts.filter((_, i) => i !== idx);
    saveContacts(newContacts);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.classList.toggle('large-text', largeText);
  }, [largeText]);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);


  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const dict = {
    en: {
      profile: 'Profile & Settings',
      appearance: 'Appearance',
      dark: '🌙 Dark Mode',
      access: 'Accessibility',
      large: 'Large Text',
      contrast: 'High Contrast',
      reduce: 'Reduce Motion',
      haptic: 'Haptic Feedback',
      lang: 'Language',
      emerg: 'Emergency Settings',
      silent: 'Silent SOS',
      silentDesc: 'Triple-tap power button',
      shake: 'Shake to SOS',
      shakeDesc: 'May trigger accidentally',
      auto: 'Auto-Share Location',
      contacts: 'Emergency Contacts',
      addContact: '+ Add Contact',
      respSet: 'Responder Settings',
      onDuty: 'On Duty',
      notif: 'Notifications',
      push: 'Push Notifications',
      about: 'About',
      logout: 'Logout'
    },
    ta: {
      profile: 'சுயவிவரம் மற்றும் அமைப்புகள்',
      appearance: 'தோற்றம்',
      dark: '🌙 இருண்ட முறை',
      access: 'அணுகல்தன்மை',
      large: 'பெரிய உரை',
      contrast: 'அதிக மாறுபாடு',
      reduce: 'இயக்கத்தை குறை',
      haptic: 'தொடு உணர்வு',
      lang: 'மொழி',
      emerg: 'அவசரகால அமைப்புகள்',
      silent: 'அமைதியான SOS',
      silentDesc: 'பவர் பட்டனை மூன்று முறை அழுத்தவும்',
      shake: 'SOS-ஐ அசைக்கவும்',
      shakeDesc: 'தவறுதலாக இயங்கக்கூடும்',
      auto: 'தானாக இருப்பிடத்தைப் பகிர்',
      contacts: 'அவசரகால தொடர்புகள்',
      addContact: '+ தொடர்பைச் சேர்',
      respSet: 'பதிலளிப்பவர் அமைப்புகள்',
      onDuty: 'பணியில்',
      notif: 'அறிவிப்புகள்',
      push: 'தள்ளு அறிவிப்புகள்',
      about: 'பற்றி',
      logout: 'வெளியேறு'
    }
  };

  const t = dict[lang] || dict.en;

  return (
    <div className="page fade-up">
      <h1 className="page-title" style={{ marginBottom: '2rem' }}>{t.profile}</h1>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
        <div className="avatar avatar-lg" style={{ marginBottom: '1rem' }}>{name.split(' ').map(n => n[0]).join('')}</div>
        <h2 style={{ fontWeight: 700, fontSize: '1.25rem' }}>{name}</h2>
        <span className={`badge ${role === 'admin' ? 'badge-red' : role === 'responder' ? 'badge-amber' : 'badge-blue'}`} style={{ marginTop: '0.5rem', textTransform: 'capitalize' }}>
          {role}
        </span>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{userProfile?.email}</p>
      </div>

      <div className="settings-section">
        <h3 className="settings-title">{t.appearance}</h3>
        <div className="glass-card" style={{ padding: '0 1rem' }}>
          <div className="settings-row">
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.dark}</span>
            <Toggle value={darkMode} onChange={setDarkMode} />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-title">{t.access}</h3>
        <div className="glass-card" style={{ padding: '0 1rem' }}>
          <div className="settings-row">
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.large}</span>
            <Toggle value={largeText} onChange={setLargeText} />
          </div>
          <div className="settings-row">
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.contrast}</span>
            <Toggle value={highContrast} onChange={setHighContrast} />
          </div>
          <div className="settings-row">
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.reduce}</span>
            <Toggle value={reduceMotion} onChange={setReduceMotion} />
          </div>
          <div className="settings-row">
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.haptic}</span>
            <Toggle value={haptic} onChange={setHaptic} />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-title">{t.lang}</h3>
        <div className="glass-card" style={{ padding: '0.75rem 1rem' }}>
          <div className="role-picker" style={{ marginBottom: 0 }}>
            <button className={`role-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => { setLang('en'); if (window.doGTranslate) window.doGTranslate('en'); }}>English</button>
            <button className={`role-btn ${lang === 'ta' ? 'active' : ''}`} onClick={() => { setLang('ta'); if (window.doGTranslate) window.doGTranslate('ta'); }}>தமிழ்</button>
          </div>
        </div>
      </div>

      {role === 'student' && (
        <div className="settings-section">
          <h3 className="settings-title">{t.emerg}</h3>
          <div className="glass-card" style={{ padding: '0 1rem' }}>
            <div className="settings-row">
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.silent}</span>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{t.silentDesc}</p>
              </div>
              <Toggle value={silentSos} onChange={setSilentSos} />
            </div>
            <div className="settings-row">
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.shake}</span>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{t.shakeDesc}</p>
              </div>
              <Toggle value={shakeSos} onChange={setShakeSos} />
            </div>
            <div className="settings-row">
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.auto}</span>
              <Toggle value={autoLocation} onChange={setAutoLocation} />
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', marginTop: '0.75rem' }}>
            <span className="section-label">{t.contacts}</span>
            {contacts.map((c, idx) => (
               <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                 <span style={{ fontSize: '0.875rem' }}>{c.name} — {c.number}</span>
                 <div style={{ display: 'flex', gap: '0.5rem' }}>
                   <span className="material-symbols-outlined notranslate" style={{ fontSize: '1.2rem', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => { setEditingIndex(idx); setContactName(c.name); setContactNumber(c.number); }}>edit</span>
                   <span className="material-symbols-outlined notranslate" style={{ fontSize: '1.2rem', color: 'var(--sos-red)', cursor: 'pointer' }} onClick={() => handleRemoveContact(idx)}>delete</span>
                 </div>
               </div>
            ))}
            {editingIndex !== null ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                 <div className="input-group">
                   <span className="material-symbols-outlined notranslate">person</span>
                   <input className="input-field" placeholder="Contact Name" value={contactName} onChange={e => setContactName(e.target.value)} />
                 </div>
                 <div className="input-group">
                   <span className="material-symbols-outlined notranslate">call</span>
                   <input className="input-field" placeholder="Phone Number" value={contactNumber} onChange={e => setContactNumber(e.target.value)} />
                 </div>
                 <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                   <button className="btn btn-primary" style={{ flex: 1, padding: '0.75rem' }} onClick={handleSaveContact}>SAVE</button>
                   <button className="btn" style={{ flex: 1, padding: '0.75rem', background: 'var(--border)', color: 'var(--text-main)' }} onClick={() => setEditingIndex(null)}>CANCEL</button>
                 </div>
               </div>
            ) : (
              <button onClick={handleAddContact} style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', marginTop: '0.5rem', fontFamily: 'inherit' }}>{t.addContact}</button>
            )}
          </div>
        </div>
      )}

      {role === 'responder' && (
        <div className="settings-section">
          <h3 className="settings-title">{t.respSet}</h3>
          <div className="glass-card" style={{ padding: '0 1rem' }}>
            <div className="settings-row">
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.onDuty}</span>
              <Toggle value={onDuty} onChange={setOnDuty} />
            </div>
          </div>
        </div>
      )}

      <div className="settings-section">
        <h3 className="settings-title">{t.notif}</h3>
        <div className="glass-card" style={{ padding: '0 1rem' }}>
          <div className="settings-row">
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.push}</span>
            <Toggle value={pushNotif} onChange={setPushNotif} />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-title">{t.about}</h3>
        <div className="glass-card" style={{ padding: '1rem' }}>
          <p style={{ fontSize: '0.8125rem', marginBottom: '0.25rem' }}>📞 Emergency: 112 | Campus: 044-XXXXXXX</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kavach v1.0.0</p>
        </div>
      </div>

      <button className="btn" style={{ background: 'transparent', border: '2px solid var(--sos-red)', color: 'var(--sos-red)', marginTop: '0.5rem' }} onClick={handleLogout}>
        {t.logout}
      </button>

      <BottomNav role={role} active="profile" />
    </div>
  );
}
