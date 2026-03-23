-- Migration: Allow admins to manage Indonesian cities
-- Description: Add write policies so admin dashboard can insert/update/delete city records.
DROP POLICY IF EXISTS "Admin can insert indonesian cities" ON public.indonesian_cities;

DROP POLICY IF EXISTS "Admin can update indonesian cities" ON public.indonesian_cities;

DROP POLICY IF EXISTS "Admin can delete indonesian cities" ON public.indonesian_cities;

CREATE POLICY "Admin can insert indonesian cities" ON public.indonesian_cities FOR
INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update indonesian cities" ON public.indonesian_cities FOR
UPDATE
    USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete indonesian cities" ON public.indonesian_cities FOR DELETE USING (public.is_admin());