 import { useNavigate } from 'react-router-dom';
 import { Layout } from '@/components/Layout';
 import { useWorkoutStore } from '@/store/workoutStore';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Play, Calendar, BedDouble, Dumbbell, Eye } from 'lucide-react';
 import { format } from 'date-fns';
 import { exercises } from '@/data/exercises';
 
 const Today = () => {
   const navigate = useNavigate();
   const getTodayAssignment = useWorkoutStore((state) => state.getTodayAssignment);
   const workouts = useWorkoutStore((state) => state.workouts);
   const customExercises = useWorkoutStore((state) => state.customExercises);
   
   const todayAssignment = getTodayAssignment();
   const today = new Date();
   const formattedDate = format(today, 'EEE, MMM d');
   
   const workout = todayAssignment.workoutId 
     ? workouts.find((w) => w.id === todayAssignment.workoutId)
     : null;
   
   const allExercises = [...exercises, ...customExercises];
   
   const exerciseNames = workout?.exercises
     .map((we) => allExercises.find((e) => e.id === we.exerciseId)?.name)
     .filter(Boolean)
     .slice(0, 3) || [];
 
   const handleStartWorkout = () => {
     if (workout) {
       navigate(`/workout/${workout.id}`);
     }
   };
 
   const handleViewWorkout = () => {
     if (workout) {
       navigate(`/create-workout?edit=${workout.id}`);
     }
   };
 
   return (
     <Layout>
       <div className="container max-w-lg animate-fade-in px-4">
         <div className="pt-4 pb-6">
           <p className="text-sm text-muted-foreground">{formattedDate}</p>
         </div>
 
         <div className="flex flex-col items-center justify-center min-h-[60vh]">
           {todayAssignment.type === 'Rest' ? (
             // Rest Day Card
             <Card className="w-full bg-card border-border text-center">
               <CardHeader className="pb-4">
                 <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                   <BedDouble className="w-8 h-8 text-primary" />
                 </div>
                 <CardTitle className="text-2xl font-bold">REST & RECOVER</CardTitle>
               </CardHeader>
               <CardContent className="space-y-6">
                 <p className="text-muted-foreground">
                   No training today. Stretch & recover.
                 </p>
                 <Button 
                   variant="outline" 
                   className="gap-2"
                   onClick={() => navigate('/workout-plan')}
                 >
                   <Calendar className="w-4 h-4" />
                   View Plan
                 </Button>
               </CardContent>
             </Card>
           ) : todayAssignment.type === 'Workout' && workout ? (
             // Workout Day Card
             <Card className="w-full bg-card border-border">
               <CardHeader className="pb-4">
                 <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                   <Dumbbell className="w-8 h-8 text-primary" />
                 </div>
                 <CardTitle className="text-2xl font-bold text-center">{workout.name}</CardTitle>
               </CardHeader>
               <CardContent className="space-y-6">
                 <div className="text-center">
                   <p className="text-sm text-muted-foreground mb-1">
                     {exerciseNames.join(' • ')}
                     {workout.exercises.length > 3 && ` +${workout.exercises.length - 3} more`}
                   </p>
                   <p className="text-xs text-muted-foreground">
                     {workout.exercises.length} exercises
                   </p>
                 </div>
                 
                 <div className="flex flex-col gap-3">
                   <Button 
                     size="lg" 
                     className="w-full gap-2"
                     onClick={handleStartWorkout}
                   >
                     <Play className="w-5 h-5" />
                     START WORKOUT
                   </Button>
                   <Button 
                     variant="outline"
                     className="w-full gap-2"
                     onClick={handleViewWorkout}
                   >
                     <Eye className="w-4 h-4" />
                     VIEW WORKOUT
                   </Button>
                 </div>
               </CardContent>
             </Card>
           ) : (
             // Empty / No Plan Card
             <Card className="w-full bg-card border-border text-center">
               <CardHeader className="pb-4">
                 <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                   <Calendar className="w-8 h-8 text-muted-foreground" />
                 </div>
                 <CardTitle className="text-xl font-semibold">No workout scheduled</CardTitle>
               </CardHeader>
               <CardContent>
                 <Button 
                   size="lg" 
                   className="gap-2"
                   onClick={() => navigate('/workout-plan')}
                 >
                   Plan now
                 </Button>
               </CardContent>
             </Card>
           )}
         </div>
       </div>
     </Layout>
   );
 };
 
 export default Today;