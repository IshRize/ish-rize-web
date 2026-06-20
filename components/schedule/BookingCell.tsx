/**
 * Module: BookingCell
 * Layer:  web-component (presentational)
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: One grid cell — dense rendering of host initials + activity code + room.
 *          A cell may hold zero or more bookings (zero is the common case). Shows
 *          a ClashBadge when a booking appears in the clash report.
 */
import { ClashBadge } from './ClashBadge';
import type { Booking, Clash } from '@/types/scheduling';

interface BookingCellProps {
  bookings: Booking[];
  clashesByBookingId?: Map<string, Clash[]>;
}

export function BookingCell({ bookings, clashesByBookingId }: BookingCellProps) {
  if (bookings.length === 0) {
    return <span className="text-[var(--color-text-disabled)]">—</span>;
  }
  return (
    <div className="flex flex-col gap-1">
      {bookings.map((b) => {
        const clashes = clashesByBookingId?.get(b.id) ?? [];
        return (
          <div
            key={b.id}
            className="flex items-start justify-between gap-1 rounded-md border border-[var(--color-border-light)] bg-[var(--color-surface-alt)] px-2 py-1 text-xs leading-tight"
            title={`${b.course.name}${b.host ? ` — ${b.host.displayName}` : ''}${b.venue ? ` — ${b.venue.name}` : ''}`}
          >
            <div>
              <div className="font-medium text-[var(--color-text-primary)]">{b.course.code}</div>
              <div className="text-[var(--color-text-secondary)]">
                {b.host?.initials ?? '—'} · {b.venue?.name ?? 'TBD'}
              </div>
            </div>
            <ClashBadge clashes={clashes} />
          </div>
        );
      })}
    </div>
  );
}
