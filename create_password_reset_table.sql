-- Create password_reset_tokens table for password reset functionality
-- This table stores reset tokens, PINs, and verification status

-- Drop table if it exists (for development)
-- DROP TABLE IF EXISTS public.password_reset_tokens;

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    token TEXT NOT NULL UNIQUE,
    pin TEXT NOT NULL,
    email_identifier TEXT NOT NULL,
    phone_identifier TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_attempts INTEGER DEFAULT 0,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON public.password_reset_tokens(email_identifier);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_phone ON public.password_reset_tokens(phone_identifier);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON public.password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_verified ON public.password_reset_tokens(is_verified);

-- Enable Row Level Security
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own reset tokens
CREATE POLICY "Users can view own reset tokens" ON public.password_reset_tokens
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can insert their own reset tokens
CREATE POLICY "Users can insert own reset tokens" ON public.password_reset_tokens
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own reset tokens
CREATE POLICY "Users can update own reset tokens" ON public.password_reset_tokens
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Allow anonymous access for password reset (needed for the reset flow)
CREATE POLICY "Allow anonymous password reset" ON public.password_reset_tokens
    FOR ALL USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_password_reset_tokens_updated_at ON public.password_reset_tokens;
CREATE TRIGGER update_password_reset_tokens_updated_at 
    BEFORE UPDATE ON public.password_reset_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.password_reset_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.password_reset_tokens TO anon;

-- Insert a sample reset token for testing (optional)
-- INSERT INTO public.password_reset_tokens (user_id, token, pin, email_identifier, expires_at)
-- VALUES (
--     '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID
--     'test_token_123',
--     '12345',
--     'test@example.com',
--     NOW() + INTERVAL '15 minutes'
-- );

-- Verify table creation
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'password_reset_tokens' 
ORDER BY ordinal_position;
