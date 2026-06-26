/**
 * Module: ImportDepartmentTimetableModal
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md; dept-coordinator tooling Phase 5
 *
 * Purpose: A coordinator's own bulk-import flow -- upload a department's
 *          already-decomposed timetable file (Course + Host per row, e.g.
 *          the day-grid PDFs/spreadsheets a department's own coordinator
 *          produces), review the parsed draft, then commit straight into
 *          Booking. Scoped to this orgUnitId end-to-end: parse resolves
 *          Course/Host only against this department's own records, and
 *          commit re-validates that scope server-side -- a coordinator
 *          can't accidentally (or otherwise) write another department's
 *          bookings through this flow.
 */
'use client';

import { useState } from 'react';
import { ingestionApi } from '@/lib/api';
import { BookingReviewTable } from '@/components/ingestion/BookingReviewTable';
import type { BookingIngestionCommitResult, BookingIngestionResult } from '@/types/scheduling';

interface ImportDepartmentTimetableModalProps {
  organizationId: string;
  orgUnitId: string;
  termId: string;
  onClose: () => void;
  onCommitted: () => void;
}

export function ImportDepartmentTimetableModal({
  organizationId,
  orgUnitId,
  termId,
  onClose,
  onCommitted,
}: ImportDepartmentTimetableModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingIngestionResult | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<BookingIngestionCommitResult | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  async function handleParse() {
    if (!file) return;
    setIsParsing(true);
    setParseError(null);
    setCommitResult(null);
    try {
      const parsed = await ingestionApi.parseBookings(file, organizationId, orgUnitId);
      setResult(parsed);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Parse failed');
    } finally {
      setIsParsing(false);
    }
  }

  async function handleCommit() {
    if (!result) return;
    setIsCommitting(true);
    setCommitError(null);
    try {
      const commit = await ingestionApi.commitBookings(termId, result.draftBookings, orgUnitId);
      setCommitResult(commit);
      onCommitted();
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : 'Commit failed');
    } finally {
      setIsCommitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-backdrop)] p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto space-y-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--fg-primary)]">Import department timetable</h2>
          <button type="button" onClick={onClose} className="text-[var(--fg-muted)] hover:text-[var(--fg-primary)]">
            ×
          </button>
        </div>
        <p className="text-xs text-[var(--fg-muted)]">
          Upload a file that already lists course, lecturer, venue, day, and time -- this department&apos;s own decomposed timetable,
          not the master file. Rows resolve only against this department&apos;s own courses and lecturers.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
            Timetable file (.csv, .xlsx, .pdf)
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-[var(--fg-primary)]"
            />
          </label>
          <button
            type="button"
            onClick={handleParse}
            disabled={!file || isParsing}
            className="rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-sm font-medium text-[var(--fg-on-accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
          >
            {isParsing ? 'Parsing…' : 'Parse'}
          </button>
        </div>
        {parseError && <p className="text-sm text-[var(--fg-clash)]">{parseError}</p>}

        {result && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[var(--fg-muted)]">
                Parsed {result.draftBookings.length} row{result.draftBookings.length === 1 ? '' : 's'} via the {result.layerUsed} layer.
                Review before committing.
              </p>
              <button
                type="button"
                onClick={handleCommit}
                disabled={isCommitting || result.draftBookings.length === 0}
                className="rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-sm font-medium text-[var(--fg-on-accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
              >
                {isCommitting ? 'Committing…' : 'Commit'}
              </button>
            </div>
            {commitError && <p className="text-sm text-[var(--fg-clash)]">{commitError}</p>}
            <BookingReviewTable drafts={result.draftBookings} />
          </section>
        )}

        {commitResult && (
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] p-3 text-sm text-[var(--fg-primary)]">
            Committed {commitResult.committed.length}, skipped {commitResult.skipped.length}.
            {commitResult.skipped.length > 0 && (
              <ul className="mt-1 list-inside list-disc text-xs text-[var(--fg-muted)]">
                {commitResult.skipped.map((s) => (
                  <li key={s.rowIndex}>
                    Row {s.rowIndex}: {s.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
