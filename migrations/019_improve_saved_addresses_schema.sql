-- Migration: Improve saved_addresses schema
-- Description: Add structured address fields for client delivery management.
ALTER TABLE
    public.saved_addresses
ADD
    COLUMN IF NOT EXISTS recipient_name TEXT,
ADD
    COLUMN IF NOT EXISTS recipient_phone TEXT,
ADD
    COLUMN IF NOT EXISTS street_address TEXT,
ADD
    COLUMN IF NOT EXISTS district TEXT,
ADD
    COLUMN IF NOT EXISTS city TEXT,
ADD
    COLUMN IF NOT EXISTS province TEXT,
ADD
    COLUMN IF NOT EXISTS postal_code TEXT,
ADD
    COLUMN IF NOT EXISTS country TEXT DEFAULT 'Indonesia',
ADD
    COLUMN IF NOT EXISTS notes TEXT,
ADD
    COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Allow non-map address entry. Existing geography is kept for future map support.
ALTER TABLE
    public.saved_addresses
ALTER COLUMN
    location DROP NOT NULL;

-- Backfill street_address from previous free-text column for existing rows.
UPDATE
    public.saved_addresses
SET
    street_address = address_detail
WHERE
    street_address IS NULL
    AND address_detail IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_saved_addresses_city ON public.saved_addresses(city);

CREATE INDEX IF NOT EXISTS idx_saved_addresses_postal_code ON public.saved_addresses(postal_code);

-- Keep at most one default address per user.
CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_addresses_single_default ON public.saved_addresses(user_id)
WHERE
    is_default = TRUE;

COMMENT ON COLUMN public.saved_addresses.street_address IS 'Main street/building address line';

COMMENT ON COLUMN public.saved_addresses.district IS 'Subdistrict or kecamatan';

COMMENT ON COLUMN public.saved_addresses.city IS 'City or regency';

COMMENT ON COLUMN public.saved_addresses.province IS 'Province';

COMMENT ON COLUMN public.saved_addresses.postal_code IS 'Postal code';

COMMENT ON COLUMN public.saved_addresses.is_default IS 'Primary address used by default during checkout';