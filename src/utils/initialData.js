// src/data/initialData.js
// Static configuration data for Pulseboard
// NOTE: months are now dynamically generated in helpers.js

// Areas (product areas)
export const areas = [
  { id: 'visualizer', name: 'Visualizer', color: '#3fb950' },
  { id: 'vinci', name: 'Vinci', color: '#38bdf8' },
  { id: 'spaces', name: 'Spaces', color: '#a371f7' },
  { id: 'showcase', name: 'Showcase', color: '#f85149' },
  { id: 'studio', name: 'Studio', color: '#f778ba' },
  { id: 'platform', name: 'Platform', color: '#d29922' },
  { id: 'admin', name: 'Admin', color: '#8b949e' }
];

// Initiatives (strategic themes)
export const initiatives = [
  { id: 'launch', name: 'Launch Partner Commitments', color: '#f85149' },
  { id: 'selfserve', name: 'Self-Serve Scale', color: '#58a6ff' },
  { id: 'embed', name: 'Embed Everywhere', color: '#a371f7' },
  { id: 'ai', name: 'AI Model Excellence', color: '#3fb950' },
  { id: 'commerce', name: 'Commerce Enablement', color: '#d29922' },
  { id: 'enterprise', name: 'Enterprise Content Scale', color: '#f778ba' }
];

// Re-export months from helpers for backward compatibility
// This allows existing code that imports from initialData to keep working
export { months } from '../utils/helpers';
