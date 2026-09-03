import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Auth from './pages/Auth/Auth';
import MainWorkspace from './pages/MainWorkspace/MainWorkspace';
import Investigate from './pages/Investigate/Investigate';
import WellDetails from './pages/WellDetails/WellDetails';
import Explore from './pages/Explore/Explore';
import MonitorAlerts from './pages/MonitorAlerts/MonitorAlerts';

import GetStarted from './pages/GetStarted/GetStarted';

// Protected Route Guard ensuring authenticated access to dashboard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root '/' opens the GetStarted Page (1st Webpage) */}
          <Route path="/" element={<GetStarted />} />
          <Route path="/get-started" element={<GetStarted />} />

          {/* Authentication Page */}
          <Route path="/login" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />

          {/* Protected Well Dashboard Routes */}
          <Route
            path="/wells"
            element={
              <ProtectedRoute>
                <WellDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wells/:wellId"
            element={
              <ProtectedRoute>
                <WellDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/well-details"
            element={
              <ProtectedRoute>
                <WellDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace"
            element={
              <ProtectedRoute>
                <MainWorkspace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/explore"
            element={
              <ProtectedRoute>
                <Explore />
              </ProtectedRoute>
            }
          />
          <Route
            path="/monitor"
            element={
              <ProtectedRoute>
                <MonitorAlerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <MonitorAlerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/monitor-alerts"
            element={
              <ProtectedRoute>
                <MonitorAlerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/investigate"
            element={
              <ProtectedRoute>
                <Investigate />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
