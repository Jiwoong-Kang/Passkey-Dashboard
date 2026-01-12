import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import userService from '../services/userService';
import searchService from '../services/searchService';
import './Settings.css';

function Settings() {
  const [username, setUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check login status
    if (!authService.isLoggedIn()) {
      navigate('/');
      return;
    }

    // Load user profile
    loadProfile();
  }, [navigate]);

  const loadProfile = async () => {
    try {
      const profile = await userService.getProfile();
      setUsername(profile.username);
      setNewUsername(profile.username);
      setTheme(profile.theme || 'light');
    } catch (error) {
      console.error('Failed to load profile:', error);
      const user = authService.getCurrentUser();
      setUsername(user?.username || 'User');
      setNewUsername(user?.username || '');
    }
  };

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    if (newUsername.trim() && newUsername !== username) {
      setLoading(true);
      try {
        await userService.updateProfile({ username: newUsername });
        setUsername(newUsername);
        alert('Name has been updated!');
      } catch (error) {
        const message = error.response?.data?.message || 'Failed to update name.';
        alert(message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleThemeChange = async (e) => {
    const selectedTheme = e.target.value;
    setTheme(selectedTheme);
    try {
      await userService.updateProfile({ theme: selectedTheme });
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to delete all search history?')) {
      try {
        await searchService.clearAllHistory();
        alert('Search history has been deleted.');
      } catch (error) {
        alert('Failed to clear history. Please try again.');
      }
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  return (
    <div className="settings-container">
      <header className="settings-header">
        <div className="header-content">
          <h1>⚙️ Settings</h1>
          <div className="header-actions">
            <button onClick={handleBackToDashboard} className="back-button">
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="settings-main">
        <div className="settings-section">
          <h2>Profile Settings</h2>
          <div className="setting-item">
            <label>Current User</label>
            <p className="current-value">{username}</p>
          </div>
          
          <form onSubmit={handleUpdateUsername} className="settings-form">
            <div className="form-group">
              <label htmlFor="newUsername">New Name</label>
              <input
                type="text"
                id="newUsername"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter new name"
              />
            </div>
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Updating...' : 'Change Name'}
            </button>
          </form>
        </div>

        <div className="settings-section">
          <h2>Theme Settings</h2>
          <div className="setting-item">
            <label htmlFor="theme">Select Theme</label>
            <select id="theme" value={theme} onChange={handleThemeChange} className="theme-select">
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h2>Data Management</h2>
          <div className="setting-item">
            <label>Search History</label>
            <p className="setting-description">
              Delete all saved search history.
            </p>
            <button onClick={handleClearHistory} className="danger-button">
              Clear Search History
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h2>Account</h2>
          <div className="setting-item">
            <label>Logout</label>
            <p className="setting-description">
              Logout from your current account.
            </p>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>

        <div className="settings-footer">
          <p>Dashboard v1.0.0</p>
        </div>
      </main>
    </div>
  );
}

export default Settings;
