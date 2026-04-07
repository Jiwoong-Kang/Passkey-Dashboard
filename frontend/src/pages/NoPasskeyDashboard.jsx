import React from 'react';
import SiteDashboard from '../components/SiteDashboard';
import linkService from '../services/linkService';

const config = {
  fetchLinks:   () => linkService.getNoPasskeySites(),
  themeClass:   'no-passkey-theme',
  headerBadge:  { text: 'No Passkey', className: 'no-passkey-badge' },
  title:        'Sites Without Passkey',
  introClass:   'no-passkey-intro',
  intro:        'Sites that do not support Passkey / WebAuthn authentication',
  emptyIcon:    '🔒',
  emptyMessage: 'No non-passkey sites recorded yet.',
  badge: {
    className: 'no-passkey-badge-small',
    fullText:  'Passkey Not Supported',
    shortText: 'No Passkey',
  },
};

export default function NoPasskeyDashboard() {
  return <SiteDashboard config={config} />;
}
