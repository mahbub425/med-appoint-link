import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DoctorSession {
  id: string;
  name: string;
  username: string;
  loginTime: string;
}

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [doctorSession, setDoctorSession] = useState<DoctorSession | null>(null);
  const [todayAppointmentsCount, setTodayAppointmentsCount] = useState(0);
  const [totalAppointmentsCount, setTotalAppointmentsCount] = useState(0);
  const [profileStatus, setProfileStatus] = useState<'Active' | 'Inactive'>('Active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkDoctorSession();
  }, []);

  useEffect(() => {
    if (doctorSession) {
      fetchDashboardData();
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
    setLoading(false);
  };

  const fetchDashboardData = async () => {
    if (!doctorSession) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch today's appointments
      const { data: todayData, error: todayError } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorSession.id)
        .eq('appointment_date', today)
        .eq('status', 'scheduled');

      if (todayError) throw todayError;
      setTodayAppointmentsCount(todayData?.length || 0);

      // Fetch total appointments
      const { data: totalData, error: totalError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', doctorSession.id);

      if (totalError) throw totalError;
      setTotalAppointmentsCount(totalData?.length || 0);

      // Fetch doctor profile status
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', doctorSession.id)
        .single();

      if (doctorError) throw doctorError;
      // Assuming doctors are active by default - can be enhanced with status field
      setProfileStatus('Active');

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('doctorSession');
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!doctorSession) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Side - Doctor Info */}
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-foreground">
                Dr. {doctorSession.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Doctor Panel
              </p>
            </div>

            {/* Right Side - Logout Button */}
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Welcome, Dr. {doctorSession.name}
          </h2>
          <p className="text-lg text-muted-foreground">
            Manage your appointments and patient consultations
          </p>
        </div>

        {/* Dashboard Cards as per FRS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{totalAppointmentsCount}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Total appointments booked to date
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Today's Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{todayAppointmentsCount}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Appointments for {new Date().toLocaleDateString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                  profileStatus === 'Active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {profileStatus}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Current profile status
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Menu */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Profile Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View and edit your professional details
              </p>
              <Button className="w-full" variant="default" onClick={() => navigate('/doctor-profile-management')}>
                Manage Profile
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Schedule Viewing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View your availability and schedule
              </p>
              <Button className="w-full" variant="default" onClick={() => navigate('/doctor-schedule-viewing')}>
                View Schedule
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Appointment Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Manage patient appointments
              </p>
              <Button className="w-full" variant="default" onClick={() => navigate('/doctor-appointment-management')}>
                Manage Appointments
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Consultation Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Handle patient consultations
              </p>
              <Button className="w-full" variant="default">
                Manage Consultations
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DoctorDashboard;