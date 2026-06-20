/**
 * Module: BookingCell
 * Layer:  web-component (presentational)
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: One grid cell — dense rendering of host initials + activity code + room.
 *          A cell may hold zero or more bookings (zero is the common case).
 */
import type { Booking } from '@/types/scheduling';

interface BookingCellProps {
  bookings: Booking[];
}

export function BookingCell({ bookings }: BookingCellProps) {
  if (bookings.length === 0) {
    return <span className="text-[var(--color-text-disabled)]">—</span>;
  }
  return (
    <div className="flex flex-col gap-1">
      {bookings.map((b) => (
        <div
          key={b.id}
          className="rounded-md border border-[var(--color-border-light)] bg-[var(--color-surface-alt)] px-2 py-1 text-xs leading-tight"
          title={`${b.course.name}${b.host ? ` — ${b.host.displayName}` : ''}${b.venue ? ` — ${b.venue.name}` : ''}`}
        >
          <div className="font-medium text-[var(--color-text-primary)]">{b.course.code}</div>
          <div className="text-[var(--color-text-secondary)]">
            {b.host?.initials ?? '—'} · {b.venue?.name ?? 'TBD'}
          </div>
        </div>
      ))}
    </div>
  );
}
