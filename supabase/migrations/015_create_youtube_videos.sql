-- Create youtube_videos table
CREATE TABLE IF NOT EXISTS youtube_videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    youtube_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'published', 'failed')),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    file_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;

-- Policy for viewing videos (anyone can view)
CREATE POLICY "Anyone can view youtube videos"
    ON youtube_videos
    FOR SELECT
    USING (true);

-- Policy for inserting videos (only authenticated users with level 5 can insert)
CREATE POLICY "Only level 5 users can insert youtube videos"
    ON youtube_videos
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_level = 5
        )
    );

-- Policy for updating videos (only authenticated users with level 5 can update)
CREATE POLICY "Only level 5 users can update youtube videos"
    ON youtube_videos
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_level = 5
        )
    );

-- Policy for deleting videos (only authenticated users with level 5 can delete)
CREATE POLICY "Only level 5 users can delete youtube videos"
    ON youtube_videos
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_level = 5
        )
    );

-- Create the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create updated_at trigger
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON youtube_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 