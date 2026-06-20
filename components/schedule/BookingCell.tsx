/**
 * Module: BookingCell
 * Layer:  web-component (presentational)
 * Context: See COPILOT_CONTEXT.md, IMPLEMENTATION_PLAN.md (Phase 4)
 *
 * Purpose: One grid cell — dense rendering of host initials + activity code + room.
 *          A cell may hold zero or more bookings (zero is the common case). Shows
 *          a ClashBadge when a booking appears in the clash report. Coordinators
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
          className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-[var(--color-border)] text-[var(--color-text-disabled)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          aria-label="Add booking"
        >
          +
        </button>
      );
    }
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
            <div className="flex items-center gap-1">
              <ClashBadge clashes={clashes} />
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onDelete?.(b.id)}
                  className="text-[var(--color-text-disabled)] hover:text-[var(--color-error)]"
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
