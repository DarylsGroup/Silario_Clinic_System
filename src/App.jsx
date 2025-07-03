// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ClinicProvider } from './contexts/ClinicContext';
import DebugLockoutFix from './components/common/DebugLockoutFix';

// Public Pages
import Home from './pages/public/Home';
import About from './pages/public/About';
import Services from './pages/public/Services';
import Contact from './pages/public/Contact';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Private Pages - Admin
import AdminDashboard from './pages/admin/Dashboard';
import AdminUserManagement from './pages/admin/UserManagement';
import AdminAppointments from './pages/admin/Appointments';
import AdminBilling from './pages/admin/Billing';
import AdminServiceManagement from './pages/admin/ServiceManagement';
import AdminQueueMonitoring from './pages/admin/QueueMonitoring';
import AdminReports from './pages/admin/Reports';
import AdminSettings from './pages/admin/Settings';

// Private Pages - Doctor
import DoctorDashboard from './pages/doctor/Dashboard';
import DoctorAppointments from './pages/doctor/Appointments';
import DoctorPatientRecords from './pages/doctor/PatientRecords';
import PatientsList from './pages/doctor/PatientsList'; // Import the PatientsList component
import DoctorEmergencyCases from './pages/doctor/EmergencyCases';
import DoctorQueueManagement from './pages/doctor/QueueManagement';
import DoctorBilling from './pages/doctor/Billing';
import DoctorSettings from './pages/doctor/Settings';
import DentalChart from './pages/doctor/DentalChart'; // Import the DentalChart component

// Private Pages - Staff
import StaffDashboard from './pages/staff/Dashboard';
import StaffAppointments from './pages/staff/Appointments';
import StaffQueueManagement from './pages/staff/QueueManagement';
import StaffPatientRecords from './pages/staff/PatientRecords';
import StaffPatientsList from './pages/staff/PatientsList'; // Import the Staff PatientsList component
import StaffSettings from './pages/staff/Settings';

// Private Pages - Patient
import PatientDashboard from './pages/patient/Dashboard';
import PatientProfile from './pages/patient/Profile';
import PatientServices from './pages/patient/Services';
import PatientAppointments from './pages/patient/Appointments';
import PatientPayments from './pages/patient/Payments';
import PatientHistory from './pages/patient/History';
import PatientSettings from './pages/patient/Settings';

// Shared Components
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import NotFound from './pages/NotFound';

// Import supabase to check for persistent sessions at startup
import supabase from './config/supabaseClient';

function App() {
  const [appReady, setAppReady] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Check for debug mode
  const isDebugMode = new URLSearchParams(window.location.search).get('debug') === 'unlock';

  // Add extra initialization to ensure auth is ready
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Force refresh the session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error during initialization:', error);
          // Clear any potentially corrupted state if there's an error
          try {
            await supabase.auth.signOut();
          } catch (e) {
            console.error('Error during cleanup signout:', e);
          }
        }
        
        console.log('Auth initialized, session:', data?.session ? 'Present' : 'None');
      } catch (e) {
        console.error('Error during auth initialization:', e);
      } finally {
        setAuthInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  // Only show the app once auth is initialized to prevent flashes
  useEffect(() => {
    if (authInitialized) {
      setAppReady(true);
    }
  }, [authInitialized]);

  if (!appReady && !isDebugMode) {
    // Simple initial loading screen
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-lg font-medium text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <ClinicProvider>
        <Router>
          {/* Always render the debug helper - it will only show when URL has ?debug=unlock */}
          <DebugLockoutFix />
          
          <Routes>
            {/* Public Routes - Will redirect to dashboard if logged in */}
            <Route element={<PublicRoute />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/services" element={<Services />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>

            {/* Root / Route redirection based on role */}
            <Route 
              path="/" 
              element={<Navigate to="/patient/dashboard" replace />} 
            />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute role="admin" />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUserManagement />} />
              <Route path="appointments" element={<AdminAppointments />} />
              <Route path="billing" element={<AdminBilling />} />
              <Route path="services" element={<AdminServiceManagement />} />
              <Route path="queue" element={<AdminQueueMonitoring />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Doctor Routes - UPDATED with Dental Chart */}
            <Route path="/doctor" element={<ProtectedRoute role="doctor" />}>
              <Route index element={<Navigate to="/doctor/dashboard" replace />} />
              <Route path="dashboard" element={<DoctorDashboard />} />
              <Route path="appointments" element={<DoctorAppointments />} />
              <Route path="patients" element={<PatientsList />} /> {/* This shows all patients */}
              <Route path="patients/:patientId" element={<DoctorPatientRecords />} /> {/* This shows individual patient records */}
              <Route path="patients/:patientId/dental-chart" element={<DentalChart />} /> {/* Dental Chart for specific patient */}
              <Route path="emergencies" element={<DoctorEmergencyCases />} />
              <Route path="queue" element={<DoctorQueueManagement />} />
              <Route path="billing" element={<DoctorBilling />} />
              <Route path="settings" element={<DoctorSettings />} />
            </Route>

            {/* Staff Routes */}
            <Route path="/staff" element={<ProtectedRoute role="staff" />}>
              <Route index element={<Navigate to="/staff/dashboard" replace />} />
              <Route path="dashboard" element={<StaffDashboard />} />
              <Route path="appointments" element={<StaffAppointments />} />
              <Route path="queue" element={<StaffQueueManagement />} />
              <Route path="patients" element={<StaffPatientsList />} /> {/* This shows the patient list */}
              <Route path="patients/:patientId" element={<StaffPatientRecords />} /> {/* This shows individual patient records */}
              <Route path="settings" element={<StaffSettings />} />
            </Route>

            {/* Patient Routes */}
            <Route path="/patient" element={<ProtectedRoute role="patient" />}>
              <Route index element={<Navigate to="/patient/dashboard" replace />} />
              <Route path="dashboard" element={<PatientDashboard />} />
              <Route path="profile" element={<PatientProfile />} />
              <Route path="services" element={<PatientServices />} />
              <Route path="appointments" element={<PatientAppointments />} />
              <Route path="payments" element={<PatientPayments />} />
              <Route path="history" element={<PatientHistory />} />
              <Route path="settings" element={<PatientSettings />} />
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ToastContainer position="top-right" autoClose={3000} />
        </Router>
      </ClinicProvider>
    </AuthProvider>
  );
}

export default App;