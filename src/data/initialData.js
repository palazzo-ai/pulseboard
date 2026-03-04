// src/data/initialData.js
// Static configuration data and seed data for Pulseboard
// Re-exports from helpers.js for backward compatibility

// Re-export everything from helpers that components need
export { 
  STATUSES,
  areas, 
  initiatives, 
  months,
  getInitiativeColor,
  getAreaColor,
  getAreaName,
  getInitiativeName,
  getMonthName,
  getQuarters,
  getMonthsForQuarter
} from '../utils/helpers';

// Storage key for localStorage (legacy)
export const STORAGE_KEY = 'palazzo_timeline_data';

// Initial milestones for database seeding
export const initialMilestones = [
  { id: 'm1', title: 'HomeZone Go-Live', month: 'dec25', area: 'showcase', client: 'homezone', description: 'Production launch for HomeZone retail partner' },
  { id: 'm14', title: 'Vinci Conversational Launch', month: 'jan26', area: 'vinci', client: null, description: 'Talkative Vinci ready for Showcase customer website embeds' },
  { id: 'm2', title: 'Embed Platform v1', month: 'jan26', area: 'platform', client: null, description: 'Universal widget infrastructure ready for partners' },
  { id: 'm3', title: 'Studio MVP', month: 'jan26', area: 'studio', client: null, description: 'Brand content creation engine available for pilot customers' },
  { id: 'm4', title: 'Serhant Pilot Launch', month: 'feb26', area: 'spaces', client: 'serhant', description: 'Real estate staging platform live with Serhant' },
  { id: 'm5', title: 'Maxa Beta', month: 'feb26', area: 'platform', client: 'maxa', description: 'Embedded staging available in Maxa editor for beta users' },
  { id: 'm6', title: 'Wonder Embedded Launch', month: 'feb26', area: 'showcase', client: 'wonder', description: 'Embed buttons live on Wonder client PDPs' },
  { id: 'm7', title: 'Storis Integration v1', month: 'mar26', area: 'showcase', client: 'storis', description: 'POS/ERP integration complete for furniture retailers' },
  { id: 'm8', title: 'Studio Commerce Engine', month: 'mar26', area: 'studio', client: null, description: 'Publishing and shoppable image features live' },
  { id: 'm9', title: 'Maxa Production', month: 'apr26', area: 'platform', client: 'maxa', description: 'Full production rollout for Maxa integration' },
  { id: 'm10', title: 'Partner Portal Launch', month: 'may26', area: 'platform', client: null, description: 'Self-service portal for embed partners' },
  { id: 'm11', title: 'Studio Scale Acceleration', month: 'jul26', area: 'studio', client: null, description: 'Batch pipelines and AI QA available for enterprise' },
  { id: 'm12', title: 'Sales Intelligence Platform', month: 'oct26', area: 'showcase', client: null, description: 'Conversation coaching platform live' },
  { id: 'm13', title: 'Public API v1.0', month: 'dec26', area: 'platform', client: null, description: 'Versioned public API for external developers' }
];

