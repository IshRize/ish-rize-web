/**
 * Module: AppHeader
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md; nav/theme-toggle/sign-out moved to
 *          Sidebar in UI/UX redesign Phase 2; Organization selection moved to
 *          Sidebar's OrgSwitcher in Phase 6b -- repeating an Organization
 *          picker on every page was redundant once the Sidebar carries it
 *          persistently, the same way nav/theme/sign-out already moved there.
 *          This now carries the page title and the Term selector.
 *
 * Purpose: Shared header for the Schedule/Clashes/Free-finder/Ingestion
 *          pages — title, Term selector (backed by scheduleSelectionStore so
 *          the choice persists across pages). Applies the org-neutral accent
 *          override (lib/orgTheme.ts) the moment an org's config resolves.
 */
'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { applyOrgAccentOverride } from '@/lib/orgTheme';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { Select } from '@/components/ui/Select';

interface AppHeaderProps {
  title: string;
  /** Rendered next to the title — e.g. the schedule page's live-sync dot. */
  endSlot?: React.ReactNode;
  /** Rendered in the filter row BEFORE Term -- e.g. the department-timetable page's Department select, so the row reads Department, Term, Level. */
  beforeTermSlot?: React.ReactNode;
  /** Extra filter controls rendered in the same row as Term, after it — e.g. the master timetable's Level filter. */
  filtersSlot?: React.ReactNode;
}

export function AppHeader({ title, endSlot, beforeTermSlot, filtersSlot }: AppHeaderProps) {
  const { user } = useAuthStore();
  const { organizationId, termId, setTermId } = useScheduleSelectionStore();

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
      </div>

      <div className="flex flex-wrap gap-3">
        {beforeTermSlot}
        <Select
          label="Term"
          value={termId}
          onChange={setTermId}
          options={(termsQuery.data ?? []).map((t) => ({ value: t.id, label: t.name }))}
        />
        {filtersSlot}
      </div>
    </header>
  );
}
