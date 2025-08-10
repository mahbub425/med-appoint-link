import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { DoctorScheduleForm } from "./DoctorScheduleForm";

interface Doctor {
  id: string;
  name: string;
  designation?: string;
}

interface Schedule {
  id: string;
  doctor_id: string;
  availability_date: string;
  start_time: string;
  end_time: string;
  break_start: string;
  break_end: string;
  max_appointments: number;
  doctor?: Doctor;
}

export const DoctorScheduleManagement = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<Schedule[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [editForm, setEditForm] = useState({
    start_time: "",
    end_time: "",
    break_start: "",
    break_end: "",
    max_appointments: 17
  });

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, name, designation')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch doctors",
        variant: "destructive",
      });
    }
  };

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_schedules')
        .select(`
          *,
          doctor:doctors(id, name, designation)
        `)
        .order('availability_date', { ascending: false });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        title: "Error",
        description: "Failed to fetch schedules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setEditForm({
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      break_start: schedule.break_start,
      break_end: schedule.break_end,
      max_appointments: schedule.max_appointments
    });
  };

  const handleUpdate = async () => {
    if (!editingSchedule) return;

    try {
      const { error } = await supabase
        .from('doctor_schedules')
        .update({
          start_time: editForm.start_time,
          end_time: editForm.end_time,
          break_start: editForm.break_start,
          break_end: editForm.break_end,
          max_appointments: editForm.max_appointments,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingSchedule.id);

      if (error) throw error;

      // Call reschedule function
      await supabase.rpc('reschedule_appointments_for_doctor', {
        p_doctor_id: editingSchedule.doctor_id,
        p_availability_date: editingSchedule.availability_date,
        p_start_time: editForm.start_time,
        p_break_start: editForm.break_start,
        p_break_end: editForm.break_end
      });

      toast({
        title: "Success",
        description: "Schedule updated successfully and appointments rescheduled",
      });

      setEditingSchedule(null);
      fetchSchedules();
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast({
        title: "Error",
        description: "Failed to update schedule",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (scheduleId: string) => {
    const scheduleToDelete = schedules.find(s => s.id === scheduleId);
    if (!scheduleToDelete) return;

    try {
      // First check if there are any appointments for this schedule
      const { data: appointments, error: appointmentError } = await supabase
        .from("appointments")
        .select("id")
        .eq("doctor_id", scheduleToDelete.doctor_id)
        .eq("appointment_date", scheduleToDelete.availability_date);

      if (appointmentError) {
        console.error("Error checking appointments:", appointmentError);
        toast({
          title: "Error",
          description: "Failed to check existing appointments",
          variant: "destructive"
        });
        return;
      }

      // If there are appointments, show warning
      if (appointments && appointments.length > 0) {
        const confirmed = window.confirm(
          `This schedule has ${appointments.length} appointment(s). Deleting it will also cancel these appointments. Are you sure you want to continue?`
        );
        
        if (!confirmed) return;

        // Delete appointments first
        const { error: deleteAppointmentsError } = await supabase
          .from("appointments")
          .delete()
          .eq("doctor_id", scheduleToDelete.doctor_id)
          .eq("appointment_date", scheduleToDelete.availability_date);

        if (deleteAppointmentsError) {
          console.error("Error deleting appointments:", deleteAppointmentsError);
          toast({
            title: "Error",
            description: "Failed to cancel appointments",
            variant: "destructive"
          });
          return;
        }
      }

      const { error } = await supabase
        .from('doctor_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: appointments && appointments.length > 0 
          ? `Schedule and ${appointments.length} appointment(s) deleted successfully`
          : "Schedule deleted successfully",
      });

      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive",
      });
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getScheduleStatus = (schedule: Schedule) => {
    const today = new Date();
    const scheduleDate = new Date(schedule.availability_date);
    
    if (scheduleDate < today) {
      return <Badge variant="secondary">Past</Badge>;
    } else if (scheduleDate.toDateString() === today.toDateString()) {
      return <Badge variant="default">Today</Badge>;
    } else {
      return <Badge variant="outline">Upcoming</Badge>;
    }
  };

  useEffect(() => {
    fetchDoctors();
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (selectedDoctor === "all") {
      setFilteredSchedules(schedules);
    } else {
      setFilteredSchedules(schedules.filter(schedule => schedule.doctor_id === selectedDoctor));
    }
  }, [schedules, selectedDoctor]);

  const onScheduleUpdate = () => {
    fetchSchedules();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Schedule Management</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              Add Schedules
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Doctor Schedule</DialogTitle>
            </DialogHeader>
            <DoctorScheduleForm onScheduleUpdate={onScheduleUpdate} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Schedule List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Doctor Schedules</CardTitle>
            <div className="flex items-center gap-4">
              <Label htmlFor="doctor-filter">Filter by Doctor:</Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Doctors</SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSchedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No schedules found for the selected filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Break</TableHead>
                  <TableHead>Max Appointments</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{schedule.doctor?.name}</div>
                        {schedule.doctor?.designation && (
                          <div className="text-sm text-muted-foreground">
                            {schedule.doctor.designation}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(schedule.availability_date)}</TableCell>
                    <TableCell>
                      {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                    </TableCell>
                    <TableCell>
                      {formatTime(schedule.break_start)} - {formatTime(schedule.break_end)}
                    </TableCell>
                    <TableCell>{schedule.max_appointments}</TableCell>
                    <TableCell>{getScheduleStatus(schedule)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(schedule)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(schedule.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Schedule Dialog */}
      <Dialog open={!!editingSchedule} onOpenChange={() => setEditingSchedule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={editForm.start_time}
                  onChange={(e) => setEditForm(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={editForm.end_time}
                  onChange={(e) => setEditForm(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="break_start">Break Start</Label>
                <Input
                  id="break_start"
                  type="time"
                  value={editForm.break_start}
                  onChange={(e) => setEditForm(prev => ({ ...prev, break_start: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="break_end">Break End</Label>
                <Input
                  id="break_end"
                  type="time"
                  value={editForm.break_end}
                  onChange={(e) => setEditForm(prev => ({ ...prev, break_end: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="max_appointments">Max Appointments</Label>
              <Input
                id="max_appointments"
                type="number"
                value={editForm.max_appointments}
                onChange={(e) => setEditForm(prev => ({ ...prev, max_appointments: parseInt(e.target.value) }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingSchedule(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>
                Update Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};