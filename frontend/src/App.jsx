import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import AdminDashboard from './components/AdminDashboard';
import TenantDashboard from './components/TenantDashboard';
import AddTenant from './components/AddTenant';
import Tenants from './components/Tenants';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import { ToastContainer } from './components/Toast';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  });

  const handleLogin = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setIsAuthenticated(true);
    setUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ?
            (user?.role === 'tenant' ? <Navigate to="/tenant/dashboard" /> : <Navigate to="/dashboard" />) :
            <Login onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/signup" 
          element={
            isAuthenticated ?
            (user?.role === 'tenant' ? <Navigate to="/tenant/dashboard" /> : <Navigate to="/dashboard" />) :
            <Signup onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/forgot-password" 
          element={
            isAuthenticated ? 
            <Navigate to="/dashboard" /> : 
            <ForgotPassword />
          } 
        />
        <Route 
          path="/reset-password" 
          element={
            isAuthenticated ? 
            <Navigate to="/dashboard" /> : 
            <ResetPassword />
          } 
        />
        <Route
          path="/tenant/dashboard"
          element={
            isAuthenticated ?
            (user?.role === 'tenant' ?
              <TenantDashboard user={user} onLogout={handleLogout} /> :
              <Navigate to="/dashboard" />
            ) :
            <Navigate to="/login" />
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ?
            (user?.role === 'admin' ?
              <AdminDashboard user={user} onLogout={handleLogout} /> :
              <Navigate to="/tenant/dashboard" />
            ) :
            <Navigate to="/login" />
          }
        />
        <Route
          path="/tenants"
          element={
            isAuthenticated ?
            (user?.role === 'admin' ?
              <Tenants /> :
              <Navigate to="/dashboard" />
            ) :
            <Navigate to="/login" />
          }
        />
        <Route 
          path="/tenants/add" 
          element={
            isAuthenticated ? 
            <Navigate to="/dashboard?tab=approvals" /> : 
            <Navigate to="/login" />
          } 
        />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
      <ToastContainer />
    </Router>
  );
}

export default App;