// Initial opportunities for database seeding
export const initialOpportunities = [
  // Visualizer
  { id: 1, title: 'Improve Unstaging Model', area: 'visualizer', initiative: 'ai', month: 'dec25', issues: ['PAL-1191', 'PAL-875'], description: 'Replace current unstaging model with new Gemini 3-based model', milestoneId: null },
  { id: 2, title: 'Reimagine Pipeline Gemini 3', area: 'visualizer', initiative: 'ai', month: 'dec25', issues: ['PAL-1133'], description: 'Upgrade reimagine/restyle pipeline using Gemini 3', milestoneId: null },
  { id: 3, title: 'Scale-Accurate Placement', area: 'visualizer', initiative: 'ai', month: 'jan26', issues: ['PAL-1033', 'PAL-1142'], description: 'Ensure furniture maintains correct proportions relative to room size', milestoneId: null },
  { id: 4, title: 'Inventory Tracking Fix', area: 'visualizer', initiative: 'ai', month: 'jan26', issues: ['PAL-1169'], description: 'Fix swap operations to properly update inventory state', milestoneId: null },
  { id: 5, title: 'Move/Reposition Objects', area: 'visualizer', initiative: 'ai', month: 'feb26', issues: ['PAL-898'], description: 'Allow users to drag furniture to new positions', milestoneId: null },
  { id: 6, title: 'Total Room Makeover', area: 'visualizer', initiative: 'ai', month: 'mar26', issues: ['PAL-1170', 'PAL-1178'], description: 'Transform both furniture AND room aesthetic in single operation', milestoneId: null },
  
  // Vinci
  { id: 70, title: 'Conversational State Machine', area: 'vinci', initiative: 'ai', month: 'dec25', issues: [], description: 'Event-driven conversation architecture with context persistence', milestoneId: 'm14' },
  { id: 71, title: 'Voice & Personality System', area: 'vinci', initiative: 'ai', month: 'jan26', issues: [], description: 'Consistent talkative personality with configurable tone', milestoneId: 'm14' },
  { id: 72, title: 'Product Knowledge Integration', area: 'vinci', initiative: 'ai', month: 'jan26', issues: [], description: 'Connect Vinci to retailer product catalog', milestoneId: 'm14' },
  { id: 73, title: 'Embed Widget for Vinci', area: 'vinci', initiative: 'embed', month: 'jan26', issues: [], description: 'Chat widget component for embedding Vinci', milestoneId: 'm14' },
  { id: 83, title: 'Style Discovery Quiz', area: 'vinci', initiative: 'selfserve', month: 'feb26', issues: ['PAL-1193'], description: 'Interactive quiz to identify user design aesthetic', milestoneId: null },
  
  // Spaces
  { id: 7, title: 'Real Estate Style Presets', area: 'spaces', initiative: 'selfserve', month: 'jan26', issues: ['PAL-1179'], description: 'One-click style presets for real estate staging', milestoneId: 'm4' },
  { id: 74, title: 'Mobile-Optimized Experience', area: 'spaces', initiative: 'selfserve', month: 'jan26', issues: [], description: 'Responsive staging interface for agents', milestoneId: 'm4' },
  { id: 84, title: 'Listings Dashboard', area: 'spaces', initiative: 'selfserve', month: 'jan26', issues: ['PAL-1195'], description: 'Central home page for agents to manage listings', milestoneId: 'm4' },
  { id: 8, title: 'MLS-Safe Microsites', area: 'spaces', initiative: 'launch', month: 'feb26', issues: ['PAL-1126'], description: 'Unbranded microsites compliant with MLS guidelines', milestoneId: 'm4' },
  { id: 9, title: 'Broker Attribution System', area: 'spaces', initiative: 'launch', month: 'feb26', issues: [], description: 'Commission tracking and agent performance attribution', milestoneId: 'm4' },
  { id: 10, title: 'Before/After Comparison', area: 'spaces', initiative: 'commerce', month: 'feb26', issues: ['PAL-1180'], description: 'Interactive slider-based comparison', milestoneId: 'm4' },
  
  // Showcase
  { id: 14, title: 'Shopify Checkout Integration', area: 'showcase', initiative: 'launch', month: 'dec25', issues: ['PAL-1114', 'PAL-1168'], description: 'Complete Shopify checkout flow for HomeZone', milestoneId: 'm1' },
  { id: 15, title: 'Product Ingestion Pipeline', area: 'showcase', initiative: 'launch', month: 'dec25', issues: ['PAL-1072'], description: 'Automated product feed sync from Shopify', milestoneId: 'm1' },
  { id: 16, title: 'Shopify Self-Serve Onboarding', area: 'showcase', initiative: 'selfserve', month: 'dec25', issues: ['PAL-1121'], description: 'Enable retailers to self-setup via OAuth', milestoneId: null },
  { id: 78, title: 'Session & Projects Management', area: 'showcase', initiative: 'launch', month: 'dec25', issues: ['PAL-926', 'PAL-978', 'PAL-979'], description: 'Projects page for customers to manage Vinci sessions', milestoneId: 'm1' },
  { id: 18, title: 'Vision-Enhanced Recommender', area: 'showcase', initiative: 'ai', month: 'jan26', issues: ['PAL-912'], description: 'Cross-role beam search with GPT-4V integration', milestoneId: null },
  { id: 19, title: 'Wonder Embed Buttons', area: 'showcase', initiative: 'launch', month: 'feb26', issues: ['PAL-1096'], description: 'Deploy standardized embed buttons on Wonder client PDPs', milestoneId: 'm6' },
  
  // Studio
  { id: 25, title: 'Brand Image Upload & Extraction', area: 'studio', initiative: 'enterprise', month: 'jan26', issues: ['PAL-1138'], description: 'Upload brand images and extract style DNA', milestoneId: 'm3' },
  { id: 26, title: 'Room Scale System', area: 'studio', initiative: 'enterprise', month: 'jan26', issues: ['PAL-1141'], description: 'White canvas mode with accurate room dimensions', milestoneId: 'm3' },
  { id: 27, title: 'Brand Style Application', area: 'studio', initiative: 'enterprise', month: 'jan26', issues: ['PAL-1139'], description: 'Apply extracted brand aesthetics to generated images', milestoneId: 'm3' },
  { id: 28, title: 'Basic Studio Canvas', area: 'studio', initiative: 'enterprise', month: 'jan26', issues: ['PAL-1144'], description: 'Core canvas UX with panels and controls', milestoneId: 'm3' },
  { id: 30, title: 'Direct PDP Publishing', area: 'studio', initiative: 'commerce', month: 'mar26', issues: ['PAL-1146'], description: 'One-click publish to Shopify, BigCommerce', milestoneId: 'm8' },
  { id: 31, title: 'Social Media Export', area: 'studio', initiative: 'commerce', month: 'mar26', issues: ['PAL-1147'], description: 'Export to Instagram, Pinterest, Facebook', milestoneId: 'm8' },
  
  // Platform
  { id: 40, title: 'Widget SDK & Infrastructure', area: 'platform', initiative: 'embed', month: 'jan26', issues: ['PAL-1171', 'PAL-1172', 'PAL-1173'], description: 'Core embed infrastructure: widget.js loader', milestoneId: 'm2' },
  { id: 41, title: 'Partner Auth & Documentation', area: 'platform', initiative: 'embed', month: 'jan26', issues: ['PAL-1177', 'PAL-1185'], description: 'Server-side token generation, integration docs', milestoneId: 'm2' },
  { id: 42, title: 'Maxa Embed UI', area: 'platform', initiative: 'launch', month: 'feb26', issues: ['PAL-1174'], description: 'Embed-optimized Palazzo interface for Maxa', milestoneId: 'm5' },
  { id: 43, title: 'Source Image Loading', area: 'platform', initiative: 'launch', month: 'feb26', issues: ['PAL-1175'], description: 'Handle incoming images from Maxa canvas', milestoneId: 'm5' },
  { id: 44, title: 'Export to Canvas Action', area: 'platform', initiative: 'launch', month: 'feb26', issues: ['PAL-1176'], description: 'Send staged images back to Maxa editor', milestoneId: 'm5' },
  
  // Admin
  { id: 55, title: 'Dynamic Tenant Config', area: 'admin', initiative: 'selfserve', month: 'dec25', issues: ['PAL-1074', 'PAL-1118'], description: 'Handle tenant branding and settings dynamically', milestoneId: 'm1' },
  { id: 56, title: 'Styles Management', area: 'admin', initiative: 'selfserve', month: 'dec25', issues: ['PAL-1088', 'PAL-1124'], description: 'Admin panel for creating and assigning staging styles', milestoneId: 'm1' },
  { id: 79, title: 'Super-Admin Dashboard', area: 'admin', initiative: 'selfserve', month: 'jan26', issues: [], description: 'Central dashboard for Palazzo team to manage all tenants', milestoneId: null },
  { id: 57, title: 'Demo Images Management', area: 'admin', initiative: 'selfserve', month: 'jan26', issues: ['PAL-1080', 'PAL-1082'], description: 'Admin interface for managing demo images per tenant', milestoneId: null },
  { id: 58, title: 'Permissions & Flags', area: 'admin', initiative: 'selfserve', month: 'jan26', issues: ['PAL-1125', 'PAL-1128'], description: 'Granular permission controls and feature flags', milestoneId: null }
];
