-- Drop existing policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Create new policies
CREATE POLICY "Enable insert for authentication users" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable select for authenticated users" ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on id" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Ensure RLS is enabled
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY; 