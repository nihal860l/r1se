-- Allow anyone authenticated to count program_follows (for marketplace follow counts)
DROP POLICY IF EXISTS "Users can view their own follows" ON public.program_follows;

CREATE POLICY "Anyone can view follows"
ON public.program_follows
FOR SELECT
TO authenticated
USING (true);