/**
 * Module: BookingReviewTable
 * Layer:  web-component (presentational)
 * Context: See COPILOT_CONTEXT.md; dept-coordinator tooling Phase 5
 *
 * Purpose: Show every parsed department-ingestion draft row -- Course/Day/
 *          Time/Venue/Host/Level -- with its resolution warnings, before
 *          anything is committed. Unlike MasterSlotReviewTable, this file's
 *          rows already carry Course + Host (the real department export is
 *          already decomposed), so a row resolving to a courseId AND a
 *          timeSlotId is fully committable.
 */
'use client';

import { dayLabel } from '@/lib/dayNames';
import type { DraftBooking } from '@/types/scheduling';

interface BookingReviewTableProps {
  drafts: DraftBooking[];
}

export function BookingReviewTable({ drafts }: BookingReviewTableProps) {
  if (drafts.length === 0) {
    return <p className="text-sm text-[var(--fg-muted)]">No rows parsed from this file.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-[var(--accent-secondary)]">
          <tr>
            {['Row', 'Course', 'Day', 'Time', 'Venue', 'Host', 'Level', 'Sheet', 'Warnings'].map((h) => (
              <th key={h} className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drafts.map((d) => {
            const committable = !!d.courseId && !!d.timeSlotId;
            const needsReview = d.warnings.length > 0;
            return (
              <tr
                key={d.rowIndex}
                className={!committable ? 'bg-[var(--bg-clash)]/40' : needsReview ? 'bg-[var(--bg-pending)]/40' : 'even:bg-[var(--bg-alternate)]/60'}
              >
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-xs tabular-nums text-[var(--fg-muted)]">
                  {d.rowIndex}
                </td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-primary)]">{d.raw.code}</td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-muted)]">{dayLabel(d.raw.day)}</td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-muted)]">{d.raw.slot}</td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-muted)]">{d.raw.venue ?? '—'}</td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-muted)]">{d.raw.host ?? '—'}</td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-[var(--fg-muted)]">{d.level ?? d.raw.level ?? '—'}</td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-xs text-[var(--fg-muted)]">{d.sheet ?? '—'}</td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-xs">
                  {!committable ? (
                    <span className="text-[var(--fg-clash)]">Not committable -- {!d.courseId ? 'course' : 'time slot'} unresolved</span>
                  ) : !needsReview ? (
                    <span className="text-[var(--fg-free-slot)]">OK</span>
                  ) : (
                    <ul className="list-inside list-disc text-[var(--fg-pending)]">
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
