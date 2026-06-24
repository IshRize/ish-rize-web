/**
 * Module: DraggableBookingCard
 * Layer:  web-component (presentational)
 * Context: See COPILOT_CONTEXT.md; dept-coordinator tooling Phase 3
 *
 * Purpose: A single booking card in the department grid view, draggable to
 *          a different day/period cell to resolve a clash (or just
 *          reschedule). Visually mirrors BookingCell's booked-card styling
 *          so the two grids (Schedule's read-mostly grid, this editable
 *          one) stay consistent; the drag handle is the whole card, not a
 *          separate grip icon, since every booking here is always movable
 *          when the coordinator can edit.
 */
'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ClashBadge } from '@/components/schedule/ClashBadge';
import type { Booking, Clash } from '@/types/scheduling';

interface DraggableBookingCardProps {
  booking: Booking;
  clashes: Clash[];
  canEdit: boolean;
  onDelete?: (bookingId: string) => void;
  onAutoReschedule?: (bookingId: string) => void;
}

export function DraggableBookingCard({ booking, clashes, canEdit, onDelete, onAutoReschedule }: DraggableBookingCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: booking.id,
    disabled: !canEdit,
  });
  const hasClash = clashes.length > 0;

  return (
    <div
      ref={setNodeRef}
      {...(canEdit ? listeners : {})}
      {...(canEdit ? attributes : {})}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      className={`flex items-start justify-between gap-1 rounded-md border px-2 py-1 text-xs leading-tight ${
        canEdit ? 'cursor-grab active:cursor-grabbing' : ''
      } ${
        hasClash
          ? 'border-[var(--fg-clash)]/40 bg-[var(--bg-clash)] text-[var(--fg-clash)]'
          : 'border-[var(--border-default)] bg-[var(--bg-secondary)]'
      }`}
      title={`${booking.course.name}${booking.host ? ` — ${booking.host.displayName}` : ''}${booking.venue ? ` — ${booking.venue.name}` : ''}`}
    >
      <div>
        <div className={`font-medium ${hasClash ? 'text-[var(--fg-clash)]' : 'text-[var(--fg-primary)]'}`}>{booking.course.code}</div>
        <div className={hasClash ? 'text-[var(--fg-clash)]' : 'text-[var(--fg-muted)]'}>
          {booking.host?.initials ?? '—'} · {booking.venue?.name ?? 'TBD'}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <ClashBadge clashes={clashes} />
        {canEdit && hasClash && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAutoReschedule?.(booking.id);
            }}
            className="text-[var(--accent-primary)] hover:underline"
            aria-label={`Resolve ${booking.course.code}'s clash automatically`}
            title="Resolve automatically"
          >
            ⟳
          </button>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(booking.id);
            }}
            className="text-[var(--fg-muted)] hover:text-[var(--fg-clash)]"
            aria-label={`Remove ${booking.course.code}`}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
