import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import linkService from '../services/linkService';
import './PublicDashboard.css';

function PasskeyDashboard() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!authService.isLoggedIn()) {
      navigate('/');
      return;
    }
    loadLinks();
  }, [navigate]);

  const loadLinks = async () => {
    try {
      const data = await linkService.getPasskeySites();
      setLinks(data.links || []);
    } catch (error) {
      console.error('Failed to load passkey sites:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLinks = links.filter(link =>
    link.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="public-dashboard-container passkey-theme">
      <header className="public-dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <button onClick={() => navigate('/dashboard')} className="back-button">
              ← Back
            </button>
            <div className="header-title">
              <span className="header-badge passkey-badge">Passkey</span>
              <h1>Passkey-Supported Sites</h1>
            </div>
          </div>
          <div className="header-right">
            <span className="site-count">{links.length} sites</span>
          </div>
        </div>
      </header>

      <main className="public-dashboard-main">
        <div className="dashboard-intro passkey-intro">
          <p>Sites that support Passkey / WebAuthn passwordless authentication</p>
        </div>

        <div className="filter-bar">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by name, URL, or tag..."
            className="filter-input"
          />
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="empty-state">
            {searchQuery ? (
              <>
                <div className="empty-icon">🔍</div>
                <p>No results matching "{searchQuery}"</p>
                <button onClick={() => setSearchQuery('')} className="reset-button">
                  Clear Filter
                </button>
              </>
            ) : (
              <>
                <div className="empty-icon">🔑</div>
                <p>No passkey-supported sites yet.</p>
                <p className="empty-sub">Search the web from the dashboard to discover sites!</p>
                <button onClick={() => navigate('/dashboard')} className="go-dashboard-button">
                  Go to Dashboard
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="sites-grid">
            {filteredLinks.map((link) => (
              <div key={link._id} className="site-card passkey-card">
                <div className="card-header">
                  <div className="site-favicon">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${link.url}&sz=32`}
                      alt=""
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div className="site-title-wrap">
                    <h3 className="site-title">
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        {link.title}
                      </a>
                    </h3>
                    <span className="passkey-supported-badge">Passkey Supported</span>
                  </div>
                </div>
                {link.description && (
                  <p className="site-description">{link.description}</p>
                )}
                <div className="card-footer">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="site-url">
                    {link.url}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default PasskeyDashboard;
