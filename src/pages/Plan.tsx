 import { useNavigate } from 'react-router-dom';
 import { Layout } from '@/components/Layout';
 import { useGlowStore } from '@/store/glowStore';
 import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, Calendar, Library, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
 
 const Plan = () => {
  const navigate = useNavigate();
  const glowEnabled = useGlowStore((s) => s.glowEnabled);
 
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
      {
        title: 'Coach Marketplace',
        description: 'Programs & personal training from real coaches',
        icon: Users,
        path: '/marketplace',
        accent: true,
      },
   ];
 
   return (
     <Layout>
       <div className="container max-w-lg animate-fade-in px-4">
         <div className="pt-6 pb-4">
           <h2 className="text-xl font-bold tracking-tight">Plan</h2>
           <p className="text-sm text-muted-foreground">Manage your training</p>
         </div>
 
         <div className="space-y-3">
           {planOptions.map((option) => (
              <Card 
                key={option.path}
                className={cn(
                  "bg-card cursor-pointer group transition-all duration-300 hover:border-primary/30 hover:-translate-y-0.5",
                  glowEnabled && "card-glow border-glow hover:shadow-[0_0_25px_hsl(189_100%_51%/0.1)]"
                )}
               onClick={() => navigate(option.path)}
             >
               <CardContent className="flex items-center gap-4 p-5">
                 <div className={cn(
                   "w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 transition-all duration-300 group-hover:bg-primary/15",
                   glowEnabled && "group-hover:shadow-[0_0_16px_hsl(189_100%_51%/0.15)]"
                 )}>
                   <option.icon className="w-6 h-6 text-primary" />
                 </div>
                 <div className="flex-1">
                   <h3 className="font-bold text-base">{option.title}</h3>
                   <p className="text-sm text-muted-foreground">{option.description}</p>
                 </div>
                 <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
               </CardContent>
             </Card>
           ))}
         </div>
       </div>
     </Layout>
   );
 };
 
 export default Plan;
