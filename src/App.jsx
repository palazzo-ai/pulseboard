import React, { useState, useCallback, useEffect, useRef } from 'react';

// Status definitions
const STATUSES = {
  not_started: { label: 'Not Started', color: '#6b7280', bgColor: '#6b728020' },
  in_progress: { label: 'In Progress', color: '#3b82f6', bgColor: '#3b82f620' },
  done: { label: 'Done', color: '#22c55e', bgColor: '#22c55e20' },
  blocked: { label: 'Blocked', color: '#ef4444', bgColor: '#ef444420' }
};

const initialData = {
  areas: [
    { id: 'visualizer', name: 'Visualizer', color: '#3fb950' },
    { id: 'vinci', name: 'Vinci', color: '#38bdf8' },
    { id: 'spaces', name: 'Spaces', color: '#a371f7' },
    { id: 'showcase', name: 'Showcase', color: '#f85149' },
    { id: 'studio', name: 'Studio', color: '#f778ba' },
    { id: 'platform', name: 'Platform', color: '#d29922' },
    { id: 'admin', name: 'Admin', color: '#8b949e' }
  ],
  initiatives: [
    { id: 'launch', name: 'Launch Partner Commitments', color: '#f85149' },
    { id: 'selfserve', name: 'Self-Serve Scale', color: '#58a6ff' },
    { id: 'embed', name: 'Embed Everywhere', color: '#a371f7' },
    { id: 'ai', name: 'AI Model Excellence', color: '#3fb950' },
    { id: 'commerce', name: 'Commerce Enablement', color: '#d29922' },
    { id: 'enterprise', name: 'Enterprise Content Scale', color: '#f778ba' }
  ],
  months: [
    { id: 'dec25', name: "Dec '25", quarter: 'Q4 2025', current: true },
    { id: 'jan26', name: "Jan '26", quarter: 'Q1 2026' },
    { id: 'feb26', name: "Feb '26", quarter: 'Q1 2026' },
    { id: 'mar26', name: "Mar '26", quarter: 'Q1 2026' },
    { id: 'apr26', name: "Apr '26", quarter: 'Q2 2026' },
    { id: 'may26', name: "May '26", quarter: 'Q2 2026' },
    { id: 'jun26', name: "Jun '26", quarter: 'Q2 2026' },
    { id: 'jul26', name: "Jul '26", quarter: 'Q3 2026' },
    { id: 'aug26', name: "Aug '26", quarter: 'Q3 2026' },
    { id: 'sep26', name: "Sep '26", quarter: 'Q3 2026' },
    { id: 'oct26', name: "Oct '26", quarter: 'Q4 2026' },
    { id: 'nov26', name: "Nov '26", quarter: 'Q4 2026' },
    { id: 'dec26', name: "Dec '26", quarter: 'Q4 2026' }
  ]
};

// Milestones are delivery dates / external commitments
const initialMilestones = [
  { id: 'm1', title: 'HomeZone Go-Live', month: 'dec25', area: 'showcase', description: 'Production launch for HomeZone retail partner' },
  { id: 'm14', title: 'Vinci Conversational Launch', month: 'jan26', area: 'vinci', description: 'Talkative Vinci ready for Showcase customer website embeds' },
  { id: 'm2', title: 'Embed Platform v1', month: 'jan26', area: 'platform', description: 'Universal widget infrastructure ready for partners' },
  { id: 'm3', title: 'Studio MVP', month: 'jan26', area: 'studio', description: 'Brand content creation engine available for pilot customers' },
  { id: 'm4', title: 'Serhant Pilot Launch', month: 'feb26', area: 'spaces', description: 'Real estate staging platform live with Serhant' },
  { id: 'm5', title: 'Maxa Beta', month: 'feb26', area: 'platform', description: 'Embedded staging available in Maxa editor for beta users' },
  { id: 'm6', title: 'Wonder Embedded Launch', month: 'feb26', area: 'showcase', description: 'Embed buttons live on Wonder client PDPs' },
  { id: 'm7', title: 'Storis Integration v1', month: 'mar26', area: 'showcase', description: 'POS/ERP integration complete for furniture retailers' },
  { id: 'm8', title: 'Studio Commerce Engine', month: 'mar26', area: 'studio', description: 'Publishing and shoppable image features live' },
  { id: 'm9', title: 'Maxa Production', month: 'apr26', area: 'platform', description: 'Full production rollout for Maxa integration' },
  { id: 'm10', title: 'Partner Portal Launch', month: 'may26', area: 'platform', description: 'Self-service portal for embed partners' },
  { id: 'm11', title: 'Studio Scale Acceleration', month: 'jul26', area: 'studio', description: 'Batch pipelines and AI QA available for enterprise' },
  { id: 'm12', title: 'Sales Intelligence Platform', month: 'oct26', area: 'showcase', description: 'Conversation coaching platform live' },
  { id: 'm13', title: 'Public API v1.0', month: 'dec26', area: 'platform', description: 'Versioned public API for external developers' }
];

