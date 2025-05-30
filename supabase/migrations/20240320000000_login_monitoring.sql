-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create login_attempts table
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    email TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    location TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mfa BOOLEAN DEFAULT FALSE
);

-- Create suspicious_activities table
CREATE TABLE IF NOT EXISTS suspicious_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT NOT NULL,
    activities JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_timestamp ON login_attempts(email, timestamp);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_email ON suspicious_activities(email);

-- Add notification_preferences to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_notifications": true}'::jsonb;

-- Create function to automatically clean up old login attempts
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM login_attempts
    WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically clean up old login attempts
CREATE OR REPLACE FUNCTION trigger_cleanup_old_login_attempts()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run cleanup if we have more than 1000 records
    IF (SELECT COUNT(*) FROM login_attempts) > 1000 THEN
        PERFORM cleanup_old_login_attempts();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs after insert on login_attempts
CREATE TRIGGER cleanup_login_attempts_trigger
    AFTER INSERT ON login_attempts
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_cleanup_old_login_attempts(); 