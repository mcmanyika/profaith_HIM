-- Create a function to initialize chat tables
create or replace function create_chat_tables()
returns void
language plpgsql
security definer
as $$
begin
    -- Create chats table if it doesn't exist
    create table if not exists public.chats (
        id uuid default gen_random_uuid() primary key,
        name text,
        type text not null check (type in ('direct', 'group')),
        created_at timestamp with time zone default timezone('utc'::text, now()) not null,
        updated_at timestamp with time zone default timezone('utc'::text, now()) not null
    );

    -- Create messages table if it doesn't exist
    create table if not exists public.messages (
        id uuid default gen_random_uuid() primary key,
        chat_id uuid references public.chats(id) on delete cascade not null,
        sender_id uuid references auth.users(id) on delete cascade not null,
        content text not null,
        type text not null check (type in ('text', 'file', 'image')),
        created_at timestamp with time zone default timezone('utc'::text, now()) not null,
        updated_at timestamp with time zone default timezone('utc'::text, now()) not null
    );

    -- Create chat_participants table if it doesn't exist
    create table if not exists public.chat_participants (
        chat_id uuid references public.chats(id) on delete cascade not null,
        user_id uuid references auth.users(id) on delete cascade not null,
        role text not null check (role in ('admin', 'member')),
        joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
        primary key (chat_id, user_id)
    );

    -- Create indexes if they don't exist
    create index if not exists idx_messages_chat_id on public.messages(chat_id);
    create index if not exists idx_messages_sender_id on public.messages(sender_id);
    create index if not exists idx_chat_participants_user_id on public.chat_participants(user_id);

    -- Enable Row Level Security
    alter table public.chats enable row level security;
    alter table public.messages enable row level security;
    alter table public.chat_participants enable row level security;

    -- Create RLS policies
    -- Chats policies
    create policy "Users can view their chats"
        on public.chats for select
        using (
            exists (
                select 1 from public.chat_participants
                where chat_id = id
                and user_id = auth.uid()
            )
        );

    create policy "Users can create chats"
        on public.chats for insert
        with check (true);

    -- Messages policies
    create policy "Users can view messages in their chats"
        on public.messages for select
        using (
            exists (
                select 1 from public.chat_participants
                where chat_id = messages.chat_id
                and user_id = auth.uid()
            )
        );

    create policy "Users can send messages to their chats"
        on public.messages for insert
        with check (
            exists (
                select 1 from public.chat_participants
                where chat_id = messages.chat_id
                and user_id = auth.uid()
            )
        );

    -- Chat participants policies
    create policy "Users can view chat participants"
        on public.chat_participants for select
        using (
            exists (
                select 1 from public.chat_participants
                where chat_id = chat_participants.chat_id
                and user_id = auth.uid()
            )
        );

    create policy "Users can add participants to their chats"
        on public.chat_participants for insert
        with check (
            exists (
                select 1 from public.chat_participants
                where chat_id = chat_participants.chat_id
                and user_id = auth.uid()
                and role = 'admin'
            )
        );
end;
$$; 