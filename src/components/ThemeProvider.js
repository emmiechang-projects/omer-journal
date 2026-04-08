'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = {
  dark: {
    bg: '#0f0f0f',
    text: '#e8e0d4',
    textMuted: '#9a9080',
    textFaint: '#666',
    textFaintest: '#555',
    surface: 'rgba(255,255,255,0.03)',
    surfaceHover: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.06)',
    borderFaint: 'rgba(255,255,255,0.04)',
    inputBg: 'rgba(255,255,255,0.03)',
    inputBorder: 'rgba(255,255,255,0.08)',
    accentBg: 'rgba(212,165,116,0.04)',
    accentBorder: 'rgba(212,165,116,0.08)',
    lockBg: 'rgba(255,255,255,0.02)',
    mantraBg: 'rgba(255,255,255,0.02)',
    mantraBorder: 'rgba(255,255,255,0.04)',
    reflectionText: '#c4b49a',
    btnText: '#1a1a1a',
    lockedDot: '#333',
  },
  light: {
    bg: '#faf8f5',
    text: '#2a2520',
    textMuted: '#6b5e52',
    textFaint: '#998b7d',
    textFaintest: '#b8ad9f',
    surface: 'rgba(0,0,0,0.02)',
    surfaceHover: 'rgba(0,0,0,0.04)',
    border: 'rgba(0,0,0,0.08)',
    borderFaint: 'rgba(0,0,0,0.04)',
    inputBg: 'rgba(0,0,0,0.02)',
    inputBorder: 'rgba(0,0,0,0.1)',
    accentBg: 'rgba(212,165,116,0.08)',
    accentBorder: 'rgba(212,165,116,0.15)',
    lockBg: 'rgba(0,0,0,0.02)',
    mantraBg: 'rgba(212,165,116,0.05)',
    mantraBorder: 'rgba(212,165,116,0.12)',
    reflectionText: '#7a6b58',
    btnText: '#faf8f5',
    lockedDot: '#ccc',
  },
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check localStorage first (manual override)
    const saved = localStorage.getItem('omer-theme');
    if (saved) {
      setTheme(saved);
    } else {
      // Auto-detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
    setMounted(true);

    // Listen for system changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      const saved = localStorage.getItem('omer-theme');
      if (!saved) setTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('omer-theme', next);
  }

  const colors = THEMES[theme];

  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      <div style={{ backgroundColor: colors.bg, color: colors.text, minHeight: '100vh', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
