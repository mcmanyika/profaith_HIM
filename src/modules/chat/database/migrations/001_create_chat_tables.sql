-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('text', 'file', 'image')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'read')) DEFAULT 'sent'
);

-- Create chat_participants table
CREATE TABLE IF NOT EXISTS chat_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_read_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(chat_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);

-- Create RLS policies
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- Chats policies
CREATE POLICY "Users can view their chats"
    ON chats FOR SELECT
    USING (
        id IN (
            SELECT chat_id 
            FROM chat_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create chats"
    ON chats FOR INSERT
    WITH CHECK (true);

-- Messages policies
CREATE POLICY "Users can view messages in their chats"
    ON messages FOR SELECT
    USING (
        chat_id IN (
            SELECT chat_id 
            FROM chat_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages to their chats"
    ON messages FOR INSERT
    WITH CHECK (
        chat_id IN (
            SELECT chat_id 
            FROM chat_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Chat participants policies
CREATE POLICY "Users can view chat participants"
    ON chat_participants FOR SELECT
    USING (
        chat_id IN (
            SELECT chat_id 
            FROM chat_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add participants to their chats"
    ON chat_participants FOR INSERT
    WITH CHECK (
        chat_id IN (
            SELECT chat_id 
            FROM chat_participants 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create function to update chat's updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chats
    SET updated_at = NOW()
    WHERE id = NEW.chat_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating chat timestamp
CREATE TRIGGER update_chat_timestamp
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_timestamp(); 