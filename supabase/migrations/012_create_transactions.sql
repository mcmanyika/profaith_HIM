DROP TABLE IF EXISTS public.transactions;

create table if not exists public.transactions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete set null,
    amount numeric not null,
    type text not null check (type in ('credit', 'debit')),
    status text not null check (status in ('pending', 'completed', 'failed')),
    payment_method text,
    metadata jsonb,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

create index if not exists idx_transactions_user_id on public.transactions(user_id); 