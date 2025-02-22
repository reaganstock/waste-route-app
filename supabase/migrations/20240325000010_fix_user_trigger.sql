-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    max_retries INTEGER := 3;
    current_retry INTEGER := 0;
    profile_created BOOLEAN := FALSE;
BEGIN
    -- Log the attempt
    RAISE LOG 'Attempting to create profile for user %', NEW.id;
    
    WHILE NOT profile_created AND current_retry < max_retries LOOP
        BEGIN
            current_retry := current_retry + 1;
            RAISE LOG 'Attempt % to create profile for user %', current_retry, NEW.id;
            
            -- Wait longer on each retry
            PERFORM pg_sleep(0.5 * current_retry);
            
            -- Check if profile already exists
            IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
                RAISE LOG 'Profile already exists for user %', NEW.id;
                profile_created := TRUE;
                RETURN NEW;
            END IF;

            -- Create profile
            INSERT INTO public.profiles (
                id,
                full_name,
                email,
                role,
                status,
                created_at,
                updated_at
            ) VALUES (
                NEW.id,
                COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
                NEW.email,
                COALESCE(
                    (NEW.raw_user_meta_data->>'role')::user_role,
                    'driver'::user_role
                ),
                'active'::user_status,
                NOW(),
                NOW()
            );
            
            profile_created := TRUE;
            RAISE LOG 'Successfully created profile for user % on attempt %', NEW.id, current_retry;
            
        EXCEPTION
            WHEN unique_violation THEN
                IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
                    profile_created := TRUE;
                    RAISE LOG 'Profile was created by another process for user %', NEW.id;
                ELSIF current_retry < max_retries THEN
                    RAISE LOG 'Unique violation on attempt % for user %, retrying...', current_retry, NEW.id;
                    CONTINUE;
                ELSE
                    RAISE LOG 'Failed to create profile after % attempts due to unique violation for user %', max_retries, NEW.id;
                    RETURN NEW;
                END IF;
            WHEN foreign_key_violation THEN
                IF current_retry < max_retries THEN
                    RAISE LOG 'Foreign key violation on attempt % for user %, retrying...', current_retry, NEW.id;
                    CONTINUE;
                ELSE
                    RAISE LOG 'Failed to create profile after % attempts due to foreign key violation for user %', max_retries, NEW.id;
                    RETURN NEW;
                END IF;
            WHEN OTHERS THEN
                RAISE LOG 'Unexpected error creating profile for user % on attempt %: %', NEW.id, current_retry, SQLERRM;
                -- Don't retry on unexpected errors
                RETURN NEW;
        END;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user(); 