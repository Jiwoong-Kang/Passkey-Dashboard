import React from 'react';
import SiteDashboard from '../components/SiteDashboard';
import linkService from '../services/linkService';

const config = {
  fetchLinks:   () => linkService.getPasskeySites(),
  themeClass:   'passkey-theme',
  headerBadge:  { text: 'Passkey', className: 'passkey-badge' },
  title:        'Passkey-Supported Sites',
  introClass:   'passkey-intro',
  intro:        'Sites that support Passkey / WebAuthn passwordless authentication',
  emptyIcon:    '🔑',
  emptyMessage: 'No passkey-supported sites yet.',
  badge: {
    className: 'passkey-supported-badge',
    fullText:  'Passkey Supported',
    shortText: 'Passkey',
  },
};

export default function PasskeyDashboard() {
  return <SiteDashboard config={config} />;
}
