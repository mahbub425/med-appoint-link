import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DoctorSession {
  id: string;
  name: string;
  username: string;
  loginTime: string;
}

interface DoctorProfile {
  id: string;
  name: string;
  degree: string;
  experience: string;
  doctor_type: 'General' | 'Homeopathy' | 'Physiotherapist';
  profile_picture_url?: string;
  username: string;
}

const DoctorProfileManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [doctorSession, setDoctorSession] = useState<DoctorSession | null>(null);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    degree: '',
    experience: '',
    doctor_type: 'General' as 'General' | 'Homeopathy' | 'Physiotherapist',
    profile_picture_url: ''
  });

  useEffect(() => {
    checkDoctorSession();
  }, []);

  useEffect(() => {
    if (doctorSession) {
      fetchProfile();
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

  const fetchProfile = async () => {
    if (!doctorSession) return;

    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', doctorSession.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFormData({
        name: data.name || '',
        degree: data.degree || '',
        experience: data.experience || '',
        doctor_type: data.doctor_type || 'General',
        profile_picture_url: data.profile_picture_url || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!doctorSession || !profile) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('doctors')
        .update({
          name: formData.name,
          degree: formData.degree,
          experience: formData.experience,
          doctor_type: formData.doctor_type,
          profile_picture_url: formData.profile_picture_url
        })
        .eq('id', doctorSession.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      // Update the profile state
      setProfile(prev => prev ? { ...prev, ...formData } : null);

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
                Profile Management
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Edit Your Profile</CardTitle>
            <p className="text-muted-foreground">
              Update your professional information. Username and password cannot be changed.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <Label htmlFor="doctor_type">Doctor Type *</Label>
                <Select value={formData.doctor_type} onValueChange={(value) => handleInputChange('doctor_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Homeopathy">Homeopathy</SelectItem>
                    <SelectItem value="Physiotherapist">Physiotherapist</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="degree">Degree/Qualification *</Label>
                <Input
                  id="degree"
                  value={formData.degree}
                  onChange={(e) => handleInputChange('degree', e.target.value)}
                  placeholder="e.g., MBBS, MD, BAMS, BPT"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="experience">Experience *</Label>
                <Textarea
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  placeholder="Describe your experience, specializations, etc."
                  className="min-h-[100px]"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="profile_picture">Profile Picture URL (Optional)</Label>
                <Input
                  id="profile_picture"
                  value={formData.profile_picture_url}
                  onChange={(e) => handleInputChange('profile_picture_url', e.target.value)}
                  placeholder="https://example.com/your-photo.jpg"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Username (Cannot be changed)</Label>
                <Input
                  value={profile?.username || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleSave}
                disabled={saving || !formData.name || !formData.degree || !formData.experience}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DoctorProfileManagement;