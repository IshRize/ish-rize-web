/**
 * Module: Ingestion page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md, IMPLEMENTATION_PLAN.md (Phase 5); three-tier
 *          timetable refactor Phase 2
 *
 * Purpose: Upload the Master Timetable (.csv/.xlsx/.pdf), review the parsed
 *          draft, then commit -- idempotently, via the backend's importKey
 *          upsert -- into MasterSlot. Never a Booking: the real master export
 *          only ever carries subject code + level + day + time + venue, never
 *          a specific course or a named lecturer (a department coordinator
 *          decomposes a MasterSlot into that later). ADMIN-only.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ingestionApi, schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { AppHeader } from '@/components/layout/AppHeader';
import { MasterSlotReviewTable } from '@/components/ingestion/MasterSlotReviewTable';
import type { MasterSlotCommitResult, MasterSlotIngestionResult } from '@/types/scheduling';

export default function IngestionPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, termId } = useScheduleSelectionStore();

  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<MasterSlotIngestionResult | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<MasterSlotCommitResult | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
    else if (!authLoading && user && user.role !== 'ADMIN') router.replace('/schedule');
  }, [authLoading, isAuthenticated, user, router]);

  const venuesQuery = useQuery({
    queryKey: ['venues', organizationId],
    queryFn: () => schedulingApi.listVenues(organizationId),
    enabled: !!organizationId,
  });

  async function handleParse() {
    if (!file) return;
    setIsParsing(true);
    setParseError(null);
    setCommitResult(null);
    try {
      const parsed = await ingestionApi.parseMaster(file, organizationId);
      setResult(parsed);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Parse failed');
    } finally {
      setIsParsing(false);
    }
  }

  async function handleCommit() {
    if (!result || !termId) return;
    setIsCommitting(true);
    setCommitError(null);
    try {
      const commit = await ingestionApi.commitMaster(organizationId, termId, result.draftSlots);
      setCommitResult(commit);
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : 'Commit failed');
    } finally {
      setIsCommitting(false);
    }
  }

  if (authLoading || !isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] p-6">
      <AppHeader title="Master Timetable Ingestion" />

      <section className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
          Master timetable file (.csv, .xlsx, .pdf)
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
        {parseError && <p className="text-sm text-[var(--fg-clash)]">{parseError}</p>}
      </section>

      {result && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[var(--fg-muted)]">
              Layer used: <span className="font-medium text-[var(--fg-primary)]">{result.layerUsed}</span>
              {' · '}
              {result.draftSlots.length} row(s) parsed
            </p>
            <button
              type="button"
              onClick={handleCommit}
              disabled={isCommitting || result.draftSlots.length === 0 || !termId}
              className="rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-sm font-medium text-[var(--fg-on-accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
            >
              {isCommitting ? 'Committing…' : 'Commit'}
            </button>
          </div>

          {result.warnings.length > 0 && (
            <ul className="list-inside list-disc text-sm text-[var(--fg-pending)]">
              {result.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}

          <MasterSlotReviewTable drafts={result.draftSlots} venues={venuesQuery.data ?? []} />

          {commitError && <p className="text-sm text-[var(--fg-clash)]">{commitError}</p>}

          {commitResult && (
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 text-sm">
              <p className="text-[var(--fg-free-slot)]">
                Committed {commitResult.committed.length} master slot(s)
                {commitResult.skipped.length > 0 && `, skipped ${commitResult.skipped.length}`}.
              </p>
              {commitResult.skipped.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-[var(--fg-pending)]">
                  {commitResult.skipped.map((s) => (
                    <li key={s.rowIndex}>
                      Row {s.rowIndex}: {s.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {!organizationId && (
        <p className="mt-4 text-xs text-[var(--fg-muted)]">Pick an organization and term above before parsing a file.</p>
      )}
    </main>
  );
}
