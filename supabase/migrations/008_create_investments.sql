create table if not exists public.investments (
    id uuid default gen_random_uuid() primary key,
    amount numeric not null,
    payment_id text,
    proposal_id uuid references public.proposals(id) on delete cascade,
    investor_id uuid references public.profiles(id) on delete set null,
    status text check (status in ('COMPLETED', 'PENDING', 'FAILED', 'CANCELLED')) default 'PENDING'
); 