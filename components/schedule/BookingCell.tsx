/**
 * Module: BookingCell
 * Layer:  web-component (presentational)
 * Context: See COPILOT_CONTEXT.md, IMPLEMENTATION_PLAN.md (Phase 4)
 *
 * Purpose: One grid cell — dense rendering of host initials + activity code + room.
 *          Implements the product's core 3-state surface: an empty cell reads as
 *          "free" (bg-free-slot), a booking with no conflict reads as neutral
 *          booked (bg-secondary), and a booking involved in a clash fills the
 *          whole row with bg-clash/fg-clash — not just a small badge. Coordinators
 *          (canEdit) get a delete affordance on bookings and an add affordance on
 *          empty cells; everyone else sees a read-only cell.
 */
import { ClashBadge } from './ClashBadge';
import type { Booking, Clash } from '@/types/scheduling';

interface BookingCellProps {
  bookings: Booking[];
  clashesByBookingId?: Map<string, Clash[]>;
  canEdit?: boolean;
  onAdd?: () => void;
  onDelete?: (bookingId: string) => void;
}

export function BookingCell({ bookings, clashesByBookingId, canEdit, onAdd, onDelete }: BookingCellProps) {
  if (bookings.length === 0) {
    if (canEdit) {
      return (
        <button
          type="button"
          onClick={onAdd}
          className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-[var(--fg-free-slot)]/40 bg-[var(--bg-free-slot)]/40 text-[var(--fg-free-slot)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
          aria-label="Add booking"
        >
          +
        </button>
      );
    }
    return (
      <span className="flex h-full w-full items-center justify-center rounded-md bg-[var(--bg-free-slot)]/30 text-xs text-[var(--fg-free-slot)]">
        Free
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {bookings.map((b) => {
        const clashes = clashesByBookingId?.get(b.id) ?? [];
        const hasClash = clashes.length > 0;
        return (
          <div
            key={b.id}
            className={`flex items-start justify-between gap-1 rounded-md border px-2 py-1 text-xs leading-tight ${
              hasClash
                ? 'border-[var(--fg-clash)]/40 bg-[var(--bg-clash)] text-[var(--fg-clash)]'
                : 'border-[var(--border-default)] bg-[var(--bg-secondary)]'
            }`}
            title={`${b.course.name}${b.host ? ` — ${b.host.displayName}` : ''}${b.venue ? ` — ${b.venue.name}` : ''}`}
          >
            <div>
              <div className={`font-medium ${hasClash ? 'text-[var(--fg-clash)]' : 'text-[var(--fg-primary)]'}`}>
                {b.course.code}
              </div>
              <div className={hasClash ? 'text-[var(--fg-clash)]' : 'text-[var(--fg-muted)]'}>
                {b.host?.initials ?? '—'} · {b.venue?.name ?? 'TBD'}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ClashBadge clashes={clashes} />
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onDelete?.(b.id)}
                  className="text-[var(--fg-muted)] hover:text-[var(--fg-clash)]"
                  aria-label={`Remove ${b.course.code}`}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
