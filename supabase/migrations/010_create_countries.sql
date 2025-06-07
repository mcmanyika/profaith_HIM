create table if not exists public.countries (
    id uuid default gen_random_uuid() primary key,
    name text not null unique,
    code text not null unique
);

insert into public.countries (name, code) values
('United States', 'US'),
('Zimbabwe', 'ZW'),
('South Africa', 'ZA'),
('United Kingdom', 'GB'),
('Canada', 'CA'),
('Australia', 'AU')
on conflict do nothing; 