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
  BookOpen,
  Loader2,
} from 'lucide-react';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import type { Course } from '@/types/scheduling';
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

const ACTIVITY_KINDS = [
  { value: 'COURSE', label: 'Course' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'SESSION', label: 'Session' },
];

const COURSE_TYPES = [
  { value: 'NONE', label: 'None' },
  { value: 'CORE', label: 'Core' },
  { value: 'ELECTIVE', label: 'Elective' },
];

export default function ActivitiesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, setOrganizationId } = useScheduleSelectionStore();

  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formKind, setFormKind] = useState('COURSE');
  const [formCourseType, setFormCourseType] = useState('NONE');
  const [formLevel, setFormLevel] = useState('');
  const [formExpectedSize, setFormExpectedSize] = useState('');

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

  const coursesQuery = useQuery({
    queryKey: ['courses', organizationId],
    queryFn: () => schedulingApi.listCourses(organizationId),
    enabled: !!organizationId,
  });

  const orgUnitsQuery = useQuery({
    queryKey: ['orgUnits', organizationId],
    queryFn: () => schedulingApi.listOrgUnits(organizationId),
    enabled: !!organizationId,
  });

  const [formOrgUnitId, setFormOrgUnitId] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      schedulingApi.createCourse({
        code: formCode.trim(),
        name: formName.trim(),
        orgUnitId: formOrgUnitId,
        kind: formKind,
        courseType: formCourseType,
        level: formLevel ? parseInt(formLevel, 10) : undefined,
        expectedSize: formExpectedSize ? parseInt(formExpectedSize, 10) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', organizationId] });
      toast.success('Activity created');
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      schedulingApi.updateCourse(editingCourse!.id, {
        name: formName.trim(),
        code: formCode.trim(),
        kind: formKind,
        courseType: formCourseType,
        level: formLevel ? parseInt(formLevel, 10) : undefined,
        expectedSize: formExpectedSize ? parseInt(formExpectedSize, 10) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', organizationId] });
      toast.success('Activity updated');
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (courseId: string) => schedulingApi.deleteCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', organizationId] });
      toast.success('Activity deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditingCourse(null);
    setFormCode('');
    setFormName('');
    setFormKind('COURSE');
    setFormCourseType('NONE');
    setFormLevel('');
    setFormExpectedSize('');
    setFormOrgUnitId(orgUnitsQuery.data?.[0]?.id ?? '');
    setDialogOpen(true);
  }

  function openEdit(course: Course) {
    setEditingCourse(course);
    setFormCode(course.code);
    setFormName(course.name);
    setFormKind(course.kind);
    setFormCourseType(course.courseType);
    setFormLevel(course.level != null ? String(course.level) : '');
    setFormExpectedSize(course.expectedSize != null ? String(course.expectedSize) : '');
    setFormOrgUnitId(course.orgUnitId ?? '');
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingCourse(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim()) return;
    if (editingCourse) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  }

  const courses = (coursesQuery.data ?? []).filter((c) => {
    if (kindFilter !== 'all' && c.kind !== kindFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.code.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (authLoading || !isAuthenticated) return null;

  return (
    <AppShell>
      <PageHeader title="Activities" description={`${coursesQuery.data?.length ?? 0} activities in your organization`}>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-2" />
          Add Activity
        </Button>
      </PageHeader>

      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Kind" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All kinds</SelectItem>
              {ACTIVITY_KINDS.map((k) => (
                <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {coursesQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : courses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <BookOpen size={48} className="mx-auto mb-3 text-muted-foreground/40" />
                    <p className="font-medium text-foreground">
                      {search || kindFilter !== 'all' ? 'No activities match your filters' : 'No activities yet'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {search || kindFilter !== 'all'
                        ? 'Try adjusting your search or filters.'
                        : 'Add your first activity to start scheduling.'}
                    </p>
                    {!search && kindFilter === 'all' && (
                      <Button variant="outline" className="mt-4" onClick={openCreate}>
                        <Plus size={16} className="mr-2" />
                        Add Activity
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-mono text-sm font-medium text-foreground">{course.code}</TableCell>
                    <TableCell className="text-foreground">{course.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{course.kind}</Badge>
                    </TableCell>
                    <TableCell>
                      {course.courseType !== 'NONE' && (
                        <Badge variant="outline">{course.courseType}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {course.level ?? '—'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(course)}>
                            <Pencil size={14} className="mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(course.id)}
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
            <DialogTitle>{editingCourse ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
            <DialogDescription>
              {editingCourse ? 'Update activity details.' : 'Add a new activity to your organization.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="course-code">Code</Label>
                <Input
                  id="course-code"
                  placeholder="e.g. MATH 101"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-name">Name</Label>
                <Input
                  id="course-name"
                  placeholder="e.g. Calculus I"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kind</Label>
                <Select value={formKind} onValueChange={setFormKind}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Course Type</Label>
                <Select value={formCourseType} onValueChange={setFormCourseType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COURSE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!editingCourse && orgUnitsQuery.data && orgUnitsQuery.data.length > 0 && (
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="course-level">Level <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  id="course-level"
                  type="number"
                  min={1}
                  placeholder="e.g. 100"
                  value={formLevel}
                  onChange={(e) => setFormLevel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-size">Expected Size <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  id="course-size"
                  type="number"
                  min={1}
                  placeholder="e.g. 150"
                  value={formExpectedSize}
                  onChange={(e) => setFormExpectedSize(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingCourse ? 'Save' : 'Add Activity'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
