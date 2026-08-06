'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Building2, Settings2, UserPlus, Check } from 'lucide-react';
import { orgApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OrgRole } from '@/types/scheduling';

const ORG_TYPES = [
  { value: 'university', label: 'University / College' },
  { value: 'school', label: 'School' },
  { value: 'church', label: 'Church / Religious Org' },
  { value: 'company', label: 'Company / Corporate' },
  { value: 'other', label: 'Other' },
];

const STEPS = [
  { icon: Building2, label: 'Organization' },
  { icon: Settings2, label: 'Configuration' },
  { icon: UserPlus, label: 'Invite Team' },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.label} className="flex items-center gap-2">
            {i > 0 && (
              <div className={`h-px w-8 ${done ? 'bg-primary' : 'bg-border'}`} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  done
                    ? 'border-primary bg-primary text-primary-foreground'
                    : active
                      ? 'border-primary text-primary'
                      : 'border-border text-muted-foreground'
                }`}
              >
                {done ? <Check size={18} /> : <Icon size={18} />}
              </div>
              <span className={`text-xs ${active ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CreateOrgPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { setOrganizationId } = useScheduleSelectionStore();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Org details
  const [name, setName] = useState('');
  const [orgType, setOrgType] = useState('university');
  const [description, setDescription] = useState('');

  // Step 3: Invite
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('MEMBER');

  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);

  useEffect(() => { loadUser(); }, [loadUser]);
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  const createMutation = useMutation({
    mutationFn: () => orgApi.createOrganization({ name, orgType, description: description || undefined }),
    onSuccess: (org) => {
      setCreatedOrgId(org.id);
      setOrganizationId(org.id);
      setError(null);
      setStep(2);
    },
    onError: (err: Error) => setError(err.message),
  });

  const inviteMutation = useMutation({
    mutationFn: () => {
      const emails = inviteEmails
        .split(/[\n,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes('@'));
      if (emails.length === 0) return Promise.resolve([]);
      return orgApi.sendInvitations(createdOrgId!, { emails, role: inviteRole });
    },
    onSuccess: () => {
      router.push('/overview');
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleNext() {
    setError(null);
    if (step === 0) {
      if (!name.trim()) {
        setError('Organization name is required');
        return;
      }
      setStep(1);
    } else if (step === 1) {
      createMutation.mutate();
    } else if (step === 2) {
      if (inviteEmails.trim()) {
        inviteMutation.mutate();
      } else {
        router.push('/overview');
      }
    }
  }

  if (authLoading || !isAuthenticated) return null;

  return (
    <main className="flex min-h-screen items-start justify-center bg-background px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">IshRize</h1>
          <p className="mt-1 text-sm text-muted-foreground">Set up your organization</p>
        </div>

        <StepIndicator current={step} />

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Organization details</CardTitle>
              <CardDescription>Tell us about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Name</Label>
                <Input
                  id="org-name"
                  placeholder="e.g. University of Ghana Math Dept"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={orgType} onValueChange={setOrgType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORG_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea
                  id="org-desc"
                  placeholder="A brief description of your organization"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Review your organization settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium text-foreground">{name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium text-foreground">
                    {ORG_TYPES.find((t) => t.value === orgType)?.label}
                  </span>
                </div>
                {description && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Description</span>
                    <span className="font-medium text-foreground max-w-[200px] text-right">{description}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                You&apos;ll be the owner of this organization. You can invite team members and configure settings after setup.
              </p>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Invite your team</CardTitle>
              <CardDescription>Add team members now or skip and invite later</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-emails">Email addresses</Label>
                <Textarea
                  id="invite-emails"
                  placeholder="Enter emails, one per line or comma-separated"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Default role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as OrgRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="COORDINATOR">Coordinator</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-4 flex justify-between">
          {step > 0 && step < 2 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            {step === 2 && (
              <Button variant="ghost" onClick={() => router.push('/overview')}>
                Skip for now
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={createMutation.isPending || inviteMutation.isPending}
            >
              {(createMutation.isPending || inviteMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {step === 0 && 'Continue'}
              {step === 1 && (createMutation.isPending ? 'Creating...' : 'Create Organization')}
              {step === 2 && (inviteMutation.isPending ? 'Sending...' : 'Send & Finish')}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
