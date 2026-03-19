-- Migration: Fix referral function resolution for partner signup
-- Description: Ensure referral code function exists in public schema and trigger calls it explicitly.
CREATE
OR REPLACE FUNCTION public.generate_referral_code() RETURNS VARCHAR(10) LANGUAGE plpgsql VOLATILE
SET
    search_path = public AS $ $ DECLARE new_code VARCHAR(10);

code_exists BOOLEAN;

BEGIN LOOP -- Generate 8-character alphanumeric code (e.g. TG5X9A2B)
new_code := 'TG' || UPPER(
    SUBSTRING(
        MD5(RANDOM() :: TEXT || CLOCK_TIMESTAMP() :: TEXT)
        FROM
            1 FOR 6
    )
);

SELECT
    EXISTS(
        SELECT
            1
        FROM
            public.profiles
        WHERE
            referral_code = new_code
    ) INTO code_exists;

EXIT
WHEN NOT code_exists;

END LOOP;

RETURN new_code;

END;

$ $;

CREATE
OR REPLACE FUNCTION public.auto_generate_referral_code() RETURNS TRIGGER LANGUAGE plpgsql
SET
    search_path = public AS $ $ BEGIN IF NEW.role = 'mitra'
    AND NEW.referral_code IS NULL THEN NEW.referral_code := public.generate_referral_code();

END IF;

RETURN NEW;

END;

$ $;

-- Recreate trigger to ensure it points at the public schema function.
DROP TRIGGER IF EXISTS trigger_auto_referral_code ON public.profiles;

CREATE TRIGGER trigger_auto_referral_code BEFORE
INSERT
    ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.auto_generate_referral_code();

-- Backfill any existing partner rows still missing referral codes.
UPDATE
    public.profiles
SET
    referral_code = public.generate_referral_code()
WHERE
    role = 'mitra'
    AND referral_code IS NULL;