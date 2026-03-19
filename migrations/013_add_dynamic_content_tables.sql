-- ============================================
-- DYNAMIC CONTENT MANAGEMENT TABLES
-- Tables for manageable content: FAQs, Contact, Terms & Privacy
-- ============================================
-- FAQ Table
CREATE TABLE faqs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT NOT NULL,
    -- e.g., 'general', 'payment', 'orders', 'partner'
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Information Table
CREATE TABLE contact_info (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL UNIQUE,
    -- 'email', 'phone', 'whatsapp', 'address', 'support_hours'
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    icon TEXT,
    -- Icon name for mobile apps
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Terms & Privacy Content Table
CREATE TABLE legal_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL UNIQUE,
    -- 'terms_of_service', 'privacy_policy', 'partner_agreement'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    -- Markdown or HTML content
    version TEXT NOT NULL,
    effective_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements Table for Partner Gamification
CREATE TABLE achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT,
    requirement_type TEXT NOT NULL,
    -- 'total_jobs', 'rating', 'streak'
    requirement_value INTEGER NOT NULL,
    reward_type TEXT,
    -- 'badge', 'bonus', 'discount'
    reward_value TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Achievements (Partner progress)
CREATE TABLE user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Insert sample FAQs
INSERT INTO
    faqs (question, answer, category, display_order)
VALUES
    -- General FAQs
    (
        'Apa itu Tukang Go?',
        'Tukang Go adalah platform on-demand yang menghubungkan Anda dengan tukang profesional dan terverifikasi untuk berbagai kebutuhan perbaikan rumah.',
        'general',
        1
    ),
    (
        'Bagaimana cara memesan layanan?',
        'Pilih jenis layanan yang Anda butuhkan, masukkan detail masalah dan lokasi, lalu tukang terdekat akan otomatis menerima pesanan Anda.',
        'general',
        2
    ),
    (
        'Apakah tukang sudah terverifikasi?',
        'Ya, semua mitra tukang telah melalui proses verifikasi dokumen dan keahlian sebelum dapat menerima pesanan.',
        'general',
        3
    ),
    -- Payment FAQs
    (
        'Metode pembayaran apa saja yang tersedia?',
        'Kami menerima pembayaran tunai, transfer bank, e-wallet (GoPay, OVO, DANA), dan kartu kredit/debit.',
        'payment',
        1
    ),
    (
        'Kapan saya harus membayar?',
        'Pembayaran dilakukan setelah pekerjaan selesai dan Anda puas dengan hasilnya.',
        'payment',
        2
    ),
    (
        'Apakah ada biaya tambahan?',
        'Biaya dasar sudah termasuk jasa tukang. Biaya tambahan mungkin berlaku untuk material atau pekerjaan di luar estimasi awal.',
        'payment',
        3
    ),
    -- Orders FAQs
    (
        'Berapa lama tukang akan tiba?',
        'Rata-rata tukang akan tiba dalam 30-60 menit tergantung lokasi dan ketersediaan tukang.',
        'orders',
        1
    ),
    (
        'Bisakah saya membatalkan pesanan?',
        'Ya, Anda dapat membatalkan pesanan sebelum tukang menerima atau dalam 5 menit pertama setelah pemesanan.',
        'orders',
        2
    ),
    (
        'Bagaimana jika saya tidak puas dengan hasilnya?',
        'Anda dapat memberikan rating dan review. Untuk masalah serius, hubungi customer service kami untuk penyelesaian.',
        'orders',
        3
    ),
    -- Partner FAQs
    (
        'Bagaimana cara menjadi mitra tukang?',
        'Daftar melalui aplikasi Partner, lengkapi dokumen (KTP, SIM, sertifikat keahlian), dan tunggu proses verifikasi kami.',
        'partner',
        1
    ),
    (
        'Berapa komisi yang dikenakan?',
        'Komisi platform sebesar 2.5% dari total nilai pesanan untuk biaya operasional dan perawatan aplikasi.',
        'partner',
        2
    ),
    (
        'Kapan saya menerima pembayaran?',
        'Pembayaran akan masuk ke wallet Anda segera setelah pelanggan menyelesaikan pembayaran. Anda dapat withdraw kapan saja.',
        'partner',
        3
    );

-- Insert contact information
INSERT INTO
    contact_info (type, label, value, icon, display_order)
VALUES
    (
        'email',
        'Email Support',
        'support@tukanggo.com',
        'mail-outline',
        1
    ),
    (
        'phone',
        'Customer Service',
        '+62 21 1234 5678',
        'call-outline',
        2
    ),
    (
        'whatsapp',
        'WhatsApp',
        '+62 812 3456 7890',
        'logo-whatsapp',
        3
    ),
    (
        'address',
        'Head Office',
        'Jl. Sudirman No. 123, Jakarta Pusat, DKI Jakarta 10110',
        'location-outline',
        4
    ),
    (
        'support_hours',
        'Support Hours',
        'Senin - Jumat: 08:00 - 20:00 WIB, Sabtu - Minggu: 09:00 - 18:00 WIB',
        'time-outline',
        5
    );

-- Insert legal content
INSERT INTO
    legal_content (type, title, content, version, effective_date)
VALUES
    (
        'terms_of_service',
        'Terms of Service',
        '# Terms of Service

## 1. Acceptance of Terms
By accessing and using Tukang Go, you accept and agree to be bound by the terms and provision of this agreement.

## 2. Service Description
Tukang Go provides a platform connecting clients with verified service providers (tukang) for home repair and maintenance services.

## 3. User Obligations
- Provide accurate information during registration
- Maintain confidentiality of account credentials
- Use the service lawfully and respectfully
- Pay for services as agreed

## 4. Service Provider Obligations
- Maintain valid credentials and certifications
- Provide quality service as described
- Comply with safety regulations
- Treat clients professionally

## 5. Payment Terms
- All prices are in Indonesian Rupiah (IDR)
- Payment must be completed after service completion
- Platform commission: 2.5% of order value

## 6. Cancellation Policy
- Free cancellation within 5 minutes of order
- After acceptance: subject to cancellation fee
- Emergency cancellations: case-by-case basis

## 7. Limitation of Liability
Tukang Go acts as an intermediary platform. We are not liable for:
- Service quality or outcomes
- Disputes between parties
- Property damage during service
- Personal injury during service

## 8. Dispute Resolution
Any disputes will be resolved through mediation. If unsuccessful, disputes will be subject to Indonesian law and Jakarta jurisdiction.

## 9. Changes to Terms
We reserve the right to modify these terms. Users will be notified of significant changes.

## 10. Contact
For questions about these terms, contact support@tukanggo.com',
        '1.0',
        '2024-01-01'
    ),
    (
        'privacy_policy',
        'Privacy Policy',
        '# Privacy Policy

## Information We Collect

### Personal Information
- Name, phone number, email address
- ID documents for verification (partners)
- Location data for service matching
- Payment information

### Usage Data
- App usage statistics
- Order history
- Device information
- IP address

## How We Use Your Information
- Facilitate service connections
- Process payments
- Improve user experience
- Send notifications and updates
- Prevent fraud and ensure security

## Data Sharing
We do not sell your personal information. We share data only:
- With matched service providers (for order fulfillment)
- With payment processors (for transactions)
- When required by law

## Data Security
We implement industry-standard security measures:
- Encrypted data transmission (SSL/TLS)
- Secure database storage
- Regular security audits
- Access controls

## Your Rights
You have the right to:
- Access your personal data
- Correct inaccurate data
- Request data deletion
- Opt-out of marketing communications

## Location Data
We collect location data to:
- Match you with nearby service providers
- Track order progress
- Improve service efficiency

You can disable location services, but this may limit functionality.

## Cookies and Tracking
We use cookies to:
- Maintain your session
- Remember preferences
- Analyze usage patterns

## Children''s Privacy
Our service is not intended for users under 17 years old.

## Changes to Privacy Policy
We may update this policy periodically. Continued use after changes constitutes acceptance.

## Contact
Privacy concerns: privacy@tukanggo.com',
        '1.0',
        '2024-01-01'
    ),
    (
        'partner_agreement',
        'Partner Agreement',
        '# Partner Agreement

## 1. Partnership Terms
This agreement governs the relationship between Tukang Go and registered service providers (Partners).

## 2. Partner Eligibility
Partners must:
- Be at least 18 years old
- Hold valid Indonesian ID (KTP)
- Possess relevant skills and certifications
- Maintain professional liability insurance (recommended)

## 3. Verification Process
- Document submission (KTP, SIM, certificates)
- Background check
- Skills assessment
- Approval typically within 3-5 business days

## 4. Commission Structure
- Platform fee: 2.5% of order value
- No subscription fees
- No hidden charges
- Weekly payment schedule

## 5. Service Standards
Partners must:
- Respond to orders within 5 minutes
- Arrive within estimated time
- Provide quality workmanship
- Use proper safety equipment
- Treat clients respectfully

## 6. Rating and Reviews
- Maintain minimum 4.0 star rating
- Below 3.5: temporary suspension
- Consistent poor ratings: account termination

## 7. Payment Terms
- Earnings credited to wallet after order completion
- Withdraw anytime (min. Rp 50,000)
- Processing time: 1-2 business days
- Bank transfer fees may apply

## 8. Working Hours
- Set your own schedule
- Toggle online/offline status
- No minimum hours required
- Peak hours bonus opportunities

## 9. Cancellation Policy
- Accept 80%+ of assigned orders
- Maximum 3 cancellations per week
- Excessive cancellations: warning/suspension

## 10. Prohibited Activities
- Soliciting clients outside platform
- Falsifying credentials
- Demanding extra payment off-platform
- Harassment or misconduct

## 11. Insurance and Liability
- Partners responsible for own work
- Platform not liable for service issues
- Recommended: professional liability insurance

## 12. Termination
Either party may terminate with 30 days notice. Immediate termination for:
- Fraud or misconduct
- Safety violations
- Terms breach

## 13. Support
Partner support: partners@tukanggo.com
Emergency hotline: +62 21 1234 5678',
        '1.0',
        '2024-01-01'
    );

-- Insert sample achievements
INSERT INTO
    achievements (
        name,
        description,
        icon,
        requirement_type,
        requirement_value,
        reward_type,
        reward_value
    )
VALUES
    (
        'First Job',
        'Complete your first order',
        'star',
        'total_jobs',
        1,
        'badge',
        'bronze'
    ),
    (
        '10 Jobs Milestone',
        'Complete 10 successful orders',
        'ribbon',
        'total_jobs',
        10,
        'bonus',
        '10000'
    ),
    (
        '50 Jobs Expert',
        'Complete 50 orders',
        'trophy',
        'total_jobs',
        50,
        'bonus',
        '50000'
    ),
    (
        '100 Jobs Master',
        'Complete 100 orders',
        'medal',
        'total_jobs',
        100,
        'bonus',
        '100000'
    ),
    (
        '5 Star Pro',
        'Maintain 5.0 rating for 20 orders',
        'star-outline',
        'rating',
        500,
        'badge',
        'gold'
    ),
    (
        'Customer Favorite',
        'Maintain 4.8+ rating for 50 orders',
        'heart',
        'rating',
        480,
        'discount',
        '5%'
    );

-- Create indexes
CREATE INDEX idx_faqs_category ON faqs(category);

CREATE INDEX idx_faqs_active ON faqs(is_active);

CREATE INDEX idx_contact_info_active ON contact_info(is_active);

CREATE INDEX idx_legal_content_type ON legal_content(type);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- Create RLS policies
ALTER TABLE
    faqs ENABLE ROW LEVEL SECURITY;

ALTER TABLE
    contact_info ENABLE ROW LEVEL SECURITY;

ALTER TABLE
    legal_content ENABLE ROW LEVEL SECURITY;

ALTER TABLE
    achievements ENABLE ROW LEVEL SECURITY;

ALTER TABLE
    user_achievements ENABLE ROW LEVEL SECURITY;

-- Everyone can read active content
CREATE POLICY "FAQs are viewable by everyone" ON faqs FOR
SELECT
    USING (is_active = TRUE);

CREATE POLICY "Contact info is viewable by everyone" ON contact_info FOR
SELECT
    USING (is_active = TRUE);

CREATE POLICY "Legal content is viewable by everyone" ON legal_content FOR
SELECT
    USING (is_active = TRUE);

CREATE POLICY "Achievements are viewable by everyone" ON achievements FOR
SELECT
    USING (is_active = TRUE);

-- Users can view their own achievements
CREATE POLICY "Users can view their achievements" ON user_achievements FOR
SELECT
    USING (auth.uid() = user_id);

-- Admin policies (only admins can insert/update/delete)
CREATE POLICY "Admins can manage FAQs" ON faqs FOR ALL USING (
    EXISTS (
        SELECT
            1
        FROM
            profiles
        WHERE
            id = auth.uid()
            AND role = 'admin'
    )
);

CREATE POLICY "Admins can manage contact info" ON contact_info FOR ALL USING (
    EXISTS (
        SELECT
            1
        FROM
            profiles
        WHERE
            id = auth.uid()
            AND role = 'admin'
    )
);

CREATE POLICY "Admins can manage legal content" ON legal_content FOR ALL USING (
    EXISTS (
        SELECT
            1
        FROM
            profiles
        WHERE
            id = auth.uid()
            AND role = 'admin'
    )
);

CREATE POLICY "Admins can manage achievements" ON achievements FOR ALL USING (
    EXISTS (
        SELECT
            1
        FROM
            profiles
        WHERE
            id = auth.uid()
            AND role = 'admin'
    )
);

-- Function to update timestamps
CREATE
OR REPLACE FUNCTION update_dynamic_content_timestamp() RETURNS TRIGGER AS $ $ BEGIN NEW.updated_at = NOW();

RETURN NEW;

END;

$ $ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_faqs_timestamp BEFORE
UPDATE
    ON faqs FOR EACH ROW EXECUTE FUNCTION update_dynamic_content_timestamp();

CREATE TRIGGER update_contact_info_timestamp BEFORE
UPDATE
    ON contact_info FOR EACH ROW EXECUTE FUNCTION update_dynamic_content_timestamp();

CREATE TRIGGER update_legal_content_timestamp BEFORE
UPDATE
    ON legal_content FOR EACH ROW EXECUTE FUNCTION update_dynamic_content_timestamp();