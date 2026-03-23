-- Migration: Add Indonesian cities databank
-- Description: Provide standardized city options for partner service area selection.
CREATE TABLE IF NOT EXISTS public.indonesian_cities (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    province TEXT NOT NULL,
    city_name TEXT NOT NULL,
    city_type TEXT NOT NULL CHECK (city_type IN ('Kota', 'Kabupaten')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (province, city_name, city_type)
);

CREATE INDEX IF NOT EXISTS idx_indonesian_cities_province ON public.indonesian_cities(province);

CREATE INDEX IF NOT EXISTS idx_indonesian_cities_city_name ON public.indonesian_cities(city_name);

DROP TRIGGER IF EXISTS update_indonesian_cities_updated_at ON public.indonesian_cities;

CREATE TRIGGER update_indonesian_cities_updated_at BEFORE
UPDATE
    ON public.indonesian_cities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Province capital cities plus major cities as baseline dataset.
INSERT INTO
    public.indonesian_cities (province, city_name, city_type)
VALUES
    ('Aceh', 'Banda Aceh', 'Kota'),
    ('Sumatera Utara', 'Medan', 'Kota'),
    ('Sumatera Barat', 'Padang', 'Kota'),
    ('Riau', 'Pekanbaru', 'Kota'),
    ('Kepulauan Riau', 'Tanjung Pinang', 'Kota'),
    ('Jambi', 'Jambi', 'Kota'),
    ('Sumatera Selatan', 'Palembang', 'Kota'),
    ('Bangka Belitung', 'Pangkal Pinang', 'Kota'),
    ('Bengkulu', 'Bengkulu', 'Kota'),
    ('Lampung', 'Bandar Lampung', 'Kota'),
    ('DKI Jakarta', 'Jakarta Pusat', 'Kota'),
    ('DKI Jakarta', 'Jakarta Barat', 'Kota'),
    ('DKI Jakarta', 'Jakarta Selatan', 'Kota'),
    ('DKI Jakarta', 'Jakarta Timur', 'Kota'),
    ('DKI Jakarta', 'Jakarta Utara', 'Kota'),
    ('Banten', 'Serang', 'Kota'),
    ('Banten', 'Tangerang', 'Kota'),
    ('Banten', 'Tangerang Selatan', 'Kota'),
    ('Jawa Barat', 'Bandung', 'Kota'),
    ('Jawa Barat', 'Bekasi', 'Kota'),
    ('Jawa Barat', 'Bogor', 'Kota'),
    ('Jawa Tengah', 'Semarang', 'Kota'),
    ('Jawa Tengah', 'Surakarta', 'Kota'),
    ('DI Yogyakarta', 'Yogyakarta', 'Kota'),
    ('Jawa Timur', 'Surabaya', 'Kota'),
    ('Jawa Timur', 'Malang', 'Kota'),
    ('Bali', 'Denpasar', 'Kota'),
    ('Nusa Tenggara Barat', 'Mataram', 'Kota'),
    ('Nusa Tenggara Timur', 'Kupang', 'Kota'),
    ('Kalimantan Barat', 'Pontianak', 'Kota'),
    ('Kalimantan Tengah', 'Palangka Raya', 'Kota'),
    ('Kalimantan Selatan', 'Banjarbaru', 'Kota'),
    ('Kalimantan Timur', 'Samarinda', 'Kota'),
    ('Kalimantan Utara', 'Tanjung Selor', 'Kabupaten'),
    ('Sulawesi Utara', 'Manado', 'Kota'),
    ('Gorontalo', 'Gorontalo', 'Kota'),
    ('Sulawesi Tengah', 'Palu', 'Kota'),
    ('Sulawesi Barat', 'Mamuju', 'Kabupaten'),
    ('Sulawesi Selatan', 'Makassar', 'Kota'),
    ('Sulawesi Tenggara', 'Kendari', 'Kota'),
    ('Maluku', 'Ambon', 'Kota'),
    ('Maluku Utara', 'Sofifi', 'Kota'),
    ('Papua', 'Jayapura', 'Kota'),
    ('Papua Barat', 'Manokwari', 'Kabupaten'),
    ('Papua Barat Daya', 'Sorong', 'Kota'),
    ('Papua Tengah', 'Nabire', 'Kabupaten'),
    ('Papua Pegunungan', 'Wamena', 'Kabupaten'),
    ('Papua Selatan', 'Merauke', 'Kabupaten') ON CONFLICT (province, city_name, city_type) DO NOTHING;

ALTER TABLE
    public.indonesian_cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view Indonesian cities" ON public.indonesian_cities;

CREATE POLICY "Public can view Indonesian cities" ON public.indonesian_cities FOR
SELECT
    USING (true);

COMMENT ON TABLE public.indonesian_cities IS 'Databank for Indonesian cities used in profile service area dropdown';