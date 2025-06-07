create table if not exists public.proposals (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    budget numeric not null,
    amount_raised numeric default 0,
    investor_count integer default 0,
    status text,
    user_id uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    category text
); 