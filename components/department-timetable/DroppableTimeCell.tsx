/**
 * Module: DroppableTimeCell
 * Layer:  web-component (presentational)
 * Context: See COPILOT_CONTEXT.md; dept-coordinator tooling Phase 3
 *
 * Purpose: One day/period cell in the department grid view. Droppable id is
 *          the underlying TimeSlot id, so dropping a booking card here moves
 *          it to this exact day+period -- venue is left untouched; a
 *          coordinator still reassigns venue separately if needed.
 */
'use client';

import { useDroppable } from '@dnd-kit/core';

interface DroppableTimeCellProps {
  timeSlotId: string;
  canDrop: boolean;
  children: React.ReactNode;
}

export function DroppableTimeCell({ timeSlotId, canDrop, children }: DroppableTimeCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: timeSlotId, disabled: !canDrop });

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full min-h-[2.5rem] flex-col gap-1 rounded-md ${
        isOver && canDrop ? 'bg-[var(--accent-secondary)]/40 ring-2 ring-[var(--accent-primary)]' : ''
      }`}
    >
      {children}
    </div>
  );
}
