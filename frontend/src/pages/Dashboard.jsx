import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import searchService from '../services/searchService';
import './Dashboard.css';

function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check login status
    if (!authService.isLoggedIn()) {
      navigate('/');
      return;
    }

    // Get username
    const user = authService.getCurrentUser();
    setUsername(user?.username || 'User');

    // Load search history
    loadSearchHistory();
  }, [navigate]);

  const loadSearchHistory = async () => {
    try {
      const history = await searchService.getHistory();
      // Format history for display
      const formattedHistory = history.map(item => ({
        id: item._id,
        query: item.query,
        timestamp: new Date(item.timestamp).toLocaleString('en-US')
      }));
      setSearchHistory(formattedHistory);
    } catch (error) {
      console.error('Failed to load search history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      try {
        const newSearch = await searchService.addSearch(searchQuery);
        const formattedSearch = {
          id: newSearch._id,
          query: newSearch.query,
          timestamp: new Date(newSearch.timestamp).toLocaleString('en-US')
        };
        setSearchHistory([formattedSearch, ...searchHistory]);
        setSearchQuery('');
      } catch (error) {
        alert('Failed to save search. Please try again.');
      }
    }
  };

  const handleDeleteHistory = async (id) => {
    try {
      await searchService.deleteHistory(id);
      setSearchHistory(searchHistory.filter(item => item.id !== id));
    } catch (error) {
      alert('Failed to delete history. Please try again.');
    }
  };

  const handleClearAllHistory = async () => {
    if (window.confirm('Are you sure you want to delete all search history?')) {
      try {
        await searchService.clearAllHistory();
        setSearchHistory([]);
      } catch (error) {
        alert('Failed to clear history. Please try again.');
      }
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Dashboard</h1>
          <div className="header-actions">
            <span className="username">Welcome, {username}</span>
            <button onClick={() => navigate('/settings')} className="settings-button">
              ⚙️ Settings
            </button>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="search-section">
          <h2>Search</h2>
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter search query..."
              className="search-input"
            />
            <button type="submit" className="search-button">
              🔍 Search
            </button>
          </form>
        </div>

        <div className="history-section">
          <div className="history-header">
            <h2>Search History</h2>
            {searchHistory.length > 0 && (
              <button onClick={handleClearAllHistory} className="clear-all-button">
                Clear All
              </button>
            )}
          </div>

          {loading ? (
            <div className="empty-history">
              <p>Loading history...</p>
            </div>
          ) : searchHistory.length === 0 ? (
            <div className="empty-history">
              <p>No search history.</p>
              <p className="empty-subtitle">Start searching using the search bar above!</p>
            </div>
          ) : (
            <div className="history-list">
              {searchHistory.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="history-content">
                    <span className="history-query">{item.query}</span>
                    <span className="history-timestamp">{item.timestamp}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteHistory(item.id)}
                    className="delete-button"
                    title="Delete"
                  >
                    ❌
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
