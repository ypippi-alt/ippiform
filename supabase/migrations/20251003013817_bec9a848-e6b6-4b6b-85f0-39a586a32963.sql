-- Drop the unused admins table that stores password hashes
-- This table is not used by the application, which correctly uses Supabase Auth instead
-- Removing it eliminates the security risk of exposed password hashes

DROP TABLE IF EXISTS public.admins CASCADE;