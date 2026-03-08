 import { useNavigate } from 'react-router-dom';
 import { Layout } from '@/components/Layout';
 import { useGlowStore } from '@/store/glowStore';
 import { Card, CardContent } from '@/components/ui/card';
 import { Dumbbell, Calendar, Library } from 'lucide-react';
 
 const Plan = () => {
   const navigate = useNavigate();
 
   const planOptions = [
     {
       title: 'Workouts',
       description: 'Create & edit workout templates',
       icon: Dumbbell,
       path: '/workouts',
     },
     {
       title: 'Workout Plan',
       description: 'Schedule your weekly workouts',
       icon: Calendar,
       path: '/workout-plan',
     },
     {
       title: 'Exercises',
       description: 'Browse & manage exercises',
       icon: Library,
       path: '/exercises',
     },
   ];
 
   return (
     <Layout>
       <div className="container max-w-lg animate-fade-in px-4">
         <div className="pt-4 pb-4">
           <h2 className="text-xl font-semibold">Plan</h2>
           <p className="text-sm text-muted-foreground">Manage your training</p>
         </div>
 
         <div className="space-y-4">
           {planOptions.map((option) => (
             <Card 
               key={option.path}
               className="bg-card border-border cursor-pointer card-hover"
               onClick={() => navigate(option.path)}
             >
               <CardContent className="flex items-center gap-4 p-6">
                 <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                   <option.icon className="w-6 h-6 text-primary" />
                 </div>
                 <div>
                   <h3 className="font-semibold text-lg">{option.title}</h3>
                   <p className="text-sm text-muted-foreground">{option.description}</p>
                 </div>
               </CardContent>
             </Card>
           ))}
         </div>
       </div>
     </Layout>
   );
 };
 
 export default Plan;