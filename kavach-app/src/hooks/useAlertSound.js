// New-alert signal for responders: urgent two-tone beep (WebAudio, no files), vibration and a
// "(n) New alert" tab title until the tab is focused again. Sound respects a persisted mute.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';

const MUTE_KEY = 'kavach_mute_alerts';

let audioCtx = null;

function getAudioContext() {
  if (audioCtx) return audioCtx;
  const Ctx = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
  if (!Ctx) return null;
  try {
    audioCtx = new Ctx();
  } catch {
    audioCtx = null;
  }
  return audioCtx;
}

// Browsers only allow audio after a user gesture: create/resume the context on the first one.
function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function playAlarm() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const tone = (freq, at, dur) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.18, at + 0.015);
    gain.gain.setValueAtTime(0.18, at + dur - 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  };
  const start = ctx.currentTime + 0.05;
  for (let i = 0; i < 3; i += 1) {
    const t0 = start + i * 0.55;
    tone(988, t0, 0.2);        // B5
    tone(740, t0 + 0.24, 0.2); // F#5
  }
}

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * @param {string[]|null} ids  ids to watch (null while the first load is in flight)
 * @param {{ enabled?: boolean }} [opts]  enabled=false (e.g. off duty) records ids silently
 * @returns {{ muted: boolean, toggleMute: () => boolean }}
 */
export function useAlertSound(ids, { enabled = true } = {}) {
  const { t } = useT();
  const [muted, setMuted] = useState(readMuted);
  const seenRef = useRef(null);
  const unseenRef = useRef(0);
  const baseTitleRef = useRef(null);

  const clearTitle = useCallback(() => {
    unseenRef.current = 0;
    if (baseTitleRef.current != null) {
      document.title = baseTitleRef.current;
      baseTitleRef.current = null;
    }
  }, []);

  // Unlock audio on the first interaction; clear the title badge when the user is back.
  useEffect(() => {
    const onGesture = () => { unlockAudio(); clearTitle(); };
    const onFocus = () => clearTitle();
    const onVisible = () => { if (document.visibilityState === 'visible' && document.hasFocus()) clearTitle(); };
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('keydown', onGesture);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      clearTitle();
    };
  }, [clearTitle]);

  const idsKey = ids ? [...ids].sort().join('|') : null;

  useEffect(() => {
    if (idsKey == null) return;
    const list = idsKey ? idsKey.split('|') : [];
    if (!seenRef.current) {
      // First load: everything already on screen is not "new"
      seenRef.current = new Set(list);
      return;
    }
    const fresh = list.filter(id => !seenRef.current.has(id));
    list.forEach(id => seenRef.current.add(id));
    if (!fresh.length || !enabled) return;

    unseenRef.current += fresh.length;
    if (baseTitleRef.current == null) baseTitleRef.current = document.title;
    document.title = t('responder.newAlertTitle', { n: unseenRef.current });
    if (!muted) playAlarm();
    try { navigator.vibrate?.([300, 150, 300]); } catch { /* not supported */ }
  }, [idsKey, enabled, muted, t]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    try { localStorage.setItem(MUTE_KEY, next ? '1' : '0'); } catch { /* storage unavailable */ }
    if (!next) unlockAudio();
    return next;
  }, [muted]);

  return { muted, toggleMute };
}
