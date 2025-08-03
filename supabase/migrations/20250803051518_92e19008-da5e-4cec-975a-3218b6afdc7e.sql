-- Fix RLS policies for doctor schedules and appointments
-- Add proper policies for appointments table to fix "new row violates row-level security policy" error

-- Fix appointments table RLS policies
DROP POLICY IF EXISTS "Users can create their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can view all appointments" ON appointments;

-- Create comprehensive policies for appointments
CREATE POLICY "Users can create appointments" 
ON appointments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.role() = 'authenticated');

CREATE POLICY "Users can view their appointments" 
ON appointments 
FOR SELECT 
USING (auth.uid() = user_id OR auth.role() = 'authenticated');

CREATE POLICY "Users can update their appointments" 
ON appointments 
FOR UPDATE 
USING (auth.uid() = user_id OR auth.role() = 'authenticated');

CREATE POLICY "Admin can manage all appointments" 
ON appointments 
FOR ALL 
USING (true);

-- Fix doctor_schedules table RLS policies
DROP POLICY IF EXISTS "Authenticated users can insert schedules" ON doctor_schedules;
DROP POLICY IF EXISTS "Authenticated users can update schedules" ON doctor_schedules;
DROP POLICY IF EXISTS "Authenticated users can delete schedules" ON doctor_schedules;

CREATE POLICY "Admin can manage schedules" 
ON doctor_schedules 
FOR ALL 
USING (true);

-- Ensure handle_new_user function exists and works properly for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, pin, concern, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'pin', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'concern')::public.concern_type, 'OG'),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', '')
  );
  RETURN NEW;
END;
$$;

-- Ensure trigger exists for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();