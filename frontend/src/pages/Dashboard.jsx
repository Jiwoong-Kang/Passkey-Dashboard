import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import searchService from '../services/searchService';
import linkService from '../services/linkService';
import './Dashboard.css';

function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [crawling, setCrawling] = useState(false);
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
      setSearching(true);
      setCurrentSearchQuery(searchQuery);
      setNoResults(false);
      
      try {
        // Search for links in database
        const response = await linkService.searchLinks(searchQuery);
        const results = response.links || response; // Handle both formats
        
        if (results.length === 0) {
          // No results found in database
          setSearchResults([]);
          setNoResults(true);
          setShowResults(true);
        } else {
          // Results found
          setSearchResults(results);
          setNoResults(false);
          setShowResults(true);
        }

        // Save search to history
        const newSearch = await searchService.addSearch(searchQuery);
        const formattedSearch = {
          id: newSearch._id,
          query: newSearch.query,
          timestamp: new Date(newSearch.timestamp).toLocaleString('en-US')
        };
        setSearchHistory([formattedSearch, ...searchHistory]);
      } catch (error) {
        alert('Failed to search. Please try again.');
      } finally {
        setSearching(false);
      }
    }
  };

  const handleCrawlWeb = async () => {
    if (!currentSearchQuery) return;
    
    setCrawling(true);
    try {
      // Crawl the web
      const response = await linkService.crawlWeb(currentSearchQuery);
      
      if (response.links && response.links.length > 0) {
        setSearchResults(response.links);
        setNoResults(false);
        alert(`Found ${response.newLinksAdded} new links and added them to the database!`);
      } else {
        alert('No results found on the web either.');
      }
    } catch (error) {
      alert('Failed to crawl web. Please try again.');
    } finally {
      setCrawling(false);
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
            <button type="submit" className="search-button" disabled={searching}>
              {searching ? '⏳ Searching...' : '🔍 Search'}
            </button>
          </form>
        </div>

        {showResults && (
          <div className="results-section">
            <div className="results-header">
              <h2>Search Results ({searchResults.length})</h2>
              <button onClick={() => setShowResults(false)} className="close-results-button">
                ✕ Close
              </button>
            </div>

            {noResults ? (
              <div className="empty-results">
                <p>No results found in database.</p>
                <p className="empty-subtitle">Would you like to search the web?</p>
                <button 
                  onClick={handleCrawlWeb} 
                  className="crawl-button"
                  disabled={crawling}
                >
                  {crawling ? '🔄 Searching the web...' : '🌐 Search the Web'}
                </button>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="empty-results">
                <p>No links found.</p>
                <p className="empty-subtitle">Try a different search term.</p>
              </div>
            ) : (
              <div className="results-list">
                {searchResults.map((link) => (
                  <div key={link._id} className="result-item">
                    <div className="result-header">
                      <h3 className="result-title">
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          {link.title}
                        </a>
                      </h3>
                      {link.category && (
                        <span className="result-category">{link.category}</span>
                      )}
                    </div>
                    {link.description && (
                      <p className="result-description">{link.description}</p>
                    )}
                    <div className="result-footer">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="result-url">
                        🔗 {link.url}
                      </a>
                      {link.tags && link.tags.length > 0 && (
                        <div className="result-tags">
                          {link.tags.map((tag, index) => (
                            <span key={index} className="result-tag">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
