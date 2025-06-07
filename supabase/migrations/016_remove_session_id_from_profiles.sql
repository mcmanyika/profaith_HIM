-- Remove session_id column from profiles table
ALTER TABLE profiles DROP COLUMN IF EXISTS session_id; 