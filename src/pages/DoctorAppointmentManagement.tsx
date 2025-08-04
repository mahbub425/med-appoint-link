import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface DoctorSession {
  id: string;
  name: string;
  username: string;
  loginTime: string;
}

interface Appointment {
  id: string;
  name: string;
  concern: string;
  reason: string;
  serial_number: number;
  scheduled_time: string;
  appointment_date: string;
  status: string;
  phone: string;
}

const DoctorAppointmentManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [doctorSession, setDoctorSession] = useState<DoctorSession | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [completedAppointments, setCompletedAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    checkDoctorSession();
  }, []);

  useEffect(() => {
    if (doctorSession) {
      fetchAppointments();
    }
  }, [doctorSession]);

  const checkDoctorSession = () => {
    const session = localStorage.getItem('doctorSession');
    if (session) {
      const parsedSession: DoctorSession = JSON.parse(session);
      setDoctorSession(parsedSession);
    } else {
      navigate('/doctor');
    }
  };

  const fetchAppointments = async () => {
    if (!doctorSession) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch active appointments
      const { data: activeData, error: activeError } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorSession.id)
        .eq('appointment_date', today)
        .eq('status', 'scheduled')
        .order('serial_number');

      if (activeError) throw activeError;

      // Fetch completed/absent appointments
      const { data: completedData, error: completedError } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorSession.id)
        .eq('appointment_date', today)
        .in('status', ['completed', 'absent'])
        .order('serial_number');

      if (completedError) throw completedError;

      setAppointments(activeData || []);
      setCompletedAppointments(completedData || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentSerial = () => {
    if (!appointments.length) return 1;

    const now = new Date();
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

  const recalculateSerials = async (removedSerial: number) => {
    // Get appointments that need to be updated (serial numbers greater than removed)
    const appointmentsToUpdate = appointments.filter(apt => apt.serial_number > removedSerial);
    
    if (appointmentsToUpdate.length > 0) {
      const updates = appointmentsToUpdate.map(apt => ({
        id: apt.id,
        serial_number: apt.serial_number - 1
      }));

      // Update serials in database
      for (const update of updates) {
        await supabase
          .from('appointments')
          .update({ serial_number: update.serial_number })
          .eq('id', update.id);
      }
    }
  };

  const handleMarkComplete = async (appointmentId: string, serialNumber: number) => {
    setProcessing(appointmentId);

    try {
      // Update appointment status
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentId);

      if (error) throw error;

      // Recalculate serials for subsequent appointments
      await recalculateSerials(serialNumber);

      toast({
        title: "Success",
        description: "Appointment marked as complete",
      });

      // Refresh appointments
      await fetchAppointments();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkAbsent = async (appointmentId: string, serialNumber: number) => {
    setProcessing(appointmentId);

    try {
      // Update appointment status
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'absent' })
        .eq('id', appointmentId);

      if (error) throw error;

      // Recalculate serials for subsequent appointments
      await recalculateSerials(serialNumber);

      toast({
        title: "Success",
        description: "Appointment marked as absent",
      });

      // Refresh appointments
      await fetchAppointments();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate('/doctor-dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-xl font-semibold text-foreground">
                Appointment Management
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Active Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Active Appointments
            </CardTitle>
            <p className="text-muted-foreground">
              Appointments scheduled for {new Date().toLocaleDateString()}
            </p>
            <div className="text-sm bg-muted p-2 rounded">
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
                    <TableHead>Phone</TableHead>
                    <TableHead>Actions</TableHead>
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
                        <TableCell className="font-medium">{appointment.serial_number}</TableCell>
                        <TableCell>{appointment.name}</TableCell>
                        <TableCell>{appointment.concern}</TableCell>
                        <TableCell>{appointment.reason}</TableCell>
                        <TableCell>{appointment.scheduled_time}</TableCell>
                        <TableCell>{appointment.phone}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  disabled={processing === appointment.id}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Complete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Mark as Complete</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure to mark this appointment as complete?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>No</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleMarkComplete(appointment.id, appointment.serial_number)}>
                                    Yes
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  disabled={processing === appointment.id}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Absent
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Mark as Absent</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure to mark this appointment as absent?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>No</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleMarkAbsent(appointment.id, appointment.serial_number)}>
                                    Yes
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No active appointments for today.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Appointments */}
        {completedAppointments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Completed/Absent Appointments</CardTitle>
              <p className="text-muted-foreground">
                Appointments that have been completed or marked absent today
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Original Serial</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Concern</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Schedule Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedAppointments.map((appointment) => (
                    <TableRow 
                      key={appointment.id}
                      className="bg-gray-50"
                    >
                      <TableCell className="font-medium">{appointment.serial_number}</TableCell>
                      <TableCell>{appointment.name}</TableCell>
                      <TableCell>{appointment.concern}</TableCell>
                      <TableCell>{appointment.reason}</TableCell>
                      <TableCell>{appointment.scheduled_time}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          appointment.status === 'completed' 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        )}>
                          {appointment.status === 'completed' ? 'Completed' : 'Absent'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default DoctorAppointmentManagement;