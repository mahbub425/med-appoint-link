import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface DoctorSession {
  id: string;
  name: string;
  username: string;
  loginTime: string;
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

const DoctorScheduleViewing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [doctorSession, setDoctorSession] = useState<DoctorSession | null>(null);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState<DoctorSchedule | null>(null);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    start_time: '',
    break_start: '',
    break_end: '',
    end_time: '',
    max_appointments: 17
  });

  useEffect(() => {
    checkDoctorSession();
  }, []);

  useEffect(() => {
    if (doctorSession) {
      fetchSchedules();
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

  const fetchSchedules = async () => {
    if (!doctorSession) return;

    try {
      const { data, error } = await supabase
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', doctorSession.id)
        .order('availability_date');

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        title: "Error",
        description: "Failed to load schedules",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (schedule: DoctorSchedule) => {
    setEditingSchedule(schedule);
    setEditForm({
      start_time: schedule.start_time,
      break_start: schedule.break_start,
      break_end: schedule.break_end,
      end_time: schedule.end_time,
      max_appointments: schedule.max_appointments
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSchedule) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('doctor_schedules')
        .update({
          start_time: editForm.start_time,
          break_start: editForm.break_start,
          break_end: editForm.break_end,
          end_time: editForm.end_time,
          max_appointments: editForm.max_appointments
        })
        .eq('id', editingSchedule.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Schedule updated successfully",
      });

      // Refresh schedules
      await fetchSchedules();
      setEditingSchedule(null);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
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
                Schedule Viewing
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Your Schedules
            </CardTitle>
            <p className="text-muted-foreground">
              View and edit your available schedules. You can modify timing but cannot delete schedules.
            </p>
          </CardHeader>
          <CardContent>
            {schedules.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>Break Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Max Appointments</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">
                        {new Date(schedule.availability_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {schedule.start_time}
                        </div>
                      </TableCell>
                      <TableCell>
                        {schedule.break_start} - {schedule.break_end}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {schedule.end_time}
                        </div>
                      </TableCell>
                      <TableCell>{schedule.max_appointments}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(schedule)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Schedule</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Date (Cannot be changed)</Label>
                                <Input
                                  value={new Date(schedule.availability_date).toLocaleDateString()}
                                  disabled
                                  className="bg-muted"
                                />
                              </div>
                              
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
                                <Label htmlFor="max_appointments">Maximum Appointments</Label>
                                <Input
                                  id="max_appointments"
                                  type="number"
                                  min="1"
                                  max="50"
                                  value={editForm.max_appointments}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, max_appointments: parseInt(e.target.value) || 17 }))}
                                />
                              </div>

                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setEditingSchedule(null)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleSaveEdit} disabled={saving}>
                                  {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No schedules found. Contact admin to set up your availability.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DoctorScheduleViewing;