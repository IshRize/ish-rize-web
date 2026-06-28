/**
 * Module: OrgSwitcher
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md; Phase 6b of the cross-role fixes plan
 *
 * Purpose: Slack-style persistent workspace switcher, living in the Sidebar
 *          instead of repeated on every page (AppHeader's old per-page
 *          Organization selector is gone now that this exists). Sourced from
 *          listOrganizations, which is membership-scoped on the backend --
 *          this only ever offers organizations the signed-in person actually
 *          belongs to, never every organization in the system.
 *
 *          This is the "switch which org I'm MANAGING" half of the user's
 *          own Slack-vs-Gmail framing -- single org at a time, for every
 *          org-scoped page (Schedule, Master Timetable, Department
 *          Timetable, etc). The "see all my orgs combined" half is My
 *          Timetable's separate unified toggle, not this switcher.
 */
'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';

interface OrgSwitcherProps {
  labelClassName: string;
}

export function OrgSwitcher({ labelClassName }: OrgSwitcherProps) {
  const { organizationId, setOrganizationId } = useScheduleSelectionStore();
  const orgsQuery = useQuery({ queryKey: ['organizations'], queryFn: schedulingApi.listOrganizations });
  const orgs = orgsQuery.data ?? [];

  useEffect(() => {
    if (!organizationId && orgs[0]) setOrganizationId(orgs[0].id);
    // If the currently-selected org is no longer one this person belongs to
    // (e.g. membership was revoked), fall back rather than staying stuck on
    // an org they can no longer see.
    else if (organizationId && orgs.length > 0 && !orgs.some((o) => o.id === organizationId)) {
      setOrganizationId(orgs[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, orgs]);

  if (orgs.length === 0) return null;

  return (
    <div className="px-2 pb-2">
      <label className="flex flex-col gap-1">
        <span className={`text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-muted)] ${labelClassName}`}>
          Workspace
        </span>
        <select
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
          className="w-full truncate rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--fg-primary)]"
        >
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
