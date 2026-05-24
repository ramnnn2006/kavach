import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/DialogContext';

export default function Settings({ userRole = 'Student', onLogout }) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  // Local state for toggles
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('kavach_dark') === 'true'
  );
  const [highContrast, setHighContrast] = useState(
    () => localStorage.getItem('kavach_contrast') === 'true'
  );
  const [largeText, setLargeText] = useState(
    () => localStorage.getItem('kavach_largetext') === 'true'
  );
  const [pushEnabled, setPushEnabled] = useState(
    () => localStorage.getItem('kavach_push') !== 'false'
  );
  const [onlineStatus, setOnlineStatus] = useState(
    () => localStorage.getItem('kavach_online') !== 'false'
  );

  // Apply visual changes immediately
  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) html.classList.add('dark');
    else html.classList.remove('dark');
    localStorage.setItem('kavach_dark', darkMode);

    if (highContrast) html.classList.add('high-contrast');
    else html.classList.remove('high-contrast');
    localStorage.setItem('kavach_contrast', highContrast);

    if (largeText) html.classList.add('large-text');
    else html.classList.remove('large-text');
    localStorage.setItem('kavach_largetext', largeText);
  }, [darkMode, highContrast, largeText]);

  useEffect(() => {
    localStorage.setItem('kavach_push', pushEnabled);
  }, [pushEnabled]);

  useEffect(() => {
    localStorage.setItem('kavach_online', onlineStatus);
  }, [onlineStatus]);

  const handleClearCache = async () => {
    const confirmed = await confirm(
      'Clear Cache',
      'This will clear offline maps and cached data. Are you sure?'
    );
    if (confirmed) {
      localStorage.removeItem('kavach_push');
      localStorage.removeItem('kavach_online');
      showToast('Cache cleared successfully.', 'success');
    }
  };

  const handleLogout = async () => {
    const confirmed = await confirm(
      'Log Out',
      'Are you sure you want to log out of Kavach?'
    );
    if (confirmed) {
      // Clear auth data logic here
      showToast('Logged out.', 'info');
      if (onLogout) onLogout();
    }
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and app preferences</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 className="section-label">Profile</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div className="avatar avatar-lg">
            {userRole.charAt(0)}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '700' }}>Test User</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>test@campus.edu</p>
            <div className="badge badge-blue" style={{ marginTop: '0.5rem' }}>{userRole}</div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-title">Appearance</h2>
        <div className="glass-card" style={{ padding: '0 1.25rem' }}>
          <div className="settings-row">
            <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Dark Mode</span>
            <button 
              type="button" 
              className={`toggle ${darkMode ? 'on' : ''}`}
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Toggle dark mode"
            />
          </div>
          <div className="settings-row">
            <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>High Contrast</span>
            <button 
              type="button" 
              className={`toggle ${highContrast ? 'on' : ''}`}
              onClick={() => setHighContrast(!highContrast)}
              aria-label="Toggle high contrast"
            />
          </div>
          <div className="settings-row">
            <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Large Text</span>
            <button 
              type="button" 
              className={`toggle ${largeText ? 'on' : ''}`}
              onClick={() => setLargeText(!largeText)}
              aria-label="Toggle large text"
            />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-title">Preferences</h2>
        <div className="glass-card" style={{ padding: '0 1.25rem' }}>
          <div className="settings-row">
            <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Push Notifications</span>
            <button 
              type="button" 
              className={`toggle ${pushEnabled ? 'on' : ''}`}
              onClick={() => setPushEnabled(!pushEnabled)}
              aria-label="Toggle push notifications"
            />
          </div>
          {userRole === 'Responder' && (
            <div className="settings-row">
              <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Online Status</span>
              <button 
                type="button" 
                className={`toggle ${onlineStatus ? 'on' : ''}`}
                onClick={() => setOnlineStatus(!onlineStatus)}
                aria-label="Toggle online status"
              />
            </div>
          )}
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-title">Actions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={handleClearCache}>
            <span className="material-symbols-outlined">delete_sweep</span>
            Clear Cache
          </button>
          <button className="btn btn-danger" onClick={handleLogout}>
            <span className="material-symbols-outlined">logout</span>
            Log Out
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '2rem', marginBottom: '4rem', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: '600' }}>Kavach v1.0.0</p>
        <a 
          href="https://github.com/ramnnn2006/kavach" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}
        >
          View on GitHub
        </a>
      </div>
    </div>
  );
}
