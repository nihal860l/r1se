import { useState } from 'react';
import { Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface BecomeCoachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BecomeCoachDialog({ open, onOpenChange, onSuccess }: BecomeCoachDialogProps) {
  const { user } = useAuth();
  const { createProfile } = useCoachProfile();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || '');
  const [bio, setBio] = useState('');
  const [tosAccepted, setTosAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      toast({ title: 'Name required', description: 'Please enter a display name.', variant: 'destructive' });
      return;
    }
    if (!tosAccepted) {
      toast({ title: 'Accept Terms', description: 'Please accept the terms to continue.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const result = await createProfile(displayName.trim(), bio.trim());
    setSubmitting(false);

    if (result.error) {
      toast({ title: 'Error', description: 'Could not create coach profile. Try again.', variant: 'destructive' });
      return;
    }

    toast({ title: 'Welcome, Coach!', description: 'Your coach profile is active.' });
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Become a Coach
          </DialogTitle>
          <DialogDescription>
            Create and sell workout programs on the R1SE marketplace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="coach-name">Display Name *</Label>
            <Input
              id="coach-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your coach name"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coach-bio">Short Bio</Label>
            <Textarea
              id="coach-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell athletes about your experience..."
              maxLength={300}
              className="min-h-[80px] resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
          </div>

          <div className="flex items-start gap-2 p-3 bg-secondary/50 rounded-lg">
            <Checkbox
              id="coach-tos"
              checked={tosAccepted}
              onCheckedChange={(c) => setTosAccepted(c === true)}
              className="mt-0.5"
            />
            <Label htmlFor="coach-tos" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
              I agree to the R1SE Marketplace Terms. I will only publish original content that I have the right to distribute.
            </Label>
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || !displayName.trim() || !tosAccepted}
          >
            {submitting ? 'Setting up...' : 'Activate Coach Profile'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
