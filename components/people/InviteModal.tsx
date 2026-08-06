'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { orgApi } from '@/lib/api';
import type { OrgRole } from '@/types/scheduling';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

function parseEmails(input: string): string[] {
  return input
    .split(/[\n,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));
}

export function InviteModal({ open, onOpenChange, organizationId }: InviteModalProps) {
  const queryClient = useQueryClient();
  const [emailText, setEmailText] = useState('');
  const [role, setRole] = useState<OrgRole>('MEMBER');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (emails: string[]) => orgApi.sendInvitations(organizationId, { emails, role }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invitations', organizationId] });
      toast.success(`${variables.length} invitation${variables.length > 1 ? 's' : ''} sent`);
      setEmailText('');
      setRole('MEMBER');
      setError(null);
      onOpenChange(false);
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleSend() {
    const emails = parseEmails(emailText);
    if (emails.length === 0) {
      setError('Enter at least one valid email address');
      return;
    }
    setError(null);
    mutation.mutate(emails);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Members</DialogTitle>
          <DialogDescription>
            Send invitations to join your organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="emails">Emails</Label>
            <Textarea
              id="emails"
              placeholder="Enter email addresses, one per line or comma-separated"
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {parseEmails(emailText).length} email{parseEmails(emailText).length !== 1 ? 's' : ''} detected
            </p>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
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

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitations
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
