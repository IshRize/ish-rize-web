/**
 * Module: orgTheme
 * Layer:  lib (client-side)
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: The org-neutral theming hook — only --accent-primary,
 *          --accent-primary-hover, and --accent-secondary may ever be
 *          overridden per organization (e.g. a church instance setting its
 *          accent to purple). Applied as inline CSS variable overrides on
 *          <html>, so they win over the theme.css defaults regardless of
 *          light/dark mode.
 *
 * Notes:
 * - --bg-clash, --bg-free-slot, --bg-pending (and their fg- pairs) are NEVER
 *   accepted here, even if present on the config — those are fixed,
 *   safety-critical semantics across every org by design. This function only
 *   knows about the three accent variables; there is no code path through
 *   which a clash/free/pending token could be overridden.
 */
import type { OrgConfig } from '@/types/scheduling';

const ACCENT_VARS = ['--accent-primary', '--accent-primary-hover', '--accent-secondary'] as const;

export function applyOrgAccentOverride(branding: OrgConfig['branding']): void {
  const root = document.documentElement;
  const values: Record<(typeof ACCENT_VARS)[number], string | undefined> = {
    '--accent-primary': branding?.accentPrimary,
    '--accent-primary-hover': branding?.accentPrimaryHover,
    '--accent-secondary': branding?.accentSecondary,
  };
  for (const varName of ACCENT_VARS) {
    const value = values[varName];
    if (value) {
      root.style.setProperty(varName, value);
    } else {
      root.style.removeProperty(varName);
    }
  }
}
