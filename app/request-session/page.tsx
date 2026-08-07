/**
 * Module: Request Extra Session page
 * Layer:  web-page (client)
 * Context: Stage 12 WS1 — hosts request additional sessions for their groups
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarPlus,
  Clock,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { dayLabel } from '@/lib/dayNames';
import type { TimeSlot, VenueSummary } from '@/types/scheduling';

function slotLabel(slot: TimeSlot): string {
  return `${dayLabel(slot.dayOfWeek)} · ${slot.startTime}–${slot.endTime}`;
}

export default function RequestSessionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, termId, setOrganizationId, setTermId } = useScheduleSelectionStore();

  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

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

  const myHostQuery = useQuery({
    queryKey: ['my-host'],
    queryFn: () => schedulingApi.getMyHost(),
    enabled: !!isAuthenticated,
  });

  const loadQuery = useQuery({
    queryKey: ['my-teaching-load', termId],
    queryFn: () => schedulingApi.getMyTeachingLoad(termId),
    enabled: !!termId,
  });

  const freeSlotsQuery = useQuery({
    queryKey: ['free-slots-group', selectedGroupId],
    queryFn: () => schedulingApi.getFreeSlotsForGroup(selectedGroupId),
    enabled: !!selectedGroupId,
  });

  const freeVenuesQuery = useQuery({
    queryKey: ['free-venues', selectedSlotId],
    queryFn: () => schedulingApi.getFreeVenues({ slotId: selectedSlotId }),
    enabled: !!selectedSlotId,
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      schedulingApi.createBookingRequest({
        organizationId,
        termId,
        groupId: selectedGroupId,
        courseId: selectedCourseId,
        timeSlotId: selectedSlotId,
        venueId: selectedVenueId || undefined,
        reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['booking-requests'] });
    },
  });

  const groups = loadQuery.data?.groups ?? [];

  useEffect(() => {
    setSelectedSlotId('');
    setSelectedVenueId('');
    setSelectedCourseId('');
  }, [selectedGroupId]);

  useEffect(() => {
    setSelectedVenueId('');
  }, [selectedSlotId]);

  if (authLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading&hellip;</p>
      </main>
    );
  }

  if (!myHostQuery.isLoading && !myHostQuery.data) {
    return (
      <AppShell>
        <PageHeader title="Request Extra Session" />
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <CalendarPlus size={48} className="text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">No teaching record</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            You need a host profile to request sessions. Contact your coordinator.
          </p>
        </div>
      </AppShell>
    );
  }

  if (submitted) {
    return (
      <AppShell>
        <PageHeader title="Request Extra Session" />
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <CheckCircle2 size={48} className="text-[var(--fg-free-slot)]" />
          <h2 className="text-lg font-semibold text-foreground">Request submitted</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Your coordinator will review it and you&apos;ll see the result on your timetable once approved.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setSubmitted(false); setSelectedGroupId(''); setReason(''); }}>
              Request another
            </Button>
            <Button asChild>
              <a href="/host-dashboard">Back to Dashboard</a>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Request Extra Session" />

      <div className="space-y-6">
        {/* Step 1 — pick group */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">1. Select group</CardTitle>
          </CardHeader>
          <CardContent>
            {loadQuery.isLoading ? (
              <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-3/4" /></div>
            ) : !groups.length ? (
              <p className="text-sm text-muted-foreground">You have no assigned groups this term.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <button
                    key={g.groupId}
                    onClick={() => setSelectedGroupId(g.groupId)}
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      selectedGroupId === g.groupId
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--fg-on-accent-primary)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-foreground hover:bg-[var(--bg-alternate)]'
                    }`}
                  >
                    {g.name}
                    <span className="ml-1.5 text-xs opacity-70">{g.department}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2 — pick course (from group's linked courses) */}
        {selectedGroupId && (
          <CourseSelector
            termId={termId}
            groupId={selectedGroupId}
            selectedCourseId={selectedCourseId}
            onSelect={setSelectedCourseId}
          />
        )}

        {/* Step 3 — pick free slot */}
        {selectedGroupId && selectedCourseId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Clock size={16} />
                3. Pick a free slot
              </CardTitle>
            </CardHeader>
            <CardContent>
              {freeSlotsQuery.isLoading ? (
                <div className="space-y-2"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-2/3" /></div>
              ) : !freeSlotsQuery.data?.length ? (
                <p className="text-sm text-muted-foreground">No free slots for this group.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {freeSlotsQuery.data.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`rounded-md border px-2 py-1.5 text-xs tabular-nums transition-colors ${
                        selectedSlotId === slot.id
                          ? 'border-[var(--fg-free-slot)] bg-[var(--bg-free-slot)] text-[var(--fg-free-slot)] font-medium'
                          : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-foreground hover:bg-[var(--bg-free-slot)]/30'
                      }`}
                    >
                      {slotLabel(slot)}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4 — optionally pick venue */}
        {selectedSlotId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MapPin size={16} />
                4. Preferred venue (optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {freeVenuesQuery.isLoading ? (
                <Skeleton className="h-6 w-full" />
              ) : !freeVenuesQuery.data?.length ? (
                <p className="text-sm text-muted-foreground">No free venues at this slot.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedVenueId('')}
                    className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                      !selectedVenueId
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                        : 'border-[var(--border-default)] text-foreground hover:bg-[var(--bg-alternate)]'
                    }`}
                  >
                    No preference
                  </button>
                  {freeVenuesQuery.data.map((v: VenueSummary) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVenueId(v.id)}
                      className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                        selectedVenueId === v.id
                          ? 'border-[var(--fg-free-slot)] bg-[var(--bg-free-slot)] text-[var(--fg-free-slot)] font-medium'
                          : 'border-[var(--border-default)] text-foreground hover:bg-[var(--bg-alternate)]'
                      }`}
                    >
                      {v.name}
                      <span className="ml-1 opacity-60">({v.capacity})</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 5 — reason + submit */}
        {selectedSlotId && selectedCourseId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">5. Reason (optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Need an extra tutorial for revision week"
                rows={3}
                className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? 'Submitting…' : 'Submit Request'}
                </Button>
                {submitMutation.isError && (
                  <p className="text-sm text-[var(--fg-clash)]">
                    {(submitMutation.error as Error).message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function CourseSelector({
  termId,
  groupId,
  selectedCourseId,
  onSelect,
}: {
  termId: string;
  groupId: string;
  selectedCourseId: string;
  onSelect: (id: string) => void;
}) {
  const groupsQuery = useQuery({
    queryKey: ['groups', termId],
    queryFn: () => schedulingApi.listGroups(termId),
    enabled: !!termId,
  });

  const group = groupsQuery.data?.find((g) => g.id === groupId);
  const courseIds = group?.courseLinks.map((cl) => cl.courseId) ?? [];

  const activitiesQuery = useQuery({
    queryKey: ['activities-for-group', groupId, termId],
    queryFn: async () => {
      if (!group?.orgUnitId) return [];
      const all = await schedulingApi.listActivities(group.orgUnitId);
      return all.filter((a) => courseIds.includes(a.id));
    },
    enabled: !!group,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">2. Select activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activitiesQuery.isLoading || groupsQuery.isLoading ? (
          <Skeleton className="h-8 w-full" />
        ) : !activitiesQuery.data?.length ? (
          <p className="text-sm text-muted-foreground">No activities linked to this group.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activitiesQuery.data.map((a) => (
              <button
                key={a.id}
                onClick={() => onSelect(a.id)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  selectedCourseId === a.id
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--fg-on-accent-primary)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-foreground hover:bg-[var(--bg-alternate)]'
                }`}
              >
                {a.code} — {a.name}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
