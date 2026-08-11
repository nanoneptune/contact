-- ======================================================================
-- SUPABASE MIGRATION SCRIPT: ADD OPTIONAL 'email' COLUMN
-- Project URL: https://qyzkvztmdxebgaknuvfl.supabase.co
-- SQL Editor: https://supabase.com/dashboard/project/qyzkvztmdxebgaknuvfl/sql/new
-- ======================================================================

-- 1. Add optional 'email' column to public.contacts table if not present
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='email') THEN
        ALTER TABLE public.contacts ADD COLUMN email TEXT;
    END IF;
END $$;

-- 2. Full schema table definition reference
CREATE TABLE IF NOT EXISTS public.contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  place TEXT NOT NULL,
  email TEXT,
  "isFavorite" BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  "createdAt" BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  created_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 3. Row Level Security policies
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for all users" ON public.contacts;

CREATE POLICY "Enable all access for all users"
  ON public.contacts
  FOR ALL
  TO public, anon, authenticated
  USING (true)
  WITH CHECK (true);
