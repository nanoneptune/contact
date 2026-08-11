-- ======================================================================
-- SUPABASE CONTACTS TABLE SETUP SCRIPT
-- Project URL: https://qyzkvztmdxebgaknuvfl.supabase.co
-- SQL Editor URL: https://supabase.com/dashboard/project/qyzkvztmdxebgaknuvfl/sql/new
-- ======================================================================

-- 1. Create the contacts table with support for all field name variations
CREATE TABLE IF NOT EXISTS public.contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  place TEXT NOT NULL,
  "isFavorite" BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  "createdAt" BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  created_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 2. Add missing columns if table was created previously without them
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='isFavorite') THEN
        ALTER TABLE public.contacts ADD COLUMN "isFavorite" BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='is_favorite') THEN
        ALTER TABLE public.contacts ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='createdAt') THEN
        ALTER TABLE public.contacts ADD COLUMN "createdAt" BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='created_at') THEN
        ALTER TABLE public.contacts ADD COLUMN created_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint;
    END IF;
END $$;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- 4. Drop old policies to avoid duplicates
DROP POLICY IF EXISTS "Allow anonymous read access" ON public.contacts;
DROP POLICY IF EXISTS "Allow anonymous insert access" ON public.contacts;
DROP POLICY IF EXISTS "Allow anonymous update access" ON public.contacts;
DROP POLICY IF EXISTS "Allow anonymous delete access" ON public.contacts;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.contacts;

-- 5. Create permissive Row Level Security (RLS) policies
CREATE POLICY "Enable all access for all users"
  ON public.contacts
  FOR ALL
  TO public, anon, authenticated
  USING (true)
  WITH CHECK (true);
