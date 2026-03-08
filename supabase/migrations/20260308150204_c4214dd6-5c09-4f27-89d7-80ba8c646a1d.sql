
-- Membership tier enum
CREATE TYPE public.membership_tier AS ENUM ('free', 'premium');

-- Memberships table - server-side source of truth for premium access
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier membership_tier NOT NULL DEFAULT 'free',
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Users can only read their own membership
CREATE POLICY "Users can view their own membership"
  ON public.memberships
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only server (service role) can insert/update/delete memberships
-- No INSERT/UPDATE/DELETE policies for authenticated users = server-only control

-- Security definer function to check membership from other RLS policies
CREATE OR REPLACE FUNCTION public.has_active_membership(_user_id UUID, _tier membership_tier)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = _user_id
      AND tier = _tier
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Auto-create free membership on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.memberships (user_id, tier, is_active)
  VALUES (NEW.id, 'free', true)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_membership
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_membership();

-- Updated_at trigger
CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
