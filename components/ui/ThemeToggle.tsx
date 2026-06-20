/**
 * Module: ThemeToggle
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: Switch between Foundation (default, dark) and Ascent (light), mirroring
 *          the mobile theme system. Persists the choice in localStorage.
 */
'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'ishrize_web_theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'foundation' | 'ascent'>('foundation');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const initial = stored === 'ascent' ? 'ascent' : 'foundation';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial === 'ascent' ? 'ascent' : '');
  }, []);

  function toggle() {
    const next = theme === 'foundation' ? 'ascent' : 'foundation';
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute('data-theme', next === 'ascent' ? 'ascent' : '');
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
    >
      {theme === 'foundation' ? 'Foundation' : 'Ascent'}
    </button>
  );
}
