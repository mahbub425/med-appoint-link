import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Clock, User, ArrowLeft, CheckCircle } from 'lucide-react';
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

const BookAppointment = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [schedule, setSchedule] = useState<DoctorSchedule | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState<any>(null);

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
    setProfile(data);
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

  const calculateAppointmentTime = (serialNumber: number) => {
    if (!schedule || !doctor) return '';

    const startTime = new Date(`2000-01-01T${schedule.start_time}`);
    const breakStart = new Date(`2000-01-01T${schedule.break_start}`);
    const breakEnd = new Date(`2000-01-01T${schedule.break_end}`);
    
    let currentTime = new Date(startTime);
    let currentSerial = 1;

    while (currentSerial < serialNumber) {
      // Determine appointment duration based on doctor type and reason
      let duration = 10; // Default for General/Homeopathy new patient
      
      if (doctor.doctor_type === 'Physiotherapist') {
        duration = 25;
      } else {
        // Find the appointment to get its reason
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
      const scheduledTime = calculateAppointmentTime(serialNumber);

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
        .insert([appointmentData])
        .select()
        .single();

      if (error) throw error;

      setBookedAppointment({
        ...data,
        doctor_name: doctor.name,
        appointment_date: schedule.availability_date
      });
      setShowSuccess(true);

      toast({
        title: "Success",
        description: "Appointment booked successfully!",
      });

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

  if (showSuccess && bookedAppointment) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <Button variant="outline" onClick={() => navigate('/')} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-600">Appointment Booked Successfully!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>Appointment Date:</strong> {new Date(bookedAppointment.appointment_date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> {bookedAppointment.scheduled_time}</p>
                <p><strong>Doctor:</strong> {bookedAppointment.doctor_name}</p>
                <p><strong>Name:</strong> {bookedAppointment.name}</p>
                <p><strong>Serial Number:</strong> {bookedAppointment.serial_number}</p>
                <p><strong>Concern:</strong> {bookedAppointment.concern}</p>
                <p><strong>Reason:</strong> {bookedAppointment.reason}</p>
              </div>
              
              <Button onClick={() => navigate('/')} className="w-full">
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
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
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Book Appointment</h1>
            <p className="text-muted-foreground">Dr. {doctor.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Doctor Info & Booking Form */}
          <div className="space-y-6">
            {/* Doctor Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{doctor.name}</span>
                  <Badge variant="outline">{doctor.doctor_type}</Badge>
                </CardTitle>
                <CardDescription>
                  <p className="font-medium">{doctor.degree}</p>
                  <p className="text-sm">Experience: {doctor.experience}</p>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>Available: {new Date(schedule.availability_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>{schedule.start_time} - {schedule.end_time}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Form */}
            <Card>
              <CardHeader>
                <CardTitle>Book Your Appointment</CardTitle>
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
                      <Label>Concern</Label>
                      <Input value={profile.concern} disabled />
                    </div>
                    
                    <div>
                      <Label>Phone Number</Label>
                      <Input value={profile.phone} disabled />
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

          {/* Appointment List */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="font-bold">Appointments List</CardTitle>
                <CardDescription>
                  Scheduled appointments for {new Date(schedule.availability_date).toLocaleDateString()}
                </CardDescription>
                <div className="flex justify-between items-center text-sm">
                  <span>Booking Status: {appointments.length}/{schedule.max_appointments}</span>
                  <span>Next Serial: {getCurrentSerial()}</span>
                </div>
              </CardHeader>
              <CardContent>
                {appointments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serial</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Concern</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Time</TableHead>
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
                              isCompleted && "bg-green-50",
                              isCurrent && "bg-blue-50"
                            )}
                          >
                            <TableCell>{appointment.serial_number}</TableCell>
                            <TableCell>{appointment.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{appointment.concern}</Badge>
                            </TableCell>
                            <TableCell>{appointment.reason}</TableCell>
                            <TableCell>{appointment.scheduled_time}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No appointments booked yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;