-- Run this in Supabase SQL Editor
-- Sets erion@gen-z.digital as the admin/owner of the app

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'erion@gen-z.digital';

-- Verify
SELECT id, email, full_name, role FROM public.profiles WHERE email = 'erion@gen-z.digital';
