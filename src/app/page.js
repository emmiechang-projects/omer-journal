'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { SEFIROT_WEEKS, ACCENT_COLORS, getDayOfOmer, formatTodayDate } from '@/lib/omer-data';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fadeIn, setFadeIn] = useState(false);
  const [authMode, setAuthMode] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [referralCode, setReferralCode] = useState(null);

  const supabase = createClient();
  const currentDay = getDayOfOmer();

  useEffect(() => {
    // Capture referral code from URL
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setReferralCode(ref);
    checkUser();
    setTimeout(() => setFadeIn(true), 100);
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      window.location.href = '/journal';
      return;
    }
    setLoading(false);
  }

  async function handleAuth(e) {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    if (authMode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/journal` } });
      if (error) {
        setAuthError(error.message);
      } else if (data?.user?.identities?.length === 0) {
        setAuthError('An account with this email already exists. Try logging in.');
      } else if (data?.session) {
        // Auto-confirmed — enrich profile in background, then go to journal
        fetch('/api/enrich-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: data.user.id, email, referredBy: referralCode }),
        }).catch(() => {});
        window.location.href = '/journal';
      } else {
        // Needs email confirmation — enrich after they confirm
        if (data?.user?.id) {
          fetch('/api/enrich-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id, email, referredBy: referralCode }),
          }).catch(() => {});
        }
        setMagicLinkSent(true);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
      else window.location.href = '/journal';
    }
    setAuthLoading(false);
  }

  async function handleMagicLink() {
    setAuthError('');
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/journal` } });
    if (error) setAuthError(error.message);
    else setMagicLinkSent(true);
    setAuthLoading(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f0f' }}>
        <p style={{ color: '#666', fontSize: 16, letterSpacing: 3, fontFamily: "'Helvetica Neue', sans-serif" }}>Loading...</p>
      </div>
    );
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 4,
    border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)',
    color: '#e8e0d4', fontSize: 15, fontFamily: "'Cormorant Garamond', serif",
    outline: 'none', boxSizing: 'border-box',
  };

  const btnPrimary = {
    width: '100%', padding: '14px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
    backgroundColor: '#D4A574', color: '#1a1a1a', fontSize: 13, letterSpacing: 3,
    textTransform: 'uppercase', fontFamily: "'Helvetica Neue', sans-serif", fontWeight: 500,
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '64px 24px', backgroundColor: '#0f0f0f',
      color: '#e8e0d4', fontFamily: "'Cormorant Garamond', Georgia, serif",
      opacity: fadeIn ? 1 : 0, transition: 'opacity 1s ease',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <h1 style={{ fontSize: 52, fontWeight: 300, margin: '0 0 8px 0', letterSpacing: 2, direction: 'rtl' }}>ספירת העומר</h1>
        <p style={{ fontSize: 13, letterSpacing: 4, textTransform: 'uppercase', color: '#8a8a8a', fontFamily: "'Helvetica Neue', sans-serif", fontWeight: 300, margin: '0 0 48px 0' }}>
          Counting the Omer · 5786
        </p>
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 72, fontWeight: 300, color: '#D4A574', lineHeight: 1 }}>{currentDay}</span>
          <span style={{ display: 'block', fontSize: 11, color: '#666', letterSpacing: 3, textTransform: 'uppercase', fontFamily: "'Helvetica Neue', sans-serif", marginTop: 4 }}>of 49 days</span>
        </div>
        <p style={{ fontSize: 13, color: '#666', fontFamily: "'Helvetica Neue', sans-serif", marginBottom: 48 }}>{formatTodayDate()}</p>
        <p style={{ fontSize: 18, lineHeight: 1.8, color: '#9a9080', marginBottom: 8 }}>A 49-day spiritual journal from Passover to Shavuot.</p>
        <p style={{ fontSize: 18, lineHeight: 1.8, color: '#9a9080', marginBottom: 40 }}>Daily reflections guided by the sefirot, moon phases, and personal mantras. From liberation to revelation.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 48 }}>
          {ACCENT_COLORS.map((c, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 4, backgroundColor: c, opacity: 0.8 }} />
              <span style={{ fontSize: 9, color: '#555', fontFamily: "'Helvetica Neue', sans-serif", letterSpacing: 1 }}>{SEFIROT_WEEKS[i].name.slice(0, 3).toUpperCase()}</span>
            </div>
          ))}
        </div>
      </div>

      {!authMode && !magicLinkSent && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 300 }}>
          <button onClick={() => setAuthMode('signup')} style={btnPrimary}>Begin the Journey</button>
          <button onClick={() => setAuthMode('login')} style={{ ...btnPrimary, backgroundColor: 'rgba(255,255,255,0.06)', color: '#8a8a8a' }}>I have an account</button>
        </div>
      )}

      {authMode && !magicLinkSent && (
        <div style={{ width: '100%', maxWidth: 300 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'center' }}>
            {['signup', 'login'].map(m => (
              <button key={m} onClick={() => { setAuthMode(m); setAuthError(''); }} style={{
                background: 'none', border: 'none', cursor: 'pointer', paddingBottom: 4,
                fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', fontFamily: "'Helvetica Neue', sans-serif",
                color: authMode === m ? '#D4A574' : '#666',
                borderBottom: authMode === m ? '1px solid #D4A574' : '1px solid transparent',
              }}>{m === 'signup' ? 'Sign Up' : 'Log In'}</button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAuth()} style={inputStyle} />
            {authError && <p style={{ fontSize: 13, color: '#c4736a', fontFamily: "'Helvetica Neue', sans-serif", margin: 0 }}>{authError}</p>}
            <button onClick={handleAuth} disabled={authLoading || !email || !password} style={{ ...btnPrimary, opacity: authLoading || !email || !password ? 0.4 : 1 }}>
              {authLoading ? 'Loading...' : authMode === 'signup' ? 'Create Account' : 'Log In'}
            </button>
            <button onClick={handleMagicLink} disabled={authLoading || !email} style={{ width: '100%', padding: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontFamily: "'Helvetica Neue', sans-serif", color: '#555' }}>
              or sign in with magic link
            </button>
          </div>
          <button onClick={() => { setAuthMode(null); setAuthError(''); }} style={{ width: '100%', marginTop: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#555', fontFamily: "'Helvetica Neue', sans-serif" }}>← Back</button>
        </div>
      )}

      {magicLinkSent && (
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          <p style={{ fontSize: 28, marginBottom: 12 }}>📬</p>
          <p style={{ fontSize: 20, color: '#D4A574', marginBottom: 12 }}>Check your email</p>
          <p style={{ fontSize: 15, color: '#8a8a8a', fontFamily: "'Helvetica Neue', sans-serif", lineHeight: 1.6 }}>
            We sent a link to <strong style={{ color: '#e8e0d4' }}>{email}</strong>. Click it and you'll be taken straight to your journal. The link keeps you logged in.
          </p>
          <p style={{ fontSize: 13, color: '#555', fontFamily: "'Helvetica Neue', sans-serif", marginTop: 16 }}>
            Don't see it? Check your spam folder.
          </p>
        </div>
      )}

      <div style={{ marginTop: 64, textAlign: 'center' }}>
        <p style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#444', fontFamily: "'Helvetica Neue', sans-serif", marginBottom: 12 }}>Passover → Shavuot · From freedom to revelation</p>
        <p style={{ fontSize: 13, color: '#555', fontFamily: "'Helvetica Neue', sans-serif", marginBottom: 10 }}>
          Made for fun by a tech founder in SF.{' '}
          <a href="https://www.linkedin.com/in/emmie" target="_blank" rel="noopener noreferrer" style={{ color: '#D4A574', textDecoration: 'none', borderBottom: '1px solid rgba(212,165,116,0.3)' }}>Say hi on LinkedIn</a>
          {' · '}
          <a href="/privacy" style={{ color: '#666', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Privacy</a>
        </p>
        <p style={{ fontSize: 12, color: '#444', fontFamily: "'Helvetica Neue', sans-serif" }}>
          In community with{' '}
          <a href="https://www.valueculture.org" target="_blank" rel="noopener noreferrer" style={{ color: '#666', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Value Culture</a>
          , California Non-Profit
        </p>
      </div>
    </div>
  );
}
