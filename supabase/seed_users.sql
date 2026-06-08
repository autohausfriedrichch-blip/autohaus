-- ============================================================
-- AUTOHAUS FRIEDRICH – Initial User Accounts
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- The SQL Editor runs as superuser and can write to auth.users
-- ============================================================

-- Enable pgcrypto if not already active
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Helper: skip if email already exists ────────────────────
DO $$
DECLARE
  barbara_id UUID;
  karl_id     UUID;
BEGIN

  -- ── USER 1: Barbara Friedrich (super_admin) ─────────────────
  SELECT id INTO barbara_id FROM auth.users WHERE email = 'adminfriedrichautohaus@gmail.com';

  IF barbara_id IS NULL THEN
    barbara_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      aud, role, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      barbara_id,
      '00000000-0000-0000-0000-000000000000',
      'adminfriedrichautohaus@gmail.com',
      crypt('AdminFA2026@', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Barbara Friedrich"}',
      'authenticated', 'authenticated',
      NOW(), NOW(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      barbara_id,
      jsonb_build_object('sub', barbara_id::text, 'email', 'adminfriedrichautohaus@gmail.com'),
      'email', NOW(), NOW(), NOW()
    );

    RAISE NOTICE 'Created Barbara Friedrich (super_admin) – id: %', barbara_id;
  ELSE
    RAISE NOTICE 'Barbara Friedrich already exists – id: %', barbara_id;
  END IF;

  -- Upsert profile
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (barbara_id, 'adminfriedrichautohaus@gmail.com', 'Barbara Friedrich', 'super_admin')
  ON CONFLICT (id) DO UPDATE SET
    email     = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role      = EXCLUDED.role;

  -- ── USER 2: Karl Friedrich (mechanic) ───────────────────────
  SELECT id INTO karl_id FROM auth.users WHERE email = 'autohausfriedrich.ch@gmail.com';

  IF karl_id IS NULL THEN
    karl_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      aud, role, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      karl_id,
      '00000000-0000-0000-0000-000000000000',
      'autohausfriedrich.ch@gmail.com',
      crypt('Puntigamer1989@', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Karl Friedrich"}',
      'authenticated', 'authenticated',
      NOW(), NOW(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      karl_id,
      jsonb_build_object('sub', karl_id::text, 'email', 'autohausfriedrich.ch@gmail.com'),
      'email', NOW(), NOW(), NOW()
    );

    RAISE NOTICE 'Created Karl Friedrich (mechanic) – id: %', karl_id;
  ELSE
    RAISE NOTICE 'Karl Friedrich already exists – id: %', karl_id;
  END IF;

  -- Upsert profile
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (karl_id, 'autohausfriedrich.ch@gmail.com', 'Karl Friedrich', 'mechanic')
  ON CONFLICT (id) DO UPDATE SET
    email     = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role      = EXCLUDED.role;

END $$;

-- ─── Verify ───────────────────────────────────────────────────
SELECT
  u.email,
  p.full_name,
  p.role,
  u.email_confirmed_at IS NOT NULL AS confirmed,
  u.created_at
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email IN (
  'adminfriedrichautohaus@gmail.com',
  'autohausfriedrich.ch@gmail.com'
)
ORDER BY p.role;
