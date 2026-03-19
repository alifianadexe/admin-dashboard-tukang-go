-- ============================================
-- TUKANG GO - DATABASE SCHEMA
-- Production-Ready Schema for On-Demand Service Platform
-- ============================================
-- Enable PostGIS extension for location features
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- 1. CONFIG & MASTER DATA
-- ============================================
CREATE TABLE app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO
    app_config (key, value, description)
VALUES
    (
        'commission_rate',
        '2.5',
        'Default commission percentage for partners'
    ),
    (
        'min_android_version',
        '"1.0.0"',
        'Minimum Android app version required'
    ),
    (
        'min_ios_version',
        '"1.0.0"',
        'Minimum iOS app version required'
    ),
    (
        'maintenance_mode',
        'false',
        'Enable/disable maintenance mode'
    ),
    (
        'matching_radius_km',
        '10',
        'Default radius for finding nearby partners (km)'
    );

CREATE TABLE services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    commission_percentage DECIMAL(5, 2) DEFAULT 2.5,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert sample services
INSERT INTO
    services (
        name,
        description,
        base_price,
        commission_percentage
    )
VALUES
    (
        'Tukang Listrik',
        'Electrical repair and installation services',
        75000,
        2.5
    ),
    (
        'Tukang AC',
        'AC repair, maintenance, and installation',
        100000,
        2.5
    ),
    (
        'Tukang Pipa',
        'Plumbing and pipe repair services',
        80000,
        2.5
    ),
    (
        'Tukang Cat',
        'Painting services for home and office',
        90000,
        2.5
    ),
    (
        'Tukang Kayu',
        'Carpentry and furniture repair',
        85000,
        2.5
    );

-- ============================================
-- 2. USERS & PROFILES
-- ============================================
CREATE TABLE profiles (
    id UUID REFERENCES auth.users PRIMARY KEY,
    role TEXT CHECK (role IN ('client', 'mitra', 'admin')) NOT NULL,
    full_name TEXT,
    phone TEXT UNIQUE,
    avatar_url TEXT,
    -- Configuration & State
    settings JSONB DEFAULT '{"push_enabled": true, "theme": "system", "language": "id"}' :: jsonb,
    fcm_token TEXT,
    -- Mitra Specific Fields
    is_verified BOOLEAN DEFAULT FALSE,
    is_online BOOLEAN DEFAULT FALSE,
    current_location GEOGRAPHY(POINT),
    wallet_balance DECIMAL(15, 2) DEFAULT 0,
    rating_avg DECIMAL(3, 2) DEFAULT 5.0,
    total_jobs INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for location-based queries
CREATE INDEX idx_profiles_location ON profiles USING GIST (current_location);

CREATE INDEX idx_profiles_role ON profiles (role);

CREATE INDEX idx_profiles_is_online ON profiles (is_online)
WHERE
    role = 'mitra';

CREATE TABLE saved_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    address_detail TEXT NOT NULL,
    location GEOGRAPHY(POINT) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saved_addresses_user ON saved_addresses (user_id);

-- ============================================
-- 3. ORDERS (The Core Business Logic)
-- ============================================
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_no SERIAL,
    client_id UUID REFERENCES profiles(id) NOT NULL,
    mitra_id UUID REFERENCES profiles(id),
    service_id UUID REFERENCES services(id) NOT NULL,
    -- Price Snapshot (lock prices at order time)
    price_base DECIMAL(10, 2) NOT NULL,
    price_additional DECIMAL(10, 2) DEFAULT 0,
    price_total DECIMAL(10, 2) NOT NULL,
    commission_amount DECIMAL(10, 2) NOT NULL,
    -- Location Data
    address_origin TEXT NOT NULL,
    origin_location GEOGRAPHY(POINT) NOT NULL,
    -- Status Management
    status TEXT CHECK (
        status IN (
            'searching',
            'accepted',
            'arrived',
            'in_progress',
            'payment_pending',
            'completed',
            'cancelled'
        )
    ) DEFAULT 'searching',
    -- Notes and metadata
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_client ON orders (client_id);

CREATE INDEX idx_orders_mitra ON orders (mitra_id);

CREATE INDEX idx_orders_status ON orders (status);

CREATE INDEX idx_orders_created ON orders (created_at DESC);

-- ============================================
-- 4. WALLET & TRANSACTIONS (Financial Integrity)
-- ============================================
CREATE TABLE wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES orders(id),
    type TEXT CHECK (
        type IN (
            'topup',
            'payment_out',
            'income_job',
            'withdraw',
            'admin_adjustment'
        )
    ) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    -- Positive for credit, Negative for debit
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_transactions_user ON wallet_transactions (user_id, created_at DESC);

CREATE INDEX idx_wallet_transactions_order ON wallet_transactions (order_id);

-- ============================================
-- 5. NOTIFICATIONS (Inbox System)
-- ============================================
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);

