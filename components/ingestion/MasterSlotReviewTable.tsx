/**
 * Module: MasterSlotReviewTable
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md; three-tier timetable refactor Phase 2
 *
 * Purpose: Show every parsed master-timetable draft row -- Subject/Day/Time/
 *          Venue/Level -- with its resolved/unresolved fields and warnings,
 *          before anything is committed. No Activity/Host columns: the real
 *          master export never carries a specific course or a named lecturer,
 *          so there's nothing to resolve there. A department coordinator
 *          decomposes a MasterSlot into a real course+lecturer later (Phase 3).
 */
'use client';

import type { DraftMasterSlot, VenueSummary } from '@/types/scheduling';

interface MasterSlotReviewTableProps {
  drafts: DraftMasterSlot[];
  venues: VenueSummary[];
}

function venueName(venueId: string | undefined, venues: VenueSummary[]): string {
  if (!venueId) return '—';
  return venues.find((v) => v.id === venueId)?.name ?? venueId;
}

export function MasterSlotReviewTable({ drafts, venues }: MasterSlotReviewTableProps) {
  if (drafts.length === 0) {
    return <p className="text-sm text-[var(--fg-muted)]">No rows parsed from this file.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-[var(--accent-secondary)]">
          <tr>
            {['Row', 'Subject', 'Level', 'Day', 'Time', 'Venue', 'Sheet', 'Warnings'].map((h) => (
              <th key={h} className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drafts.map((d) => {
            const needsReview = d.warnings.length > 0;
            return (
              <tr
                key={d.rowIndex}
                className={needsReview ? 'bg-[var(--bg-pending)]/40' : 'even:bg-[var(--bg-alternate)]/60'}
              >
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-xs tabular-nums text-[var(--fg-muted)]">
                  {d.rowIndex}
                </td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-primary)]">{d.raw.subjectCode}</td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-muted)]">{d.level ?? '—'}</td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-muted)]">{d.dayOfWeek ?? d.raw.day}</td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-muted)]">{d.raw.slot}</td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-muted)]">{venueName(d.venueId, venues)}</td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-xs text-[var(--fg-muted)]">{d.sheet ?? '—'}</td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-xs text-[var(--fg-pending)]">
                  {!needsReview ? (
                    <span className="text-[var(--fg-free-slot)]">OK</span>
                  ) : (
                    <ul className="list-inside list-disc">
                      {d.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
