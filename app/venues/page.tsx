'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Archive,
  ArchiveRestore,
  MapPin,
  Loader2,
} from 'lucide-react';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import type { VenueSummary, VenueType } from '@/types/scheduling';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
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

const VENUE_TYPES: { value: VenueType; label: string }[] = [
  { value: 'LECTURE_HALL', label: 'Lecture Hall' },
  { value: 'LAB', label: 'Lab' },
  { value: 'SEMINAR_ROOM', label: 'Seminar Room' },
  { value: 'UNIT_ROOM', label: 'Unit Room' },
  { value: 'ONLINE', label: 'Online' },
];

function venueTypeLabel(type: string) {
  return VENUE_TYPES.find((t) => t.value === type)?.label ?? type;
}

export default function VenuesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, setOrganizationId } = useScheduleSelectionStore();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<VenueSummary | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<VenueType>('LECTURE_HALL');
  const [formCapacity, setFormCapacity] = useState('');

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

  const venuesQuery = useQuery({
    queryKey: ['venues', organizationId],
    queryFn: () => schedulingApi.listVenues(organizationId),
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      schedulingApi.createVenue({
        organizationId,
        name: formName.trim(),
        type: formType,
        capacity: formCapacity ? parseInt(formCapacity, 10) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues', organizationId] });
      toast.success('Venue created');
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      schedulingApi.updateVenue(editingVenue!.id, {
        name: formName.trim(),
        type: formType,
        capacity: formCapacity ? parseInt(formCapacity, 10) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues', organizationId] });
      toast.success('Venue updated');
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      schedulingApi.updateVenue(id, { archived }),
    onSuccess: (_, { archived }) => {
      queryClient.invalidateQueries({ queryKey: ['venues', organizationId] });
      toast.success(archived ? 'Venue archived' : 'Venue restored');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditingVenue(null);
    setFormName('');
    setFormType('LECTURE_HALL');
    setFormCapacity('');
    setDialogOpen(true);
  }

  function openEdit(venue: VenueSummary) {
    setEditingVenue(venue);
    setFormName(venue.name);
    setFormType(venue.type as VenueType);
    setFormCapacity(String(venue.capacity || ''));
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingVenue(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    if (editingVenue) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  }

  const venues = (venuesQuery.data ?? []).filter((v) => {
    if (typeFilter !== 'all' && v.type !== typeFilter) return false;
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (authLoading || !isAuthenticated) return null;

  return (
    <AppShell>
      <PageHeader title="Venues" description={`${venuesQuery.data?.length ?? 0} venues in your organization`}>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-2" />
          Add Venue
        </Button>
      </PageHeader>

      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search venues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {VENUE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {venuesQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : venues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center">
                    <MapPin size={48} className="mx-auto mb-3 text-muted-foreground/40" />
                    <p className="font-medium text-foreground">
                      {search || typeFilter !== 'all' ? 'No venues match your filters' : 'No venues yet'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {search || typeFilter !== 'all'
                        ? 'Try adjusting your search or filters.'
                        : 'Add your first venue to start scheduling.'}
                    </p>
                    {!search && typeFilter === 'all' && (
                      <Button variant="outline" className="mt-4" onClick={openCreate}>
                        <Plus size={16} className="mr-2" />
                        Add Venue
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                venues.map((venue) => (
                  <TableRow key={venue.id}>
                    <TableCell className="font-medium text-foreground">{venue.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{venueTypeLabel(venue.type)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {venue.capacity > 0 ? venue.capacity : '—'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(venue)}>
                            <Pencil size={14} className="mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => archiveMutation.mutate({ id: venue.id, archived: true })}>
                            <Archive size={14} className="mr-2" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVenue ? 'Edit Venue' : 'Add Venue'}</DialogTitle>
            <DialogDescription>
              {editingVenue ? 'Update venue details.' : 'Add a new venue to your organization.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="venue-name">Name</Label>
              <Input
                id="venue-name"
                placeholder="e.g. N1, JQB 12"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as VenueType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VENUE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue-capacity">Capacity <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="venue-capacity"
                type="number"
                min={0}
                placeholder="e.g. 100"
                value={formCapacity}
                onChange={(e) => setFormCapacity(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingVenue ? 'Save' : 'Add Venue'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
