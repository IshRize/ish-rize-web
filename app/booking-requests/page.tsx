/**
 * Module: Booking Requests inbox
 * Layer:  web-page (client)
 * Context: Stage 12 WS1 — coordinators review host booking requests
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Inbox, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { dayLabel } from '@/lib/dayNames';
import type { BookingRequest, BookingRequestStatus } from '@/types/scheduling';

const STATUS_STYLES: Record<BookingRequestStatus, { bg: string; fg: string; label: string }> = {
  PENDING: { bg: 'var(--bg-pending)', fg: 'var(--fg-pending)', label: 'Pending' },
  APPROVED: { bg: 'var(--bg-free-slot)', fg: 'var(--fg-free-slot)', label: 'Approved' },
  REJECTED: { bg: 'var(--bg-clash)', fg: 'var(--fg-clash)', label: 'Rejected' },
};

function StatusBadge({ status }: { status: BookingRequestStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      {status === 'PENDING' && <Clock size={12} />}
      {status === 'APPROVED' && <CheckCircle2 size={12} />}
      {status === 'REJECTED' && <XCircle size={12} />}
      {s.label}
    </span>
  );
}

type FilterStatus = 'ALL' | BookingRequestStatus;

export default function BookingRequestsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading, user, loadUser } = useAuthStore();
  const { organizationId, termId, setOrganizationId, setTermId } = useScheduleSelectionStore();

  const [filter, setFilter] = useState<FilterStatus>('PENDING');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => { loadUser(); }, [loadUser]);
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  const orgsQuery = useQuery({
    queryKey: ['organizations'],
    queryFn: schedulingApi.listOrganizations,
    enabled: isAuthenticated,
  });
  useEffect(() => {
    if (!organizationId && orgsQuery.data?.[0]) setOrganizationId(orgsQuery.data[0].id);
  }, [organizationId, orgsQuery.data, setOrganizationId]);

  const termsQuery = useQuery({
    queryKey: ['terms', organizationId],
    queryFn: () => schedulingApi.listTerms(organizationId),
    enabled: !!organizationId,
  });
  useEffect(() => {
    if (termsQuery.data?.length && !termsQuery.data.some((t) => t.id === termId)) {
      setTermId(termsQuery.data[0].id);
    }
  }, [termsQuery.data, termId, setTermId]);

  const requestsQuery = useQuery({
    queryKey: ['booking-requests', termId],
    queryFn: () => schedulingApi.listBookingRequests(termId),
    enabled: !!termId,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
      schedulingApi.reviewBookingRequest(id, {
        status,
        reviewNote: reviewNote.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-requests'] });
      setReviewingId(null);
      setReviewNote('');
    },
  });

  const isCoordinator = user?.role === 'ADMIN' || user?.role === 'LECTURER';

  const requests = requestsQuery.data ?? [];
  const filtered = filter === 'ALL' ? requests : requests.filter((r) => r.status === filter);

  if (authLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading&hellip;</p>
      </main>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Booking Requests" />

      <div className="mb-4 flex flex-wrap gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as FilterStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
              filter === s
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--fg-on-accent-primary)]'
                : 'border-[var(--border-default)] text-foreground hover:bg-[var(--bg-alternate)]'
            }`}
          >
            {s === 'ALL' ? 'All' : STATUS_STYLES[s].label}
            {s !== 'ALL' && (
              <span className="ml-1 opacity-70">
                ({requests.filter((r) => r.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {requestsQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !filtered.length ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Inbox size={48} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {filter === 'PENDING' ? 'No pending requests.' : 'No requests match this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <Card key={req.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {req.course.code} — {req.course.name}
                      </span>
                      <StatusBadge status={req.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {req.group.name} &middot; {dayLabel(req.timeSlot.dayOfWeek)} {req.timeSlot.startTime}–{req.timeSlot.endTime}
                      {req.venue && <> &middot; {req.venue.name}</>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested by <span className="font-medium text-foreground">{req.requestedBy.displayName}</span>
                      {' · '}
                      {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                    {req.reason && (
                      <p className="mt-1 text-xs italic text-muted-foreground">&ldquo;{req.reason}&rdquo;</p>
                    )}
                    {req.reviewNote && req.status !== 'PENDING' && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Review note: {req.reviewNote}
                        {req.reviewedBy && <> — {req.reviewedBy.displayName}</>}
                      </p>
                    )}
                  </div>

                  {req.status === 'PENDING' && isCoordinator && (
                    <div className="flex shrink-0 flex-col gap-2">
                      {reviewingId === req.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            placeholder="Note (optional)"
                            rows={2}
                            className="w-48 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:border-[var(--accent-primary)] focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => reviewMutation.mutate({ id: req.id, status: 'APPROVED' })}
                              disabled={reviewMutation.isPending}
                              className="bg-[var(--fg-free-slot)] text-white hover:bg-[var(--fg-free-slot)]/90"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => reviewMutation.mutate({ id: req.id, status: 'REJECTED' })}
                              disabled={reviewMutation.isPending}
                            >
                              Reject
                            </Button>
                          </div>
                          {reviewMutation.isError && (
                            <p className="text-xs text-[var(--fg-clash)]">
                              {(reviewMutation.error as Error).message}
                            </p>
                          )}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setReviewingId(req.id); setReviewNote(''); }}
                        >
                          Review
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
