-- Add missing columns to profiles table for admin dashboard
-- 1. is_active: allows admin to enable/disable user accounts
ALTER TABLE
    profiles
ADD
    COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. email: copy from auth.users for easier querying
ALTER TABLE
    profiles
ADD
    COLUMN IF NOT EXISTS email TEXT;

-- Add comments for documentation
COMMENT ON COLUMN profiles.is_active IS 'Whether the account is active (can be disabled by admin)';

COMMENT ON COLUMN profiles.email IS 'User email copied from auth.users for easier querying';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Update existing profiles with email from auth.users
UPDATE
    profiles p
SET
    email = u.email
FROM
    auth.users u
WHERE
    p.id = u.id
    AND p.email IS NULL;

-- Update trigger to also copy email on new user signup
CREATE
OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $ $ BEGIN
INSERT INTO
    public.profiles (id, role, full_name, phone, email)
VALUES
    (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'role', 'client'),
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'phone',
        NEW.email
    );

RETURN NEW;

END;

$ $ LANGUAGE plpgsql SECURITY DEFINER;