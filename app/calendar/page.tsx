'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { schedulingApi, orgApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import type { Calendar, Term, TimeSlot, TermType } from '@/types/scheduling';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const TERM_TYPES: { value: TermType; label: string }[] = [
  { value: 'SEMESTER', label: 'Semester' },
  { value: 'TRIMESTER', label: 'Trimester' },
  { value: 'QUARTER', label: 'Quarter' },
  { value: 'TERM', label: 'Term' },
  { value: 'SEASON', label: 'Season' },
];

const DAY_OPTIONS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isTermActive(term: Term) {
  const now = Date.now();
  return new Date(term.startDate).getTime() <= now && now <= new Date(term.endDate).getTime();
}

export default function CalendarPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, setOrganizationId } = useScheduleSelectionStore();

  const [expandedCalendar, setExpandedCalendar] = useState<string | null>(null);

  // Calendar dialog
  const [calDialogOpen, setCalDialogOpen] = useState(false);
  const [editingCal, setEditingCal] = useState<Calendar | null>(null);
  const [calLabel, setCalLabel] = useState('');
  const [calStart, setCalStart] = useState('');
  const [calEnd, setCalEnd] = useState('');

  // Term dialog
  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [termCalendarId, setTermCalendarId] = useState('');
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [termName, setTermName] = useState('');
  const [termType, setTermType] = useState<TermType>('SEMESTER');
  const [termStart, setTermStart] = useState('');
  const [termEnd, setTermEnd] = useState('');
  const [termWeeks, setTermWeeks] = useState('');

  // Time slot dialog
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [slotDay, setSlotDay] = useState('MON');
  const [slotStart, setSlotStart] = useState('');
  const [slotEnd, setSlotEnd] = useState('');
  const [slotLabel, setSlotLabel] = useState('');

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

  const calendarsQuery = useQuery({
    queryKey: ['calendars', organizationId],
    queryFn: () => orgApi.listCalendars(organizationId),
    enabled: !!organizationId,
  });

  const timeSlotsQuery = useQuery({
    queryKey: ['timeSlots', organizationId],
    queryFn: () => orgApi.listTimeSlots(organizationId),
    enabled: !!organizationId,
  });

  // Auto-expand first calendar
  useEffect(() => {
    if (!expandedCalendar && calendarsQuery.data?.[0]) {
      setExpandedCalendar(calendarsQuery.data[0].id);
    }
  }, [expandedCalendar, calendarsQuery.data]);

  // Calendar mutations
  const createCalMutation = useMutation({
    mutationFn: () => orgApi.createCalendar(organizationId, { label: calLabel.trim(), startDate: calStart, endDate: calEnd }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars', organizationId] });
      toast.success('Calendar created');
      setCalDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateCalMutation = useMutation({
    mutationFn: () => orgApi.updateCalendar(organizationId, editingCal!.id, { label: calLabel.trim(), startDate: calStart, endDate: calEnd }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars', organizationId] });
      toast.success('Calendar updated');
      setCalDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Term mutations
  const createTermMutation = useMutation({
    mutationFn: () =>
      orgApi.createTerm(organizationId, termCalendarId, {
        name: termName.trim(),
        type: termType,
        startDate: termStart,
        endDate: termEnd,
        teachingWeeks: termWeeks ? parseInt(termWeeks, 10) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars', organizationId] });
      toast.success('Term created');
      setTermDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateTermMutation = useMutation({
    mutationFn: () =>
      orgApi.updateTerm(organizationId, editingTerm!.id, {
        name: termName.trim(),
        type: termType,
        startDate: termStart,
        endDate: termEnd,
        teachingWeeks: termWeeks ? parseInt(termWeeks, 10) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars', organizationId] });
      toast.success('Term updated');
      setTermDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Time slot mutations
  const createSlotMutation = useMutation({
    mutationFn: () =>
      orgApi.createTimeSlot(organizationId, {
        dayOfWeek: slotDay,
        startTime: slotStart,
        endTime: slotEnd,
        label: slotLabel || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeSlots', organizationId] });
      toast.success('Time slot created');
      setSlotDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateSlotMutation = useMutation({
    mutationFn: () =>
      orgApi.updateTimeSlot(organizationId, editingSlot!.id, {
        startTime: slotStart,
        endTime: slotEnd,
        label: slotLabel || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeSlots', organizationId] });
      toast.success('Time slot updated');
      setSlotDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteSlotMutation = useMutation({
    mutationFn: (slotId: string) => orgApi.deleteTimeSlot(organizationId, slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeSlots', organizationId] });
      toast.success('Time slot deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreateCalendar() {
    setEditingCal(null);
    setCalLabel('');
    setCalStart('');
    setCalEnd('');
    setCalDialogOpen(true);
  }

  function openEditCalendar(cal: Calendar) {
    setEditingCal(cal);
    setCalLabel(cal.label);
    setCalStart(cal.startDate.slice(0, 10));
    setCalEnd(cal.endDate.slice(0, 10));
    setCalDialogOpen(true);
  }

  function openCreateTerm(calendarId: string) {
    setEditingTerm(null);
    setTermCalendarId(calendarId);
    setTermName('');
    setTermType('SEMESTER');
    setTermStart('');
    setTermEnd('');
    setTermWeeks('');
    setTermDialogOpen(true);
  }

  function openEditTerm(term: Term) {
    setEditingTerm(term);
    setTermCalendarId(term.calendarId);
    setTermName(term.name);
    setTermType(term.type as TermType);
    setTermStart(term.startDate.slice(0, 10));
    setTermEnd(term.endDate.slice(0, 10));
    setTermWeeks('');
    setTermDialogOpen(true);
  }

  function openCreateSlot() {
    setEditingSlot(null);
    setSlotDay('MON');
    setSlotStart('');
    setSlotEnd('');
    setSlotLabel('');
    setSlotDialogOpen(true);
  }

  function openEditSlot(slot: TimeSlot) {
    setEditingSlot(slot);
    setSlotDay(slot.dayOfWeek);
    setSlotStart(slot.startTime);
    setSlotEnd(slot.endTime);
    setSlotLabel(slot.label ?? '');
    setSlotDialogOpen(true);
  }

  // Group time slots by day
  const slotsByDay = (timeSlotsQuery.data ?? []).reduce<Record<string, TimeSlot[]>>((acc, slot) => {
    (acc[slot.dayOfWeek] ??= []).push(slot);
    return acc;
  }, {});

  if (authLoading || !isAuthenticated) return null;

  return (
    <AppShell>
      <PageHeader title="Calendar" description="Academic years, terms, and time slots">
        <Button onClick={openCreateCalendar}>
          <Plus size={16} className="mr-2" />
          New Calendar
        </Button>
      </PageHeader>

      <div className="space-y-8">
        {/* Calendars & Terms */}
        <div className="space-y-4">
          {calendarsQuery.isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}><CardContent className="py-6"><Skeleton className="h-6 w-48" /><Skeleton className="mt-3 h-16 w-full" /></CardContent></Card>
            ))
          ) : (calendarsQuery.data ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarIcon size={48} className="mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-medium text-foreground">No academic calendars yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Create your first calendar to define terms.</p>
                <Button variant="outline" className="mt-4" onClick={openCreateCalendar}>
                  <Plus size={16} className="mr-2" />
                  New Calendar
                </Button>
              </CardContent>
            </Card>
          ) : (
            (calendarsQuery.data ?? []).map((cal) => {
              const expanded = expandedCalendar === cal.id;
              const terms = cal.terms ?? [];
              return (
                <Card key={cal.id}>
                  <CardHeader className="cursor-pointer pb-3" onClick={() => setExpandedCalendar(expanded ? null : cal.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        <CardTitle className="text-base">{cal.label}</CardTitle>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(cal.startDate)} – {formatDate(cal.endDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => openCreateTerm(cal.id)}>
                          <Plus size={14} className="mr-1" />
                          Term
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditCalendar(cal)}>
                          <Pencil size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {expanded && (
                    <CardContent className="pt-0">
                      {terms.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">No terms in this calendar yet.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Period</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="w-[50px]" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {terms.map((term) => (
                              <TableRow key={term.id}>
                                <TableCell className="font-medium text-foreground">{term.name}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{term.type}</Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {formatDate(term.startDate)} – {formatDate(term.endDate)}
                                </TableCell>
                                <TableCell>
                                  {isTermActive(term) ? (
                                    <Badge variant="default">Active</Badge>
                                  ) : new Date(term.startDate) > new Date() ? (
                                    <Badge variant="outline">Upcoming</Badge>
                                  ) : (
                                    <Badge variant="secondary">Past</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTerm(term)}>
                                    <Pencil size={14} />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* Time Slots */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Time Slots</h2>
            <Button variant="outline" size="sm" onClick={openCreateSlot}>
              <Plus size={14} className="mr-1" />
              Add Slot
            </Button>
          </div>

          {timeSlotsQuery.isLoading ? (
            <Card><CardContent className="py-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ) : Object.keys(slotsByDay).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock size={48} className="mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-medium text-foreground">No time slots defined</p>
                <p className="mt-1 text-sm text-muted-foreground">Add time slots to structure your schedule grid.</p>
                <Button variant="outline" className="mt-4" onClick={openCreateSlot}>
                  <Plus size={16} className="mr-2" />
                  Add Slot
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DAY_OPTIONS.filter((d) => slotsByDay[d]).flatMap((day) =>
                    slotsByDay[day]
                      .sort((a, b) => a.orderIndex - b.orderIndex)
                      .map((slot, i) => (
                        <TableRow key={slot.id}>
                          {i === 0 ? (
                            <TableCell rowSpan={slotsByDay[day].length} className="font-medium text-foreground align-top border-r border-border">
                              {day}
                            </TableCell>
                          ) : null}
                          <TableCell className="font-mono text-sm">
                            {slot.startTime} – {slot.endTime}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {slot.label || '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSlot(slot)}>
                                <Pencil size={14} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSlotMutation.mutate(slot.id)}>
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>

      {/* Calendar Dialog */}
      <Dialog open={calDialogOpen} onOpenChange={setCalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCal ? 'Edit Calendar' : 'New Calendar'}</DialogTitle>
            <DialogDescription>
              {editingCal ? 'Update academic calendar details.' : 'Create an academic year calendar.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); editingCal ? updateCalMutation.mutate() : createCalMutation.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cal-label">Label</Label>
              <Input id="cal-label" placeholder="e.g. 2025-2026" value={calLabel} onChange={(e) => setCalLabel(e.target.value)} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cal-start">Start Date</Label>
                <Input id="cal-start" type="date" value={calStart} onChange={(e) => setCalStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cal-end">End Date</Label>
                <Input id="cal-end" type="date" value={calEnd} onChange={(e) => setCalEnd(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setCalDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createCalMutation.isPending || updateCalMutation.isPending}>
                {(createCalMutation.isPending || updateCalMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCal ? 'Save' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Term Dialog */}
      <Dialog open={termDialogOpen} onOpenChange={setTermDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTerm ? 'Edit Term' : 'New Term'}</DialogTitle>
            <DialogDescription>
              {editingTerm ? 'Update term details.' : 'Add a term to this calendar.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); editingTerm ? updateTermMutation.mutate() : createTermMutation.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="term-name">Name</Label>
              <Input id="term-name" placeholder="e.g. Semester 1" value={termName} onChange={(e) => setTermName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={termType} onValueChange={(v) => setTermType(v as TermType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TERM_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="term-start">Start Date</Label>
                <Input id="term-start" type="date" value={termStart} onChange={(e) => setTermStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="term-end">End Date</Label>
                <Input id="term-end" type="date" value={termEnd} onChange={(e) => setTermEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="term-weeks">Teaching Weeks <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="term-weeks" type="number" min={1} placeholder="e.g. 14" value={termWeeks} onChange={(e) => setTermWeeks(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setTermDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createTermMutation.isPending || updateTermMutation.isPending}>
                {(createTermMutation.isPending || updateTermMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTerm ? 'Save' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Time Slot Dialog */}
      <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}</DialogTitle>
            <DialogDescription>Define a period in the schedule grid.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); editingSlot ? updateSlotMutation.mutate() : createSlotMutation.mutate(); }} className="space-y-4">
            {!editingSlot && (
              <div className="space-y-2">
                <Label>Day</Label>
                <Select value={slotDay} onValueChange={setSlotDay}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAY_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slot-start">Start</Label>
                <Input id="slot-start" type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slot-end">End</Label>
                <Input id="slot-end" type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-label">Label <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="slot-label" placeholder="e.g. Period 1" value={slotLabel} onChange={(e) => setSlotLabel(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setSlotDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createSlotMutation.isPending || updateSlotMutation.isPending}>
                {(createSlotMutation.isPending || updateSlotMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingSlot ? 'Save' : 'Add'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
