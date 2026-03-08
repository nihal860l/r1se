import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useWorkoutStore } from '@/store/workoutStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { format, startOfWeek, addDays } from 'date-fns';
import { DayAssignment, WorkoutPlan as WorkoutPlanType, DEFAULT_WEEKLY_ASSIGNMENTS } from '@/types/workout';
import { Dumbbell, BedDouble, Plus, X, Check, ChevronDown, Pencil, Trash2, Star } from 'lucide-react';
import { WorkoutTemplateCard } from '@/components/WorkoutTemplateCard';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const WorkoutPlan = () => {
  const navigate = useNavigate();
  const workoutPlans = useWorkoutStore((state) => state.workoutPlans);
  const activePlanId = useWorkoutStore((state) => state.activePlanId);
  const workouts = useWorkoutStore((state) => state.workouts);
  const addWorkoutPlan = useWorkoutStore((state) => state.addWorkoutPlan);
  const updateWorkoutPlan = useWorkoutStore((state) => state.updateWorkoutPlan);
  const deleteWorkoutPlan = useWorkoutStore((state) => state.deleteWorkoutPlan);
  const setActivePlan = useWorkoutStore((state) => state.setActivePlan);
  const updateDayAssignment = useWorkoutStore((state) => state.updateDayAssignment);
  const addPlanException = useWorkoutStore((state) => state.addPlanException);
  
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<'weekly' | 'date'>('weekly');
  
  // Plan management dialogs
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showRenamePlan, setShowRenamePlan] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [planToRename, setPlanToRename] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  
  const today = new Date();
  const todayDayOfWeek = today.getDay();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  
  const activePlan = workoutPlans.find((p) => p.planId === activePlanId);
  
  const getAssignmentForDay = (dayOfWeek: number): DayAssignment => {
    if (!activePlan) {
      return { type: 'Empty', workoutId: null };
    }
    
    const dateForDay = addDays(weekStart, dayOfWeek);
    const dateStr = format(dateForDay, 'yyyy-MM-dd');
    
    // Check exceptions first
    const exception = activePlan.exceptions.find((e) => e.date === dateStr);
    if (exception) {
      return { type: exception.type, workoutId: exception.workoutId };
    }
    
    // Fall back to weekly assignment
    return activePlan.weeklyAssignments[String(dayOfWeek) as keyof typeof activePlan.weeklyAssignments];
  };
  
  const getWorkoutName = (workoutId: string | null): string => {
    if (!workoutId) return '';
    const workout = workouts.find((w) => w.id === workoutId);
    return workout?.name || 'Unknown';
  };
  
  const handleDayClick = (dayOfWeek: number) => {
    if (!activePlan) {
      // Create a default plan first
      handleCreatePlan('My Plan');
    }
    setSelectedDay(dayOfWeek);
    const dateForDay = addDays(weekStart, dayOfWeek);
    setSelectedDate(format(dateForDay, 'yyyy-MM-dd'));
    setAssignmentMode('weekly');
  };
  
  const handleAssignWorkout = (workoutId: string) => {
    if (selectedDay === null) return;
    
    if (assignmentMode === 'date' && selectedDate) {
      addPlanException(selectedDate, { type: 'Workout', workoutId });
    } else {
      updateDayAssignment(selectedDay, { type: 'Workout', workoutId });
    }
    
    setShowWorkoutPicker(false);
    setSelectedDay(null);
    setSelectedDate(null);
  };
  
  const handleAssignRest = () => {
    if (selectedDay === null) return;
    
    if (assignmentMode === 'date' && selectedDate) {
      addPlanException(selectedDate, { type: 'Rest', workoutId: null });
    } else {
      updateDayAssignment(selectedDay, { type: 'Rest', workoutId: null });
    }
    
    setSelectedDay(null);
    setSelectedDate(null);
  };
  
  const handleClearAssignment = () => {
    if (selectedDay === null) return;
    
    if (assignmentMode === 'date' && selectedDate) {
      addPlanException(selectedDate, { type: 'Empty', workoutId: null });
    } else {
      updateDayAssignment(selectedDay, { type: 'Empty', workoutId: null });
    }
    
    setSelectedDay(null);
    setSelectedDate(null);
  };
  
  const handleCreatePlan = (name: string) => {
    const newPlan: WorkoutPlanType = {
      id: crypto.randomUUID(),
      planId: crypto.randomUUID(),
      name: name || 'My Plan',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: null,
      weeklyAssignments: DEFAULT_WEEKLY_ASSIGNMENTS,
      exceptions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: workoutPlans.length === 0,
    };
    addWorkoutPlan(newPlan);
    setShowCreatePlan(false);
    setNewPlanName('');
  };
  
  const handleRenamePlan = () => {
    if (!planToRename || !newPlanName.trim()) return;
    updateWorkoutPlan(planToRename, { name: newPlanName.trim() });
    setShowRenamePlan(false);
    setPlanToRename(null);
    setNewPlanName('');
  };
  
  const handleDeletePlan = () => {
    if (!planToDelete) return;
    deleteWorkoutPlan(planToDelete);
    setShowDeleteConfirm(false);
    setPlanToDelete(null);
  };
  
  const openRenamePlan = (planId: string, currentName: string) => {
    setPlanToRename(planId);
    setNewPlanName(currentName);
    setShowRenamePlan(true);
  };
  
  const openDeletePlan = (planId: string) => {
    setPlanToDelete(planId);
    setShowDeleteConfirm(true);
  };

  return (
    <Layout>
      <div className="container max-w-lg animate-fade-in px-4">
        <div className="pt-4 pb-4">
          <h2 className="text-xl font-semibold">Workout Plan</h2>
          <p className="text-sm text-muted-foreground">Schedule your weekly training</p>
        </div>
        
        {/* Plan Selector */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-1 justify-between">
                  <span className="truncate">
                    {activePlan?.name || 'Select a plan'}
                  </span>
                  <ChevronDown className="w-4 h-4 ml-2 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[calc(100vw-2rem)] max-w-[400px]">
                {workoutPlans.length === 0 ? (
                  <DropdownMenuItem disabled className="text-muted-foreground">
                    No plans yet
                  </DropdownMenuItem>
                ) : (
                  workoutPlans.map((plan) => (
                    <DropdownMenuItem
                      key={plan.planId}
                      className="flex items-center justify-between"
                      onClick={() => setActivePlan(plan.planId)}
                    >
                      <span className="flex items-center gap-2">
                        {plan.planId === activePlanId && (
                          <Star className="w-3 h-3 text-primary fill-primary" />
                        )}
                        <span className={cn(
                          plan.planId === activePlanId && "font-medium text-primary"
                        )}>
                          {plan.name}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRenamePlan(plan.planId, plan.name);
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeletePlan(plan.planId);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              size="icon"
              variant="outline"
              onClick={() => setShowCreatePlan(true)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Weekly Grid */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {WEEKDAYS.map((day, index) => {
            const dateForDay = addDays(weekStart, index);
            const dateLabel = format(dateForDay, 'd');
            const isToday = index === todayDayOfWeek;
            const assignment = getAssignmentForDay(index);
            
            return (
              <button
                key={day}
                className={cn(
                  "flex flex-col items-center p-2 rounded-lg border transition-all min-h-[100px]",
                  isToday 
                    ? "border-primary bg-primary/10" 
                    : "border-border bg-card hover:border-primary/50"
                )}
                onClick={() => handleDayClick(index)}
              >
                <span className={cn(
                  "text-xs font-medium mb-1",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}>
                  {day}
                </span>
                <span className={cn(
                  "text-sm font-semibold mb-2",
                  isToday ? "text-primary" : "text-foreground"
                )}>
                  {dateLabel}
                </span>
                
                {assignment.type === 'Workout' ? (
                  <div className="flex flex-col items-center gap-1">
                    <Dumbbell className="w-4 h-4 text-primary" />
                    <span className="text-[10px] text-center text-muted-foreground line-clamp-2">
                      {getWorkoutName(assignment.workoutId)}
                    </span>
                  </div>
                ) : assignment.type === 'Rest' ? (
                  <div className="flex flex-col items-center gap-1">
                    <BedDouble className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">REST</span>
                  </div>
                ) : (
                  <Plus className="w-4 h-4 text-muted-foreground/50" />
                )}
              </button>
            );
          })}
        </div>
        
        {workouts.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground mb-4">
              Create workout templates first to assign them to your plan.
            </p>
            <Button onClick={() => navigate('/workouts')}>
              Go to Workouts
            </Button>
          </Card>
        )}
      </div>

      {/* Assignment Sheet */}
      <Sheet open={selectedDay !== null && !showWorkoutPicker} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <SheetContent side="bottom" className="h-auto max-h-[50vh]">
          <SheetHeader className="mb-6">
            <SheetTitle>
              {selectedDay !== null && WEEKDAYS[selectedDay]}
              {selectedDate && `, ${format(new Date(selectedDate + 'T12:00:00'), 'MMM d')}`}
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-3">
            <Button 
              className="w-full justify-start gap-3" 
              variant="outline"
              onClick={() => setShowWorkoutPicker(true)}
            >
              <Dumbbell className="w-5 h-5" />
              Choose Workout
            </Button>
            
            <Button 
              className="w-full justify-start gap-3" 
              variant="outline"
              onClick={handleAssignRest}
            >
              <BedDouble className="w-5 h-5" />
              Assign Rest
            </Button>
            
            <Button 
              className="w-full justify-start gap-3" 
              variant="outline"
              onClick={handleClearAssignment}
            >
              <X className="w-5 h-5" />
              Clear Assignment
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Workout Picker Sheet */}
      <Sheet open={showWorkoutPicker} onOpenChange={setShowWorkoutPicker}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader className="mb-6">
            <SheetTitle>Select Workout</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-3 overflow-y-auto max-h-[calc(80vh-100px)]">
            {workouts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No workouts created yet</p>
                <Button onClick={() => navigate('/create-workout')}>
                  Create Workout
                </Button>
              </div>
            ) : (
              workouts.map((workout) => (
                <WorkoutTemplateCard
                  key={workout.id}
                  workout={workout}
                  showSelectButton
                  onSelect={() => handleAssignWorkout(workout.id)}
                />
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Create Plan Dialog */}
      <Dialog open={showCreatePlan} onOpenChange={setShowCreatePlan}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Plan</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Plan name"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePlan(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleCreatePlan(newPlanName)} disabled={!newPlanName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Rename Plan Dialog */}
      <Dialog open={showRenamePlan} onOpenChange={setShowRenamePlan}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Plan</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Plan name"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenamePlan(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenamePlan} disabled={!newPlanName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Plan Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this workout plan. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlan}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default WorkoutPlan;
