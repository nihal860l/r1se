import { useState } from 'react';
import { Settings, LogOut, Trash2, RotateCcw, Sparkles, Award, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useWorkoutStore } from '@/store/workoutStore';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useGlowStore } from '@/store/glowStore';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { BecomeCoachDialog } from './BecomeCoachDialog';
import { useNavigate } from 'react-router-dom';
import { usePref } from '@/hooks/usePref';

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [resetExercisesConfirm, setResetExercisesConfirm] = useState(false);
  const [resetWorkoutsConfirm, setResetWorkoutsConfirm] = useState(false);
  const [coachDialogOpen, setCoachDialogOpen] = useState(false);
  const [disableCoachConfirm, setDisableCoachConfirm] = useState(false);
  
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { glowEnabled, setGlowEnabled } = useGlowStore();
  const { isCoach, deleteProfile, refetch } = useCoachProfile();
  const [keepOvernight, setKeepOvernight] = usePref('pref-keep-session-overnight', false);

  const handleResetExercises = () => {
    useWorkoutStore.setState({
      customExercises: [],
      exerciseMuscleOverrides: {},
    });
    setResetExercisesConfirm(false);
    toast({
      title: 'Exercises Reset',
      description: 'All custom exercises and edits have been removed.',
    });
  };

  const handleResetWorkouts = () => {
    useWorkoutStore.setState({
      workouts: [],
    });
    setResetWorkoutsConfirm(false);
    toast({
      title: 'Workouts Reset',
      description: 'All workout templates have been removed.',
    });
  };

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    toast({
      title: 'Signed Out',
      description: 'You have been signed out. Your local data is preserved.',
    });
  };

  const handleCoachToggle = (checked: boolean) => {
    if (checked) {
      setCoachDialogOpen(true);
    } else {
      setDisableCoachConfirm(true);
    }
  };

  const handleDisableCoach = async () => {
    const result = await deleteProfile();
    setDisableCoachConfirm(false);
    if (result.error) {
      toast({ title: 'Error', description: 'Could not disable coach mode.', variant: 'destructive' });
    } else {
      toast({ title: 'Coach Mode Disabled', description: 'Your published programs remain available.' });
    }
  };

  const displayName = user?.user_metadata?.full_name || user?.email || 'User';
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="text-foreground">
            <Settings className="w-5 h-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* User Info */}
            {user && (
              <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                <Avatar>
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            )}

            {/* Glow Toggle */}
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <div>
                  <p className="font-medium text-sm">Glow Effects</p>
                  <p className="text-xs text-muted-foreground">Neon glow on UI elements</p>
                </div>
              </div>
              <Switch checked={glowEnabled} onCheckedChange={setGlowEnabled} />
            </div>

            {/* Keep Paused Workout Overnight */}
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-primary" />
                <div>
                  <p className="font-medium text-sm">Keep paused workout overnight</p>
                  <p className="text-xs text-muted-foreground">Resume a paused workout the next day</p>
                </div>
              </div>
              <Switch checked={keepOvernight} onCheckedChange={setKeepOvernight} />
            </div>

            {/* Become a Coach Toggle */}
            {user && (
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Become a Coach</p>
                    <p className="text-xs text-muted-foreground">Create & sell workout programs</p>
                  </div>
                </div>
                <Switch checked={isCoach} onCheckedChange={handleCoachToggle} />
              </div>
            )}

            {/* Coach Dashboard Link */}
            {isCoach && (
              <Button
                variant="outline"
                className="w-full justify-start gap-2 border-primary/30 text-primary"
                onClick={() => {
                  setOpen(false);
                  window.location.href = '/coach';
                }}
              >
                <Award className="w-4 h-4" />
                Coach Dashboard
              </Button>
            )}

            {/* Reset Options */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setResetExercisesConfirm(true)}
              >
                <RotateCcw className="w-4 h-4" />
                Reset Exercises
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setResetWorkoutsConfirm(true)}
              >
                <Trash2 className="w-4 h-4" />
                Reset Workouts
              </Button>
            </div>

            {/* Sign Out */}
            {user && (
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Become a Coach Dialog */}
      <BecomeCoachDialog
        open={coachDialogOpen}
        onOpenChange={setCoachDialogOpen}
        onSuccess={refetch}
      />

      {/* Disable Coach Confirmation */}
      <AlertDialog open={disableCoachConfirm} onOpenChange={setDisableCoachConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Coach Mode?</AlertDialogTitle>
            <AlertDialogDescription>
              Your coach profile will be removed. Any published programs will remain available in the marketplace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisableCoach} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Exercises Confirmation */}
      <AlertDialog open={resetExercisesConfirm} onOpenChange={setResetExercisesConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Exercises?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all custom exercises and any edits you made to built-in exercises. 
              The default exercise library will be restored. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetExercises} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reset Exercises
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Workouts Confirmation */}
      <AlertDialog open={resetWorkoutsConfirm} onOpenChange={setResetWorkoutsConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Workouts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all your workout templates. Your workout history will be preserved. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetWorkouts} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reset Workouts
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
