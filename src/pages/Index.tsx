import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Doctor {
  id: string;
  name: string;
  degree: string;
  experience: string;
  doctor_type: string;
}

interface DoctorSchedule {
  id: string;
  doctor_id: string;
  availability_date: string;
  start_time: string;
  end_time: string;
  break_start: string;
  break_end: string;
  max_appointments: number;
}

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoctors();
    fetchSchedules();
  }, []);

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
        .gte('availability_date', new Date().toISOString().split('T')[0])
        .order('availability_date');

      if (error) throw error;
      setSchedules(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setLoading(false);
    }
  };

  const getDoctorNextAvailability = (doctorId: string) => {
    const schedule = schedules.find(s => s.doctor_id === doctorId);
    if (schedule) {
      const date = new Date(schedule.availability_date);
      return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    }
    return 'No schedule available';
  };

  const handleViewProfile = (doctorId: string) => {
    if (user) {
      navigate(`/book-appointment/${doctorId}`);
    } else {
      navigate('/auth');
    }
  };

  const handleLogin = () => {
    navigate('/auth');
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
            {/* Left Side - Bengali Text */}
            <div className="flex flex-col">
              <h1 className="text-xl font-bold" style={{ color: '#0000FF' }}>
                অন্যরকম
              </h1>
              <p className="text-sm" style={{ color: '#282828' }}>
                হিলিং সার্ভিসেস
              </p>
            </div>

            {/* Right Side - Login Button */}
            <div>
              {user ? (
                <Button onClick={() => navigate('/dashboard')} variant="default">
                  Dashboard
                </Button>
              ) : (
                <Button onClick={handleLogin} variant="default">
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-4">Our Doctors</h2>
          <p className="text-lg text-muted-foreground">
            Choose from our experienced medical professionals
          </p>
        </div>

        {/* Doctor List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => (
            <Card key={doctor.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">
                  {doctor.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Degree:</span> {doctor.degree}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Experience:</span> {doctor.experience}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Specialization:</span> {doctor.doctor_type}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Next Availability:</span>{' '}
                    <span className="text-primary font-medium">
                      {getDoctorNextAvailability(doctor.id)}
                    </span>
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleViewProfile(doctor.id)}
                  className="w-full"
                  variant="default"
                >
                  View Profile
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {doctors.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">No doctors available at the moment.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;