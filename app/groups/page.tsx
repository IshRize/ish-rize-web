'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Layers,
  Loader2,
} from 'lucide-react';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import type { GroupSummary } from '@/types/scheduling';
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
  DropdownMenuSeparator,
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

export default function GroupsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, termId, setOrganizationId, setTermId } = useScheduleSelectionStore();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupSummary | null>(null);

  const [formName, setFormName] = useState('');
  const [formOrgUnitId, setFormOrgUnitId] = useState('');

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
  }, [termId, termsQuery.data, setTermId]);

  const orgUnitsQuery = useQuery({
    queryKey: ['orgUnits', organizationId],
    queryFn: () => schedulingApi.listOrgUnits(organizationId),
    enabled: !!organizationId,
  });

  const groupsQuery = useQuery({
    queryKey: ['groups', termId],
    queryFn: () => schedulingApi.listGroups(termId),
    enabled: !!termId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      schedulingApi.createGroup({
        termId,
        orgUnitId: formOrgUnitId,
        name: formName.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', termId] });
      toast.success('Group created');
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      schedulingApi.updateGroup(editingGroup!.id, { name: formName.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', termId] });
      toast.success('Group updated');
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (groupId: string) => schedulingApi.deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', termId] });
      toast.success('Group deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditingGroup(null);
    setFormName('');
    setFormOrgUnitId(orgUnitsQuery.data?.[0]?.id ?? '');
    setDialogOpen(true);
  }

  function openEdit(group: GroupSummary) {
    setEditingGroup(group);
    setFormName(group.name);
    setFormOrgUnitId(group.orgUnitId);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingGroup(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    if (editingGroup) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  }

  const groups = (groupsQuery.data ?? []).filter((g) => {
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const orgUnitMap = new Map((orgUnitsQuery.data ?? []).map((u) => [u.id, u.name]));

  if (authLoading || !isAuthenticated) return null;

  return (
    <AppShell>
      <PageHeader title="Groups" description={`${groupsQuery.data?.length ?? 0} groups this term`}>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-2" />
          Add Group
        </Button>
      </PageHeader>

      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {termsQuery.data && termsQuery.data.length > 1 && (
            <Select value={termId} onValueChange={setTermId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                {termsQuery.data.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Courses</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupsQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center">
                    <Layers size={48} className="mx-auto mb-3 text-muted-foreground/40" />
                    <p className="font-medium text-foreground">
                      {search ? 'No groups match your search' : 'No groups yet'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {search
                        ? 'Try adjusting your search.'
                        : 'Create your first group to organize activities.'}
                    </p>
                    {!search && (
                      <Button variant="outline" className="mt-4" onClick={openCreate}>
                        <Plus size={16} className="mr-2" />
                        Add Group
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium text-foreground">{group.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {orgUnitMap.get(group.orgUnitId) ?? '—'}
                    </TableCell>
                    <TableCell>
                      {group.courseLinks.length > 0 ? (
                        <Badge variant="secondary">{group.courseLinks.length} linked</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(group)}>
                            <Pencil size={14} className="mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(group.id)}
                          >
                            <Trash2 size={14} className="mr-2" />
                            Delete
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
            <DialogTitle>{editingGroup ? 'Edit Group' : 'Add Group'}</DialogTitle>
            <DialogDescription>
              {editingGroup ? 'Update group details.' : 'Create a new group for this term.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Name</Label>
              <Input
                id="group-name"
                placeholder="e.g. Year 1 Group A"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>
            {!editingGroup && orgUnitsQuery.data && orgUnitsQuery.data.length > 0 && (
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={formOrgUnitId} onValueChange={setFormOrgUnitId}>
                  <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>
                    {orgUnitsQuery.data.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingGroup ? 'Save' : 'Add Group'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
