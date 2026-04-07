import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import linkService from '../services/linkService';
import { useModal } from '../hooks/useModal';
import './PublicDashboard.css';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function NoPasskeyDashboard() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('dashViewMode') || 'card');
  const [recrawlingId, setRecrawlingId] = useState(null);
  const { showAlert, ModalComponent } = useModal();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authService.isLoggedIn()) {
      navigate('/');
      return;
    }
    loadLinks();
  }, [navigate]);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const data = await linkService.getNoPasskeySites();
      setLinks(data.links || []);
    } catch (error) {
      console.error('Failed to load no-passkey sites:', error);
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

  const groupedLinks = useMemo(() => {
    const sorted = [...filteredLinks].sort((a, b) =>
      (a.title || '').localeCompare(b.title || '', 'en', { sensitivity: 'base' })
    );
    const groups = {};
    sorted.forEach(link => {
      const first = (link.title || '#')[0].toUpperCase();
      const key = /[A-Z]/.test(first) ? first : '#';
      if (!groups[key]) groups[key] = [];
      groups[key].push(link);
    });
    return groups;
  }, [filteredLinks]);

  const availableLetters = Object.keys(groupedLinks).sort();

  const scrollToLetter = (letter) => {
    const el = document.getElementById(`section-${letter}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isStale = (link) => {
    const checkDate = link.lastCrawledAt || link.updatedAt || link.createdAt;
    if (!checkDate) return false;
    return Date.now() - new Date(checkDate).getTime() > THIRTY_DAYS_MS;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleRecrawl = async (linkId) => {
    setRecrawlingId(linkId);
    try {
      await linkService.recrawlLink(linkId);
      await loadLinks();
    } catch (error) {
      await showAlert('Re-check failed. Please try again.', 'error');
    } finally {
      setRecrawlingId(null);
    }
  };

  const handleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('dashViewMode', mode);
  };

  const renderCard = (link) => {
    const stale = isStale(link);
    const crawlDate = link.lastCrawledAt || link.updatedAt;
    return (
      <div key={link._id} className="site-card no-passkey-card">
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
            <span className="no-passkey-badge-small">Passkey Not Supported</span>
          </div>
          {stale && <span className="stale-badge">⚠️ Outdated</span>}
        </div>
        {link.description && (
          <p className="site-description">{link.description}</p>
        )}
        <div className="card-footer">
          <div className="crawl-meta">
            <span className="crawl-date">🕒 {formatDate(crawlDate)}</span>
            {stale && (
              <button
                className="recrawl-btn recrawl-btn--no-passkey"
                onClick={() => handleRecrawl(link._id)}
                disabled={recrawlingId === link._id}
              >
                {recrawlingId === link._id ? '🔄 Checking...' : '🔍 Re-check'}
              </button>
            )}
          </div>
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="site-url">
            {link.url}
          </a>
        </div>
      </div>
    );
  };

  const renderListItem = (link) => {
    const stale = isStale(link);
    const crawlDate = link.lastCrawledAt || link.updatedAt;
    return (
      <div key={link._id} className="site-list-item no-passkey-list-item">
        <div className="list-favicon">
          <img
            src={`https://www.google.com/s2/favicons?domain=${link.url}&sz=16`}
            alt=""
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
        <div className="list-title">
          <a href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a>
        </div>
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="list-url">
          {link.url}
        </a>
        <div className="list-meta">
          <span className="no-passkey-badge-small">No Passkey</span>
          {stale && <span className="stale-badge-sm">⚠️ Outdated</span>}
          <span className="list-crawl-date">{formatDate(crawlDate)}</span>
          {stale && (
            <button
              className="recrawl-btn-sm"
              onClick={() => handleRecrawl(link._id)}
              disabled={recrawlingId === link._id}
              title="Re-check"
            >
              {recrawlingId === link._id ? '🔄' : '🔍'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="public-dashboard-container no-passkey-theme">
      {ModalComponent}
      <header className="public-dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <button onClick={() => navigate('/dashboard')} className="back-button">
              ← Back
            </button>
            <div className="header-title">
              <span className="header-badge no-passkey-badge">No Passkey</span>
              <h1>Sites Without Passkey</h1>
            </div>
          </div>
          <div className="header-right">
            <span className="site-count">{links.length} sites</span>
            <div className="view-toggle">
              <button
                className={`view-btn ${viewMode === 'card' ? 'view-btn--active view-btn--no-passkey' : ''}`}
                onClick={() => handleViewMode('card')}
                title="Card view"
              >
                ⊞
              </button>
              <button
                className={`view-btn ${viewMode === 'list' ? 'view-btn--active view-btn--no-passkey' : ''}`}
                onClick={() => handleViewMode('list')}
                title="List view"
              >
                ☰
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="public-dashboard-main">
        <div className="dashboard-intro no-passkey-intro">
          <p>Sites that do not support Passkey / WebAuthn authentication</p>
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

        {!loading && filteredLinks.length > 0 && (
          <div className="alphabet-bar">
            {ALPHABET.map(letter => {
              const active = !!groupedLinks[letter];
              return (
                <button
                  key={letter}
                  className={`alpha-btn ${active ? 'alpha-btn--active no-passkey-alpha' : 'alpha-btn--inactive'}`}
                  onClick={() => active && scrollToLetter(letter)}
                  disabled={!active}
                >
                  {letter}
                </button>
              );
            })}
            {groupedLinks['#'] && (
              <button
                className="alpha-btn alpha-btn--active no-passkey-alpha"
                onClick={() => scrollToLetter('#')}
              >
                #
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="spinner no-passkey-spinner"></div>
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
                <div className="empty-icon">🔒</div>
                <p>No non-passkey sites recorded yet.</p>
                <p className="empty-sub">Search the web from the dashboard to discover sites!</p>
                <button onClick={() => navigate('/dashboard')} className="go-dashboard-button">
                  Go to Dashboard
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="sections-container">
            {availableLetters.map(letter => (
              <div key={letter} id={`section-${letter}`} className="alpha-section">
                <div className="alpha-section-header no-passkey-section-header">{letter}</div>
                {viewMode === 'card' ? (
                  <div className="sites-grid">
                    {groupedLinks[letter].map(link => renderCard(link))}
                  </div>
                ) : (
                  <div className="sites-list">
                    {groupedLinks[letter].map(link => renderListItem(link))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default NoPasskeyDashboard;
