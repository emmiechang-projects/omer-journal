'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    title: '',
    company: '',
    industry: '',
    bio: '',
    personalization_opt_out: false,
  });

  const supabase = createClient();

  const [whoopStatus, setWhoopStatus] = useState('');

  useEffect(() => { 
    // Check for Whoop OAuth callback status
    const params = new URLSearchParams(window.location.search);
    const whoop = params.get('whoop');
    if (whoop === 'connected') setWhoopStatus('Whoop connected successfully!');
    else if (whoop === 'error') setWhoopStatus('Whoop connection failed. Try again.');
    init(); 
  }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/'; return; }
    setUser(user);

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      setProfile(profile);
      setFormData({
        display_name: profile.display_name || '',
        title: profile.title || '',
        company: profile.company || '',
        industry: profile.industry || '',
        bio: profile.bio || '',
        personalization_opt_out: profile.personalization_opt_out || false,
      });
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update(formData)
      .eq('id', user.id);

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
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
    color: '#e8e0d4', fontSize: 16, fontFamily: "'Cormorant Garamond', serif",
    outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: 11, letterSpacing: 3, textTransform: 'uppercase',
    fontFamily: "'Helvetica Neue', sans-serif", color: '#8a8a8a',
    marginBottom: 6, display: 'block',
  };

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#e8e0d4',
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      maxWidth: 520, margin: '0 auto', padding: '48px 24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 400, margin: 0 }}>Your Profile</h1>
          <p style={{ fontSize: 13, color: '#666', fontFamily: "'Helvetica Neue', sans-serif", margin: '4px 0 0 0' }}>
            {profile?.email}
          </p>
        </div>
        <a href="/journal" style={{ color: '#D4A574', textDecoration: 'none', fontSize: 14, fontFamily: "'Helvetica Neue', sans-serif" }}>
          ← Journal
        </a>
      </div>

      {whoopStatus && (
        <div style={{
          padding: '16px 20px', borderRadius: 6, marginBottom: 16,
          backgroundColor: whoopStatus.includes('success') ? 'rgba(100,200,100,0.1)' : 'rgba(200,100,100,0.1)',
          border: `1px solid ${whoopStatus.includes('success') ? 'rgba(100,200,100,0.2)' : 'rgba(200,100,100,0.2)'}`,
        }}>
          <p style={{ fontSize: 14, color: '#e8e0d4', margin: 0, fontFamily: "'Helvetica Neue', sans-serif" }}>
            {whoopStatus}
          </p>
        </div>
      )}

      {profile?.enriched_at && !profile?.personalization_opt_out && (
        <div style={{
          padding: '16px 20px', borderRadius: 6, marginBottom: 32,
          backgroundColor: 'rgba(212,165,116,0.06)', border: '1px solid rgba(212,165,116,0.1)',
        }}>
          <p style={{ fontSize: 14, color: '#9a9080', margin: 0, fontFamily: "'Helvetica Neue', sans-serif" }}>
            ✨ Your daily reflections are personalized based on your professional context.
            You can edit the details below or opt out entirely.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <label style={labelStyle}>Name</label>
          <input
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            placeholder="Your name"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Title / Role</label>
          <input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Founder & CEO"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Company / Organization</label>
          <input
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="e.g. Yuzu Labs"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Industry</label>
          <input
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            placeholder="e.g. SaaS, Education, Healthcare"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>About you (optional)</label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Anything you'd like the daily reflections to know about you — your goals, what you're working through, what matters to you right now."
            rows={4}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
          />
          <p style={{ fontSize: 12, color: '#555', fontFamily: "'Helvetica Neue', sans-serif", marginTop: 6 }}>
            This helps personalize your evening emails. Only the AI reads this.
          </p>
        </div>

        {/* Whoop Integration */}
        <div style={{
          padding: '20px', borderRadius: 6,
          border: `1px solid ${profile?.whoop_connected ? 'rgba(212,165,116,0.2)' : 'rgba(255,255,255,0.06)'}`,
          backgroundColor: profile?.whoop_connected ? 'rgba(212,165,116,0.05)' : 'rgba(255,255,255,0.02)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 15, color: '#e8e0d4' }}>
                {profile?.whoop_connected ? '✓ Whoop Connected' : 'Connect Whoop'}
              </span>
              <p style={{ fontSize: 13, color: '#666', fontFamily: "'Helvetica Neue', sans-serif", margin: '4px 0 0 0' }}>
                {profile?.whoop_connected
                  ? 'Your recovery, sleep, and strain data enrich your daily reflections.'
                  : 'Let your body data speak through your Omer reflections. Your recovery, sleep, and strain woven into your evening email.'}
              </p>
            </div>
            {!profile?.whoop_connected ? (
              <button
                onClick={() => {
                  window.location.href = `/api/auth/whoop/connect?userId=${user.id}`;
                }}
                style={{
                  padding: '8px 20px', borderRadius: 4, border: 'none', cursor: 'pointer',
                  backgroundColor: '#D4A574', color: '#1a1a1a', fontSize: 12, letterSpacing: 2,
                  textTransform: 'uppercase', fontFamily: "'Helvetica Neue', sans-serif", fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                Connect
              </button>
            ) : (
              <span style={{ fontSize: 12, color: '#D4A574', fontFamily: "'Helvetica Neue', sans-serif" }}>
                Active
              </span>
            )}
          </div>
        </div>

        {/* Opt out */}
        <div style={{
          padding: '20px', borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.06)',
          backgroundColor: 'rgba(255,255,255,0.02)',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.personalization_opt_out}
              onChange={(e) => setFormData({ ...formData, personalization_opt_out: e.target.checked })}
              style={{ width: 18, height: 18, accentColor: '#D4A574' }}
            />
            <div>
              <span style={{ fontSize: 15, color: '#e8e0d4' }}>Opt out of personalization</span>
              <p style={{ fontSize: 13, color: '#666', fontFamily: "'Helvetica Neue', sans-serif", margin: '4px 0 0 0' }}>
                Your daily emails will be based only on your journal entries and the sefirot — no professional or body context.
              </p>
            </div>
          </label>
        </div>

        {/* Referral Link */}
        {profile?.referral_code && (
          <div style={{
            padding: '20px', borderRadius: 6,
            border: '1px solid rgba(212,165,116,0.15)',
            backgroundColor: 'rgba(212,165,116,0.05)',
          }}>
            <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', fontFamily: "'Helvetica Neue', sans-serif", color: '#8a8a8a', marginBottom: 12 }}>
              Your invite link
            </div>
            <div style={{
              padding: '10px 16px', borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              fontSize: 15, fontFamily: "'Helvetica Neue', sans-serif", color: '#D4A574',
              wordBreak: 'break-all',
            }}>
              counttheomer.com/?ref={profile.referral_code}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <p style={{ fontSize: 13, color: '#666', fontFamily: "'Helvetica Neue', sans-serif", margin: 0 }}>
                {(profile.referral_count || 0) > 0
                  ? `🔥 ${profile.referral_count} friend${profile.referral_count > 1 ? 's have' : ' has'} joined through you`
                  : 'Share this link to invite friends to count with you'}
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(`https://counttheomer.com/?ref=${profile.referral_code}`)}
                style={{
                  padding: '6px 16px', borderRadius: 4, border: '1px solid rgba(212,165,116,0.3)',
                  backgroundColor: 'transparent', color: '#D4A574', fontSize: 12, letterSpacing: 1,
                  fontFamily: "'Helvetica Neue', sans-serif", cursor: 'pointer',
                }}
              >
                Copy
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
            backgroundColor: '#D4A574', color: '#1a1a1a', fontSize: 13, letterSpacing: 3,
            textTransform: 'uppercase', fontFamily: "'Helvetica Neue', sans-serif", fontWeight: 500,
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Profile'}
        </button>
      </div>

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#555', fontFamily: "'Helvetica Neue', sans-serif" }}>
          Your data is private. We never share or sell your information.{' '}
          <a href="/privacy" style={{ color: '#666', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
