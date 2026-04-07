import React from 'react';
import SiteDashboard from '../components/SiteDashboard';
import linkService from '../services/linkService';

const config = {
  fetchLinks:   () => linkService.getThirdPartyPasskeySites(),
  themeClass:   'third-party-theme',
  headerBadge:  { text: '3rd Party', className: 'third-party-badge' },
  title:        'Third-Party Passkey Sites',
  introClass:   'third-party-intro',
  intro:        'Sites that support Passkey login via an external Identity Provider (e.g. Sign in with Apple, Google, etc.)',
  emptyIcon:    '🔗',
  emptyMessage: 'No third-party passkey sites yet.',
  badge: {
    className: 'third-party-supported-badge',
    fullText:  '3rd Party Passkey',
    shortText: '3rd Party',
  },
};

export default function ThirdPartyDashboard() {
  return <SiteDashboard config={config} />;
}
