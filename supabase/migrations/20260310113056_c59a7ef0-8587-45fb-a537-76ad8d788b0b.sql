
-- Fix overly permissive analytics insert policy
DROP POLICY "Anyone can insert analytics" ON public.program_analytics;
CREATE POLICY "Users can insert their own analytics" ON public.program_analytics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
