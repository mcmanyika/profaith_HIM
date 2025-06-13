-- Create proposals table
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow users to view their own proposals
CREATE POLICY "Users can view their own proposals"
    ON public.proposals
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to insert their own proposals
CREATE POLICY "Users can insert their own proposals"
    ON public.proposals
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own proposals
CREATE POLICY "Users can update their own proposals"
    ON public.proposals
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create function to handle updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.proposals
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for proposals
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposals', 'proposals', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can upload their own proposals'
    ) THEN
        CREATE POLICY "Users can upload their own proposals"
            ON storage.objects
            FOR INSERT
            WITH CHECK (
                bucket_id = 'proposals'
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can view their own proposals'
    ) THEN
        CREATE POLICY "Users can view their own proposals"
            ON storage.objects
            FOR SELECT
            USING (
                bucket_id = 'proposals'
            );
    END IF;
END $$; 