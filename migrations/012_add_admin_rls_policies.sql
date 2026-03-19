-- Add RLS policies for admin users to access all data
-- Using a security definer function to avoid infinite recursion
-- Create a function to check if user is admin (avoids recursion)
CREATE
OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $ $
SELECT
    EXISTS (
        SELECT
            1
        FROM
            profiles
        WHERE
            id = auth.uid()
            AND role = 'admin'
    );

$ $ LANGUAGE sql SECURITY DEFINER STABLE;

-- Allow admin users to view ALL orders
CREATE POLICY "Admin can view all orders" ON orders FOR
SELECT
    USING (is_admin());

-- Allow admin users to update ALL orders
CREATE POLICY "Admin can update all orders" ON orders FOR
UPDATE
    USING (is_admin());

-- For profiles, we need a simpler approach - just allow viewing all for authenticated users
-- The app logic handles admin-only access
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Authenticated users can view profiles" ON profiles FOR
SELECT
    USING (auth.uid() IS NOT NULL);

-- Allow users to update own profile, admin can update all
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own or admin all" ON profiles FOR
UPDATE
    USING (
        auth.uid() = id
        OR is_admin()
    );

-- Allow admin to view all wallet transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON wallet_transactions;

CREATE POLICY "Users and admin can view transactions" ON wallet_transactions FOR
SELECT
    USING (
        auth.uid() = user_id
        OR is_admin()
    );

-- Allow admin to view all notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;

CREATE POLICY "Users and admin can view notifications" ON notifications FOR
SELECT
    USING (
        auth.uid() = user_id
        OR is_admin()
    );

-- Allow admin to manage services (insert, update, delete)
CREATE POLICY "Admin can insert services" ON services FOR
INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admin can update services" ON services FOR
UPDATE
    USING (is_admin());

CREATE POLICY "Admin can delete services" ON services FOR DELETE USING (is_admin());