// Opportunities feed into milestones (milestoneId is optional)
const initialOpportunities = [
  // Visualizer (no milestones, foundational work)
  { id: 1, title: 'Improve Unstaging Model', area: 'visualizer', initiative: 'ai', month: 'dec25', issues: ['PAL-1191', 'PAL-875'], description: 'Replace current unstaging model with new Gemini 3-based model for better furniture removal', milestoneId: null },
  { id: 2, title: 'Reimagine Pipeline Gemini 3', area: 'visualizer', initiative: 'ai', month: 'dec25', issues: ['PAL-1133'], description: 'Upgrade reimagine/restyle pipeline using Gemini 3 for higher quality room transformations', milestoneId: null },
  { id: 3, title: 'Scale-Accurate Placement', area: 'visualizer', initiative: 'ai', month: 'jan26', issues: ['PAL-1033', 'PAL-1142'], description: 'Ensure furniture maintains correct proportions relative to room size', milestoneId: null },
  { id: 4, title: 'Inventory Tracking Fix', area: 'visualizer', initiative: 'ai', month: 'jan26', issues: ['PAL-1169'], description: 'Fix swap operations to properly update inventory state', milestoneId: null },
  { id: 5, title: 'Move/Reposition Objects', area: 'visualizer', initiative: 'ai', month: 'feb26', issues: ['PAL-898'], description: 'Allow users to drag furniture to new positions without full regeneration', milestoneId: null },
  { id: 6, title: 'Total Room Makeover', area: 'visualizer', initiative: 'ai', month: 'mar26', issues: ['PAL-1170', 'PAL-1178'], description: 'Transform both furniture AND room aesthetic in single operation', milestoneId: null },
  
  // Vinci -> Conversational Launch (m14)
  { id: 70, title: 'Conversational State Machine', area: 'vinci', initiative: 'ai', month: 'dec25', issues: [], description: 'Event-driven conversation architecture with context persistence across turns', milestoneId: 'm14' },
  { id: 71, title: 'Voice & Personality System', area: 'vinci', initiative: 'ai', month: 'jan26', issues: [], description: 'Consistent talkative personality with configurable tone per retailer brand', milestoneId: 'm14' },
  { id: 72, title: 'Product Knowledge Integration', area: 'vinci', initiative: 'ai', month: 'jan26', issues: [], description: 'Connect Vinci to retailer product catalog for informed recommendations', milestoneId: 'm14' },
  { id: 73, title: 'Embed Widget for Vinci', area: 'vinci', initiative: 'embed', month: 'jan26', issues: [], description: 'Chat widget component for embedding Vinci on customer websites', milestoneId: 'm14' },
  { id: 83, title: 'Style Discovery Quiz', area: 'vinci', initiative: 'selfserve', month: 'feb26', issues: ['PAL-1193'], description: 'Interactive quiz to identify user design aesthetic (Modern, Coastal, Farmhouse, etc.) that captures preferences and feeds into Vinci suggestions', milestoneId: null },
  
  // Spaces -> Serhant Pilot (m4)
  { id: 7, title: 'Real Estate Style Presets', area: 'spaces', initiative: 'selfserve', month: 'jan26', issues: ['PAL-1179'], description: 'One-click style presets optimized for real estate staging', milestoneId: 'm4' },
  { id: 74, title: 'Mobile-Optimized Experience', area: 'spaces', initiative: 'selfserve', month: 'jan26', issues: [], description: 'Responsive staging interface for agents using phones and tablets in the field', milestoneId: 'm4' },
  { id: 84, title: 'Listings Dashboard', area: 'spaces', initiative: 'selfserve', month: 'jan26', issues: ['PAL-1195'], description: 'Central home page for agents to manage all listings, track staging progress, and continue previous work', milestoneId: 'm4' },
  { id: 8, title: 'MLS-Safe Microsites', area: 'spaces', initiative: 'launch', month: 'feb26', issues: ['PAL-1126'], description: 'Unbranded microsites compliant with MLS guidelines', milestoneId: 'm4' },
  { id: 9, title: 'Broker Attribution System', area: 'spaces', initiative: 'launch', month: 'feb26', issues: [], description: 'Commission tracking and agent performance attribution', milestoneId: 'm4' },
  { id: 10, title: 'Before/After Comparison', area: 'spaces', initiative: 'commerce', month: 'feb26', issues: ['PAL-1180'], description: 'Interactive slider-based comparison for marketing materials', milestoneId: 'm4' },
  { id: 85, title: 'MLS Photo Import', area: 'spaces', initiative: 'selfserve', month: 'feb26', issues: ['PAL-1196'], description: 'Pull listing photos directly from MLS by entering MLS# — no manual download/upload needed', milestoneId: 'm4' },
  { id: 86, title: 'Publish to Listing Platforms', area: 'spaces', initiative: 'commerce', month: 'feb26', issues: ['PAL-1197'], description: 'One-click export staged images to Serhant.com, brokerage websites, and social media', milestoneId: 'm4' },
  { id: 11, title: 'Spaces Self-Serve PLG', area: 'spaces', initiative: 'selfserve', month: 'mar26', issues: [], description: 'Agent signup flow with pricing tiers and Stripe integration', milestoneId: null },
  { id: 12, title: 'Room Declutter', area: 'spaces', initiative: 'ai', month: 'mar26', issues: ['PAL-1181'], description: 'Automatically remove existing furniture and clutter before staging', milestoneId: null },
  { id: 13, title: 'Room Type Detection', area: 'spaces', initiative: 'ai', month: 'apr26', issues: ['PAL-1182'], description: 'Auto-detect room type to provide contextual staging suggestions', milestoneId: null },
  
  // Showcase -> HomeZone (m1)
  { id: 14, title: 'Shopify Checkout Integration', area: 'showcase', initiative: 'launch', month: 'dec25', issues: ['PAL-1114', 'PAL-1168'], description: 'Complete Shopify checkout flow for HomeZone', milestoneId: 'm1' },
  { id: 15, title: 'Product Ingestion Pipeline', area: 'showcase', initiative: 'launch', month: 'dec25', issues: ['PAL-1072'], description: 'Automated product feed sync from Shopify', milestoneId: 'm1' },
  { id: 16, title: 'Shopify Self-Serve Onboarding', area: 'showcase', initiative: 'selfserve', month: 'dec25', issues: ['PAL-1121'], description: 'Enable retailers to self-setup via OAuth and auto product sync', milestoneId: null },
  { id: 17, title: 'Storis Integration Plan', area: 'showcase', initiative: 'selfserve', month: 'dec25', issues: ['PAL-1092'], description: 'Technical planning for Storis POS/ERP connection', milestoneId: 'm7' },
  { id: 78, title: 'Session & Projects Management', area: 'showcase', initiative: 'launch', month: 'dec25', issues: ['PAL-926', 'PAL-978', 'PAL-979'], description: 'Projects page for customers to manage Vinci sessions, Customers page for sales associates to view client work, session persistence and retrieval', milestoneId: 'm1' },
  { id: 18, title: 'Vision-Enhanced Recommender', area: 'showcase', initiative: 'ai', month: 'jan26', issues: ['PAL-912'], description: 'Cross-role beam search with GPT-4V integration', milestoneId: null },
  
  // Showcase -> Wonder (m6)
  { id: 19, title: 'Wonder Embed Buttons', area: 'showcase', initiative: 'launch', month: 'feb26', issues: ['PAL-1096'], description: 'Deploy standardized embed buttons on Wonder client PDPs', milestoneId: 'm6' },
  { id: 82, title: 'Public Showcase Sandbox', area: 'showcase', initiative: 'selfserve', month: 'feb26', issues: [], description: 'No-signup demo on palazzo.ai where visitors can try staging with sample rooms and generic furniture, with limited free generations', milestoneId: null },
  
  // Showcase -> Storis (m7)
  { id: 20, title: 'Storis API Integration', area: 'showcase', initiative: 'selfserve', month: 'mar26', issues: ['PAL-1092'], description: 'Complete Storis POS/ERP integration for product sync', milestoneId: 'm7' },
  { id: 21, title: 'Storis Checkout Handoff', area: 'showcase', initiative: 'selfserve', month: 'mar26', issues: [], description: 'Seamless checkout transition to Storis POS', milestoneId: 'm7' },
  
  { id: 22, title: 'PIM Integrations', area: 'showcase', initiative: 'selfserve', month: 'apr26', issues: [], description: 'Enable enterprise retailers to sync from Salsify, Syndigo', milestoneId: null },
  
  // Showcase -> Sales Intelligence (m12)
  { id: 23, title: 'Conversation Recording', area: 'showcase', initiative: 'commerce', month: 'oct26', issues: [], description: 'Audio capture and transcription for showroom conversations', milestoneId: 'm12' },
  { id: 24, title: 'Sales Coaching Dashboard', area: 'showcase', initiative: 'commerce', month: 'oct26', issues: [], description: 'Manager dashboard for reviewing and coaching sales reps', milestoneId: 'm12' },
  
  // Studio -> Studio MVP (m3)
  { id: 25, title: 'Brand Image Upload & Extraction', area: 'studio', initiative: 'enterprise', month: 'jan26', issues: ['PAL-1138'], description: 'Upload brand images and extract style DNA', milestoneId: 'm3' },
  { id: 26, title: 'Room Scale System', area: 'studio', initiative: 'enterprise', month: 'jan26', issues: ['PAL-1141'], description: 'White canvas mode with accurate room dimensions', milestoneId: 'm3' },
  { id: 27, title: 'Brand Style Application', area: 'studio', initiative: 'enterprise', month: 'jan26', issues: ['PAL-1139'], description: 'Apply extracted brand aesthetics to any generated image', milestoneId: 'm3' },
  { id: 28, title: 'Basic Studio Canvas', area: 'studio', initiative: 'enterprise', month: 'jan26', issues: ['PAL-1144'], description: 'Core canvas UX with panels and controls', milestoneId: 'm3' },
  { id: 29, title: 'Inspo Style Transfer', area: 'studio', initiative: 'enterprise', month: 'feb26', issues: ['PAL-1140'], description: 'Extract mood/color/lighting from inspiration images', milestoneId: null },
  
  // Studio -> Commerce Engine (m8)
  { id: 30, title: 'Direct PDP Publishing', area: 'studio', initiative: 'commerce', month: 'mar26', issues: ['PAL-1146'], description: 'One-click publish to Shopify, BigCommerce, Adobe Commerce', milestoneId: 'm8' },
  { id: 31, title: 'Social Media Export', area: 'studio', initiative: 'commerce', month: 'mar26', issues: ['PAL-1147'], description: 'Export to Instagram, Pinterest, Facebook with format presets', milestoneId: 'm8' },
  { id: 32, title: 'Auto-Hotspotting', area: 'studio', initiative: 'commerce', month: 'apr26', issues: ['PAL-1149'], description: 'Automatically detect and tag products in images', milestoneId: 'm8' },
  { id: 33, title: 'Variant-Aware Rendering', area: 'studio', initiative: 'enterprise', month: 'apr26', issues: ['PAL-1150'], description: 'Switch fabric/finish without regenerating layout', milestoneId: null },
  { id: 34, title: 'Studio Collaboration', area: 'studio', initiative: 'enterprise', month: 'may26', issues: ['PAL-1164', 'PAL-1165'], description: 'Shareable scene boards, commenting, teammate invites', milestoneId: null },
  { id: 35, title: 'Auto-Scene Generator', area: 'studio', initiative: 'enterprise', month: 'may26', issues: ['PAL-1152'], description: 'Automatically generate room scenes using brand catalog', milestoneId: null },
  { id: 36, title: 'Canva Export', area: 'studio', initiative: 'commerce', month: 'jun26', issues: ['PAL-1148'], description: 'Open image directly in Canva design editor', milestoneId: null },
  
  // Studio -> Scale Acceleration (m11)
  { id: 37, title: 'Batch Publishing Pipelines', area: 'studio', initiative: 'enterprise', month: 'jul26', issues: ['PAL-1153'], description: 'Scheduled, automated publishing of thousands of images', milestoneId: 'm11' },
  { id: 38, title: 'AI QA Reviewer', area: 'studio', initiative: 'enterprise', month: 'jul26', issues: ['PAL-1155'], description: 'Auto-detect brand standard violations and suggest fixes', milestoneId: 'm11' },
  { id: 39, title: 'Studio API (Headless)', area: 'studio', initiative: 'enterprise', month: 'aug26', issues: ['PAL-1163'], description: 'RESTful API for programmatic access to Studio', milestoneId: null },
  
  // Platform -> Embed Platform (m2)
  { id: 40, title: 'Widget SDK & Infrastructure', area: 'platform', initiative: 'embed', month: 'jan26', issues: ['PAL-1171', 'PAL-1172', 'PAL-1173'], description: 'Core embed infrastructure: widget.js loader (<15KB), modal container system with accessibility, and postMessage bridge for parent-iframe communication', milestoneId: 'm2' },
  { id: 41, title: 'Partner Auth & Documentation', area: 'platform', initiative: 'embed', month: 'jan26', issues: ['PAL-1177', 'PAL-1185'], description: 'Server-side token generation for secure partner access, comprehensive integration docs, and TypeScript definitions', milestoneId: 'm2' },
  
  // Platform -> Maxa Beta (m5)
  { id: 42, title: 'Maxa Embed UI', area: 'platform', initiative: 'launch', month: 'feb26', issues: ['PAL-1174'], description: 'Embed-optimized Palazzo interface for Maxa', milestoneId: 'm5' },
  { id: 43, title: 'Source Image Loading', area: 'platform', initiative: 'launch', month: 'feb26', issues: ['PAL-1175'], description: 'Handle incoming images from Maxa canvas', milestoneId: 'm5' },
  { id: 44, title: 'Export to Canvas Action', area: 'platform', initiative: 'launch', month: 'feb26', issues: ['PAL-1176'], description: 'Send staged images back to Maxa editor', milestoneId: 'm5' },
  { id: 45, title: 'Sandbox & Test Tokens', area: 'platform', initiative: 'embed', month: 'feb26', issues: ['PAL-1186'], description: 'Testing environment for partner development', milestoneId: null },
  { id: 46, title: "Bob's Hosted Widget", area: 'platform', initiative: 'embed', month: 'mar26', issues: ['PAL-1122', 'PAL-1123'], description: 'Retail widget for Bob\'s Discount Furniture', milestoneId: null },
  { id: 47, title: 'API Service Enhancements', area: 'platform', initiative: 'commerce', month: 'mar26', issues: ['PAL-1127', 'PAL-1134'], description: 'Per-image style params, staging levels, job recovery', milestoneId: null },
  { id: 75, title: 'PIM Adapter Framework', area: 'platform', initiative: 'selfserve', month: 'mar26', issues: [], description: 'Unified product data model with adapter interface for Salsify, Syndigo, 1WorldSync, and future PIM integrations', milestoneId: 'm7' },
  
  // Platform -> Maxa Production (m9)
  { id: 48, title: 'Maxa E2E Testing', area: 'platform', initiative: 'launch', month: 'apr26', issues: [], description: 'Full integration testing with Maxa staging environment', milestoneId: 'm9' },
  { id: 49, title: 'Maxa Production Rollout', area: 'platform', initiative: 'launch', month: 'apr26', issues: [], description: 'Gradual rollout to all Maxa users', milestoneId: 'm9' },
  { id: 76, title: 'Conversion Attribution Analytics', area: 'platform', initiative: 'commerce', month: 'apr26', issues: [], description: 'Track staging-to-sale conversions, A/B test styles, and generate ROI dashboards for retailers', milestoneId: null },
  
  // Platform -> Partner Portal (m10)
  { id: 50, title: 'API Key Management', area: 'platform', initiative: 'embed', month: 'may26', issues: ['PAL-1183'], description: 'Generate and rotate partner secret keys', milestoneId: 'm10' },
  { id: 51, title: 'Partner Analytics Dashboard', area: 'platform', initiative: 'embed', month: 'may26', issues: ['PAL-1184'], description: 'Usage metrics, error rates, latency tracking', milestoneId: 'm10' },
  { id: 52, title: 'Partner Configuration UI', area: 'platform', initiative: 'embed', month: 'may26', issues: [], description: 'Allowed origins, branding, feature toggles', milestoneId: 'm10' },
  
  // Platform -> Public API (m13)
  { id: 53, title: 'Public API Design', area: 'platform', initiative: 'embed', month: 'dec26', issues: [], description: 'API specification and documentation', milestoneId: 'm13' },
  { id: 54, title: 'API Versioning System', area: 'platform', initiative: 'embed', month: 'dec26', issues: [], description: 'Versioned endpoints with deprecation policy', milestoneId: 'm13' },
  
  // Admin (supporting work, no external milestones)
  { id: 55, title: 'Dynamic Tenant Config', area: 'admin', initiative: 'selfserve', month: 'dec25', issues: ['PAL-1074', 'PAL-1118'], description: 'Handle tenant branding and settings dynamically', milestoneId: 'm1' },
  { id: 56, title: 'Styles Management', area: 'admin', initiative: 'selfserve', month: 'dec25', issues: ['PAL-1088', 'PAL-1124'], description: 'Admin panel for creating and assigning staging styles', milestoneId: 'm1' },
  { id: 79, title: 'Super-Admin Dashboard', area: 'admin', initiative: 'selfserve', month: 'jan26', issues: [], description: 'Central dashboard for Palazzo team to manage all tenants, users, stores, and monitor system health across the platform', milestoneId: null },
  { id: 57, title: 'Demo Images Management', area: 'admin', initiative: 'selfserve', month: 'jan26', issues: ['PAL-1080', 'PAL-1082'], description: 'Admin interface for managing demo images per tenant', milestoneId: null },
  { id: 58, title: 'Permissions & Flags', area: 'admin', initiative: 'selfserve', month: 'jan26', issues: ['PAL-1125', 'PAL-1128'], description: 'Granular permission controls and feature flags', milestoneId: null },
  { id: 59, title: 'Usage Tracking', area: 'admin', initiative: 'commerce', month: 'feb26', issues: ['PAL-1115'], description: 'Track tenantId, storeId, mode for usage analytics', milestoneId: null },
  { id: 60, title: 'Automation Testing', area: 'admin', initiative: 'selfserve', month: 'feb26', issues: ['PAL-1190'], description: 'E2E testing for admin portal reliability', milestoneId: null },
  { id: 77, title: 'Interactive Onboarding', area: 'admin', initiative: 'selfserve', month: 'mar26', issues: [], description: 'In-app guided tutorials, video walkthroughs, and contextual help to reduce support burden', milestoneId: null },
  { id: 80, title: 'Usage Analytics & Billing', area: 'admin', initiative: 'commerce', month: 'mar26', issues: [], description: 'Per-tenant usage dashboards, metering infrastructure, cost tracking, and billing integration', milestoneId: null },
  { id: 81, title: 'Ops & Support Tools', area: 'admin', initiative: 'selfserve', month: 'apr26', issues: [], description: 'Bulk operations, user impersonation for support, session debugging, and audit logs', milestoneId: null }
];

