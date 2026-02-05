 import { useNavigate } from 'react-router-dom';
 import { Layout } from '@/components/Layout';
 import { WorkoutTemplateCard } from '@/components/WorkoutTemplateCard';
 import { useWorkoutStore } from '@/store/workoutStore';
 import { Dumbbell, Plus } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 
 const Workouts = () => {
   const workouts = useWorkoutStore((state) => state.workouts);
   const navigate = useNavigate();
 
   return (
     <Layout>
       <div className="container max-w-lg animate-fade-in px-4">
         <div className="pt-4 pb-4">
           <h2 className="text-xl font-semibold">Workouts</h2>
           <p className="text-sm text-muted-foreground">Your workout templates</p>
         </div>
 
         <div className="space-y-4">
           <Button 
             size="lg" 
             className="gap-2 w-full"
             onClick={() => navigate('/create-workout')}
           >
             <Plus className="w-5 h-5" />
             Create Workout
           </Button>
 
           {workouts.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-16 text-center">
               <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                 <Dumbbell className="w-8 h-8 text-muted-foreground" />
               </div>
               <h3 className="font-medium text-lg mb-1">No workouts yet</h3>
               <p className="text-muted-foreground text-sm max-w-xs">
                 Create your first workout template to start planning.
               </p>
             </div>
           ) : (
             <div className="space-y-3">
               {workouts.map((workout) => (
                 <WorkoutTemplateCard
                   key={workout.id}
                   workout={workout}
                 />
               ))}
             </div>
           )}
         </div>
       </div>
     </Layout>
   );
 };
 
 export default Workouts;