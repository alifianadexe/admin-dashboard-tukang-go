-- Add INSERT policy for notifications
-- This allows authenticated users (including edge functions with user context) to create notifications
CREATE POLICY "Allow inserting notifications for any user" ON notifications FOR
INSERT
    WITH CHECK (TRUE);

-- Alternative: If you want to restrict who can create notifications
-- CREATE POLICY "Service role can insert notifications" ON notifications FOR INSERT
--     WITH CHECK (auth.jwt()->>'role' = 'service_role');