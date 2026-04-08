'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import {
  SEFIROT_WEEKS, ACCENT_COLORS,
  getDayOfOmer, getSefirahForDay, getCosmicForDay, getWeekColor, getOmerCount,
  formatTodayDate,
} from '@/lib/omer-data';

const THEMES = {
  dark: {
    bg: '#0f0f0f', text: '#e8e0d4', muted: '#9a9080', faint: '#666', faintest: '#555',
    surface: 'rgba(255,255,255,0.03)', surfaceHover: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.06)', borderFaint: 'rgba(255,255,255,0.04)',
    inputBg: 'rgba(255,255,255,0.03)', inputBorder: 'rgba(255,255,255,0.08)',
    accentBg: 'rgba(212,165,116,0.04)', accentBorder: 'rgba(212,165,116,0.08)',
    mantraBg: 'rgba(255,255,255,0.02)', mantraBorder: 'rgba(255,255,255,0.04)',
    reflectionText: '#c4b49a', btnText: '#1a1a1a', lockColor: '#333',
    prayerBg: 'rgba(212,165,116,0.03)', prayerBorder: 'rgba(212,165,116,0.08)',
  },
  light: {
    bg: '#faf8f5', text: '#2a2520', muted: '#6b5e52', faint: '#998b7d', faintest: '#b8ad9f',
    surface: 'rgba(0,0,0,0.02)', surfaceHover: 'rgba(0,0,0,0.04)',
    border: 'rgba(0,0,0,0.08)', borderFaint: 'rgba(0,0,0,0.04)',
    inputBg: '#ffffff', inputBorder: 'rgba(0,0,0,0.12)',
    accentBg: 'rgba(212,165,116,0.08)', accentBorder: 'rgba(212,165,116,0.15)',
    mantraBg: 'rgba(212,165,116,0.06)', mantraBorder: 'rgba(212,165,116,0.12)',
    reflectionText: '#7a6b58', btnText: '#faf8f5', lockColor: '#ccc',
    prayerBg: 'rgba(212,165,116,0.06)', prayerBorder: 'rgba(212,165,116,0.12)',
  },
};

