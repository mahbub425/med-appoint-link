
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DoctorLoginProps {
  onLoginSuccess: (doctor: any) => void;
}

export const DoctorLogin = ({ onLoginSuccess }: DoctorLoginProps) => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      console.log("Attempting login with username:", credentials.username);
      
      // Query doctors table for username and password match
      const { data: doctors, error } = await supabase
        .from("doctors")
        .select("*")
        .eq("username", credentials.username)
        .eq("is_active", true);

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      console.log("Found doctors:", doctors);

      if (!doctors || doctors.length === 0) {
        console.log("No doctor found with username:", credentials.username);
        setError("Invalid username or password");
        setIsSubmitting(false);
        return;
      }

      const doctor = doctors[0];
      console.log("Doctor found:", doctor);
      console.log("Comparing password:", credentials.password, "with stored:", doctor.password_hash);
      
      // Direct password comparison as requested
      if (doctor.password_hash === credentials.password) {
        console.log("Password match successful");
        
        // Store complete doctor information in localStorage
        const doctorSessionData = {
          id: doctor.id,
          username: doctor.username,
          name: doctor.name,
          degree: doctor.degree,
          experience: doctor.experience,
          designation: doctor.designation,
          specialties: doctor.specialties,
          is_active: doctor.is_active,
          created_at: doctor.created_at,
          updated_at: doctor.updated_at
        };
        
        localStorage.setItem('doctorSession', JSON.stringify(doctorSessionData));
        
        toast({
          title: "Login Successful",
          description: `Welcome, Dr. ${doctor.name}`,
        });
        
        onLoginSuccess(doctor);
      } else {
        console.log("Password mismatch");
        setError("Invalid username or password");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setError("Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <UserCheck className="h-5 w-5" />
            Doctor Login
          </CardTitle>
          <CardDescription>
            Enter your credentials to access the doctor panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
