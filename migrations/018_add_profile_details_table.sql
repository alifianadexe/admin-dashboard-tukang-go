-- Migration: Add profile_details table
-- Description: Store extended personal and preference data for both clients and partners.
CREATE TABLE IF NOT EXISTS public.profile_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Personal details
    date_of_birth DATE,
    gender TEXT CHECK (
        gender IN ('male', 'female', 'other', 'prefer_not_to_say')
    ),
    bio TEXT,
    -- Identity and compliance
    identity_type TEXT,
    identity_number TEXT,
    identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
    -- Contact and preference data
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relation TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'id',
    theme_preference TEXT NOT NULL DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
    notification_preferences JSONB NOT NULL DEFAULT '{"order_updates": true, "promo": true, "chat": true, "system": true}' :: jsonb,
    -- Address and location preferences
    default_address_label TEXT,
    default_address_detail TEXT,
    -- Partner specific details
    years_experience INTEGER,
    service_area TEXT,
    skills TEXT [] DEFAULT '{}',
    document_links JSONB NOT NULL DEFAULT '[]' :: jsonb,
    bank_account_name TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    -- Extensible payload for future requirements
    metadata JSONB NOT NULL DEFAULT '{}' :: jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_details_profile_id ON public.profile_details(profile_id);

CREATE INDEX IF NOT EXISTS idx_profile_details_language ON public.profile_details(preferred_language);

-- Keep updated_at in sync
DROP TRIGGER IF EXISTS update_profile_details_updated_at ON public.profile_details;

CREATE TRIGGER update_profile_details_updated_at BEFORE
UPDATE
    ON public.profile_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure every profile gets one detail row
CREATE
OR REPLACE FUNCTION public.ensure_profile_details_row() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = public AS $ $ BEGIN
INSERT INTO
    public.profile_details (profile_id)
VALUES
    (NEW.id) ON CONFLICT (profile_id) DO NOTHING;

RETURN NEW;

END;

$ $;

DROP TRIGGER IF EXISTS trigger_create_profile_details ON public.profiles;

CREATE TRIGGER trigger_create_profile_details
AFTER
INSERT
    ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.ensure_profile_details_row();

-- Backfill missing detail rows for existing users
INSERT INTO
    public.profile_details (profile_id)
SELECT
    p.id
FROM
    public.profiles p
    LEFT JOIN public.profile_details pd ON pd.profile_id = p.id
WHERE
    pd.id IS NULL;

-- RLS
ALTER TABLE
    public.profile_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile details" ON public.profile_details;

CREATE POLICY "Users can view own profile details" ON public.profile_details FOR
SELECT
    USING (
        auth.uid() = profile_id
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Users can insert own profile details" ON public.profile_details;

CREATE POLICY "Users can insert own profile details" ON public.profile_details FOR
INSERT
    WITH CHECK (
        auth.uid() = profile_id
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Users can update own profile details" ON public.profile_details;

CREATE POLICY "Users can update own profile details" ON public.profile_details FOR
UPDATE
    USING (
        auth.uid() = profile_id
        OR public.is_admin()
    ) WITH CHECK (
        auth.uid() = profile_id
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Users can delete own profile details" ON public.profile_details;

CREATE POLICY "Users can delete own profile details" ON public.profile_details FOR DELETE USING (
    auth.uid() = profile_id
    OR public.is_admin()
);

COMMENT ON TABLE public.profile_details IS 'Extended user profile data (client and partner specific details)';

COMMENT ON COLUMN public.profile_details.profile_id IS 'Parent profile record (one-to-one with profiles.id)';

COMMENT ON COLUMN public.profile_details.notification_preferences IS 'JSON notification toggles used by mobile apps';

COMMENT ON COLUMN public.profile_details.document_links IS 'JSON array for partner documents (KTP, certificates, etc.)';