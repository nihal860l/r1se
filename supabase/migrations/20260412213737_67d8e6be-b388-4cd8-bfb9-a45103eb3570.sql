
-- coach_clients table
CREATE TABLE public.coach_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  client_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  training_goal text,
  experience_level text,
  training_days_per_week integer,
  equipment_access text,
  client_note text,
  assigned_program_id text,
  assigned_program_week integer DEFAULT 1,
  check_in_day integer DEFAULT 0,
  applied_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(coach_id, client_id)
);

ALTER TABLE public.coach_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can view their clients" ON public.coach_clients FOR SELECT TO authenticated USING (coach_id = auth.uid() OR client_id = auth.uid());
CREATE POLICY "Client can apply" ON public.coach_clients FOR INSERT TO authenticated WITH CHECK (client_id = auth.uid());
CREATE POLICY "Coach can update status" ON public.coach_clients FOR UPDATE TO authenticated USING (coach_id = auth.uid() OR client_id = auth.uid());
CREATE POLICY "Either party can end" ON public.coach_clients FOR DELETE TO authenticated USING (coach_id = auth.uid() OR client_id = auth.uid());

CREATE TRIGGER update_coach_clients_updated_at BEFORE UPDATE ON public.coach_clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- messages table
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_client_id uuid NOT NULL REFERENCES public.coach_clients(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.coach_clients cc WHERE cc.id = coach_client_id AND (cc.coach_id = auth.uid() OR cc.client_id = auth.uid()))
);
CREATE POLICY "Participants can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.coach_clients cc WHERE cc.id = coach_client_id AND (cc.coach_id = auth.uid() OR cc.client_id = auth.uid()))
);
CREATE POLICY "Participants can mark read" ON public.messages FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.coach_clients cc WHERE cc.id = coach_client_id AND (cc.coach_id = auth.uid() OR cc.client_id = auth.uid()))
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- check_ins table
CREATE TABLE public.check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_client_id uuid NOT NULL REFERENCES public.coach_clients(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  week_start_date text NOT NULL,
  training_feel integer,
  energy_level integer,
  sleep_quality integer,
  soreness_note text,
  other_note text,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(coach_client_id, week_start_date)
);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client can insert own check-ins" ON public.check_ins FOR INSERT TO authenticated WITH CHECK (client_id = auth.uid());
CREATE POLICY "Coach and client can view" ON public.check_ins FOR SELECT TO authenticated USING (
  client_id = auth.uid() OR EXISTS (SELECT 1 FROM public.coach_clients cc WHERE cc.id = coach_client_id AND cc.coach_id = auth.uid())
);

-- measurement_types table
CREATE TABLE public.measurement_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'cm',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.measurement_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own measurement types" ON public.measurement_types FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- measurement_logs table
CREATE TABLE public.measurement_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  measurement_type_id uuid NOT NULL REFERENCES public.measurement_types(id) ON DELETE CASCADE,
  value numeric NOT NULL,
  logged_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.measurement_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own logs" ON public.measurement_logs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Coach can view client measurements" ON public.measurement_logs FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.coach_clients cc WHERE cc.client_id = measurement_logs.user_id AND cc.coach_id = auth.uid() AND cc.status = 'active')
);

-- progress_photos table
CREATE TABLE public.progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  storage_path text NOT NULL,
  thumbnail_path text,
  taken_at timestamptz DEFAULT now(),
  notes text,
  is_visible_to_coach boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own photos" ON public.progress_photos FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Coach can view visible photos" ON public.progress_photos FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR (is_visible_to_coach = true AND EXISTS (SELECT 1 FROM public.coach_clients cc WHERE cc.client_id = progress_photos.user_id AND cc.coach_id = auth.uid() AND cc.status = 'active'))
);

-- Add accepts_clients to coach_profiles
ALTER TABLE public.coach_profiles ADD COLUMN IF NOT EXISTS accepts_clients boolean NOT NULL DEFAULT true;

-- Storage bucket for progress photos
INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Users upload own photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users view own photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Coach views client photos" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'progress-photos' AND EXISTS (
    SELECT 1 FROM public.coach_clients cc
    JOIN public.progress_photos pp ON pp.user_id::text = (storage.foldername(name))[1]
    WHERE cc.coach_id = auth.uid() AND cc.client_id::text = (storage.foldername(name))[1] AND cc.status = 'active' AND pp.is_visible_to_coach = true
  )
);
CREATE POLICY "Users delete own photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