const STORAGE_KEY = 'palazzo_timeline_data';

// Ensure opportunity has status fields (for backward compatibility)
const ensureStatusFields = (opp) => ({
  ...opp,
  status: opp.status || 'not_started',
  atRisk: opp.atRisk || false,
  atRiskReason: opp.atRiskReason || ''
});

// Load initial state from localStorage or fall back to defaults
const loadFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        opportunities: (parsed.opportunities || initialOpportunities).map(ensureStatusFields),
        milestones: parsed.milestones || initialMilestones
      };
    }
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
  }
  return {
    opportunities: initialOpportunities.map(ensureStatusFields),
    milestones: initialMilestones
  };
};

export default function PalazzoTimeline() {
  const [opportunities, setOpportunities] = useState(() => loadFromStorage().opportunities);
  const [milestones, setMilestones] = useState(() => loadFromStorage().milestones);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [editingOpportunity, setEditingOpportunity] = useState(null);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [isCreatingOpp, setIsCreatingOpp] = useState(false);
  const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);
  const [filterInitiative, setFilterInitiative] = useState(null);
  const [filterArea, setFilterArea] = useState(null);
  const [filterMilestone, setFilterMilestone] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragType, setDragType] = useState(null); // 'opportunity' or 'milestone'
  const [dropTarget, setDropTarget] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [notification, setNotification] = useState(null);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'milestones', 'opportunities'
  const [showDataModal, setShowDataModal] = useState(false);
  const [importText, setImportText] = useState('');
  
  // Chat panel state
  // Chat panel disabled for deployment - requires API key setup
  const [chatOpen, setChatOpen] = useState(false);
  const chatDisabled = true; // Set to false once API key is configured
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: "Chat is currently disabled. To enable, configure your Anthropic API key in the environment." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Save to localStorage whenever opportunities or milestones change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ opportunities, milestones }));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [opportunities, milestones]);

  // Export current state as JSON
  const exportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      opportunities,
      milestones
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `palazzo-timeline-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Exported timeline data', 'success');
  };

  // Import state from JSON
  const importData = () => {
    try {
      const data = JSON.parse(importText);
      if (data.opportunities && data.milestones) {
        setOpportunities(data.opportunities);
        setMilestones(data.milestones);
        setShowDataModal(false);
        setImportText('');
        showNotification('Imported timeline data', 'success');
      } else {
        showNotification('Invalid data format', 'warning');
      }
    } catch (e) {
      showNotification('Failed to parse JSON', 'warning');
    }
  };

  // Reset to default data
  const resetToDefault = () => {
    if (confirm('Reset all data to defaults? This cannot be undone.')) {
      setOpportunities(initialOpportunities);
      setMilestones(initialMilestones);
      setUndoStack([]);
      showNotification('Reset to default data', 'info');
    }
  };

  // Copy current state to clipboard
  const copyToClipboard = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      opportunities,
      milestones
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    showNotification('Copied to clipboard', 'success');
  };

  // Chat with Claude
  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    // Build context about current timeline state
    const timelineContext = {
      totalOpportunities: opportunities.length,
      totalMilestones: milestones.length,
      areas: initialData.areas.map(a => ({
        name: a.name,
        opportunities: opportunities.filter(o => o.area === a.id).length
      })),
      upcomingMilestones: milestones
        .filter(m => ['dec25', 'jan26', 'feb26', 'mar26'].includes(m.month))
        .map(m => ({
          title: m.title,
          month: initialData.months.find(mo => mo.id === m.month)?.name,
          area: initialData.areas.find(a => a.id === m.area)?.name,
          opportunityCount: opportunities.filter(o => o.milestoneId === m.id).length
        })),
      opportunities: opportunities.map(o => ({
        id: o.id,
        title: o.title,
        area: initialData.areas.find(a => a.id === o.area)?.name,
        month: initialData.months.find(m => m.id === o.month)?.name,
        initiative: initialData.initiatives.find(i => i.id === o.initiative)?.name,
        milestone: o.milestoneId ? milestones.find(m => m.id === o.milestoneId)?.title : null,
        linearIssues: o.issues || []
      })),
      milestones: milestones.map(m => ({
        id: m.id,
        title: m.title,
        area: initialData.areas.find(a => a.id === m.area)?.name,
        month: initialData.months.find(mo => mo.id === m.month)?.name
      }))
    };

    const systemPrompt = `You are Claude, embedded in Palazzo's Pulseboard timeline tool. You're helping Raffi (product leader) manage their roadmap.

