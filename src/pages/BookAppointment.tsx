import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Calendar, Clock, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Doctor {
  id: string;
  name: string;
  degree: string;
  experience: string;
  designation: string;
  specialties: string[];
}

interface DoctorSchedule {
  id: string;
  availability_date: string;
  start_time: string;
  break_start: string;
  break_end: string;
  end_time: string;
  max_appointments: number;
  location: string;
}

interface Appointment {
  id: string;
  serial_number: number;
  reason: string;
  appointment_time: string;
  user_id: string;
}

export default function BookAppointment() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [schedule, setSchedule] = useState<DoctorSchedule | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (doctorId && userProfile) {
      fetchDoctorData();
    }
  }, [doctorId, userProfile]);

  const fetchDoctorData = async () => {
    if (!doctorId) return;

    try {
      // Fetch doctor details
      const { data: doctorData, error: doctorError } = await supabase
        .from("doctors")
        .select("*")
        .eq("id", doctorId)
        .single();

      if (doctorError || !doctorData) {
        toast({
          title: "Error",
          description: "Doctor not found",
          variant: "destructive"
        });
        navigate("/user");
        return;
      }

      setDoctor(doctorData);

      // Fetch doctor's next availability
      const { data: scheduleData, error: scheduleError } = await supabase
        .from("doctor_schedules")
        .select("*")
        .eq("doctor_id", doctorId)
        .gte("availability_date", new Date().toISOString().split('T')[0])
        .order("availability_date", { ascending: true })
        .limit(1)
        .single();

      if (scheduleError || !scheduleData) {
        setSchedule(null);
        setLoading(false);
        return;
      }

      setSchedule(scheduleData);

      // Fetch existing appointments for this date
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .eq("doctor_id", doctorId)
        .eq("appointment_date", scheduleData.availability_date)
        .order("serial_number", { ascending: true });

      if (appointmentsError) {
        console.error("Error fetching appointments:", appointmentsError);
      } else {
        setAppointments(appointmentsData || []);
      }
    } catch (error) {
      console.error("Error fetching doctor data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAppointmentTime = (serialNumber: number, reason: string) => {
    if (!schedule) return "";

    const durations: { [key: string]: number } = {
      "New Patient": 10,
      "Follow Up": 7,
      "Report Show": 12
    };

    let currentTime = new Date(`2000-01-01T${schedule.start_time}`);
    const breakStart = new Date(`2000-01-01T${schedule.break_start}`);
    const breakEnd = new Date(`2000-01-01T${schedule.break_end}`);

    // Calculate time for appointments before this one
    for (let i = 1; i < serialNumber; i++) {
      const appointment = appointments.find(apt => apt.serial_number === i);
      if (appointment) {
        const duration = durations[appointment.reason] || 10;
        currentTime.setMinutes(currentTime.getMinutes() + duration);

        // Skip break time
        if (currentTime >= breakStart && currentTime < breakEnd) {
          currentTime = new Date(breakEnd);
        }
      }
    }

    return currentTime.toTimeString().slice(0, 5);
  };

  const handleBookAppointment = async () => {
    if (!userProfile || !doctor || !schedule || !selectedReason) {
      toast({
        title: "Error",
        description: "Please select a reason for your appointment",
        variant: "destructive"
      });
      return;
    }

    // Check if user already has an appointment with this doctor on this date
    const existingAppointment = appointments.find(apt => apt.user_id === userProfile.id);
    if (existingAppointment) {
      toast({
        title: "Error",
        description: "You can only book one appointment per doctor per day",
        variant: "destructive"
      });
      return;
    }

    // Check if max appointments reached
    if (appointments.length >= schedule.max_appointments) {
      toast({
        title: "Error",
        description: "Maximum appointments for this date have been reached",
        variant: "destructive"
      });
      return;
    }

    setBooking(true);

    try {
      const nextSerial = appointments.length + 1;
      const appointmentTime = calculateAppointmentTime(nextSerial, selectedReason);

      const { data, error } = await supabase
        .from("appointments")
        .insert({
          user_id: userProfile.id,
          doctor_id: doctor.id,
          name: userProfile.name,
          pin: parseInt(userProfile.pin),
          concern: userProfile.concern,
          phone: userProfile.phone,
          reason: selectedReason,
          appointment_date: schedule.availability_date,
          serial_number: nextSerial,
          appointment_time: appointmentTime,
          status: "upcoming"
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to book appointment",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `Appointment booked successfully! Your appointment is scheduled for ${appointmentTime} on ${new Date(schedule.availability_date).toLocaleDateString('en-GB')}`
      });

      // Navigate to appointment details page with appointment data
      navigate("/appointment-details", {
        state: {
          appointmentData: {
            ...data,
            doctor_name: doctor.name,
            location: schedule.location
          }
        }
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setBooking(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Doctor not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/user")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold">Book Appointment</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Doctor Details */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-card/80">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
              <CardTitle className="text-xl text-primary">Doctor Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-primary">{doctor.name}</h3>
                <p className="text-lg text-muted-foreground font-medium">{doctor.degree}</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{doctor.designation}</p>
                  <p>{doctor.experience}</p>
                </div>
              </div>

              {schedule && (
                <div className="space-y-4">
                  {/* Next Availability */}
                  <div className="bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/10 p-4 rounded-lg border-l-4 border-green-500">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-5 w-5 text-green-600" />
                      <span className="font-bold text-lg text-green-700 dark:text-green-400">Next Availability</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-bold text-foreground">
                        {formatDate(schedule.availability_date)}
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        ({schedule.start_time} - {schedule.end_time})
                      </p>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                          Break: {schedule.break_start} - {schedule.break_end}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                          Available slots: {schedule.max_appointments - appointments.length}/{schedule.max_appointments}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/10 p-4 rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      <span className="font-bold text-lg text-blue-700 dark:text-blue-400">Location</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{schedule.location}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking Form */}
          <Card>
            <CardHeader>
              <CardTitle>Book Your Appointment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!schedule ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    এই সপ্তাহের জন্য এখনো ডাক্তারের আসার তারিখ নির্ধারণ করা হয়নি। অনুগ্রহ করে পরবর্তীতে চেষ্টা করুন।
                  </p>
                </div>
              ) : appointments.length >= schedule.max_appointments ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Maximum appointments for this date have been reached.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm text-muted-foreground mt-1">{userProfile?.name}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">PIN</Label>
                    <p className="text-sm text-muted-foreground mt-1">{userProfile?.pin}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Concern</Label>
                    <p className="text-sm text-muted-foreground mt-1">{userProfile?.concern}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Phone Number</Label>
                    <p className="text-sm text-muted-foreground mt-1">{userProfile?.phone}</p>
                  </div>

                  <div>
                    <Label htmlFor="reason">Reason for Visit</Label>
                    <Select value={selectedReason} onValueChange={setSelectedReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New Patient">New Patient</SelectItem>
                        <SelectItem value="Follow Up">Follow Up</SelectItem>
                        <SelectItem value="Report Show">Report Show</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                   {selectedReason && schedule && (
                    <div className="bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/10 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <h4 className="font-bold text-lg text-green-700 dark:text-green-400 mb-3">Appointment Details:</h4>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Date: <span className="font-bold">{formatDate(schedule.availability_date)}</span></p>
                        <p className="text-sm font-medium">
                          Expected Time: <span className="font-bold">{calculateAppointmentTime(appointments.length + 1, selectedReason)}</span>
                        </p>
                        <p className="text-sm font-medium">Serial Number: <span className="font-bold">{appointments.length + 1}</span></p>
                        <p className="text-sm font-medium">Doctor: <span className="font-bold">{doctor.name}</span></p>
                        <p className="text-sm font-medium">Location: <span className="font-bold">{schedule.location}</span></p>
                      </div>
                    </div>
                   )}

                  <Button 
                    onClick={handleBookAppointment}
                    disabled={booking || !selectedReason}
                    className="w-full"
                  >
                    {booking ? "Booking..." : "Book Appointment"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}