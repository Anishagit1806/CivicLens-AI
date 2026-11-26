-- ============================================================================
-- CivicLens AI — PostgreSQL Schema, Indexes & Row Level Security (RLS)
-- Compatible with Supabase PostgreSQL 15+
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Profiles Table (linked 1:1 to auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  role text NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'admin')),
  preferred_language text NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'ta')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helper function to check admin role without recursive RLS lookups
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Trigger to auto-provision citizen profile upon Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, preferred_language)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), 'Citizen Reporter'),
    'citizen',
    CASE
      WHEN NEW.raw_user_meta_data->>'preferred_language' = 'ta' THEN 'ta'
      ELSE 'en'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Prevent privilege escalation: non-admins cannot change their own role
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: role changes require administrator privileges';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile or admins read all" ON public.profiles;
CREATE POLICY "Users read own profile or admins read all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. Civic Issues Table (Public reports contain ZERO reporter PII)
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.civic_issue_ref_seq START 1001;

CREATE TABLE IF NOT EXISTS public.civic_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text UNIQUE NOT NULL DEFAULT (
    'CL-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.civic_issue_ref_seq')::text, 4, '0')
  ),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 160),
  description text NOT NULL CHECK (char_length(description) BETWEEN 15 AND 2500),
  category text NOT NULL CHECK (
    category IN (
      'potholes',
      'garbage',
      'water_leakage',
      'damaged_streetlights',
      'drainage',
      'road_damage',
      'other'
    )
  ),
  ai_predicted_category text CHECK (
    ai_predicted_category IN (
      'potholes',
      'garbage',
      'water_leakage',
      'damaged_streetlights',
      'drainage',
      'road_damage',
      'other'
    )
  ),
  ai_category_confidence numeric(4,3) NOT NULL DEFAULT 0.500 CHECK (ai_category_confidence BETWEEN 0 AND 1),
  ai_provider text NOT NULL DEFAULT 'deterministic-fallback' CHECK (ai_provider IN ('gemini', 'deterministic-fallback')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  severity_explanation text NOT NULL,
  urgency_score integer NOT NULL CHECK (urgency_score BETWEEN 1 AND 100),
  public_impact_score integer NOT NULL CHECK (public_impact_score BETWEEN 1 AND 100),
  priority_score numeric(5,2) NOT NULL CHECK (priority_score BETWEEN 0 AND 100),
  priority_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_limitations_note text NOT NULL DEFAULT '',
  location_text text NOT NULL CHECK (char_length(location_text) BETWEEN 3 AND 240),
  ward_or_zone text NOT NULL DEFAULT 'Central Zone' CHECK (char_length(ward_or_zone) BETWEEN 2 AND 80),
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  image_path text,
  image_alt text,
  status text NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected')
  ),
  assigned_department text,
  assigned_to_label text,
  duplicate_of_id uuid REFERENCES public.civic_issues(id) ON DELETE SET NULL,
  duplicate_similarity numeric(4,3) CHECK (duplicate_similarity BETWEEN 0 AND 1),
  upvote_count integer NOT NULL DEFAULT 1 CHECK (upvote_count >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Indexes for fast filtering, sorting, geo-queries and full-text search
CREATE INDEX IF NOT EXISTS idx_civic_issues_status_priority
  ON public.civic_issues (status, priority_score DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_civic_issues_category_severity
  ON public.civic_issues (category, severity);

CREATE INDEX IF NOT EXISTS idx_civic_issues_reporter_created
  ON public.civic_issues (reporter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_civic_issues_geo
  ON public.civic_issues (latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_civic_issues_created_at
  ON public.civic_issues (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_civic_issues_search_tsv
  ON public.civic_issues
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(location_text, '')));

CREATE OR REPLACE FUNCTION public.touch_civic_issue_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved' AND NEW.resolved_at IS NULL THEN
    NEW.resolved_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_civic_issue_updated_at ON public.civic_issues;
CREATE TRIGGER trg_touch_civic_issue_updated_at
  BEFORE UPDATE ON public.civic_issues
  FOR EACH ROW EXECUTE FUNCTION public.touch_civic_issue_updated_at();

ALTER TABLE public.civic_issues ENABLE ROW LEVEL SECURITY;

-- Public transparency: anyone can view non-rejected issues; reporters & admins see all permitted
DROP POLICY IF EXISTS "Public can read civic issues" ON public.civic_issues;
CREATE POLICY "Public can read civic issues"
  ON public.civic_issues FOR SELECT
  USING (
    status <> 'rejected'
    OR auth.uid() = reporter_id
    OR public.is_admin()
  );

-- Only authenticated citizens/admins can insert their own report, strictly in 'submitted' status
DROP POLICY IF EXISTS "Authenticated users create own reports" ON public.civic_issues;
CREATE POLICY "Authenticated users create own reports"
  ON public.civic_issues FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id
    AND status = 'submitted'
  );

-- Only admins can perform workflow status/assignment updates
DROP POLICY IF EXISTS "Admins manage all civic issues" ON public.civic_issues;
CREATE POLICY "Admins manage all civic issues"
  ON public.civic_issues FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Reporters can edit only their unverified ('submitted') reports without changing status
DROP POLICY IF EXISTS "Reporters edit own submitted report" ON public.civic_issues;
CREATE POLICY "Reporters edit own submitted report"
  ON public.civic_issues FOR UPDATE
  USING (auth.uid() = reporter_id AND status = 'submitted')
  WITH CHECK (auth.uid() = reporter_id AND status = 'submitted');

-- ----------------------------------------------------------------------------
-- 3. Issue History / Audit Trail Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.issue_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.civic_issues(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role text NOT NULL CHECK (actor_role IN ('citizen', 'admin', 'system')),
  action text NOT NULL CHECK (char_length(action) BETWEEN 2 AND 80),
  from_status text,
  to_status text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_history_issue_created
  ON public.issue_history (issue_id, created_at DESC);

ALTER TABLE public.issue_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read history of visible issues" ON public.issue_history;
CREATE POLICY "Public can read history of visible issues"
  ON public.issue_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.civic_issues i
      WHERE i.id = issue_id
        AND (i.status <> 'rejected' OR i.reporter_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Authenticated actors log history" ON public.issue_history;
CREATE POLICY "Authenticated actors log history"
  ON public.issue_history FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (actor_id = auth.uid() AND actor_role = 'citizen')
  );

-- ----------------------------------------------------------------------------
-- 4. Notifications Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  issue_id uuid REFERENCES public.civic_issues(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins or server create notifications" ON public.notifications;
CREATE POLICY "Admins or server create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. Storage Bucket for Evidence Photos (Private-by-default or signed / strict MIME)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'issue-evidence',
  'issue-evidence',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Authenticated users upload own issue evidence" ON storage.objects;
CREATE POLICY "Authenticated users upload own issue evidence"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'issue-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Signed or authorized read for issue evidence" ON storage.objects;
CREATE POLICY "Signed or authorized read for issue evidence"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'issue-evidence'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.civic_issues ci
        WHERE ci.image_path = name
          AND ci.status <> 'rejected'
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 6. Community Corroboration / Upvotes Table & Atomic RPC
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.issue_upvotes (
  issue_id uuid NOT NULL REFERENCES public.civic_issues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (issue_id, user_id)
);

ALTER TABLE public.issue_upvotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own upvotes" ON public.issue_upvotes;
CREATE POLICY "Users view own upvotes"
  ON public.issue_upvotes FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated users upvote once" ON public.issue_upvotes;
CREATE POLICY "Authenticated users upvote once"
  ON public.issue_upvotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.upvote_civic_issue(p_issue_id uuid)
RETURNS TABLE (
  issue jsonb,
  already_upvoted boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_inserted boolean := false;
  v_issue public.civic_issues%ROWTYPE;
  v_sev_score numeric;
  v_comm_score numeric;
  v_new_priority numeric;
  v_breakdown jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.issue_upvotes (issue_id, user_id)
  VALUES (p_issue_id, v_user_id)
  ON CONFLICT (issue_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF NOT v_inserted THEN
    SELECT * INTO v_issue FROM public.civic_issues WHERE id = p_issue_id;
    IF NOT FOUND THEN
      RETURN;
    END IF;
    RETURN QUERY SELECT to_jsonb(v_issue), true;
    RETURN;
  END IF;

  UPDATE public.civic_issues
  SET upvote_count = upvote_count + 1
  WHERE id = p_issue_id
  RETURNING * INTO v_issue;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_sev_score := CASE v_issue.severity
    WHEN 'critical' THEN 95
    WHEN 'high' THEN 75
    WHEN 'medium' THEN 45
    ELSE 20
  END;
  v_comm_score := LEAST(100, GREATEST(0, (v_issue.upvote_count - 1) * 15));
  v_new_priority := ROUND(
    LEAST(100, GREATEST(0,
      v_sev_score * 0.40 +
      v_issue.urgency_score * 0.30 +
      v_issue.public_impact_score * 0.25 +
      v_comm_score * 0.05
    )),
    2
  );

  v_breakdown := jsonb_build_object(
    'severityWeight', 0.4,
    'severityScore', v_sev_score,
    'urgencyWeight', 0.3,
    'urgencyScore', v_issue.urgency_score,
    'impactWeight', 0.25,
    'publicImpactScore', v_issue.public_impact_score,
    'communityWeight', 0.05,
    'communitySignalScore', v_comm_score,
    'finalScore', v_new_priority,
    'formulaSummary', format(
      '0.40×Severity(%s) + 0.30×Urgency(%s) + 0.25×Impact(%s) + 0.05×Community(%s) = %s',
      v_sev_score, v_issue.urgency_score, v_issue.public_impact_score, v_comm_score, v_new_priority
    )
  );

  UPDATE public.civic_issues
  SET priority_score = v_new_priority,
      priority_breakdown = v_breakdown
  WHERE id = p_issue_id
  RETURNING * INTO v_issue;

  RETURN QUERY SELECT to_jsonb(v_issue), false;
END;
$$;
