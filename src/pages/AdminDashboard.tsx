import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Plus, Edit, Trash2, Users, Calendar as CalendarDay, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Doctor {
  id: string;
  name: string;
  degree: string;
  experience: string;
  username: string;
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

interface Appointment {
  id: string;
  name: string;
  pin: string;
  concern: string;
  reason: string;
  phone: string;
  serial_number: number;
  scheduled_time: string;
  appointment_date: string;
  status: string;
  doctor: { name: string };
}

const AdminDashboard = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('doctors');

  // Doctor form state
  const [doctorForm, setDoctorForm] = useState({
    name: '',
    degree: '',
    experience: '',
    username: '',
    password: '',
    doctor_type: 'General' as 'General' | 'Homeopathy' | 'Physiotherapist'
  });

  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    doctor_id: '',
    availability_date: new Date(),
    start_time: '11:00',
    break_start: '13:15',
    break_end: '14:30',
    end_time: '16:30',
    max_appointments: 17
  });

  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [showDoctorDialog, setShowDoctorDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchDoctors(),
      fetchSchedules(),
      fetchAppointments()
    ]);
    setLoading(false);
  };

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('name');

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_schedules')
        .select('*')
        .order('availability_date', { ascending: false });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor:doctors(name)
        `)
        .order('appointment_date', { ascending: false })
        .order('serial_number');

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const handleAddDoctor = async () => {
    if (!doctorForm.name || !doctorForm.degree || !doctorForm.experience || !doctorForm.username || !doctorForm.password) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('doctors')
        .insert([doctorForm]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Doctor added successfully",
      });

      setDoctorForm({
        name: '',
        degree: '',
        experience: '',
        username: '',
        password: '',
        doctor_type: 'General'
      });
      setShowDoctorDialog(false);
      fetchDoctors();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleUpdateDoctor = async () => {
    if (!editingDoctor) return;

    try {
      const { error } = await supabase
        .from('doctors')
        .update(doctorForm)
        .eq('id', editingDoctor.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Doctor updated successfully",
      });

      setEditingDoctor(null);
      setShowDoctorDialog(false);
      fetchDoctors();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    if (!confirm('Are you sure you want to delete this doctor?')) return;

    try {
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', doctorId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Doctor deleted successfully",
      });

      fetchDoctors();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleAddSchedule = async () => {
    if (!scheduleForm.doctor_id) {
      toast({
        title: "Error",
        description: "Please select a doctor",
        variant: "destructive"
      });
      return;
    }

    try {
      const scheduleData = {
        ...scheduleForm,
        availability_date: format(scheduleForm.availability_date, 'yyyy-MM-dd')
      };

      const { error } = await supabase
        .from('doctor_schedules')
        .upsert([scheduleData], { onConflict: 'doctor_id,availability_date' });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Schedule saved successfully",
      });

      setScheduleForm({
        doctor_id: '',
        availability_date: new Date(),
        start_time: '11:00',
        break_start: '13:15',
        break_end: '14:30',
        end_time: '16:30',
        max_appointments: 17
      });
      setShowScheduleDialog(false);
      fetchSchedules();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleMarkAbsent = async (appointmentId: string) => {
    if (!confirm('Are you sure to mark this appointment absent?')) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'absent' })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Appointment marked as absent",
      });

      fetchAppointments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const openDoctorDialog = (doctor?: Doctor) => {
    if (doctor) {
      setEditingDoctor(doctor);
      setDoctorForm({
        name: doctor.name,
        degree: doctor.degree,
        experience: doctor.experience,
        username: doctor.username,
        password: '',
        doctor_type: doctor.doctor_type
      });
    } else {
      setEditingDoctor(null);
      setDoctorForm({
        name: '',
        degree: '',
        experience: '',
        username: '',
        password: '',
        doctor_type: 'General'
      });
    }
    setShowDoctorDialog(true);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage doctors, schedules, and appointments</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="doctors">Doctors</TabsTrigger>
            <TabsTrigger value="schedules">Schedules</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Doctors Tab */}
          <TabsContent value="doctors" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Manage Doctors</h2>
              <Button onClick={() => openDoctorDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Doctor
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doctor) => (
                <Card key={doctor.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{doctor.name}</span>
                      <Badge variant="outline">{doctor.doctor_type}</Badge>
                    </CardTitle>
                    <CardDescription>
                      <p>{doctor.degree}</p>
                      <p className="text-sm">Experience: {doctor.experience}</p>
                      <p className="text-sm">Username: {doctor.username}</p>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDoctorDialog(doctor)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDoctor(doctor.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Schedules Tab */}
          <TabsContent value="schedules" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Doctor Schedules</h2>
              <Button onClick={() => setShowScheduleDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Schedule
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Break</TableHead>
                  <TableHead>Max Appointments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => {
                  const doctor = doctors.find(d => d.id === schedule.doctor_id);
                  return (
                    <TableRow key={schedule.id}>
                      <TableCell>{doctor?.name}</TableCell>
                      <TableCell>{new Date(schedule.availability_date).toLocaleDateString()}</TableCell>
                      <TableCell>{schedule.start_time} - {schedule.end_time}</TableCell>
                      <TableCell>{schedule.break_start} - {schedule.break_end}</TableCell>
                      <TableCell>{schedule.max_appointments}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-6">
            <h2 className="text-xl font-semibold">All Appointments</h2>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>PIN</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>{appointment.serial_number}</TableCell>
                    <TableCell>{appointment.name}</TableCell>
                    <TableCell>{appointment.pin}</TableCell>
                    <TableCell>{appointment.doctor.name}</TableCell>
                    <TableCell>{new Date(appointment.appointment_date).toLocaleDateString()}</TableCell>
                    <TableCell>{appointment.scheduled_time}</TableCell>
                    <TableCell>
                      <Badge variant={appointment.status === 'scheduled' ? 'default' : 'secondary'}>
                        {appointment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {appointment.status === 'scheduled' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAbsent(appointment.id)}
                        >
                          Mark Absent
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-xl font-semibold">System Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{doctors.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                  <CalendarDay className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{appointments.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Schedules</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{schedules.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {appointments.filter(a => a.status === 'completed').length}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Doctor Dialog */}
      <Dialog open={showDoctorDialog} onOpenChange={setShowDoctorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}</DialogTitle>
            <DialogDescription>
              {editingDoctor ? 'Update doctor information' : 'Enter doctor details to add to the system'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={doctorForm.name}
                onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                placeholder="Doctor's full name"
              />
            </div>
            
            <div>
              <Label htmlFor="degree">Degree</Label>
              <Input
                id="degree"
                value={doctorForm.degree}
                onChange={(e) => setDoctorForm({ ...doctorForm, degree: e.target.value })}
                placeholder="e.g., MBBS, MD"
              />
            </div>
            
            <div>
              <Label htmlFor="experience">Experience</Label>
              <Input
                id="experience"
                value={doctorForm.experience}
                onChange={(e) => setDoctorForm({ ...doctorForm, experience: e.target.value })}
                placeholder="e.g., 10 years"
              />
            </div>
            
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={doctorForm.username}
                onChange={(e) => setDoctorForm({ ...doctorForm, username: e.target.value })}
                placeholder="Login username"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={doctorForm.password}
                onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                placeholder="Login password"
              />
            </div>
            
            <div>
              <Label htmlFor="doctor_type">Doctor Type</Label>
              <Select value={doctorForm.doctor_type} onValueChange={(value) => setDoctorForm({ ...doctorForm, doctor_type: value as 'General' | 'Homeopathy' | 'Physiotherapist' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Homeopathy">Homeopathy</SelectItem>
                  <SelectItem value="Physiotherapist">Physiotherapist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={editingDoctor ? handleUpdateDoctor : handleAddDoctor}
                className="flex-1"
              >
                {editingDoctor ? 'Update Doctor' : 'Add Doctor'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowDoctorDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Doctor Schedule</DialogTitle>
            <DialogDescription>
              Configure doctor availability and appointment limits
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="doctor_select">Select Doctor</Label>
              <Select value={scheduleForm.doctor_id} onValueChange={(value) => setScheduleForm({ ...scheduleForm, doctor_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>{doctor.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Availability Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduleForm.availability_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduleForm.availability_date ? format(scheduleForm.availability_date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduleForm.availability_date}
                    onSelect={(date) => date && setScheduleForm({ ...scheduleForm, availability_date: date })}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={scheduleForm.start_time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={scheduleForm.end_time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="break_start">Break Start</Label>
                <Input
                  id="break_start"
                  type="time"
                  value={scheduleForm.break_start}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, break_start: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="break_end">Break End</Label>
                <Input
                  id="break_end"
                  type="time"
                  value={scheduleForm.break_end}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, break_end: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="max_appointments">Maximum Appointments</Label>
              <Input
                id="max_appointments"
                type="number"
                value={scheduleForm.max_appointments}
                onChange={(e) => setScheduleForm({ ...scheduleForm, max_appointments: parseInt(e.target.value) || 0 })}
                min="1"
                max="50"
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleAddSchedule} className="flex-1">
                Save Schedule
              </Button>
              <Button variant="outline" onClick={() => setShowScheduleDialog(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;