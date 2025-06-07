-- Drop existing table if it exists
drop table if exists public.profiles cascade;

-- Create profiles table
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    full_name text,
    avatar_url text,
    email text,
    phone_number text,
    gender text,
    date_of_birth date,
    country text,
    occupation text,
    user_level integer default 1,
    availability text check (availability in ('full-time', 'part-time')),
    last_login timestamp with time zone,
    session_id uuid,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add indexes for better query performance
create index idx_profiles_email on public.profiles(email);
create index idx_profiles_phone_number on public.profiles(phone_number);
create index idx_profiles_country on public.profiles(country);
create index idx_profiles_user_level on public.profiles(user_level);
create index idx_profiles_availability on public.profiles(availability);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Create policies
create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create a trigger to create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (
        id,
        full_name,
        avatar_url,
        email,
        phone_number,
        gender,
        date_of_birth,
        country,
        occupation,
        user_level,
        availability,
        last_login,
        session_id
    )
    values (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url',
        new.email,
        new.phone,
        new.raw_user_meta_data->>'gender',
        (new.raw_user_meta_data->>'date_of_birth')::date,
        new.raw_user_meta_data->>'country',
        new.raw_user_meta_data->>'occupation',
        1,
        case when (new.raw_user_meta_data->>'availability')::boolean then 'full-time' else 'part-time' end,
        now(),
        new.id
    );
    return new;
end;
$$;

-- Create the trigger
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user(); 