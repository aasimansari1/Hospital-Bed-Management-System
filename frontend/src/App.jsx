import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Beds from './pages/Beds.jsx';
import Patients from './pages/Patients.jsx';
import Wards from './pages/Wards.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { getSocket } from './hooks/useSocket.js';

function GlobalNotifications() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const s = getSocket();
    const onBed = (bed) => {
      if (bed?.status === 'available') {
        toast(`Bed ${bed.code} is now available`, { icon: 'CHECK', duration: 2500 });
      }
    };
    const onPatient = (p) => {
      if (p?.status === 'discharged') {
        toast.success(`${p.name} discharged`, { duration: 2500 });
      }
    };
    s.on('bed:updated', onBed);
    s.on('patient:updated', onPatient);
    return () => {
      s.off('bed:updated', onBed);
      s.off('patient:updated', onPatient);
    };
  }, [user]);
  return null;
}

export default function App() {
  return (
    <>
      <GlobalNotifications />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="beds" element={<Beds />} />
          <Route path="patients" element={<Patients />} />
          <Route path="wards" element={<Wards />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
