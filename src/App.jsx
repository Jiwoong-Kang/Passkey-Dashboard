import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import authService from './services/authService';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check login status
    setIsLoggedIn(authService.isLoggedIn());
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/signup" 
          element={
            isLoggedIn ? <Navigate to="/dashboard" replace /> : <SignUp />
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            isLoggedIn ? <Dashboard /> : <Navigate to="/" replace />
          } 
        />
        <Route 
          path="/settings" 
          element={
            isLoggedIn ? <Settings /> : <Navigate to="/" replace />
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
