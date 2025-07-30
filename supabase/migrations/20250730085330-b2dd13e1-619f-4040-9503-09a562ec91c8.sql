-- Create enum types
CREATE TYPE public.concern_type AS ENUM ('OG', 'OPL', 'Udvash-Unmesh', 'Rokomari', 'Uttoron');
CREATE TYPE public.reason_type AS ENUM ('New Patient', 'Follow Up', 'Report Show');
CREATE TYPE public.doctor_type AS ENUM ('Homeopathy', 'General', 'Physiotherapist');
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'completed', 'absent', 'cancelled');

-- Create profiles table for patients
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pin TEXT NOT NULL UNIQUE,
  concern concern_type NOT NULL,
  phone TEXT NOT NULL,
  medical_history TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create doctors table
CREATE TABLE public.doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  degree TEXT NOT NULL,
  experience TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  doctor_type doctor_type NOT NULL DEFAULT 'General',
  profile_picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create doctor schedules table
CREATE TABLE public.doctor_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
  availability_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '11:00:00',
  break_start TIME NOT NULL DEFAULT '13:15:00',
  break_end TIME NOT NULL DEFAULT '14:30:00',
  end_time TIME NOT NULL DEFAULT '16:30:00',
  max_appointments INTEGER NOT NULL DEFAULT 17,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, availability_date)
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
  doctor_schedule_id UUID REFERENCES public.doctor_schedules(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  pin TEXT NOT NULL,
  concern concern_type NOT NULL,
  reason reason_type NOT NULL,
  phone TEXT NOT NULL,
  serial_number INTEGER NOT NULL,
  scheduled_time TIME NOT NULL,
  appointment_date DATE NOT NULL,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, doctor_id, appointment_date)
);

-- Create consultations table for doctor notes
CREATE TABLE public.consultations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
  notes TEXT,
  prescription TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for doctors (readable by all authenticated users)
CREATE POLICY "Doctors are viewable by authenticated users" ON public.doctors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage doctors" ON public.doctors FOR ALL USING (false);

-- RLS Policies for doctor_schedules (readable by all authenticated users)
CREATE POLICY "Doctor schedules are viewable by authenticated users" ON public.doctor_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage schedules" ON public.doctor_schedules FOR ALL USING (false);

-- RLS Policies for appointments
CREATE POLICY "Users can view their own appointments" ON public.appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own appointments" ON public.appointments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all appointments" ON public.appointments FOR SELECT USING (false);

-- RLS Policies for consultations
CREATE POLICY "Users can view consultations for their appointments" ON public.consultations 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.appointments 
    WHERE appointments.id = consultations.appointment_id 
    AND appointments.user_id = auth.uid()
  )
);
CREATE POLICY "Only doctors and admins can manage consultations" ON public.consultations FOR ALL USING (false);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_doctor_schedules_updated_at BEFORE UPDATE ON public.doctor_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create profile after user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, pin, concern, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'pin', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'concern')::concern_type, 'OG'),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default admin doctor for testing
INSERT INTO public.doctors (name, degree, experience, username, password, doctor_type) 
VALUES 
  ('Dr. Shojib Rahman', 'MBBS, MD', '10 years', 'dr_shojib', 'shojib123', 'General'),
  ('Dr. Sarah Ahmed', 'BHMS', '8 years', 'dr_sarah', 'sarah123', 'Homeopathy'),
  ('Dr. Karim Physio', 'BPT, MPT', '5 years', 'dr_karim', 'karim123', 'Physiotherapist');