create policy "Users can insert their own profile"
    on public.profiles for insert
    with check (auth.uid() = id); 