CREATE INDEX idx_notifications_unread ON notifications (user_id, is_read)
WHERE
    is_read = FALSE;

-- ============================================
-- 6. TRIGGERS & FUNCTIONS
-- ============================================
-- Trigger: Create profile on signup
CREATE
OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $ $ BEGIN
INSERT INTO
    public.profiles (id, role, full_name, phone)
VALUES
    (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'role', 'client'),
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'phone'
    );

RETURN NEW;

END;

$ $ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER
INSERT
    ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Update updated_at timestamp
CREATE
OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $ $ BEGIN NEW.updated_at = NOW();

RETURN NEW;

END;

$ $ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE
UPDATE
    ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE
UPDATE
    ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. RPC FUNCTION: Find Nearby Partners
-- ============================================
CREATE
OR REPLACE FUNCTION find_nearby_mitra(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    service_id_param UUID,
    radius_km DOUBLE PRECISION DEFAULT 10
) RETURNS TABLE (
    mitra_id UUID,
    mitra_name TEXT,
    mitra_phone TEXT,
    mitra_rating DECIMAL,
    distance_km DOUBLE PRECISION
) AS $ $ BEGIN RETURN QUERY
SELECT
    p.id AS mitra_id,
    p.full_name AS mitra_name,
    p.phone AS mitra_phone,
    p.rating_avg AS mitra_rating,
    ST_Distance(
        p.current_location,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326) :: geography
    ) / 1000 AS distance_km
FROM
    profiles p
WHERE
    p.role = 'mitra'
    AND p.is_verified = TRUE
    AND p.is_online = TRUE
    AND p.current_location IS NOT NULL
    AND ST_DWithin(
        p.current_location,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326) :: geography,
        radius_km * 1000
    )
ORDER BY
    distance_km ASC
LIMIT
    20;

END;

$ $ LANGUAGE plpgsql;

-- ============================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Enable RLS on all tables
ALTER TABLE
    profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE
    saved_addresses ENABLE ROW LEVEL SECURITY;

ALTER TABLE
    orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE
    wallet_transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE
    notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR
SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles FOR
UPDATE
    USING (auth.uid() = id);

-- Saved Addresses: Users can manage their own addresses
CREATE POLICY "Users can manage own addresses" ON saved_addresses FOR ALL USING (auth.uid() = user_id);

-- Orders: Clients can see their orders, Mitras can see their jobs
CREATE POLICY "Users can view related orders" ON orders FOR
SELECT
    USING (
        auth.uid() = client_id
        OR auth.uid() = mitra_id
    );

CREATE POLICY "Clients can create orders" ON orders FOR
INSERT
    WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update related orders" ON orders FOR
UPDATE
    USING (
        auth.uid() = client_id
        OR auth.uid() = mitra_id
    );

-- Wallet Transactions: Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON wallet_transactions FOR
SELECT
    USING (auth.uid() = user_id);

-- Notifications: Users can view and update their own notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR
SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications FOR
UPDATE
    USING (auth.uid() = user_id);

-- Public read access for services and app_config
CREATE POLICY "Anyone can view services" ON services FOR
SELECT
    USING (TRUE);

CREATE POLICY "Anyone can view app_config" ON app_config FOR
SELECT
    USING (TRUE);