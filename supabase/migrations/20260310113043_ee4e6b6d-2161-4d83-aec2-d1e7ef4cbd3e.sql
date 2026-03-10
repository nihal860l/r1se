
-- Coach profiles table
CREATE TABLE public.coach_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text NOT NULL,
  bio text,
  avatar_url text,
  is_verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  external_link text,
  pinned_program_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view coach profiles" ON public.coach_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own coach profile" ON public.coach_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own coach profile" ON public.coach_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own coach profile" ON public.coach_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Programs table
CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id text NOT NULL,
  coach_id uuid NOT NULL REFERENCES public.coach_profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  short_description text,
  long_description text,
  banner_image_url text,
  category_tags text[] NOT NULL DEFAULT '{}',
  difficulty text NOT NULL DEFAULT 'Intermediate' CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  equipment_tags text[] NOT NULL DEFAULT '{}',
  price_amount numeric,
  currency text DEFAULT 'USD',
  visibility text NOT NULL DEFAULT 'free' CHECK (visibility IN ('free', 'paid')),
  preview_weeks integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'unpublished', 'archived')),
  version_number integer NOT NULL DEFAULT 1,
  manifest jsonb NOT NULL DEFAULT '[]'::jsonb,
  promo_video_url text,
  days_per_week integer,
  total_weeks integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, version_number)
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published programs" ON public.programs FOR SELECT TO authenticated USING (status = 'published' OR coach_id = auth.uid());
CREATE POLICY "Coaches can insert their own programs" ON public.programs FOR INSERT TO authenticated WITH CHECK (coach_id = auth.uid());
CREATE POLICY "Coaches can update their own programs" ON public.programs FOR UPDATE TO authenticated USING (coach_id = auth.uid());
CREATE POLICY "Coaches can delete their own programs" ON public.programs FOR DELETE TO authenticated USING (coach_id = auth.uid());

-- Program follows (free imports)
CREATE TABLE public.program_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  program_id text NOT NULL,
  program_version integer NOT NULL DEFAULT 1,
  imported_manifest jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_scheduled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_id)
);

ALTER TABLE public.program_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own follows" ON public.program_follows FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own follows" ON public.program_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own follows" ON public.program_follows FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own follows" ON public.program_follows FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Program purchases (for paid programs)
CREATE TABLE public.program_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  program_id text NOT NULL,
  program_version integer NOT NULL DEFAULT 1,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'refunded', 'failed')),
  checkout_token text,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_id)
);

ALTER TABLE public.program_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases" ON public.program_purchases FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own purchases" ON public.program_purchases FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Program reports
CREATE TABLE public.program_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  program_id text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam', 'policy_violation', 'poor_quality', 'inappropriate')),
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.program_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert reports" ON public.program_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view their own reports" ON public.program_reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

-- Program reviews
CREATE TABLE public.program_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  program_id text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  is_flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_id)
);

ALTER TABLE public.program_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view unflagged reviews" ON public.program_reviews FOR SELECT TO authenticated USING (is_flagged = false OR auth.uid() = user_id);
CREATE POLICY "Users can insert their own reviews" ON public.program_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON public.program_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON public.program_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Program analytics (lightweight tracking)
CREATE TABLE public.program_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('view', 'preview', 'follow', 'purchase')),
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.program_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics" ON public.program_analytics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Coaches can view their program analytics" ON public.program_analytics FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.programs p WHERE p.program_id = program_analytics.program_id AND p.coach_id = auth.uid())
);

-- Storage bucket for program media
INSERT INTO storage.buckets (id, name, public) VALUES ('program-media', 'program-media', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload program media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'program-media');
CREATE POLICY "Anyone can view program media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'program-media');
CREATE POLICY "Users can delete their own program media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'program-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Updated_at triggers
CREATE TRIGGER update_coach_profiles_updated_at BEFORE UPDATE ON public.coach_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_program_reviews_updated_at BEFORE UPDATE ON public.program_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
