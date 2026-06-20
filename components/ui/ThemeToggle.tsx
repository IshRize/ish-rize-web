/**
 * Module: ThemeToggle
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: Light/dark toggle. Defaults to the OS's prefers-color-scheme; a
 *          manual choice is persisted to localStorage and wins over the system
 *          setting from then on. Toggling sets data-theme="dark"|"" on <html>,
 *          which swaps every CSS variable in globals.css instantly — no reload.
 */
'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'ishrize_web_theme';
type ThemeChoice = 'light' | 'dark';

function applyTheme(theme: ThemeChoice): void {
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '');
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeChoice>('light');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeChoice | null;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const initial = stored ?? (mediaQuery.matches ? 'dark' : 'light');
    setTheme(initial);
    applyTheme(initial);

    // Only follow live system-preference changes when the user hasn't made an
    // explicit choice — a manual override always wins.
    if (stored) return;
    const handleChange = (e: MediaQueryListEvent): void => {
      const next: ThemeChoice = e.matches ? 'dark' : 'light';
      setTheme(next);
      applyTheme(next);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  function toggle(): void {
    const next: ThemeChoice = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-md border border-[var(--border-default)] px-3 py-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
    >
      {theme === 'dark' ? 'Dark' : 'Light'}
    </button>
  );
}
