-- Migration: Partner Referral System
-- Description: Track partner referrals for future incentive programs
-- Add referral code to profiles
ALTER TABLE
    profiles
ADD
    COLUMN IF NOT EXISTS referral_code VARCHAR(10) UNIQUE,
ADD
    COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);

-- Create index for faster referral lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code)
WHERE
    referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by)
WHERE
    referred_by IS NOT NULL;

-- Function to generate unique referral code
CREATE
OR REPLACE FUNCTION generate_referral_code() RETURNS VARCHAR(10) AS $ $ DECLARE new_code VARCHAR(10);

code_exists BOOLEAN;

BEGIN LOOP -- Generate 8-character alphanumeric code (e.g., "TG5X9A2B")
new_code := 'TG' || UPPER(
    SUBSTRING(
        MD5(RANDOM() :: TEXT || CLOCK_TIMESTAMP() :: TEXT)
        FROM
            1 FOR 6
    )
);

-- Check if code already exists
SELECT
    EXISTS(
        SELECT
            1
        FROM
            profiles
        WHERE
            referral_code = new_code
    ) INTO code_exists;

EXIT
WHEN NOT code_exists;

END LOOP;

RETURN new_code;

END;

$ $ LANGUAGE plpgsql VOLATILE;

-- Auto-generate referral codes for existing partners
UPDATE
    profiles
SET
    referral_code = generate_referral_code()
WHERE
    role = 'mitra'
    AND referral_code IS NULL;

-- Trigger to auto-generate referral code for new partners
CREATE
OR REPLACE FUNCTION auto_generate_referral_code() RETURNS TRIGGER AS $ $ BEGIN IF NEW.role = 'mitra'
AND NEW.referral_code IS NULL THEN NEW.referral_code := generate_referral_code();

END IF;

RETURN NEW;

END;

$ $ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_referral_code BEFORE
INSERT
    ON profiles FOR EACH ROW EXECUTE FUNCTION auto_generate_referral_code();

-- Create referrals tracking table (for detailed analytics in the future)
CREATE TABLE IF NOT EXISTS partner_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referral_code VARCHAR(10) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    bonus_amount DECIMAL(10, 2) DEFAULT 0,
    bonus_paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(referrer_id, referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON partner_referrals(referrer_id);

CREATE INDEX IF NOT EXISTS idx_referrals_referred ON partner_referrals(referred_id);

CREATE INDEX IF NOT EXISTS idx_referrals_status ON partner_referrals(status);

-- Trigger to create referral record when partner signs up with referral code
CREATE
OR REPLACE FUNCTION track_referral() RETURNS TRIGGER AS $ $ DECLARE referrer_profile_id UUID;

BEGIN IF NEW.role = 'mitra'
AND NEW.referred_by IS NOT NULL THEN -- Create referral tracking record
INSERT INTO
    partner_referrals (referrer_id, referred_id, referral_code, status)
SELECT
    NEW.referred_by,
    NEW.id,
    p.referral_code,
    'pending'
FROM
    profiles p
WHERE
    p.id = NEW.referred_by ON CONFLICT (referrer_id, referred_id) DO NOTHING;

END IF;

RETURN NEW;

END;

$ $ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_referral
AFTER
INSERT
    ON profiles FOR EACH ROW EXECUTE FUNCTION track_referral();

-- Update referral status when referred partner gets verified
CREATE
OR REPLACE FUNCTION update_referral_on_verification() RETURNS TRIGGER AS $ $ BEGIN IF NEW.is_verified = TRUE
AND OLD.is_verified = FALSE
AND NEW.role = 'mitra' THEN
UPDATE
    partner_referrals
SET
    status = 'active'
WHERE
    referred_id = NEW.id
    AND status = 'pending';

END IF;

RETURN NEW;

END;

$ $ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_referral_verification
AFTER
UPDATE
    OF is_verified ON profiles FOR EACH ROW EXECUTE FUNCTION update_referral_on_verification();

COMMENT ON TABLE partner_referrals IS 'Tracks partner referral relationships for future incentive programs';

COMMENT ON COLUMN profiles.referral_code IS 'Unique code partners can share to refer new partners';

COMMENT ON COLUMN profiles.referred_by IS 'ID of the partner who referred this partner';