import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage1 from "./components/LandingPage1";
import RegisterPage from "./components/RegisterPage";
import PatientRegistry from "./components/PatientRegistration";
import DoctorRegistry from "./components/DoctorRegistration";
import DiagnosticRegistry from "./components/DiagnosticsRegistration";
import LoginPage from "./components/LoginPage";
import PatientLogin from "./components/PatientLogin";
import DoctorLogin from "./components/DoctorLogin";
import DiagnosticLogin from "./components/DiagnosticLogin";
import AdminLogin from "./components/AdminLogin";
import PatientDashBoard from "./components/PatientDashBoard";
import DoctorDashBoard from "./components/DoctorDashBoard";
import DiagnosticDashBoard from "./components/DiagnosticDashBoard";
import ViewProfile from "./components/ViewProfile";
import ViewDoctorProfile from "./components/ViewDoctorProfile";
import ViewDiagnosticProfile from "./components/ViewDiagnosticProfile";
import ViewPatientRecords from "./components/ViewPatientRecords";
import ViewPatientList from "./components/ViewPatientList";
import DiagnosticForm from "./components/DiagnosticForm";
import DiagnosticReports from "./components/DiagnosticReports";
import ManageAccess from "./components/ManageAccess";
import UpdateProfile from "./components/UpdateProfile";
import AboutUs from "./components/AboutPage";
import TeamPage from "./components/TeamPage";
import Footer from "./components/Footer";
import FLDashboard from "./components/FLDashboard";
import PrivacyPolicy from "./components/PrivacyPolicy";
import ScrollToTop from "./components/ScrollToTop";
import ChatBot from "./components/ChatBot";
import { AuthProvider, useAuth } from "./context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to their respective dashboard if not authorized
    if (user?.role === 'doctor') return <Navigate to={`/doctor/${user.hhNumber}`} replace />;
    if (user?.role === 'patient') return <Navigate to={`/patient/${user.hhNumber}`} replace />;
    if (user?.role === 'diagnostic') return <Navigate to={`/diagnostic/${user.hhNumber}`} replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

const RoutesWithProtection = () => (
  <Routes>
    <Route path="/" element={<LandingPage1 />} />
    <Route path="/AboutPage" element={<AboutUs />} />
    <Route path="/team" element={<TeamPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/patient_registration" element={<PatientRegistry />} />
    <Route path="/doctor_registration" element={<DoctorRegistry />} />
    <Route path="/diagnostic_registration" element={<DiagnosticRegistry />} />
    <Route path="/patient_login" element={<PatientLogin />} />
    <Route path="/doctor_login" element={<DoctorLogin />} />
    <Route path="/diagnostic_login" element={<DiagnosticLogin />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/admin_login" element={<AdminLogin />} />

    <Route
      path="/fl-dashboard"
      element={
        <ProtectedRoute allowedRoles={['patient', 'diagnostic', 'admin']}>
          <FLDashboard />
        </ProtectedRoute>
      }
    />

    <Route
      path="/patient/:hhNumber"
      element={
        <ProtectedRoute>
          <PatientDashBoard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/patient/:hhNumber/viewprofile"
      element={
        <ProtectedRoute>
          <ViewProfile />
        </ProtectedRoute>
      }
    />
    <Route
      path="/patient/:hhNumber/viewrecords"
      element={
        <ProtectedRoute>
          <ViewPatientRecords />
        </ProtectedRoute>
      }
    />
    <Route
      path="/patient/:hhNumber/manageaccess"
      element={
        <ProtectedRoute>
          <ManageAccess />
        </ProtectedRoute>
      }
    />
    <Route
      path="/profile/edit/:hhNumber"
      element={
        <ProtectedRoute>
          <UpdateProfile />
        </ProtectedRoute>
      }
    />

    <Route
      path="/doctor/:hhNumber"
      element={
        <ProtectedRoute>
          <DoctorDashBoard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/doctor/:hhNumber/viewdoctorprofile"
      element={
        <ProtectedRoute>
          <ViewDoctorProfile />
        </ProtectedRoute>
      }
    />
    <Route
      path="/doctor/:hhNumber/patientlist"
      element={
        <ProtectedRoute>
          <ViewPatientList />
        </ProtectedRoute>
      }
    />
    <Route
      path="/records/patient/:hhNumber/all"
      element={
        <ProtectedRoute>
          <ViewPatientRecords />
        </ProtectedRoute>
      }
    />

    <Route
      path="/diagnostic/:hhNumber"
      element={
        <ProtectedRoute>
          <DiagnosticDashBoard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/diagnostic/:hhNumber/viewdiagnosticprofile"
      element={
        <ProtectedRoute>
          <ViewDiagnosticProfile />
        </ProtectedRoute>
      }
    />
    <Route
      path="/diagnostic/:hhNumber/diagnosticform"
      element={
        <ProtectedRoute>
          <DiagnosticForm />
        </ProtectedRoute>
      }
    />
    <Route
      path="/diagnostic/:hhNumber/reports"
      element={
        <ProtectedRoute>
          <DiagnosticReports />
        </ProtectedRoute>
      }
    />
    <Route path="/privacy" element={<PrivacyPolicy />} />
  </Routes>
);

const BrowseRouter = () => (
  <AuthProvider>
    <BrowserRouter>
      <ScrollToTop />
      <RoutesWithProtection />
      <ChatBot />
      <Footer />
    </BrowserRouter>
  </AuthProvider>
);

export default BrowseRouter;
