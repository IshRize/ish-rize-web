/**
 * Module: AppHeader
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: Shared header for the Schedule/Clashes/Free-finder/Ingestion pages —
 *          title, nav links, organization/term selectors (backed by
 *          scheduleSelectionStore so the choice persists across pages), theme
 *          toggle, sign out. Applies the org-neutral accent override
 *          (lib/orgTheme.ts) the moment an org's config resolves.
 */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { applyOrgAccentOverride } from '@/lib/orgTheme';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Select } from '@/components/ui/Select';

const NAV_LINKS = [
  { href: '/schedule', label: 'Schedule' },
  { href: '/clashes', label: 'Clashes' },
  { href: '/free-finder', label: 'Free finder' },
];

// Ingestion mutates the schedule and is coordinator-only on the backend
// (LECTURER/ADMIN); hide the link rather than send other roles to a 403.
const COORDINATOR_NAV_LINKS = [{ href: '/ingestion', label: 'Ingestion' }];

interface AppHeaderProps {
  title: string;
  /** Rendered next to the title — e.g. the schedule page's live-sync dot. */
  endSlot?: React.ReactNode;
}

export function AppHeader({ title, endSlot }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { organizationId, termId, setOrganizationId, setTermId } = useScheduleSelectionStore();
  const isCoordinator = user?.role === 'LECTURER' || user?.role === 'ADMIN';
  const navLinks = isCoordinator ? [...NAV_LINKS, ...COORDINATOR_NAV_LINKS] : NAV_LINKS;

  const orgsQuery = useQuery({ queryKey: ['organizations'], queryFn: schedulingApi.listOrganizations });
  useEffect(() => {
    if (!organizationId && orgsQuery.data?.[0]) setOrganizationId(orgsQuery.data[0].id);
  }, [organizationId, orgsQuery.data, setOrganizationId]);

  const termsQuery = useQuery({
    queryKey: ['terms', organizationId],
    queryFn: () => schedulingApi.listTerms(organizationId),
    enabled: !!organizationId,
  });
  useEffect(() => {
    if (termsQuery.data?.length && !termsQuery.data.some((t) => t.id === termId)) {
      setTermId(termsQuery.data[0].id);
    }
  }, [termId, termsQuery.data, setTermId]);

  // Org-neutral accent override: applies the moment this org's config
  // resolves, and clears back to the default theme tokens when it has none.
  const configQuery = useQuery({
    queryKey: ['org-config', organizationId],
    queryFn: () => schedulingApi.getOrgConfig(organizationId),
    enabled: !!organizationId,
  });
  useEffect(() => {
    applyOrgAccentOverride(configQuery.data?.branding);
  }, [configQuery.data]);

  return (
    <header className="mb-6 space-y-4 rounded-lg bg-[var(--bg-alternate)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[var(--fg-primary)]">{title}</h1>
            {endSlot}
          </div>
          <p className="text-sm text-[var(--fg-muted)]">
            Signed in as {user?.firstName} {user?.lastName} ({user?.role})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => logout().then(() => router.push('/login'))}
            className="rounded-md border border-[var(--border-default)] px-3 py-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
          >
            Sign out
          </button>
        </div>
      </div>

      <nav className="flex gap-2">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm ${
              pathname === link.href
                ? 'bg-[var(--accent-primary)] text-[var(--fg-on-accent-primary)]'
                : 'text-[var(--fg-muted)] hover:text-[var(--fg-primary)]'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap gap-3">
        <Select
          label="Organization"
          value={organizationId}
          onChange={setOrganizationId}
          options={(orgsQuery.data ?? []).map((o) => ({ value: o.id, label: o.name }))}
        />
        <Select
          label="Term"
          value={termId}
          onChange={setTermId}
          options={(termsQuery.data ?? []).map((t) => ({ value: t.id, label: t.name }))}
        />
      </div>
    </header>
  );
}