export default function JournalPage() {
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState({});
  const [currentDay, setCurrentDay] = useState(0);
  const [viewDay, setViewDay] = useState(0);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState('journal');
  const [fadeIn, setFadeIn] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [celebrating, setCelebrating] = useState(false);
  const [editing, setEditing] = useState(false);

  const t = THEMES[theme];

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem('omer-theme', next); } catch {}
  }

  const supabase = createClient();
  const activeSefirah = getSefirahForDay(viewDay);
  const accentColor = getWeekColor(viewDay);
  const cosmic = getCosmicForDay(viewDay);

  // Unlock rules: today and past = open, future = locked
  function isDayUnlocked(day) {
    return day <= currentDay;
  }

  const viewDayIsPast = viewDay < currentDay;
  const viewDayHasEntry = !!entries[viewDay];
  const viewDayContentVisible = viewDayIsPast || viewDayHasEntry;
  const viewDayCanWrite = isDayUnlocked(viewDay) && (viewDay === currentDay || viewDay >= currentDay - 7);
  const viewDayUnlocked = isDayUnlocked(viewDay);

  // Streak: consecutive days with entries counting back from today
  function getStreak() {
    let s = 0;
    for (let d = currentDay; d >= 0; d--) {
      if (entries[d]) s++;
      else break;
    }
    return s;
  }

  useEffect(() => {
    init();
  }, []);

  async function init() {
    // Load theme — default dark, only light if user explicitly chose it
    try {
      const saved = localStorage.getItem('omer-theme');
      if (saved) { setTheme(saved); }
      // Otherwise stays dark (the default)
    } catch {}

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/';
      return;
    }
    setUser(user);
    const day = getDayOfOmer();
    setCurrentDay(day);
    setViewDay(day);
    await loadEntries(user.id, day);
    setLoading(false);
    setTimeout(() => setFadeIn(true), 100);
  }

  async function loadEntries(userId, day) {
    const { data } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .order('day');

    if (data) {
      const map = {};
      data.forEach(e => { map[e.day] = e; });
      setEntries(map);
      if (map[day]) setText(map[day].text || '');
    }
  }

  async function saveEntry() {
    if (!user || !text.trim()) return;
    setSaving(true);
    const isFirstSave = !entries[viewDay];

    const existing = entries[viewDay];
    if (existing) {
      const { data, error } = await supabase
        .from('entries')
        .update({ text })
        .eq('id', existing.id)
        .select()
        .single();
      if (!error && data) {
        setEntries(prev => ({ ...prev, [viewDay]: data }));
      }
    } else {
      const { data, error } = await supabase
        .from('entries')
        .insert({ user_id: user.id, day: viewDay, text })
        .select()
        .single();
      if (!error && data) {
        setEntries(prev => ({ ...prev, [viewDay]: data }));
      }
    }
    setSaving(false);
    setEditing(false);

    // Celebrate on first save!
    if (isFirstSave) {
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 3000);
    }
  }

  function selectDay(day) {
    if (!isDayUnlocked(day)) return;
    setViewDay(day);
    setText(entries[day]?.text || '');
    setEditing(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  function exportMarkdown() {
    let md = `# Omer Journal 5786\n\n*A 49-day journey from Passover to Shavuot*\n\n---\n\n`;
    for (let d = 0; d <= 49; d++) {
      const s = getSefirahForDay(d);
      const entry = entries[d];
      if (entry) {
        md += `## Day ${d}${d === 0 ? ' — Passover' : ''}: ${s.combined}\n\n`;
        md += `*${s.mantra}*\n\n`;
        md += `${entry.text}\n\n---\n\n`;
      }
    }
    return md;
  }

  function copyExport() {
    navigator.clipboard.writeText(exportMarkdown());
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: t.bg }}>
        <p className="text-lg tracking-widest font-sans" style={{ color: t.faint }}>
          Loading your journey...
        </p>
      </div>
    );
  }

  const btnStyle = (active) => ({
    background: 'none',
    border: 'none',
    padding: '8px 0',
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: "'Helvetica Neue', sans-serif",
    cursor: 'pointer',
    borderBottom: active ? `2px solid ${accentColor}` : '2px solid transparent',
    color: active ? accentColor : t.faint,
  });

  return (
    <div
      className="min-h-screen max-w-2xl mx-auto px-5"
      style={{ opacity: fadeIn ? 1 : 0, transition: 'all 0.8s ease', backgroundColor: t.bg, color: t.text, position: 'relative', overflow: 'hidden' }}
    >
      {/* Celebration overlay */}
      {celebrating && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          pointerEvents: 'none', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Golden burst */}
          <div style={{
            position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,165,116,0.4) 0%, transparent 70%)',
            animation: 'pulse-burst 2.5s ease-out forwards',
          }} />
          {/* Sparkles */}
          {Array.from({ length: 30 }, (_, i) => {
            const angle = (i / 30) * 360;
            const distance = 120 + Math.random() * 200;
            const size = 6 + Math.random() * 10;
            const delay = Math.random() * 0.6;
            return (
              <div key={i} style={{
                position: 'absolute',
                top: '35%', left: '50%',
                width: size, height: size,
                borderRadius: '50%',
                backgroundColor: i % 4 === 0 ? '#D4A574' : i % 4 === 1 ? '#C4956A' : i % 4 === 2 ? '#e8e0d4' : '#BFA58A',
                opacity: 0,
                animation: `sparkle-fly 2s ${delay}s ease-out forwards`,
                '--tx': `${Math.cos(angle * Math.PI / 180) * distance}px`,
                '--ty': `${Math.sin(angle * Math.PI / 180) * distance}px`,
              }} />
            );
          })}
          {/* Unlock text */}
          <div style={{
            position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            animation: 'fade-up 2s 0.3s ease-out forwards',
            opacity: 0,
          }}>
            <p style={{ fontSize: 48, margin: 0 }}>✨</p>
            <p style={{ fontSize: 22, fontStyle: 'italic', color: '#D4A574', margin: '12px 0 0 0', fontFamily: "'Cormorant Garamond', serif", letterSpacing: 1 }}>
              Day {viewDay} unlocked
            </p>
          </div>
        </div>
      )}
      <style>{`
        @keyframes sparkle-fly {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0); }
        }
        @keyframes pulse-burst {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
        @keyframes fade-up {
          0% { opacity: 0; transform: translate(-50%, -40%); }
          50% { opacity: 1; transform: translate(-50%, -50%); }
          100% { opacity: 0; transform: translate(-50%, -60%); }
        }
      `}</style>
      {/* Header */}
      <div className="pt-12 pb-4" style={{ borderBottom: `1px solid ${t.border}` }}>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-normal tracking-wide" style={{ direction: 'rtl' }}>
              ספירת העומר
            </h1>
            <p className="font-sans text-sm mt-1.5 tracking-[0.2em] uppercase font-light" style={{ color: t.faint }}>
              Counting the Omer — 5786
            </p>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-5xl font-light leading-none" style={{ color: accentColor }}>
              {currentDay}
            </span>
            <span className="font-sans text-[11px] tracking-widest uppercase" style={{ color: t.faint }}>
              of 49
            </span>
          </div>
        </div>
        {/* Date display + streak */}
        <div className="flex items-center gap-4 mt-3">
          <p className="font-sans text-xs tracking-wide" style={{ color: t.muted, margin: 0 }}>
            {formatTodayDate()} · Day flips at sunset
          </p>
          {getStreak() > 0 && (
            <span className="font-sans text-xs tracking-wide" style={{ color: '#D4A574', margin: 0 }}>
              🔥 {getStreak()} day streak
            </span>
          )}
        </div>
        <div className="flex gap-6 mt-4 items-center">
          {['journal', 'timeline', 'about', 'export'].map((v) => (
            <button key={v} onClick={() => setView(v)} style={btnStyle(view === v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="font-sans text-[11px] tracking-widest"
              style={{ color: t.faintest, background: 'none', border: 'none', cursor: 'pointer' }}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <a
              href="/profile"
              className="font-sans text-[11px] tracking-widest uppercase"
              style={{ color: t.faintest, textDecoration: 'none' }}
            >
              Profile
            </a>
            <button
              onClick={handleLogout}
              className="font-sans text-[11px] tracking-widest uppercase"
              style={{ color: t.faintest, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Journal View */}
      {view === 'journal' && (
        <div className="pt-8">
          {/* Sefirah Card */}
          <div className="py-7" style={{ borderBottom: `1px solid ${t.border}`, marginBottom: 28 }}>
            <div
              className="font-sans text-xs tracking-[0.2em] uppercase mb-2"
              style={{ color: accentColor }}
            >
              {viewDay === 0 ? 'Day 0' : `Day ${viewDay}`}
            </div>
            <h2 className="text-2xl font-normal italic mb-1">{activeSefirah.combined}</h2>
            {activeSefirah.combinedMeaning && (
              <p className="text-base mb-4" style={{ color: t.faint }}>
                {activeSefirah.combinedMeaning}
              </p>
            )}
            <p className="text-base leading-relaxed" style={{ color: t.muted }}>
              {activeSefirah.prompt}
            </p>
          </div>

          {/* Prayer / Blessing */}
          {(() => {
            const omerCount = getOmerCount(viewDay);
            if (!omerCount) return null;
            return (
              <div
                className="py-6 px-6 mb-6 rounded-md text-center"
                style={{
                  backgroundColor: t.prayerBg,
                  border: `1px solid ${t.prayerBorder}`,
                }}
              >
                <div className="font-sans text-[10px] tracking-[0.3em] uppercase mb-5" style={{ color: t.faint }}>
                  Tonight's Blessing
                </div>
                {/* All Hebrew */}
                <div style={{ direction: 'rtl', marginBottom: 20 }}>
                  <p className="text-lg leading-loose mb-3" style={{ color: t.text }}>
                    {omerCount.blessing.hebrew}
                  </p>
                  <p className="text-base leading-relaxed" style={{ color: t.text }}>
                    {omerCount.count.hebrew}
                  </p>
                </div>
                <div style={{ borderTop: `1px solid ${t.borderFaint}`, paddingTop: 16, marginBottom: 16 }}>
                  {/* All transliteration */}
                  <p className="text-sm italic mb-2" style={{ color: t.faint }}>
                    {omerCount.blessing.transliteration}
                  </p>
                  <p className="text-sm italic" style={{ color: t.faint }}>
                    {omerCount.count.transliteration}
                  </p>
                </div>
                <div style={{ borderTop: `1px solid ${t.borderFaint}`, paddingTop: 16 }}>
                  {/* All English */}
                  <p className="text-sm mb-2" style={{ color: t.muted }}>
                    {omerCount.blessing.english}
                  </p>
                  <p className="text-sm" style={{ color: accentColor }}>
                    {omerCount.count.english}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Mantra — visible if past day or today with entry */}
          {activeSefirah.mantra && viewDayContentVisible && (
            <div
              className="text-center py-6 px-5 mb-5 rounded-md"
              style={{
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <div className="font-sans text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: '#555' }}>
                {viewDayIsPast ? "That day's mantra" : "Today's mantra"}
              </div>
              <p className="text-xl font-normal leading-relaxed tracking-wide">
                "{activeSefirah.mantra}"
              </p>
            </div>
          )}

          {/* Locked mantra placeholder — only for today when not yet written */}
          {activeSefirah.mantra && !viewDayContentVisible && viewDayUnlocked && (
            <div
              className="text-center py-6 px-5 mb-5 rounded-md"
              style={{
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <div className="font-sans text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: '#555' }}>
                Today's mantra
              </div>
              <p className="text-base font-sans" style={{ color: '#555' }}>
                🔒 Write your reflection to unlock today's mantra
              </p>
            </div>
          )}

          {/* Cosmic Bar — visible if past day or today with entry */}
          {viewDayContentVisible ? (
            <div
              className="flex items-center gap-4 py-4 mb-5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              <span className="text-3xl">{cosmic.moon}</span>
              <div className="flex flex-col gap-0.5">
                <span className="font-sans text-sm tracking-wide" style={{ color: '#8a8a8a' }}>
                  {cosmic.phase}{cosmic.zodiac ? ` · ${cosmic.zodiac} season` : ''}
                </span>
                {cosmic.note && (
                  <span className="text-sm italic" style={{ color: accentColor }}>
                    {cosmic.note}
                  </span>
                )}
              </div>
            </div>
          ) : viewDayUnlocked ? (
            <div
              className="flex items-center gap-4 py-4 mb-5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              <span className="text-3xl">🌙</span>
              <span className="font-sans text-sm" style={{ color: '#555' }}>
                Moon phase &amp; cosmic data unlock after you write
              </span>
            </div>
          ) : null}

          {/* Reflection — visible if past day or today with entry */}
          {activeSefirah.reflection && viewDayContentVisible && (
            <div
              className="py-6 px-7 mb-7 rounded-r"
              style={{
                backgroundColor: 'rgba(212,165,116,0.04)',
                borderLeft: `2px solid ${accentColor}`,
              }}
            >
              <div className="font-sans text-[10px] tracking-[0.2em] uppercase mb-2.5" style={{ color: '#666' }}>
                {viewDayIsPast ? "That day's reflection" : "Tonight's reflection"}
              </div>
              <p className="text-lg italic leading-relaxed" style={{ color: '#c4b49a' }}>
                {activeSefirah.reflection}
              </p>
            </div>
          )}

          {/* Journal Entry Area */}
          {viewDayCanWrite ? (
            <div className="mb-8">
              {/* Show submitted entry as styled text, or textarea if editing/new */}
              {viewDayHasEntry && !editing ? (
                <div>
                  <div className="font-sans text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: t.faint }}>
                    {viewDayIsPast ? "Your reflection" : "Tonight's entry"}
                  </div>
                  <div style={{
                    padding: '24px 28px',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    borderRadius: 6,
                    border: `1px solid ${t.borderFaint}`,
                    marginBottom: 12,
                  }}>
                    <p style={{ fontSize: 18, lineHeight: 1.8, margin: 0, color: t.text, whiteSpace: 'pre-wrap' }}>
                      {entries[viewDay]?.text}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditing(true)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 12, letterSpacing: 2, textTransform: 'uppercase',
                      fontFamily: "'Helvetica Neue', sans-serif", color: t.faintest,
                    }}
                  >
                    ✏️ Edit entry
                  </button>
                </div>
              ) : (
                <div>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Write your reflection..."
                    rows={8}
                    className="w-full min-h-[180px] rounded p-5 text-lg leading-relaxed resize-y outline-none"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      color: t.text,
                    }}
                  />
                  <div className="flex justify-between items-center mt-3">
                    <span className="font-sans text-xs" style={{ color: t.faint }}>
                      {text.length > 0 ? `${text.split(/\s+/).filter(Boolean).length} words` : ''}
                    </span>
                    <div className="flex gap-3">
                      {editing && (
                        <button
                          onClick={() => { setEditing(false); setText(entries[viewDay]?.text || ''); }}
                          className="py-2.5 px-5 rounded font-sans text-sm tracking-[0.15em] uppercase font-medium"
                          style={{ backgroundColor: 'transparent', color: t.faintest, border: `1px solid ${t.borderFaint}`, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={saveEntry}
                        disabled={saving || !text.trim()}
                        className="py-2.5 px-7 rounded font-sans text-sm tracking-[0.15em] uppercase font-medium"
                        style={{
                          backgroundColor: accentColor,
                          color: '#1a1a1a',
                          opacity: saving || !text.trim() ? 0.4 : 1,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {saving ? 'Saving...' : editing ? 'Update' : 'Save & Unlock ✨'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : viewDayUnlocked && viewDayIsPast ? (
            <div className="mb-8">
              {viewDayHasEntry ? (
                <div>
                  <div className="font-sans text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: t.faint }}>
                    Your reflection
                  </div>
                  <div style={{
                    padding: '24px 28px',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    borderRadius: 6,
                    border: `1px solid ${t.borderFaint}`,
                  }}>
                    <p style={{ fontSize: 18, lineHeight: 1.8, margin: 0, color: t.text, whiteSpace: 'pre-wrap' }}>
                      {entries[viewDay]?.text}
                    </p>
                  </div>
                  <p className="font-sans text-xs mt-3 italic" style={{ color: t.faintest }}>
                    Writing window has closed for this day.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-base italic" style={{ color: t.faintest }}>
                    No entry was written for this day.
                  </p>
                </div>
              )}
            </div>
          ) : !viewDayUnlocked ? (
            <div className="mb-8 text-center py-12">
              <p className="text-xl mb-3" style={{ color: t.faintest }}>🔒</p>
              <p className="text-base" style={{ color: t.faint }}>
                This day hasn't arrived yet. Come back tomorrow.
              </p>
            </div>
          ) : null}

          {/* Day Grid */}
          <div className="pt-6" style={{ borderTop: `1px solid ${t.border}` }}>
            <div className="flex justify-between items-center mb-4">
              <span className="font-sans text-[11px] tracking-[0.2em] uppercase" style={{ color: t.faint }}>
                Your journey
              </span>
              <span className="font-sans text-[11px] tracking-wide" style={{ color: t.faint }}>
                {Object.keys(entries).length} of {Math.min(currentDay + 1, 50)} days written
              </span>
            </div>
            <div className="grid grid-cols-10 gap-1.5">
              {Array.from({ length: 50 }, (_, i) => {
                const unlocked = isDayUnlocked(i);
                const hasEntry = !!entries[i];
                const isFuture = i > currentDay;
                const isToday = i === currentDay;
                // Check if this day is part of the current streak
                const inStreak = (() => {
                  if (!hasEntry) return false;
                  for (let d = currentDay; d >= i; d--) {
                    if (!entries[d] && d <= currentDay && d > i) return false;
                  }
                  return true;
                })();
                return (
                  <button
                    key={i}
                    onClick={() => selectDay(i)}
                    title={unlocked ? `Day ${i}: ${getSefirahForDay(i).combined}` : `Day ${i}: Coming soon`}
                    className="aspect-square rounded flex items-center justify-center font-sans text-[11px] font-medium"
                    style={{
                      backgroundColor: hasEntry
                        ? getWeekColor(i)
                        : isToday
                        ? 'rgba(212,165,116,0.2)'
                        : isFuture
                        ? 'rgba(255,255,255,0.02)'
                        : 'rgba(255,255,255,0.06)',
                      border: viewDay === i 
                        ? `2px solid ${accentColor}` 
                        : isToday && !hasEntry
                        ? '2px solid rgba(212,165,116,0.4)'
                        : '2px solid transparent',
                      color: hasEntry ? '#1a1a1a' : isToday ? accentColor : isFuture ? '#333' : t.faintest,
                      cursor: unlocked ? 'pointer' : 'default',
                      opacity: isFuture ? 0.4 : 1,
                      boxShadow: inStreak ? '0 0 6px rgba(212,165,116,0.3)' : 'none',
                    }}
                  >
                    {isFuture ? '🔒' : i}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Timeline View */}
      {view === 'timeline' && (
        <div className="pt-8">
          {Object.keys(entries).length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg italic mb-6" style={{ color: '#666' }}>
                Your journey begins with the first entry.
              </p>
              <button
                onClick={() => setView('journal')}
                className="py-2.5 px-7 rounded font-sans text-sm tracking-[0.15em] uppercase font-medium"
                style={{ backgroundColor: accentColor, color: '#1a1a1a', border: 'none', cursor: 'pointer' }}
              >
                Write Day 0
              </button>
            </div>
          ) : (
            Object.keys(entries).sort((a, b) => Number(a) - Number(b)).map((dayKey) => {
              const d = Number(dayKey);
              const entry = entries[d];
              const s = getSefirahForDay(d);
              const c = getCosmicForDay(d);
              return (
                <div
                  key={d}
                  onClick={() => { selectDay(d); setView('journal'); }}
                  className="flex gap-5 pb-7 mb-7 cursor-pointer"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5"
                    style={{ backgroundColor: getWeekColor(d) }}
                  />
                  <div className="flex-1">
                    <div className="text-lg italic mb-1">{c.moon} Day {d} — {s.combined}</div>
                    <div className="font-sans text-xs tracking-wider mb-2.5" style={{ color: '#666' }}>
                      {c.phase} · {c.zodiac}
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: '#9a9080' }}>
                      {entry.text.length > 200 ? entry.text.slice(0, 200) + '...' : entry.text}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* About View */}
      {view === 'about' && (
        <div className="pt-8">
          <h2 className="text-2xl font-normal italic mb-6">What is the Omer?</h2>
          <div className="text-base leading-relaxed" style={{ color: '#9a9080' }}>
            <p className="mb-5">
              The Omer is a 49-day spiritual practice in the Jewish tradition, counted each evening
              from the second night of Passover until Shavuot. It bridges the journey from liberation
              (leaving Egypt) to revelation (receiving the Torah at Sinai).
            </p>
            <p className="mb-5">
              Each of the 7 weeks corresponds to one of seven divine qualities — the <em>sefirot</em>.
              Each day within a week combines two qualities, creating 49 unique combinations for reflection.
            </p>
            <div
              className="my-8 py-6"
              style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {SEFIROT_WEEKS.map((s, i) => (
                <div key={i} className="flex items-center gap-4 mb-4">
                  <div
                    className="w-4 h-4 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: ACCENT_COLORS[i] }}
                  />
                  <div>
                    <span className="text-lg italic">Week {i + 1}: {s.name}</span>
                    <span className="text-sm ml-2" style={{ color: '#666' }}>— {s.meaning}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mb-5">
              The practice invites daily introspection: a few minutes each evening to check in with
              yourself, notice patterns, and grow intentionally over 7 weeks.
            </p>
            <p className="mb-5">
              Think of it as a spiritual journal with built-in structure. You don't need to be religious
              to benefit — just willing to show up each day and reflect honestly.
            </p>
            <p>
              On Day 49, you'll have a complete record of your inner journey. The tradition says that
              by Shavuot, you're ready to receive something new — wisdom, clarity, revelation — that
              you couldn't have accessed on Day 0.
            </p>
          </div>
        </div>
      )}

      {/* Export View */}
      {view === 'export' && (
        <div className="pt-8">
          <p className="text-base mb-5" style={{ color: '#8a8a8a' }}>
            {Object.keys(entries).length} of 50 days recorded. Copy your full journal as markdown.
          </p>
          <pre
            className="rounded p-5 text-sm leading-relaxed overflow-auto"
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: "'Courier New', monospace",
              color: '#9a9080',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 400,
            }}
          >
            {exportMarkdown()}
          </pre>
          <button
            onClick={copyExport}
            className="mt-4 py-2.5 px-7 rounded font-sans text-sm tracking-[0.15em] uppercase font-medium"
            style={{ backgroundColor: accentColor, color: '#1a1a1a', border: 'none', cursor: 'pointer' }}
          >
            Copy to Clipboard
          </button>
        </div>
      )}

      {/* Footer */}
      <div
        className="py-10 text-center mt-10"
        style={{ borderTop: `1px solid ${t.border}` }}
      >
        <p className="font-sans text-xs tracking-[0.2em] uppercase mb-4" style={{ color: t.faintest }}>
          Passover → Shavuot · From freedom to revelation
        </p>
        <p className="font-sans text-sm mb-3" style={{ color: t.faint }}>
          Made for fun by a tech founder in SF.{' '}
          <a
            href="https://www.linkedin.com/in/emmie"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#D4A574', textDecoration: 'none', borderBottom: '1px solid rgba(212,165,116,0.3)' }}
          >
            Say hi on LinkedIn
          </a>
          {' · '}
          <a href="/privacy" style={{ color: t.faintest, textDecoration: 'none', borderBottom: `1px solid ${t.borderFaint}` }}>Privacy</a>
        </p>
        <p className="font-sans text-xs" style={{ color: t.faintest }}>
          In community with{' '}
          <a
            href="https://www.valueculture.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: t.faint, textDecoration: 'none', borderBottom: `1px solid ${t.borderFaint}` }}
          >
            Value Culture
          </a>
          , California Non-Profit
        </p>
      </div>
    </div>
  );
}
