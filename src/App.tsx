import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import DoctorLogin from "./pages/DoctorLogin";
import DoctorDashboard from "./pages/DoctorDashboard";
import BookAppointment from "./pages/BookAppointment";
import DoctorProfile from "./pages/DoctorProfile";
import DoctorProfileManagement from "./pages/DoctorProfileManagement";
import DoctorScheduleViewing from "./pages/DoctorScheduleViewing";
import DoctorAppointmentManagement from "./pages/DoctorAppointmentManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/auth" />;
};

// Admin route - check for admin credentials
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const adminSession = localStorage.getItem('adminSession');
  if (!adminSession) {
    return <Navigate to="/admin-login" />;
  }
  return <>{children}</>;
};

// Doctor route - check for doctor credentials
const DoctorRoute = ({ children }: { children: React.ReactNode }) => {
  const doctorSession = localStorage.getItem('doctorSession');
  if (!doctorSession) {
    return <Navigate to="/doctor" />;
  }
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  
  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is authenticated, redirect to dashboard on root path
  if (user && window.location.pathname === '/') {
    return <Routes><Route path="/" element={<Navigate to="/dashboard" replace />} /></Routes>;
  }
  
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <UserDashboard />
        </ProtectedRoute>
      } />
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/doctor" element={<DoctorLogin />} />
      <Route path="/doctor-dashboard" element={<DoctorRoute><DoctorDashboard /></DoctorRoute>} />
      <Route path="/book-appointment/:doctorId" element={
        <ProtectedRoute>
          <BookAppointment />
        </ProtectedRoute>
      } />
      <Route path="/doctor-profile/:doctorId" element={
        <ProtectedRoute>
          <DoctorProfile />
        </ProtectedRoute>
      } />
      <Route path="/doctor-profile-management" element={<DoctorRoute><DoctorProfileManagement /></DoctorRoute>} />
      <Route path="/doctor-schedule-viewing" element={<DoctorRoute><DoctorScheduleViewing /></DoctorRoute>} />
      <Route path="/doctor-appointment-management" element={<DoctorRoute><DoctorAppointmentManagement /></DoctorRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
