-- Add proposal_id column to chats table for proposal-linked chats
ALTER TABLE public.chats
ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES proposals(id);

-- Optional: Create an index for faster lookup by proposal
CREATE INDEX IF NOT EXISTS idx_chats_proposal_id ON public.chats(proposal_id); 