import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

const Auth = () => {
  const { signUp, signIn, signInWithPin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Sign Up Form State
  const [signUpData, setSignUpData] = useState({
    name: '',
    email: '',
    pin: '',
    concern: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  // Sign In Form State
  const [signInData, setSignInData] = useState({
    pin: '',
    password: ''
  });

  const handleSignUp = async () => {
    if (signUpData.password !== signUpData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords don't match",
        variant: "destructive"
      });
      return;
    }

    if (!signUpData.name || !signUpData.email || !signUpData.pin || !signUpData.concern || !signUpData.phone || !signUpData.password) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const { error } = await signUp(signUpData.email, signUpData.password, {
      name: signUpData.name,
      pin: signUpData.pin,
      concern: signUpData.concern,
      phone: signUpData.phone
    });

    if (error) {
      toast({
        title: "Sign Up Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Account created successfully! Please check your email to verify your account.",
      });
      navigate('/');
    }
    setLoading(false);
  };

  const handleSignIn = async () => {
    if (!signInData.pin || !signInData.password) {
      toast({
        title: "Error",
        description: "PIN and password are required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const { error } = await signInWithPin(signInData.pin, signInData.password);

    if (error) {
      toast({
        title: "Sign In Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Signed in successfully!",
      });
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Doctor Appointment System</CardTitle>
          <CardDescription>Sign in to book appointments or create an account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-pin">PIN</Label>
                <Input
                  id="signin-pin"
                  type="text"
                  placeholder="Enter your PIN"
                  value={signInData.pin}
                  onChange={(e) => setSignInData({ ...signInData, pin: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Enter your password"
                  value={signInData.password}
                  onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                />
              </div>
              
              <Button 
                onClick={handleSignIn} 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Enter your full name"
                  value={signUpData.name}
                  onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email"
                  value={signUpData.email}
                  onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-pin">PIN</Label>
                <Input
                  id="signup-pin"
                  type="text"
                  placeholder="Create a unique PIN"
                  value={signUpData.pin}
                  onChange={(e) => setSignUpData({ ...signUpData, pin: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-concern">Concern</Label>
                <Select value={signUpData.concern} onValueChange={(value) => setSignUpData({ ...signUpData, concern: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your concern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OG">OG</SelectItem>
                    <SelectItem value="OPL">OPL</SelectItem>
                    <SelectItem value="Udvash-Unmesh">Udvash-Unmesh</SelectItem>
                    <SelectItem value="Rokomari">Rokomari</SelectItem>
                    <SelectItem value="Uttoron">Uttoron</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-phone">Phone</Label>
                <Input
                  id="signup-phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={signUpData.phone}
                  onChange={(e) => setSignUpData({ ...signUpData, phone: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Create a password"
                  value={signUpData.password}
                  onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                <Input
                  id="signup-confirm-password"
                  type="password"
                  placeholder="Confirm your password"
                  value={signUpData.confirmPassword}
                  onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                />
              </div>
              
              <Button 
                onClick={handleSignUp} 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;