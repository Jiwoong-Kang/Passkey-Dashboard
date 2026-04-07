import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import searchService from '../services/searchService';
import linkService from '../services/linkService';
import { useModal } from '../hooks/useModal';
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
  const { showAlert, showConfirm, ModalComponent } = useModal();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authService.isLoggedIn()) {
      navigate('/');
      return;
    }
    const user = authService.getCurrentUser();
    setUsername(user?.username || 'User');
    loadSearchHistory();
  }, [navigate]);

  const loadSearchHistory = async () => {
    try {
      const history = await searchService.getHistory();
      const formattedHistory = history.map(item => ({
        id: item._id,
        query: item.query,
        timestamp: new Date(item.timestamp).toLocaleString('ko-KR')
      }));
      setSearchHistory(formattedHistory);
    } catch (error) {
      console.error('Failed to load search history:', error);
    } finally {
      setLoading(false);
    }
  };

  const runSearch = async (query) => {
    if (!query.trim()) return;
    setSearching(true);
    setCurrentSearchQuery(query);
    setNoResults(false);

    try {
      const response = await linkService.searchLinks(query);
      const results = response.links || response;

      if (results.length === 0) {
        setSearchResults([]);
        setNoResults(true);
        setShowResults(true);
      } else {
        setSearchResults(results);
        setNoResults(false);
        setShowResults(true);
      }

      const newSearch = await searchService.addSearch(query);
      const formattedSearch = {
        id: newSearch._id,
        query: newSearch.query,
        timestamp: new Date(newSearch.timestamp).toLocaleString('ko-KR')
      };
      setSearchHistory(prev => [formattedSearch, ...prev.filter(h => h.query !== query)]);
    } catch (error) {
      await showAlert('Search failed. Please try again.', 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    await runSearch(searchQuery);
  };

  const handleHistoryClick = async (query) => {
    setSearchQuery(query);
    await runSearch(query);
  };

  const handleCrawlWeb = async () => {
    if (!currentSearchQuery) return;

    setCrawling(true);
    try {
      const response = await linkService.crawlWeb(currentSearchQuery);

      if (response.links && response.links.length > 0) {
        setSearchResults(response.links);
        setNoResults(false);
        await showAlert(`Found ${response.newLinksAdded} new links and added them to the database!`, 'success');
      } else {
        await showAlert('No results found on the web either.', 'info');
      }
    } catch (error) {
      await showAlert('Web search failed. Please try again.', 'error');
    } finally {
      setCrawling(false);
    }
  };

  const handleDeleteHistory = async (id) => {
    try {
      await searchService.deleteHistory(id);
      setSearchHistory(searchHistory.filter(item => item.id !== id));
    } catch (error) {
      await showAlert('Failed to delete history. Please try again.', 'error');
    }
  };

  const handleClearAllHistory = async () => {
    const confirmed = await showConfirm('Are you sure you want to delete all search history?', {
      danger: true,
      confirmLabel: 'Delete All',
    });
    if (confirmed) {
      try {
        await searchService.clearAllHistory();
        setSearchHistory([]);
      } catch (error) {
        await showAlert('Failed to clear history. Please try again.', 'error');
      }
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      {ModalComponent}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-brand">
            <h1>Dashboard</h1>
            <span className="header-username">👤 {username}</span>
          </div>
          <nav className="header-nav">
            <button onClick={() => navigate('/passkey-sites')} className="nav-button passkey-nav-button" title="Native Passkey Sites">
              🔑 Native
            </button>
            <button onClick={() => navigate('/third-party-sites')} className="nav-button third-party-nav-button" title="3rd Party Passkey Sites">
              🔗 3rd Party
            </button>
            <button onClick={() => navigate('/no-passkey-sites')} className="nav-button no-passkey-nav-button" title="No Passkey Sites">
              🔒 No Passkey
            </button>
            <button onClick={() => navigate('/settings')} className="nav-button settings-button" title="Settings">
              ⚙️
            </button>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </nav>
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
              placeholder="Enter site name or keyword..."
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
                  <div
                    key={link._id}
                    className={`result-item ${
                      link.passkeyType === 'none' ? 'result-item--no-passkey' :
                      link.passkeyType === 'third-party' ? 'result-item--third-party' :
                      'result-item--passkey'
                    }`}
                  >
                    <div className="result-header">
                      <h3 className="result-title">
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          {link.title}
                        </a>
                      </h3>
                      <span className={`result-passkey-badge ${
                        link.passkeyType === 'none' ? 'badge--no-passkey' :
                        link.passkeyType === 'third-party' ? 'badge--third-party' :
                        'badge--passkey'
                      }`}>
                        {link.passkeyType === 'none' ? '🔒 No Passkey' :
                         link.passkeyType === 'third-party' ? '🔗 3rd Party Passkey' :
                         '🔑 Native Passkey'}
                      </span>
                    </div>
                    {link.description && (
                      <p className="result-description">{link.description}</p>
                    )}
                    <div className="result-footer">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="result-url">
                        🔗 {link.url}
                      </a>
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
                  <div
                    className="history-content"
                    onClick={() => handleHistoryClick(item.query)}
                    title="Click to search again"
                  >
                    <span className="history-query">
                      <span className="history-search-icon">🔍</span>
                      {item.query}
                    </span>
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
