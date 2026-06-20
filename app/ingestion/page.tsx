/**
 * Module: Ingestion page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md, IMPLEMENTATION_PLAN.md (Phase 5)
 *
 * Purpose: Upload a schedule file (.csv/.xlsx/.pdf), review the parsed draft
 *          (fixing any unresolved fields inline), then commit — idempotently,
 *          via the backend's importKey upsert. Nothing persists until Commit.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ingestionApi, schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { AppHeader } from '@/components/layout/AppHeader';
import { ReviewTable } from '@/components/ingestion/ReviewTable';
import type { DraftBooking, IngestionCommitResult, IngestionResult } from '@/types/scheduling';

export default function IngestionPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, termId } = useScheduleSelectionStore();

  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<IngestionResult | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<IngestionCommitResult | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  const unitsQuery = useQuery({
    queryKey: ['org-units', organizationId],
    queryFn: () => schedulingApi.listOrgUnits(organizationId),
    enabled: !!organizationId,
  });
  const venuesQuery = useQuery({
    queryKey: ['venues', organizationId],
    queryFn: () => schedulingApi.listVenues(organizationId),
    enabled: !!organizationId,
  });
  // Activities and hosts are org-unit-scoped at the API; an ingestion file can
  // span multiple units, so aggregate across every unit in the organization.
  const activitiesQuery = useQuery({
    queryKey: ['activities', 'all-units', organizationId],
    queryFn: async () => {
      const units = await schedulingApi.listOrgUnits(organizationId);
      const lists = await Promise.all(units.map((u) => schedulingApi.listActivities(u.id)));
      return lists.flat();
    },
    enabled: !!organizationId,
  });
  const hostsQuery = useQuery({
    queryKey: ['hosts', 'all-units', organizationId],
    queryFn: async () => {
      const units = await schedulingApi.listOrgUnits(organizationId);
      const lists = await Promise.all(units.map((u) => schedulingApi.listHosts(u.id)));
      return lists.flat();
    },
    enabled: !!organizationId,
  });
  const scheduleQuery = useQuery({
    queryKey: ['schedule', termId],
    queryFn: () => schedulingApi.getSchedule(termId),
    enabled: !!termId,
  });

  async function handleParse() {
    if (!file) return;
    setIsParsing(true);
    setParseError(null);
    setCommitResult(null);
    try {
      const parsed = await ingestionApi.parse(file, organizationId);
      setResult(parsed);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Parse failed');
    } finally {
      setIsParsing(false);
    }
  }

  function handleDraftChange(rowIndex: number, patch: Partial<DraftBooking>) {
    if (!result) return;
    setResult({
      ...result,
      draftBookings: result.draftBookings.map((d) => (d.rowIndex === rowIndex ? { ...d, ...patch } : d)),
    });
  }

  async function handleCommit() {
    if (!result || !termId) return;
    setIsCommitting(true);
    setCommitError(null);
    try {
      const commit = await ingestionApi.commit(termId, result.draftBookings);
      setCommitResult(commit);
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : 'Commit failed');
    } finally {
      setIsCommitting(false);
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] p-6">
      <AppHeader title="Schedule Ingestion" />

      <section className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
          File (.csv, .xlsx, .pdf)
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
              {result.draftBookings.length} row(s) parsed
            </p>
            <button
              type="button"
              onClick={handleCommit}
              disabled={isCommitting || result.draftBookings.length === 0 || !termId}
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

          <ReviewTable
            drafts={result.draftBookings}
            activities={activitiesQuery.data ?? []}
            hosts={hostsQuery.data ?? []}
            venues={venuesQuery.data ?? []}
            timeSlots={scheduleQuery.data?.timeSlots ?? []}
            onChange={handleDraftChange}
          />

          {commitError && <p className="text-sm text-[var(--fg-clash)]">{commitError}</p>}

          {commitResult && (
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 text-sm">
              <p className="text-[var(--fg-free-slot)]">
                Committed {commitResult.committed.length} booking(s)
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
              <button
                type="button"
                onClick={() => router.push('/schedule')}
                className="mt-3 rounded-md border border-[var(--border-default)] px-3 py-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
              >
                View schedule
              </button>
            </div>
          )}
        </section>
      )}

      {!unitsQuery.data && (
        <p className="mt-4 text-xs text-[var(--fg-muted)]">
          Pick an organization and term above before parsing a file.
        </p>
      )}
    </main>
  );
}
