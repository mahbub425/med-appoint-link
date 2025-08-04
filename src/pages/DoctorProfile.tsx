import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Doctor {
  id: string;
  name: string;
  degree: string;
  experience: string;
  doctor_type: 'General' | 'Homeopathy' | 'Physiotherapist';
}

interface DoctorSchedule {
  id: string;
  doctor_id: string;
  availability_date: string;
  start_time: string;
  break_start: string;
  break_end: string;
  end_time: string;
  max_appointments: number;
}

interface Profile {
  name: string;
  pin: string;
  concern: 'OG' | 'OPL' | 'Udvash-Unmesh' | 'Rokomari' | 'Uttoron';
  phone: string;
}

interface Appointment {
  id: string;
  name: string;
  concern: string;
  reason: string;
  serial_number: number;
  scheduled_time: string;
  status: string;
}

const DoctorProfile = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [schedule, setSchedule] = useState<DoctorSchedule | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    reason: '' as 'New Patient' | 'Follow Up' | 'Report Show' | ''
  });

  useEffect(() => {
    if (doctorId && user) {
      fetchData();
    }
  }, [doctorId, user]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchDoctor(),
        fetchSchedule(),
        fetchProfile(),
        fetchAppointments()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctor = async () => {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', doctorId)
      .single();

    if (error) throw error;
    setDoctor(data);
  };

  const fetchSchedule = async () => {
    const { data, error } = await supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', doctorId)
      .gte('availability_date', new Date().toISOString().split('T')[0])
      .order('availability_date')
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    setSchedule(data);
  };

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('name, pin, concern, phone')
      .eq('user_id', user?.id)
      .single();

    if (error) throw error;
    setProfile(data as any);
  };

  const fetchAppointments = async () => {
    if (!schedule) return;

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', schedule.availability_date)
      .eq('status', 'scheduled')
      .order('serial_number');

    if (error) throw error;
    setAppointments(data || []);
  };

  const calculateNextSerial = () => {
    if (!appointments.length) return 1;
    return Math.max(...appointments.map(a => a.serial_number)) + 1;
  };

  const calculateAppointmentTime = (serialNumber: number, reason: string) => {
    if (!schedule || !doctor) return '';

    const startTime = new Date(`2000-01-01T${schedule.start_time}`);
    const breakStart = new Date(`2000-01-01T${schedule.break_start}`);
    const breakEnd = new Date(`2000-01-01T${schedule.break_end}`);
    
    let currentTime = new Date(startTime);
    let currentSerial = 1;

    while (currentSerial < serialNumber) {
      // Get duration for this serial
      let duration = 10; // Default
      
      if (currentSerial <= appointments.length) {
        const appointment = appointments.find(a => a.serial_number === currentSerial);
        if (appointment) {
          switch (appointment.reason) {
            case 'New Patient': duration = 10; break;
            case 'Follow Up': duration = 7; break;
            case 'Report Show': duration = 12; break;
          }
        }
      }

      currentTime.setMinutes(currentTime.getMinutes() + duration);

      // Skip break time
      if (currentTime >= breakStart && currentTime < breakEnd) {
        currentTime = new Date(breakEnd);
      }

      currentSerial++;
    }

    return currentTime.toTimeString().slice(0, 5);
  };

  const getCurrentSerial = () => {
    if (!schedule || !appointments.length) return 1;

    const now = new Date();
    const today = new Date().toISOString().split('T')[0];
    
    if (schedule.availability_date !== today) return 1;

    const currentTime = now.toTimeString().slice(0, 5);
    
    // Find the current appointment based on time
    for (const appointment of appointments) {
      const appointmentTime = appointment.scheduled_time;
      if (currentTime <= appointmentTime) {
        return appointment.serial_number;
      }
    }

    return appointments.length + 1;
  };

  const canBookAppointment = () => {
    if (!schedule) return false;
    if (!profile) return false;
    
    // Check if already booked for this doctor today
    const hasExistingBooking = appointments.some(a => a.name === profile.name);
    if (hasExistingBooking) return false;

    // Check if max appointments reached
    return appointments.length < schedule.max_appointments;
  };

  const handleBookAppointment = async () => {
    if (!profile || !doctor || !schedule || !formData.reason) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive"
      });
      return;
    }

    setBooking(true);
    
    try {
      const serialNumber = calculateNextSerial();
      const scheduledTime = calculateAppointmentTime(serialNumber, formData.reason);

      const appointmentData = {
        user_id: user?.id,
        doctor_id: doctorId,
        doctor_schedule_id: schedule.id,
        name: profile.name,
        pin: profile.pin,
        concern: profile.concern,
        reason: formData.reason,
        phone: profile.phone,
        serial_number: serialNumber,
        scheduled_time: scheduledTime,
        appointment_date: schedule.availability_date,
        status: 'scheduled' as 'scheduled' | 'completed' | 'absent' | 'cancelled'
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Appointment booked successfully!",
      });

      // Refresh appointments
      await fetchAppointments();
      setFormData({ reason: '' });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!doctor || !schedule) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto max-w-2xl text-center">
          <Button variant="outline" onClick={() => navigate('/')} className="mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <Card>
            <CardContent className="py-8">
              <p className="text-muted-foreground">
                এই সপ্তাহের জন্য এখনো ডাক্তারের আসার তারিখ নির্ধারণ করা হয়নি। অনুগ্রহ করে পরবর্তীতে চেষ্টা করুন।
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <header className="w-full bg-white border-b shadow-sm py-6">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-start">
            {/* Left Side - Branding */}
            <div>
              <h1 className="text-3xl font-bold text-blue-600 mb-1">অন্যরকম</h1>
              <p className="text-lg text-gray-700">Healing Services</p>
            </div>
            
            {/* Right Side - Doctor Info */}
            <div className="text-right">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">{doctor.name}</h2>
              <div className="text-sm text-gray-600 space-y-1">
                <p>{doctor.degree}</p>
                <p>Experience: {doctor.experience}</p>
                <p>Specialization: {doctor.doctor_type}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Notice Section */}
      <div className="w-full bg-gray-50 py-4">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-gray-600 leading-relaxed">
            Please refresh the website before arriving at the doctor's chamber to verify your serial and appointment time. 
            The doctor may arrive earlier or later than scheduled on some days, and if a prior serial is absent, 
            your serial and time may change.
          </p>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Side - Appointment Booking Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Appointment Booking Form</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile && (
                  <>
                    <div>
                      <Label>Name</Label>
                      <Input value={profile.name} disabled />
                    </div>
                    
                    <div>
                      <Label>PIN</Label>
                      <Input value={profile.pin} disabled />
                    </div>
                    
                    <div>
                      <Label>Phone Number</Label>
                      <Input value={profile.phone} disabled />
                    </div>
                    
                    <div>
                      <Label>Concern</Label>
                      <Input value={profile.concern} disabled />
                    </div>
                    
                    <div>
                      <Label htmlFor="reason">Reason *</Label>
                      <Select value={formData.reason} onValueChange={(value) => setFormData({ ...formData, reason: value as any })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason for visit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New Patient">New Patient</SelectItem>
                          <SelectItem value="Follow Up">Follow Up</SelectItem>
                          <SelectItem value="Report Show">Report Show</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {canBookAppointment() ? (
                      <Button 
                        onClick={handleBookAppointment} 
                        className="w-full"
                        disabled={booking || !formData.reason}
                      >
                        {booking ? 'Booking...' : 'Book Appointment'}
                      </Button>
                    ) : (
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          {appointments.length >= schedule.max_appointments 
                            ? "Maximum appointments for this date have been reached."
                            : "You have already booked an appointment with this doctor for this date."
                          }
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Appointment List */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="font-bold">Appointments List</CardTitle>
                <div className="text-sm text-gray-600">
                  Scheduled appointments for {new Date(schedule.availability_date).toLocaleDateString()}
                </div>
                <div className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                  <span>Booking Status: {appointments.length}/{schedule.max_appointments}</span>
                  <span>Next Serial: {getCurrentSerial()}</span>
                </div>
              </CardHeader>
              <CardContent>
                {appointments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Concern</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Schedule Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map((appointment) => {
                        const currentSerial = getCurrentSerial();
                        const isCompleted = appointment.serial_number < currentSerial;
                        const isCurrent = appointment.serial_number === currentSerial;
                        
                        return (
                          <TableRow 
                            key={appointment.id}
                            className={cn(
                              isCompleted && "bg-green-100", // Light green for completed
                              isCurrent && "bg-blue-100"    // Light blue for current
                            )}
                          >
                            <TableCell className="font-medium">{appointment.serial_number}</TableCell>
                            <TableCell>{appointment.name}</TableCell>
                            <TableCell>{appointment.concern}</TableCell>
                            <TableCell>{appointment.reason}</TableCell>
                            <TableCell>{appointment.scheduled_time}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No appointments scheduled for this date.
                  </p>
                )}
                
                {/* Emergency Notice */}
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <p className="text-center">
                    For emergencies when daily limit is reached, please contact: <strong>01708166012</strong>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;