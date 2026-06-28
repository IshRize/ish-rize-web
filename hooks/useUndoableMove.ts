/**
 * Module: useUndoableMove
 * Layer:  lib (client hook)
 * Context: See COPILOT_CONTEXT.md; Phase 5 of the cross-role fixes plan
 *
 * Purpose: Drag-and-drop reschedule with an undo step -- the "human
 *          verification" for a move, confirmed: instant commit + an Undo
 *          button is the agreed model (a deliberate dropdown choice already
 *          counts as its own confirmation; a drag, which can mis-target a
 *          cell, gets this safety net instead).
 *
 *          Extracted from Department Timetable's page (the original,
 *          already-shipped drag-and-drop) so Schedule's grid reuses the exact
 *          same undo/move logic instead of a second copy -- both pages call
 *          this hook with their own invalidate() callback, since each
 *          invalidates a different set of query keys.
 */
'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';

interface UndoEntry {
  bookingId: string;
  previousTimeSlotId: string;
}

export function useUndoableMove(invalidate: () => void) {
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);

  const moveMutation = useMutation({
    mutationFn: ({ bookingId, timeSlotId }: { bookingId: string; timeSlotId: string }) =>
      schedulingApi.updateBooking(bookingId, { timeSlotId }),
    onSuccess: invalidate,
  });

  function handleMoveBooking(bookingId: string, fromTimeSlotId: string, toTimeSlotId: string): void {
    setUndoStack((stack) => [...stack, { bookingId, previousTimeSlotId: fromTimeSlotId }]);
    moveMutation.mutate({ bookingId, timeSlotId: toTimeSlotId });
  }

  function handleUndo(): void {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    setUndoStack((stack) => stack.slice(0, -1));
    moveMutation.mutate({ bookingId: last.bookingId, timeSlotId: last.previousTimeSlotId });
  }

  return { undoStack, handleMoveBooking, handleUndo, isMoving: moveMutation.isPending };
}
