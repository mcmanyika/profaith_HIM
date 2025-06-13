-- Add file_path column to proposals table
ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Create storage bucket for proposals if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposals', 'proposals', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
DROP POLICY IF EXISTS "Users can upload their own proposals" ON storage.objects;
CREATE POLICY "Users can upload their own proposals"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'proposals'
    );

DROP POLICY IF EXISTS "Users can view their own proposals" ON storage.objects;
CREATE POLICY "Users can view their own proposals"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'proposals'
    ); 