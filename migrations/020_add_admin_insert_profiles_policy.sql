-- Allow admin dashboard to create profile rows (e.g., partner provisioning)
-- This is required for admin-side "Add Partner" flow.
DROP POLICY IF EXISTS "Admin can insert profiles" ON public.profiles;

CREATE POLICY "Admin can insert profiles" ON public.profiles FOR
INSERT
    WITH CHECK (
        public.is_admin()
        AND role IN ('client', 'mitra', 'admin')
    );