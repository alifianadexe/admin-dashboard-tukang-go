-- Migration: Add hardware marketplace items for client material catalog
-- Description: Stores material listings, prices, stock, and hardware store WhatsApp references.
CREATE TABLE IF NOT EXISTS public.hardware_marketplace_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT NOT NULL DEFAULT 'unit',
    stock_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    price NUMERIC(12, 2) NOT NULL,
    original_price NUMERIC(12, 2),
    discount_label TEXT,
    description TEXT,
    image_url TEXT,
    store_name TEXT NOT NULL,
    store_phone TEXT NOT NULL,
    store_whatsapp_phone TEXT,
    store_address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT hardware_marketplace_items_price_positive CHECK (price > 0),
    CONSTRAINT hardware_marketplace_items_stock_non_negative CHECK (stock_amount >= 0),
    CONSTRAINT hardware_marketplace_items_original_price_valid CHECK (
        original_price IS NULL
        OR original_price >= price
    )
);

CREATE INDEX IF NOT EXISTS idx_hardware_marketplace_items_active_order ON public.hardware_marketplace_items (is_active, display_order, created_at DESC);

DROP TRIGGER IF EXISTS update_hardware_marketplace_items_updated_at ON public.hardware_marketplace_items;

CREATE TRIGGER update_hardware_marketplace_items_updated_at BEFORE
UPDATE
    ON public.hardware_marketplace_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE
    public.hardware_marketplace_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view active hardware marketplace items" ON public.hardware_marketplace_items;

DROP POLICY IF EXISTS "Admin can insert hardware marketplace items" ON public.hardware_marketplace_items;

DROP POLICY IF EXISTS "Admin can update hardware marketplace items" ON public.hardware_marketplace_items;

DROP POLICY IF EXISTS "Admin can delete hardware marketplace items" ON public.hardware_marketplace_items;

CREATE POLICY "Authenticated users can view active hardware marketplace items" ON public.hardware_marketplace_items FOR
SELECT
    USING (
        is_active = TRUE
        OR public.is_admin()
    );

CREATE POLICY "Admin can insert hardware marketplace items" ON public.hardware_marketplace_items FOR
INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update hardware marketplace items" ON public.hardware_marketplace_items FOR
UPDATE
    USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete hardware marketplace items" ON public.hardware_marketplace_items FOR DELETE USING (public.is_admin());