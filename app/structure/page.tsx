'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  Network,
  ChevronDown,
  ChevronRight,
  Loader2,
  UserPlus,
} from 'lucide-react';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import type { OrgUnit, CoordinatorAssignment } from '@/types/scheduling';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

function buildTree(units: OrgUnit[]): (OrgUnit & { children: OrgUnit[] })[] {
  const map = new Map<string | null, OrgUnit[]>();
  for (const u of units) {
    const parentKey = u.parentId ?? null;
    if (!map.has(parentKey)) map.set(parentKey, []);
    map.get(parentKey)!.push(u);
  }

  function gather(parentId: string | null): (OrgUnit & { children: OrgUnit[] })[] {
    const children = map.get(parentId) ?? [];
    return children
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((u) => ({ ...u, children: gather(u.id) as OrgUnit[] }));
  }

  return gather(null);
}

function TreeNode({
  node,
  coordinators,
  expanded,
  toggleExpand,
  onEdit,
  onArchive,
  onAddChild,
  depth = 0,
}: {
  node: OrgUnit & { children: OrgUnit[] };
  coordinators: CoordinatorAssignment[];
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  onEdit: (unit: OrgUnit) => void;
  onArchive: (unit: OrgUnit) => void;
  onAddChild: (parentId: string) => void;
  depth?: number;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const unitCoords = coordinators.filter((c) => c.orgUnit.id === node.id && !c.revokedAt);

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        <button
          type="button"
          onClick={() => hasChildren && toggleExpand(node.id)}
          className="flex h-5 w-5 shrink-0 items-center justify-center"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          ) : (
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
          )}
        </button>

        <div className="flex flex-1 items-center gap-2 min-w-0">
          <span className="font-medium text-foreground truncate">{node.name}</span>
          <Badge variant="outline" className="shrink-0 text-xs">{node.unitType}</Badge>
          {node.archived && <Badge variant="secondary" className="shrink-0 text-xs">Archived</Badge>}
          {unitCoords.length > 0 && (
            <span className="text-xs text-muted-foreground shrink-0">
              {unitCoords.map((c) => `${c.user.firstName} ${c.user.lastName}`).join(', ')}
            </span>
          )}
        </div>

        <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddChild(node.id)} title="Add child">
            <Plus size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(node)} title="Edit">
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onArchive(node)} title={node.archived ? 'Restore' : 'Archive'}>
            {node.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
          </Button>
        </div>
      </div>

      {isExpanded && node.children.length > 0 && (
        <div>
          {(node.children as (OrgUnit & { children: OrgUnit[] })[]).map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              coordinators={coordinators}
              expanded={expanded}
              toggleExpand={toggleExpand}
              onEdit={onEdit}
              onArchive={onArchive}
              onAddChild={onAddChild}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function StructurePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, setOrganizationId } = useScheduleSelectionStore();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<OrgUnit | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formUnitType, setFormUnitType] = useState('Department');

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

  const unitsQuery = useQuery({
    queryKey: ['orgUnits', organizationId, true],
    queryFn: () => schedulingApi.listOrgUnits(organizationId, true),
    enabled: !!organizationId,
  });

  const coordinatorsQuery = useQuery({
    queryKey: ['coordinators', organizationId],
    queryFn: () => schedulingApi.listCoordinatorAssignments(organizationId),
    enabled: !!organizationId,
  });

  // Auto-expand root level
  useEffect(() => {
    if (unitsQuery.data && expanded.size === 0) {
      const roots = unitsQuery.data.filter((u) => !u.parentId);
      setExpanded(new Set(roots.map((u) => u.id)));
    }
  }, [unitsQuery.data, expanded.size]);

  const createMutation = useMutation({
    mutationFn: () =>
      schedulingApi.createOrgUnit({
        organizationId,
        parentId,
        name: formName.trim(),
        unitType: formUnitType,
      }),
    onSuccess: (newUnit) => {
      queryClient.invalidateQueries({ queryKey: ['orgUnits', organizationId] });
      toast.success('Unit created');
      if (parentId) setExpanded((prev) => new Set([...prev, parentId!]));
      setDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      schedulingApi.updateOrgUnit(editingUnit!.id, {
        name: formName.trim(),
        unitType: formUnitType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgUnits', organizationId] });
      toast.success('Unit updated');
      setDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (unit: OrgUnit) =>
      schedulingApi.updateOrgUnit(unit.id, { archived: !unit.archived }),
    onSuccess: (_, unit) => {
      queryClient.invalidateQueries({ queryKey: ['orgUnits', organizationId] });
      toast.success(unit.archived ? 'Unit restored' : 'Unit archived');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate(pId: string | null) {
    setEditingUnit(null);
    setParentId(pId);
    setFormName('');
    setFormUnitType('Department');
    setDialogOpen(true);
  }

  function openEdit(unit: OrgUnit) {
    setEditingUnit(unit);
    setParentId(unit.parentId);
    setFormName(unit.name);
    setFormUnitType(unit.unitType);
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    if (editingUnit) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  }

  const tree = buildTree(unitsQuery.data ?? []);

  if (authLoading || !isAuthenticated) return null;

  return (
    <AppShell>
      <PageHeader title="Structure" description={`${unitsQuery.data?.length ?? 0} units in your organization`}>
        <Button onClick={() => openCreate(null)}>
          <Plus size={16} className="mr-2" />
          Add Unit
        </Button>
      </PageHeader>

      <div className="space-y-6">
        {unitsQuery.isLoading ? (
          <Card>
            <CardContent className="py-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </CardContent>
          </Card>
        ) : tree.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Network size={48} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium text-foreground">No organizational units yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Create your first unit to define your org structure.</p>
              <Button variant="outline" className="mt-4" onClick={() => openCreate(null)}>
                <Plus size={16} className="mr-2" />
                Add Unit
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-2">
              {tree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  coordinators={coordinatorsQuery.data ?? []}
                  expanded={expanded}
                  toggleExpand={toggleExpand}
                  onEdit={openEdit}
                  onArchive={(unit) => archiveMutation.mutate(unit)}
                  onAddChild={(pid) => openCreate(pid)}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add Unit'}</DialogTitle>
            <DialogDescription>
              {editingUnit
                ? 'Update organizational unit details.'
                : parentId
                  ? 'Add a child unit.'
                  : 'Add a top-level organizational unit.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unit-name">Name</Label>
              <Input
                id="unit-name"
                placeholder="e.g. Mathematics Department"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit-type">Type</Label>
              <Input
                id="unit-type"
                placeholder="e.g. Department, Faculty, Ministry"
                value={formUnitType}
                onChange={(e) => setFormUnitType(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingUnit ? 'Save' : 'Add Unit'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
