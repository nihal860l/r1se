-- Create workout_plans table for weekly scheduling
CREATE TABLE public.workout_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Plan',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE DEFAULT NULL,
  weekly_assignments JSONB NOT NULL DEFAULT '{
    "0": {"type": "Empty", "workoutId": null},
    "1": {"type": "Empty", "workoutId": null},
    "2": {"type": "Empty", "workoutId": null},
    "3": {"type": "Empty", "workoutId": null},
    "4": {"type": "Empty", "workoutId": null},
    "5": {"type": "Empty", "workoutId": null},
    "6": {"type": "Empty", "workoutId": null}
  }'::jsonb,
  exceptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, plan_id)
);

-- Enable RLS
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own plans" 
ON public.workout_plans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plans" 
ON public.workout_plans 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plans" 
ON public.workout_plans 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plans" 
ON public.workout_plans 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_workout_plans_updated_at
BEFORE UPDATE ON public.workout_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();