CURRENT TIMELINE STATE:
${JSON.stringify(timelineContext, null, 2)}

CAPABILITIES:
- Discuss prioritization and strategy for opportunities
- Help analyze dependencies between opportunities and milestones  
- Suggest timeline adjustments based on constraints
- When asked to create/update Linear issues, explain you'll need to do that in the main Claude chat (this embedded version doesn't have Linear API access yet)
- Help think through resource allocation across areas

CONTEXT:
- Palazzo is an AI-powered visual commerce platform for furniture retailers and real estate
- Key products: Visualizer (AI staging), Spaces (real estate), Showcase (retail), Studio (content creation), Vinci (conversational AI), Platform (embed infrastructure)
- Major upcoming milestones: HomeZone Go-Live (Dec), Vinci Conversational Launch (Jan), Embed Platform v1 (Jan), Studio MVP (Jan), Serhant Pilot (Feb), Maxa Beta (Feb)

Be concise, actionable, and specific. Reference actual opportunities and milestones by name. If asked to modify the timeline, explain what changes to make (the user will drag/edit items themselves).`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [
            ...chatMessages.filter(m => m.role !== 'assistant' || chatMessages.indexOf(m) > 0).map(m => ({
              role: m.role,
              content: m.content
            })),
            { role: 'user', content: userMessage }
          ]
        })
      });

      const data = await response.json();
      const assistantMessage = data.content?.[0]?.text || 'Sorry, I encountered an error. Please try again.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error connecting to the API. Please check the console for details.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const saveToUndo = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-19), { opportunities, milestones }]);
  }, [opportunities, milestones]);

  const undo = () => {
    if (undoStack.length > 0) {
      const previous = undoStack[undoStack.length - 1];
      setUndoStack(prev => prev.slice(0, -1));
      setOpportunities(previous.opportunities);
      setMilestones(previous.milestones);
      showNotification('Undone', 'info');
    }
  };

  const getInitiativeColor = (initiativeId) => {
    const initiative = initialData.initiatives.find(i => i.id === initiativeId);
    return initiative?.color || '#8b949e';
  };

  const getAreaColor = (areaId) => {
    const area = initialData.areas.find(a => a.id === areaId);
    return area?.color || '#8b949e';
  };

  const getOpportunitiesForMilestone = (milestoneId) => {
    return opportunities.filter(opp => opp.milestoneId === milestoneId);
  };

  const getMilestoneProgress = (milestoneId) => {
    const opps = getOpportunitiesForMilestone(milestoneId);
    if (opps.length === 0) return { total: 0, done: 0, atRisk: 0, text: 'No opportunities', hasRisk: false };
    const done = opps.filter(o => o.status === 'done').length;
    const atRisk = opps.filter(o => o.atRisk).length;
    const blocked = opps.filter(o => o.status === 'blocked').length;
    return { 
      total: opps.length, 
      done, 
      atRisk,
      blocked,
      text: `${done}/${opps.length} done`,
      hasRisk: atRisk > 0 || blocked > 0
    };
  };

  const filteredOpportunities = opportunities.filter(opp => {
    if (filterInitiative && opp.initiative !== filterInitiative) return false;
    if (filterArea && opp.area !== filterArea) return false;
    if (filterMilestone && opp.milestoneId !== filterMilestone) return false;
    if (filterStatus === 'at_risk' && !opp.atRisk) return false;
    if (filterStatus && filterStatus !== 'at_risk' && opp.status !== filterStatus) return false;
    return true;
  });

  const filteredMilestones = milestones.filter(m => {
    if (filterArea && m.area !== filterArea) return false;
    return true;
  });

  const getMilestonesForCell = (areaId, monthId) => {
    return filteredMilestones.filter(m => m.area === areaId && m.month === monthId);
  };

  const getOpportunitiesForCell = (areaId, monthId) => {
    return filteredOpportunities.filter(opp => opp.area === areaId && opp.month === monthId);
  };

  const quarters = [...new Set(initialData.months.map(m => m.quarter))];
  const getMonthsForQuarter = (quarter) => initialData.months.filter(m => m.quarter === quarter);

  // Drag and Drop handlers
  const handleDragStart = (e, item, type) => {
    setDraggedItem(item);
    setDragType(type);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragOver = (e, areaId, monthId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ area: areaId, month: monthId });
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e, areaId, monthId) => {
    e.preventDefault();
    if (draggedItem) {
      saveToUndo();
      if (dragType === 'opportunity') {
        setOpportunities(prev => prev.map(opp => 
          opp.id === draggedItem.id 
            ? { ...opp, area: areaId, month: monthId }
            : opp
        ));
        showNotification(`Moved "${draggedItem.title}"`, 'success');
      } else if (dragType === 'milestone') {
        setMilestones(prev => prev.map(m => 
          m.id === draggedItem.id 
            ? { ...m, area: areaId, month: monthId }
            : m
        ));
        showNotification(`Moved milestone "${draggedItem.title}"`, 'success');
      }
    }
    setDraggedItem(null);
    setDragType(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragType(null);
    setDropTarget(null);
  };

  // CRUD operations for Opportunities
  const deleteOpportunity = (id) => {
    const opp = opportunities.find(o => o.id === id);
    saveToUndo();
    setOpportunities(prev => prev.filter(o => o.id !== id));
    setSelectedOpportunity(null);
    showNotification(`Deleted "${opp?.title}"`, 'warning');
  };

  const saveOpportunity = (opp) => {
    saveToUndo();
    if (isCreatingOpp) {
      setOpportunities(prev => [...prev, opp]);
      showNotification(`Created "${opp.title}"`, 'success');
    } else {
      setOpportunities(prev => prev.map(o => o.id === opp.id ? opp : o));
      showNotification(`Updated "${opp.title}"`, 'success');
    }
    setEditingOpportunity(null);
    setIsCreatingOpp(false);
    setSelectedOpportunity(null);
  };

  const duplicateOpportunity = (opp) => {
    saveToUndo();
    const newOpp = { ...opp, id: Date.now(), title: `${opp.title} (copy)` };
    setOpportunities(prev => [...prev, newOpp]);
    showNotification(`Duplicated "${opp.title}"`, 'success');
  };

  // CRUD operations for Milestones
  const deleteMilestone = (id) => {
    const m = milestones.find(m => m.id === id);
    saveToUndo();
    // Unlink opportunities from this milestone
    setOpportunities(prev => prev.map(opp => 
      opp.milestoneId === id ? { ...opp, milestoneId: null } : opp
    ));
    setMilestones(prev => prev.filter(m => m.id !== id));
    setSelectedMilestone(null);
    showNotification(`Deleted milestone "${m?.title}"`, 'warning');
  };

  const saveMilestone = (m) => {
    saveToUndo();
    if (isCreatingMilestone) {
      setMilestones(prev => [...prev, m]);
      showNotification(`Created milestone "${m.title}"`, 'success');
    } else {
      setMilestones(prev => prev.map(existing => existing.id === m.id ? m : existing));
      showNotification(`Updated milestone "${m.title}"`, 'success');
    }
    setEditingMilestone(null);
    setIsCreatingMilestone(false);
    setSelectedMilestone(null);
  };

  const startCreateOpportunity = (areaId, monthId) => {
    setIsCreatingOpp(true);
    setEditingOpportunity({
      id: Date.now(),
      title: '',
      area: areaId,
      month: monthId,
      initiative: 'ai',
      issues: [],
      description: '',
      milestoneId: null,
      status: 'not_started',
      atRisk: false,
      atRiskReason: ''
    });
  };

  const startCreateMilestone = (areaId, monthId) => {
    setIsCreatingMilestone(true);
    setEditingMilestone({
      id: `m${Date.now()}`,
      title: '',
      area: areaId,
      month: monthId,
      description: ''
    });
  };

  // Form Components
  const OpportunityForm = ({ opportunity, onSave, onCancel, isNew }) => {
    const [form, setForm] = useState(opportunity);
    const [issuesText, setIssuesText] = useState(opportunity.issues.join(', '));

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!form.title.trim()) return;
      onSave({
        ...form,
        issues: issuesText.split(',').map(s => s.trim()).filter(Boolean)
      });
    };

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onCancel}>
        <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b border-slate-800 sticky top-0 bg-slate-900">
            <h2 className="text-lg font-semibold text-white">
              {isNew ? 'Create Opportunity' : 'Edit Opportunity'}
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter opportunity title..."
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                placeholder="Describe the opportunity..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Area</label>
                <select
                  value={form.area}
                  onChange={e => setForm({ ...form, area: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {initialData.areas.map(area => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Month</label>
                <select
                  value={form.month}
                  onChange={e => setForm({ ...form, month: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {initialData.months.map(month => (
                    <option key={month.id} value={month.id}>{month.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Initiative</label>
              <select
                value={form.initiative}
                onChange={e => setForm({ ...form, initiative: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {initialData.initiatives.map(init => (
                  <option key={init.id} value={init.id}>{init.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Feeds Into Milestone</label>
              <select
                value={form.milestoneId || ''}
                onChange={e => setForm({ ...form, milestoneId: e.target.value || null })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No milestone</option>
                {milestones.map(m => (
                  <option key={m.id} value={m.id}>🎯 {m.title} ({initialData.months.find(mo => mo.id === m.month)?.name})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Linear Issues (comma-separated)</label>
              <input
                type="text"
                value={issuesText}
                onChange={e => setIssuesText(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="PAL-123, PAL-456"
              />
            </div>

            {/* Status Section */}
            <div className="border-t border-slate-700 pt-4 mt-4">
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">Status & Risk</div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Status</label>
                  <select
                    value={form.status || 'not_started'}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(STATUSES).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-800 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.atRisk || false}
                      onChange={e => setForm({ ...form, atRisk: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-600 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-900"
                    />
                    <span className="text-sm text-orange-400 flex items-center gap-1">
                      ⚠ At Risk
                    </span>
                  </label>
                </div>
              </div>

              {form.atRisk && (
                <div className="mt-3">
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Risk Reason</label>
                  <input
                    type="text"
                    value={form.atRiskReason || ''}
                    onChange={e => setForm({ ...form, atRiskReason: e.target.value })}
                    className="w-full bg-slate-800 border border-orange-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Why is this at risk?"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onCancel} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={!form.title.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded-lg transition-colors">
                {isNew ? 'Create' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const MilestoneForm = ({ milestone, onSave, onCancel, isNew }) => {
    const [form, setForm] = useState(milestone);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!form.title.trim()) return;
      onSave(form);
    };

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onCancel}>
        <div className="bg-slate-900 border border-yellow-700/50 rounded-xl max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b border-slate-800 bg-yellow-900/20">
            <h2 className="text-lg font-semibold text-yellow-400 flex items-center gap-2">
              🎯 {isNew ? 'Create Milestone' : 'Edit Milestone'}
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Milestone Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="e.g., Serhant Pilot Launch"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 h-20 resize-none"
                placeholder="What does this milestone represent?"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Area</label>
                <select
                  value={form.area}
                  onChange={e => setForm({ ...form, area: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  {initialData.areas.map(area => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Target Month</label>
                <select
                  value={form.month}
                  onChange={e => setForm({ ...form, month: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  {initialData.months.map(month => (
                    <option key={month.id} value={month.id}>{month.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onCancel} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={!form.title.trim()} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded-lg transition-colors">
                {isNew ? 'Create Milestone' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${
          notification.type === 'success' ? 'bg-emerald-600 text-white' :
          notification.type === 'warning' ? 'bg-amber-600 text-white' :
          'bg-slate-700 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Palazzo Opportunities Timeline</h1>
          <p className="text-slate-500 text-sm">Milestones are delivery dates • Opportunities feed into milestones • Auto-saved to browser</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!chatDisabled && (
            <button 
              onClick={() => setChatOpen(!chatOpen)} 
              className={`px-3 py-1.5 ${chatOpen ? 'bg-orange-600 hover:bg-orange-500' : 'bg-orange-700 hover:bg-orange-600'} text-white text-sm rounded-lg transition-colors flex items-center gap-1.5`}
            >
              <span>🤖</span> Claude
            </button>
          )}
          <button onClick={() => setShowDataModal(true)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors">
            📁 Data
          </button>
          <button onClick={undo} disabled={undoStack.length === 0} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
            ↶ Undo
          </button>
          <button onClick={() => startCreateMilestone('showcase', 'mar26')} className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-lg transition-colors">
            + Milestone
          </button>
          <button onClick={() => startCreateOpportunity('visualizer', 'dec25')} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
            + Opportunity
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        {/* View Mode */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 uppercase tracking-wide">View:</span>
          <div className="flex gap-1">
            {['all', 'milestones', 'opportunities'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2 py-1 text-xs rounded capitalize ${viewMode === mode ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Initiative Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 uppercase tracking-wide">Initiative:</span>
          <div className="flex flex-wrap gap-1">
            <button onClick={() => setFilterInitiative(null)} className={`px-2 py-1 text-xs rounded ${!filterInitiative ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              All
            </button>
            {initialData.initiatives.map(init => (
              <button
                key={init.id}
                onClick={() => setFilterInitiative(filterInitiative === init.id ? null : init.id)}
                className="px-2 py-1 text-xs rounded flex items-center gap-1 hover:opacity-80"
                style={{ 
                  backgroundColor: filterInitiative === init.id ? init.color : `${init.color}30`,
                  color: filterInitiative === init.id ? '#fff' : init.color
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: init.color }}></span>
                {init.name}
              </button>
            ))}
          </div>
        </div>

        {/* Milestone Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 uppercase tracking-wide">Milestone:</span>
          <select
            value={filterMilestone || ''}
            onChange={e => setFilterMilestone(e.target.value || null)}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
          >
            <option value="">All</option>
            {milestones.map(m => (
              <option key={m.id} value={m.id}>🎯 {m.title}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 uppercase tracking-wide">Status:</span>
          <div className="flex flex-wrap gap-1">
            <button 
              onClick={() => setFilterStatus(null)} 
              className={`px-2 py-1 text-xs rounded ${!filterStatus ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              All
            </button>
            {Object.entries(STATUSES).map(([key, { label, color }]) => (
              <button
                key={key}
                onClick={() => setFilterStatus(filterStatus === key ? null : key)}
                className="px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors"
                style={{ 
                  backgroundColor: filterStatus === key ? color : `${color}30`,
                  color: filterStatus === key ? '#fff' : color
                }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setFilterStatus(filterStatus === 'at_risk' ? null : 'at_risk')}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors ${filterStatus === 'at_risk' ? 'bg-orange-500 text-white' : 'bg-orange-500/30 text-orange-400 hover:bg-orange-500/50'}`}
            >
              ⚠ At Risk
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-900">
        <table className="w-full min-w-[1400px] border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-slate-900 border-b border-r border-slate-800 p-2 w-28"></th>
              {quarters.map(quarter => (
                <th key={quarter} colSpan={getMonthsForQuarter(quarter).length} className="bg-slate-800/50 border-b border-slate-800 p-2 text-xs font-medium text-blue-400 text-center">
                  {quarter}
                </th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 z-20 bg-slate-900 border-b border-r border-slate-800 p-2 text-xs font-medium text-slate-500 text-left">AREA</th>
              {initialData.months.map(month => (
                <th key={month.id} className={`border-b border-slate-800 p-2 text-xs font-medium text-center min-w-[130px] ${month.current ? 'bg-emerald-950/30 text-emerald-400 border-b-2 border-b-emerald-500' : 'text-slate-400'}`}>
                  {month.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {initialData.areas.map(area => (
              <tr key={area.id}>
                <td 
                  className="sticky left-0 z-10 bg-slate-900 border-r border-b border-slate-800 p-2 font-medium text-sm cursor-pointer hover:bg-slate-800"
                  style={{ color: area.color }}
                  onClick={() => setFilterArea(filterArea === area.id ? null : area.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: area.color }}></span>
                    {area.name}
                    {filterArea === area.id && <span className="text-xs">✓</span>}
                  </div>
                </td>
                {initialData.months.map(month => {
                  const cellMilestones = getMilestonesForCell(area.id, month.id);
                  const cellOpps = getOpportunitiesForCell(area.id, month.id);
                  const isDropTarget = dropTarget?.area === area.id && dropTarget?.month === month.id;
                  
                  return (
                    <td 
                      key={month.id}
                      className={`border-b border-slate-800 p-1.5 align-top transition-all ${month.current ? 'bg-emerald-950/10' : ''} ${isDropTarget ? 'bg-blue-900/30 ring-2 ring-inset ring-blue-500' : ''}`}
                      onDragOver={(e) => handleDragOver(e, area.id, month.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, area.id, month.id)}
                      onDoubleClick={() => startCreateOpportunity(area.id, month.id)}
                    >
                      <div className="flex flex-col gap-1.5">
                        {/* Milestones */}
                        {(viewMode === 'all' || viewMode === 'milestones') && cellMilestones.map(m => {
                          const progress = getMilestoneProgress(m.id);
                          const progressPct = progress.total > 0 ? (progress.done / progress.total) * 100 : 0;
                          return (
                            <div
                              key={m.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, m, 'milestone')}
                              onDragEnd={handleDragEnd}
                              onClick={() => setSelectedMilestone(m)}
                              className={`p-2 rounded text-[11px] cursor-grab active:cursor-grabbing bg-yellow-900/30 border border-yellow-600/50 hover:border-yellow-500 transition-all ${draggedItem?.id === m.id && dragType === 'milestone' ? 'opacity-50' : ''} ${progress.hasRisk ? 'ring-1 ring-orange-500' : ''}`}
                            >
                              <div className="flex items-center gap-1 text-yellow-400 font-semibold">
                                {progress.hasRisk && <span className="text-orange-500">⚠</span>}
                                <span>🎯</span>
                                <span className="flex-1">{m.title}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-emerald-500 transition-all" 
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-yellow-600">{progress.text}</span>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Opportunities */}
                        {(viewMode === 'all' || viewMode === 'opportunities') && cellOpps.map(opp => {
                          const linkedMilestone = opp.milestoneId ? milestones.find(m => m.id === opp.milestoneId) : null;
                          const statusInfo = STATUSES[opp.status] || STATUSES.not_started;
                          return (
                            <div
                              key={opp.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, opp, 'opportunity')}
                              onDragEnd={handleDragEnd}
                              onClick={() => setSelectedOpportunity(opp)}
                              className={`p-1.5 rounded text-[11px] cursor-grab active:cursor-grabbing transition-all hover:translate-x-0.5 hover:shadow-lg ${draggedItem?.id === opp.id && dragType === 'opportunity' ? 'opacity-50' : ''} ${opp.atRisk ? 'ring-1 ring-orange-500' : ''}`}
                              style={{ 
                                backgroundColor: `${getInitiativeColor(opp.initiative)}15`,
                                borderLeft: `3px solid ${getInitiativeColor(opp.initiative)}`
                              }}
                            >
                              <div className="flex items-center gap-1">
                                {opp.atRisk && <span className="text-orange-500" title={opp.atRiskReason || 'At Risk'}>⚠</span>}
                                <span className="font-medium text-slate-200 leading-tight flex-1">{opp.title}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span 
                                  className="px-1 py-0.5 rounded text-[8px] font-medium"
                                  style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
                                >
                                  {statusInfo.label}
                                </span>
                                {linkedMilestone && (
                                  <span className="text-yellow-500 text-[9px] flex items-center gap-0.5">
                                    → {linkedMilestone.title}
                                  </span>
                                )}
                              </div>
                              {opp.issues.length > 0 && (
                                <div className="text-slate-500 text-[9px] mt-0.5">
                                  {opp.issues.slice(0, 2).join(', ')}{opp.issues.length > 2 ? '...' : ''}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {cellMilestones.length === 0 && cellOpps.length === 0 && (
                          <div className="text-slate-700 text-center py-2 text-xs">—</div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <div><span className="text-yellow-500 font-medium">{filteredMilestones.length}</span> milestones</div>
        <div><span className="text-slate-400 font-medium">{filteredOpportunities.length}</span> opportunities</div>
        <div className="border-l border-slate-700 pl-4 flex gap-3">
          <span style={{ color: STATUSES.not_started.color }}>{opportunities.filter(o => o.status === 'not_started').length} not started</span>
          <span style={{ color: STATUSES.in_progress.color }}>{opportunities.filter(o => o.status === 'in_progress').length} in progress</span>
          <span style={{ color: STATUSES.done.color }}>{opportunities.filter(o => o.status === 'done').length} done</span>
          <span style={{ color: STATUSES.blocked.color }}>{opportunities.filter(o => o.status === 'blocked').length} blocked</span>
        </div>
        <div className="border-l border-slate-700 pl-4">
          <span className="text-orange-500">{opportunities.filter(o => o.atRisk).length} at risk</span>
        </div>
        <div><span className="text-slate-400 font-medium">{undoStack.length}</span> undo steps</div>
      </div>

      {/* Opportunity Detail Modal */}
      {selectedOpportunity && !editingOpportunity && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedOpportunity(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {selectedOpportunity.milestoneId && (
                    <span className="inline-block px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-[10px] font-medium rounded mb-2">
                      → {milestones.find(m => m.id === selectedOpportunity.milestoneId)?.title}
                    </span>
                  )}
                  <h2 className="text-lg font-semibold text-white">{selectedOpportunity.title}</h2>
                </div>
                <button onClick={() => setSelectedOpportunity(null)} className="text-slate-500 hover:text-white text-xl">×</button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-slate-300 text-sm">{selectedOpportunity.description}</p>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Area</div>
                  <div className="flex items-center gap-2" style={{ color: getAreaColor(selectedOpportunity.area) }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getAreaColor(selectedOpportunity.area) }}></span>
                    {initialData.areas.find(a => a.id === selectedOpportunity.area)?.name}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Initiative</div>
                  <div className="flex items-center gap-2" style={{ color: getInitiativeColor(selectedOpportunity.initiative) }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getInitiativeColor(selectedOpportunity.initiative) }}></span>
                    {initialData.initiatives.find(i => i.id === selectedOpportunity.initiative)?.name}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Target Month</div>
                  <div className="text-slate-300">{initialData.months.find(m => m.id === selectedOpportunity.month)?.name}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Milestone</div>
                  <div className="text-slate-300">
                    {selectedOpportunity.milestoneId 
                      ? `🎯 ${milestones.find(m => m.id === selectedOpportunity.milestoneId)?.title}`
                      : '—'
                    }
                  </div>
                </div>
              </div>

              {selectedOpportunity.issues.length > 0 && (
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-2">Linear Issues</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedOpportunity.issues.map(issue => (
                      <span key={issue} className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded font-mono">{issue}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-between">
              <div className="flex gap-2">
                <button onClick={() => deleteOpportunity(selectedOpportunity.id)} className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-sm rounded-lg">Delete</button>
                <button onClick={() => duplicateOpportunity(selectedOpportunity)} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg">Duplicate</button>
              </div>
              <button onClick={() => { setEditingOpportunity(selectedOpportunity); setIsCreatingOpp(false); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg">Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Milestone Detail Modal */}
      {selectedMilestone && !editingMilestone && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMilestone(null)}>
          <div className="bg-slate-900 border border-yellow-700/50 rounded-xl max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-800 bg-yellow-900/20">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-lg font-semibold text-yellow-400 flex items-center gap-2">
                  🎯 {selectedMilestone.title}
                </h2>
                <button onClick={() => setSelectedMilestone(null)} className="text-slate-500 hover:text-white text-xl">×</button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-slate-300 text-sm">{selectedMilestone.description}</p>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Area</div>
                  <div className="flex items-center gap-2" style={{ color: getAreaColor(selectedMilestone.area) }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getAreaColor(selectedMilestone.area) }}></span>
                    {initialData.areas.find(a => a.id === selectedMilestone.area)?.name}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Target Month</div>
                  <div className="text-slate-300">{initialData.months.find(m => m.id === selectedMilestone.month)?.name}</div>
                </div>
              </div>

              {/* Linked Opportunities */}
              <div>
                <div className="text-slate-500 text-xs uppercase tracking-wide mb-2">
                  Contributing Opportunities ({getOpportunitiesForMilestone(selectedMilestone.id).length})
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {getOpportunitiesForMilestone(selectedMilestone.id).map(opp => (
                    <div 
                      key={opp.id}
                      className="p-2 bg-slate-800 rounded text-xs cursor-pointer hover:bg-slate-700"
                      onClick={() => { setSelectedMilestone(null); setSelectedOpportunity(opp); }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getInitiativeColor(opp.initiative) }}></span>
                        <span className="text-slate-200">{opp.title}</span>
                        <span className="text-slate-500 ml-auto">{initialData.months.find(m => m.id === opp.month)?.name}</span>
                      </div>
                    </div>
                  ))}
                  {getOpportunitiesForMilestone(selectedMilestone.id).length === 0 && (
                    <div className="text-slate-500 text-xs italic">No opportunities linked yet</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-between">
              <button onClick={() => deleteMilestone(selectedMilestone.id)} className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-sm rounded-lg">Delete</button>
              <button onClick={() => { setEditingMilestone(selectedMilestone); setIsCreatingMilestone(false); }} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-lg">Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create Forms */}
      {editingOpportunity && (
        <OpportunityForm
          opportunity={editingOpportunity}
          onSave={saveOpportunity}
          onCancel={() => { setEditingOpportunity(null); setIsCreatingOpp(false); }}
          isNew={isCreatingOpp}
        />
      )}

      {editingMilestone && (
        <MilestoneForm
          milestone={editingMilestone}
          onSave={saveMilestone}
          onCancel={() => { setEditingMilestone(null); setIsCreatingMilestone(false); }}
          isNew={isCreatingMilestone}
        />
      )}

      {/* Claude Chat Panel */}
      {chatOpen && (
        <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col z-40 overflow-hidden">
          {/* Chat Header */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-orange-900/50 to-slate-900">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <span className="font-semibold text-white">Claude</span>
              <span className="text-xs text-slate-400">Roadmap Assistant</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white text-lg">×</button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-800 text-slate-200'
                }`}>
                  <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ 
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }} />
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-400 rounded-lg px-3 py-2 text-sm">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-3 py-2 border-t border-slate-800 flex gap-1 flex-wrap">
            <button 
              onClick={() => setChatInput('What should I prioritize this month?')}
              className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
            >
              Prioritize
            </button>
            <button 
              onClick={() => setChatInput('Review my January milestones')}
              className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
            >
              Jan milestones
            </button>
            <button 
              onClick={() => setChatInput('What are the risks to Serhant Pilot?')}
              className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
            >
              Risks
            </button>
            <button 
              onClick={() => setChatInput('Show opportunities without Linear issues')}
              className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
            >
              Missing issues
            </button>
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-slate-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Ask about your roadmap..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button 
                onClick={sendMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="px-3 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded-lg transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Management Modal */}
      {showDataModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowDataModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">📁 Data Management</h2>
              <button onClick={() => setShowDataModal(false)} className="text-slate-500 hover:text-white text-xl">×</button>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Export Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-300">Export Data</h3>
                <p className="text-xs text-slate-500">Download or copy your timeline data. Share with Claude to update the baseline.</p>
                <div className="flex gap-2">
                  <button onClick={exportData} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors">
                    ⬇ Download JSON
                  </button>
                  <button onClick={copyToClipboard} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors">
                    📋 Copy to Clipboard
                  </button>
                </div>
              </div>

              {/* Import Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-300">Import Data</h3>
                <p className="text-xs text-slate-500">Paste exported JSON to restore a saved state.</p>
                <textarea
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  className="w-full h-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder='Paste JSON here...'
                />
                <button 
                  onClick={importData} 
                  disabled={!importText.trim()}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded-lg transition-colors"
                >
                  ⬆ Import Data
                </button>
              </div>

              {/* Reset Section */}
              <div className="space-y-2 pt-4 border-t border-slate-800">
                <h3 className="text-sm font-medium text-red-400">Danger Zone</h3>
                <p className="text-xs text-slate-500">Reset to the original default data. This cannot be undone.</p>
                <button onClick={resetToDefault} className="px-3 py-2 bg-red-900/50 hover:bg-red-900 text-red-400 text-sm rounded-lg transition-colors">
                  ⚠ Reset to Defaults
                </button>
              </div>

              {/* Stats */}
              <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 space-y-1">
                <div>Current data: {opportunities.length} opportunities, {milestones.length} milestones</div>
                <div>Default data: {initialOpportunities.length} opportunities, {initialMilestones.length} milestones</div>
                <div>Storage key: <code className="text-slate-400">{STORAGE_KEY}</code></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
