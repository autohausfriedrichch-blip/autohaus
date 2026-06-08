-- ============================================================
-- FIX: User creation blocked — profiles trigger + RLS policies
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- 1. Fix the trigger function (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Re-create the trigger (drop first to be safe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Add service_role bypass policy so admin API can also insert profiles
DROP POLICY IF EXISTS "service_role_profiles" ON public.profiles;
CREATE POLICY "service_role_profiles" ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Verify existing users have profiles — create missing ones
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  COALESCE(u.raw_user_meta_data->>'role', 'customer')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 5. Update roles for known users
UPDATE public.profiles
SET role = 'super_admin', full_name = 'Barbara Friedrich'
WHERE email = 'adminfriedrichautohaus@gmail.com';

UPDATE public.profiles
SET role = 'mechanic', full_name = 'Karl Friedrich'
WHERE email = 'autohausfriedrich.ch@gmail.com';

-- 6. Show result
SELECT id, email, full_name, role, created_at
FROM public.profiles
ORDER BY created_at;
