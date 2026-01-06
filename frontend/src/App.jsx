import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import AdminDashboard from './components/AdminDashboard';
import TenantDashboard from './components/TenantDashboard';
import AddTenant from './components/AddTenant';
import Tenants from './components/Tenants';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token) {
      setIsAuthenticated(true);
      if (userData) {
        setUser(JSON.parse(userData));
      }
    }
    setLoading(false);
  }, []);

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

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
            <Navigate to="/dashboard" /> : 
            <Login onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/signup" 
          element={
            isAuthenticated ? 
            <Navigate to="/dashboard" /> : 
            <Signup onLogin={handleLogin} />
          } 
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ?
            (user?.role === 'admin' ?
              <AdminDashboard user={user} onLogout={handleLogout} /> :
              <TenantDashboard user={user} onLogout={handleLogout} />
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
    </Router>
  );
}

export default App;
