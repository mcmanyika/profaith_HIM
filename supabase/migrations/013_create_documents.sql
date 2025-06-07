create table if not exists public.documents (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete set null,
    title text not null,
    url text not null,
    type text,
    metadata jsonb,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

create index if not exists idx_documents_user_id on public.documents(user_id);

-- RLS policy to allow users to view their own documents
create policy "Users can view their own documents"
    on public.documents for select
    using (auth.uid() = user_id); 