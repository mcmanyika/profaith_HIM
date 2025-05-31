-- Remove file_url column from messages table
ALTER TABLE public.messages DROP COLUMN IF EXISTS file_url; 