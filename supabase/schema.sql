-- ============================================================================
-- THE 12 CHRONICLES — SUPABASE POSTGRESQL SCHEMA & RLS POLICIES
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFILES (Linked to auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  photo_url TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'Member' CHECK (role IN ('Admin', 'Treasurer', 'Member')),
  role_status TEXT NOT NULL DEFAULT 'approved' CHECK (role_status IN ('approved', 'pending')),
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended')),
  nickname TEXT DEFAULT '',
  trip_role TEXT DEFAULT '',
  fun_fact TEXT DEFAULT '',
  invite_code TEXT DEFAULT '',
  invited_role TEXT DEFAULT 'Member',
  approved_by UUID REFERENCES auth.users(id),
  approved_by_name TEXT DEFAULT '',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. GROUP INVITATIONS (Admin only management, public redemption via RPC)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_invites (
  code TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('Member', 'Treasurer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  max_uses INT NOT NULL DEFAULT 1,
  usage_count INT NOT NULL DEFAULT 0,
  used_by JSONB DEFAULT '[]'::JSONB,
  note TEXT DEFAULT '',
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. EXPENSES (Admin & Approved Treasurer manage; all members view)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Other',
  date TIMESTAMPTZ DEFAULT NOW(),
  paid_by_id UUID REFERENCES auth.users(id),
  paid_by_name TEXT NOT NULL DEFAULT '',
  split_type TEXT DEFAULT 'equal',
  split_between JSONB DEFAULT '[]'::JSONB,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'settled')),
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  updated_by_name TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. EXPENSE CATEGORIES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id TEXT PRIMARY KEY DEFAULT 'default',
  categories JSONB NOT NULL DEFAULT '["Food", "Travel", "Hotel", "Sightseeing", "Shopping", "Other"]'::JSONB,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. EXPLORE DESTINATIONS (Shared Mumbai list with realtime sync)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.explore_destinations (
  id TEXT PRIMARY KEY,
  place_id TEXT UNIQUE,
  osm_id TEXT,
  osm_type TEXT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  address TEXT DEFAULT '',
  coordinates JSONB,
  category TEXT DEFAULT 'Destination',
  photos JSONB DEFAULT '[]'::JSONB,
  photo_url TEXT DEFAULT '',
  wikipedia_url TEXT DEFAULT '',
  osm_url TEXT DEFAULT '',
  website TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  opening_hours TEXT DEFAULT '',
  entry_fee TEXT DEFAULT '',
  best_time TEXT DEFAULT '',
  visitor_tips TEXT DEFAULT '',
  accessibility TEXT DEFAULT '',
  status TEXT DEFAULT 'Yet to Visit',
  visited BOOLEAN DEFAULT FALSE,
  added_by_id UUID REFERENCES auth.users(id),
  added_by_name TEXT DEFAULT '',
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. SCHEDULE (Day-by-day Itinerary)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schedule (
  id TEXT PRIMARY KEY,
  day INT NOT NULL,
  day_label TEXT NOT NULL,
  time TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT DEFAULT '',
  map_url TEXT DEFAULT '',
  category TEXT DEFAULT 'Activity',
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'Upcoming',
  added_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. PHOTOS (Hall of Fame Gallery)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.photos (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT DEFAULT '',
  caption TEXT DEFAULT '',
  date TEXT DEFAULT '',
  day INT DEFAULT 1,
  album TEXT DEFAULT 'All',
  likes INT DEFAULT 0,
  liked_by JSONB DEFAULT '[]'::JSONB,
  uploader_id UUID REFERENCES auth.users(id),
  uploader_name TEXT DEFAULT '',
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. TASKS & POLLS (Planner)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  assigned_to TEXT DEFAULT '',
  due_date TEXT DEFAULT '',
  priority TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'To Do',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.polls (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  created_by TEXT DEFAULT '',
  active BOOLEAN DEFAULT TRUE,
  options JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. ANNOUNCEMENTS & LOGISTICS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  date TEXT DEFAULT '',
  priority TEXT DEFAULT 'Notice',
  author TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.logistics (
  id TEXT PRIMARY KEY DEFAULT 'default',
  train JSONB NOT NULL,
  hotel JSONB NOT NULL,
  rooms JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HELPER FUNCTIONS FOR SECURITY RULES (RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'Admin'
      AND role_status = 'approved'
      AND account_status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_manage_expenses()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND account_status = 'active'
      AND role_status = 'approved'
      AND (role = 'Admin' OR role = 'Treasurer')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explore_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics ENABLE ROW LEVEL SECURITY;

-- Profiles: Authenticated users can read all members; users can edit own profile fields; Admin can update all
CREATE POLICY "Profiles viewable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (
    public.is_admin() OR (
      id = auth.uid() AND
      role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
      role_status = (SELECT role_status FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Group Invites: Strictly Admin-only access
CREATE POLICY "Invites viewable and manageable by Admin" ON public.group_invites
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Expenses: Everyone can view; only Admin or Approved Treasurer can insert, update or delete
CREATE POLICY "Expenses viewable by all authenticated" ON public.expenses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Expenses manageable by Admin and Treasurer" ON public.expenses
  FOR ALL TO authenticated
  USING (public.can_manage_expenses())
  WITH CHECK (public.can_manage_expenses());

-- Expense Categories: Viewable by all; editable by Treasurer & Admin
CREATE POLICY "Categories viewable by all" ON public.expense_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Categories editable by Treasurer and Admin" ON public.expense_categories
  FOR ALL TO authenticated
  USING (public.can_manage_expenses())
  WITH CHECK (public.can_manage_expenses());

-- Explore Destinations: Realtime shared
CREATE POLICY "Destinations viewable by all" ON public.explore_destinations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Destinations editable by members" ON public.explore_destinations
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Schedule, Photos, Tasks, Polls, Announcements, Logistics: Shared squad access
CREATE POLICY "Schedule viewable by all" ON public.schedule FOR SELECT TO authenticated USING (true);
CREATE POLICY "Schedule editable by members" ON public.schedule FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Photos viewable by all" ON public.photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Photos editable by members" ON public.photos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Tasks viewable by all" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tasks editable by members" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Polls viewable by all" ON public.polls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Polls editable by members" ON public.polls FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Announcements viewable by all" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Announcements editable by members" ON public.announcements FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Logistics viewable by all" ON public.logistics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Logistics editable by members" ON public.logistics FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- SECURE RPC FUNCTIONS FOR INVITATIONS & ADMIN CONTROLS
-- ============================================================================

-- Preview Invitation (Public/Unauthenticated safe check)
CREATE OR REPLACE FUNCTION public.preview_invitation(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_invite RECORD;
  v_max_uses INT;
  v_usage_count INT;
BEGIN
  IF p_code IS NULL OR TRIM(p_code) = '' THEN
    RAISE EXCEPTION 'Please enter an invitation code.';
  END IF;

  SELECT * INTO v_invite FROM public.group_invites WHERE code = UPPER(TRIM(p_code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invitation code. Please check the code provided by the Admin.';
  END IF;

  IF v_invite.status = 'revoked' THEN
    RAISE EXCEPTION 'This invitation code has been revoked by the Admin.';
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at <= NOW() THEN
    RAISE EXCEPTION 'This invitation code has expired.';
  END IF;

  v_max_uses := GREATEST(1, v_invite.max_uses);
  v_usage_count := COALESCE(v_invite.usage_count, 0);

  IF v_usage_count >= v_max_uses THEN
    RAISE EXCEPTION 'This invitation code has reached its maximum usage limit.';
  END IF;

  RETURN jsonb_build_object(
    'code', v_invite.code,
    'role', v_invite.role,
    'status', v_invite.status,
    'maxUses', v_max_uses,
    'usageCount', v_usage_count,
    'remainingUses', v_max_uses - v_usage_count,
    'expiresAt', v_invite.expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safe Invitation Redemption (Called during sign up)
CREATE OR REPLACE FUNCTION public.redeem_invitation(
  p_code TEXT,
  p_user_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_photo_url TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_invite RECORD;
  v_role TEXT;
  v_role_status TEXT;
  v_used_by JSONB;
BEGIN
  SELECT * INTO v_invite FROM public.group_invites WHERE code = UPPER(TRIM(p_code)) FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invitation code. Please check the code provided by the Admin.';
  END IF;

  IF v_invite.status = 'revoked' THEN
    RAISE EXCEPTION 'This invitation code has been revoked by the Admin.';
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at <= NOW() THEN
    RAISE EXCEPTION 'This invitation code has expired.';
  END IF;

  IF v_invite.usage_count >= v_invite.max_uses THEN
    RAISE EXCEPTION 'This invitation code has reached its maximum usage limit.';
  END IF;

  v_role := v_invite.role;
  v_role_status := CASE WHEN v_role = 'Treasurer' THEN 'pending' ELSE 'approved' END;

  v_used_by := COALESCE(v_invite.used_by, '[]'::JSONB) || jsonb_build_object(
    'uid', p_user_id,
    'email', p_email,
    'name', p_full_name,
    'at', NOW()
  );

  UPDATE public.group_invites
  SET usage_count = usage_count + 1,
      used_by = v_used_by,
      updated_at = NOW()
  WHERE code = v_invite.code;

  INSERT INTO public.profiles (
    id, full_name, email, photo_url, role, role_status, account_status, invite_code, invited_role
  ) VALUES (
    p_user_id, p_full_name, p_email, p_photo_url, v_role, v_role_status, 'active', v_invite.code, v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    photo_url = CASE WHEN EXCLUDED.photo_url <> '' THEN EXCLUDED.photo_url ELSE public.profiles.photo_url END,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'role', v_role, 'role_status', v_role_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Approve Treasurer
CREATE OR REPLACE FUNCTION public.approve_treasurer(p_uid UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an Admin can approve Treasurer applications.';
  END IF;

  UPDATE public.profiles
  SET role = 'Treasurer',
      role_status = 'approved',
      approved_by = auth.uid(),
      approved_at = NOW(),
      updated_at = NOW()
  WHERE id = p_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Reject Treasurer
CREATE OR REPLACE FUNCTION public.reject_treasurer(p_uid UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an Admin can review Treasurer applications.';
  END IF;

  UPDATE public.profiles
  SET role = 'Member',
      role_status = 'approved',
      approved_by = auth.uid(),
      approved_at = NOW(),
      updated_at = NOW()
  WHERE id = p_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Set Member Role
CREATE OR REPLACE FUNCTION public.set_member_role(p_uid UUID, p_role TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an Admin can change member roles.';
  END IF;

  IF p_uid = auth.uid() THEN
    RAISE EXCEPTION 'You cannot change your own Admin role.';
  END IF;

  IF p_role NOT IN ('Member', 'Treasurer') THEN
    RAISE EXCEPTION 'Invalid role specified.';
  END IF;

  UPDATE public.profiles
  SET role = p_role,
      role_status = 'approved',
      approved_by = auth.uid(),
      approved_at = NOW(),
      updated_at = NOW()
  WHERE id = p_uid AND role <> 'Admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bootstrap Initial Admin (Only allowed when no approved Admin exists yet)
CREATE OR REPLACE FUNCTION public.bootstrap_admin(p_email TEXT)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'Admin' AND role_status = 'approved' AND account_status = 'active') THEN
    RAISE EXCEPTION 'An active Admin already exists for this group.';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(TRIM(p_email));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User account not found in auth.users. Please sign up or create the account first.';
  END IF;

  INSERT INTO public.profiles (
    id, full_name, email, role, role_status, account_status
  ) VALUES (
    v_user_id, COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_user_id), 'Admin Owner'), p_email, 'Admin', 'approved', 'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'Admin',
    role_status = 'approved',
    account_status = 'active',
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set / Recover Admin Password (Strictly restricted to authorized Admin email)
CREATE OR REPLACE FUNCTION public.set_admin_password(p_email TEXT, p_new_password TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF LOWER(TRIM(p_email)) <> 'harshitvaidya28@gmail.com' THEN
    RAISE EXCEPTION 'Only the authorized Admin email can reset the Admin password.';
  END IF;

  IF LENGTH(p_new_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters long.';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(TRIM(p_email));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Admin user account not found in auth.users.';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      confirmed_at = COALESCE(confirmed_at, NOW()),
      updated_at = NOW()
  WHERE id = v_user_id;

  INSERT INTO public.profiles (
    id, full_name, email, role, role_status, account_status
  ) VALUES (
    v_user_id, 'Harshit Vaidya (Admin)', p_email, 'Admin', 'approved', 'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'Admin',
    role_status = 'approved',
    account_status = 'active',
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'message', 'Admin password updated and confirmed.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- REALTIME SUBSCRIPTIONS SETUP
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'expenses') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'explore_destinations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.explore_destinations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'photos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.photos;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'group_invites') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_invites;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;
