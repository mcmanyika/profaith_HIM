-- Fix the profile creation trigger for church management system
-- This ensures new users can register successfully

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create updated function that works with church fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        phone_number,
        gender,
        date_of_birth,
        country,
        occupation,
        user_level,
        availability,
        last_login,
        member_status,
        membership_date
    )
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New Member'),
        new.email,
        new.phone,
        new.raw_user_meta_data->>'gender',
        (new.raw_user_meta_data->>'date_of_birth')::date,
        new.raw_user_meta_data->>'country',
        new.raw_user_meta_data->>'occupation',
        1, -- Default user level
        CASE 
            WHEN (new.raw_user_meta_data->>'availability')::boolean THEN 'full-time' 
            ELSE 'part-time' 
        END,
        now(),
        'active', -- Default member status
        CURRENT_DATE -- Set membership date to today
    );
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the signup
        RAISE WARNING 'Error creating profile for user %: %', new.id, SQLERRM;
        RETURN new;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- Ensure the insert policy allows new profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Add a policy for service role to insert profiles (for trigger)
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

CREATE POLICY "Service role can insert profiles"
    ON public.profiles
    FOR INSERT
    TO service_role
    WITH CHECK (true);

COMMENT ON FUNCTION handle_new_user IS 'Creates a profile entry when a new user signs up - updated for church management';

