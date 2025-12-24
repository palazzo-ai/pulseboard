// Status definitions
export const STATUSES = {
  not_started: { label: 'Not Started', color: '#6b7280', bgColor: '#6b728020' },
  in_progress: { label: 'In Progress', color: '#3b82f6', bgColor: '#3b82f620' },
  done: { label: 'Done', color: '#22c55e', bgColor: '#22c55e20' },
  blocked: { label: 'Blocked', color: '#ef4444', bgColor: '#ef444420' }
};

export const areas = [
  { id: 'visualizer', name: 'Visualizer', color: '#3fb950' },
  { id: 'vinci', name: 'Vinci', color: '#38bdf8' },
  { id: 'spaces', name: 'Spaces', color: '#a371f7' },
  { id: 'showcase', name: 'Showcase', color: '#f85149' },
  { id: 'studio', name: 'Studio', color: '#f778ba' },
  { id: 'platform', name: 'Platform', color: '#d29922' },
  { id: 'admin', name: 'Admin', color: '#8b949e' }
];

export const initiatives = [
  { id: 'launch', name: 'Launch Partner Commitments', color: '#f85149' },
  { id: 'selfserve', name: 'Self-Serve Scale', color: '#58a6ff' },
  { id: 'embed', name: 'Embed Everywhere', color: '#a371f7' },
  { id: 'ai', name: 'AI Model Excellence', color: '#3fb950' },
  { id: 'commerce', name: 'Commerce Enablement', color: '#d29922' },
  { id: 'enterprise', name: 'Enterprise Content Scale', color: '#f778ba' }
];

export const months = [
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
];

export const initialMilestones = [
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

export const initialOpportunities = [
  // Visualizer
  { id: 1, title: 'Improve Unstaging Model', area: 'visualizer', initiative: 'ai', month: 'dec25', issues: ['PAL-1191', 'PAL-875'], description: 'Replace current unstaging model with new Gemini 3-based model for better furniture removal', milestoneId: null },
  { id: 2, title: 'Reimagine Pipeline Gemini 3', area: 'visualizer', initiative: 'ai', month: 'dec25', issues: ['PAL-1133'], description: 'Upgrade reimagine/restyle pipeline using Gemini 3 for higher quality room transformations', milestoneId: null },
  { id: 3, title: 'Scale-Accurate Placement', area: 'visualizer', initiative: 'ai', month: 'jan26', issues: ['PAL-1033', 'PAL-1142'], description: 'Ensure furniture maintains correct proportions relative to room size', milestoneId: null },
  { id: 4, title: 'Inventory Tracking Fix', area: 'visualizer', initiative: 'ai', month: 'jan26', issues: ['PAL-1169'], description: 'Fix swap operations to properly update inventory state', milestoneId: null },
  { id: 5, title: 'Move/Reposition Objects', area: 'visualizer', initiative: 'ai', month: 'feb26', issues: ['PAL-898'], description: 'Allow users to drag furniture to new positions without full regeneration', milestoneId: null },
  { id: 6, title: 'Total Room Makeover', area: 'visualizer', initiative: 'ai', month: 'mar26', issues: ['PAL-1170', 'PAL-1178'], description: 'Transform both furniture AND room aesthetic in single operation', milestoneId: null },
  
  // Vinci
  { id: 70, title: 'Conversational State Machine', area: 'vinci', initiative: 'ai', month: 'dec25', issues: [], description: 'Event-driven conversation architecture with context persistence across turns', milestoneId: 'm14' },
  { id: 71, title: 'Voice & Personality System', area: 'vinci', initiative: 'ai', month: 'jan26', issues: [], description: 'Consistent talkative personality with configurable tone per retailer brand', milestoneId: 'm14' },
  { id: 72, title: 'Product Knowledge Integration', area: 'vinci', initiative: 'ai', month: 'jan26', issues: [], description: 'Connect Vinci to retailer product catalog for informed recommendations', milestoneId: 'm14' },
  { id: 73, title: 'Embed Widget for Vinci', area: 'vinci', initiative: 'embed', month: 'jan26', issues: [], description: 'Chat widget component for embedding Vinci on customer websites', milestoneId: 'm14' },
  { id: 83, title: 'Style Discovery Quiz', area: 'vinci', initiative: 'selfserve', month: 'feb26', issues: ['PAL-1193'], description: 'Interactive quiz to identify user design aesthetic', milestoneId: null },
  
  // Spaces
  { id: 7, title: 'Real Estate Style Presets', area: 'spaces', initiative: 'selfserve', month: 'jan26', issues: ['PAL-1179'], description: 'One-click style presets optimized for real estate staging', milestoneId: 'm4' },
  { id: 74, title: 'Mobile-Optimized Experience', area: 'spaces', initiative: 'selfserve', month: 'jan26', issues: [], description: 'Responsive staging interface for agents using phones and tablets in the field', milestoneId: 'm4' },
  { id: 84, title: 'Listings Dashboard', area: 'spaces', initiative: 'selfserve', month: 'jan26', issues: ['PAL-1195'], description: 'Central home page for agents to manage all listings', milestoneId: 'm4' },
  { id: 8, title: 'MLS-Safe Microsites', area: 'spaces', initiative: 'launch', month: 'feb26', issues: ['PAL-1126'], description: 'Unbranded microsites compliant with MLS guidelines', milestoneId: 'm4' },
  { id: 9, title: 'Broker Attribution System', area: 'spaces', initiative: 'launch', month: 'feb26', issues: [], description: 'Commission tracking and agent performance attribution', milestoneId: 'm4' },
  { id: 10, title: 'Before/After Comparison', area: 'spaces', initiative: 'commerce', month: 'feb26', issues: ['PAL-1180'], description: 'Interactive slider-based comparison for marketing materials', milestoneId: 'm4' },
  { id: 85, title: 'MLS Photo Import', area: 'spaces', initiative: 'selfserve', month: 'feb26', issues: ['PAL-1196'], description: 'Pull listing photos directly from MLS by entering MLS#', milestoneId: 'm4' },
  { id: 86, title: 'Publish to Listing Platforms', area: 'spaces', initiative: 'commerce', month: 'feb26', issues: ['PAL-1197'], description: 'One-click export staged images to Serhant.com and social media', milestoneId: 'm4' },
  { id: 11, title: 'Spaces Self-Serve PLG', area: 'spaces', initiative: 'selfserve', month: 'mar26', issues: [], description: 'Agent signup flow with pricing tiers and Stripe integration', milestoneId: null },
  { id: 12, title: 'Room Declutter', area: 'spaces', initiative: 'ai', month: 'mar26', issues: ['PAL-1181'], description: 'Automatically remove existing furniture and clutter before staging', milestoneId: null },
  { id: 13, title: 'Room Type Detection', area: 'spaces', initiative: 'ai', month: 'apr26', issues: ['PAL-1182'], description: 'Auto-detect room type to provide contextual staging suggestions', milestoneId: null },
  
  // Showcase
  { id: 14, title: 'Shopify Checkout Integration', area: 'showcase', initiative: 'launch', month: 'dec25', issues: ['PAL-1114', 'PAL-1168'], description: 'Complete Shopify checkout flow for HomeZone', milestoneId: 'm1' },
  { id: 15, title: 'Product Ingestion Pipeline', area: 'showcase', initiative: 'launch', month: 'dec25', issues: ['PAL-1072'], description: 'Automated product feed sync from Shopify', milestoneId: 'm1' },
  { id: 16, title: 'Shopify Self-Serve Onboarding', area: 'showcase', initiative: 'selfserve', month: 'dec25', issues: ['PAL-1121'], description: 'Enable retailers to self-setup via OAuth and auto product sync', milestoneId: null },
  { id: 17, title: 'Storis Integration Plan', area: 'showcase', initiative: 'selfserve', month: 'dec25', issues: ['PAL-1092'], description: 'Technical planning for Storis POS/ERP connection', milestoneId: 'm7' },
  { id: 78, title: 'Session & Projects Management', area: 'showcase', initiative: 'launch', month: 'dec25', issues: ['PAL-926', 'PAL-978', 'PAL-979'], description: 'Projects page for customers to manage Vinci sessions', milestoneId: 'm1' },
  { id: 18, title: 'Vision-Enhanced Recommender', area: 'showcase', initiative: 'ai', month: 'jan26', issues: ['PAL-912'], description: 'Cross-role beam search with GPT-4V integration', milestoneId: null },
  { id: 19, title: 'Wonder Embed Buttons', area: 'showcase', initiative: 'launch', month: 'feb26', issues: ['PAL-1096'], description: 'Deploy standardized embed buttons on Wonder client PDPs', milestoneId: 'm6' },
  { id: 82, title: 'Public Showcase Sandbox', area: 'showcase', initiative: 'selfserve', month: 'feb26', issues: [], description: 'No-signup demo on palazzo.ai where visitors can try staging', milestoneId: null },
  { id: 20, title: 'Storis API Integration', area: 'showcase', initiative: 'selfserve', month: 'mar26', issues: ['PAL-1092'], description: 'Complete Storis POS/ERP integration for product sync', milestoneId: 'm7' },
  { id: 21, title: 'Storis Checkout Handoff', area: 'showcase', initiative: 'selfserve', month: 'mar26', issues: [], description: 'Seamless checkout transition to Storis POS', milestoneId: 'm7' },
  { id: 22, title: 'PIM Integrations', area: 'showcase', initiative: 'selfserve', month: 'apr26', issues: [], description: 'Enable enterprise retailers to sync from Salsify, Syndigo', milestoneId: null },
  { id: 23, title: 'Conversation Recording', area: 'showcase', initiative: 'commerce', month: 'oct26', issues: [], description: 'Audio capture and transcription for showroom conversations', milestoneId: 'm12' },
  { id: 24, title: 'Sales Coaching Dashboard', area: 'showcase', initiative: 'commerce', month: 'oct26', issues: [], description: 'Manager dashboard for reviewing and coaching sales reps', milestoneId: 'm12' },
  
  // Studio
  { id: 25, title: 'Brand Image Upload & Extraction', area: 'studio', initiative: 'enterprise', month: 'jan26', issues: ['PAL-1138'], description: 'Upload brand images and extract style DNA', milestoneId: 'm3' },
  { id: 26, title: 'Room Scale System', area: 'studio', initiative: 'enterprise', month: 'jan26', issues: ['PAL-1141'], description: 'White canvas mode with accurate room dimensions', milestoneId: 'm3' },
  { id: 27, title: 'Brand Style Application', area: 'studio', initiative: 'enterprise', month: 'jan26', issues: ['PAL-1139'], description: 'Apply extracted brand aesthetics to any generated image', milestoneId: 'm3' },
  { id: 28, title: 'Basic Studio Canvas', area: 'studio', initiative: 'enterprise', month: 'jan26', issues: ['PAL-1144'], description: 'Core canvas UX with panels and controls', milestoneId: 'm3' },
  { id: 29, title: 'Inspo Style Transfer', area: 'studio', initiative: 'enterprise', month: 'feb26', issues: ['PAL-1140'], description: 'Extract mood/color/lighting from inspiration images', milestoneId: null },
  { id: 30, title: 'Direct PDP Publishing', area: 'studio', initiative: 'commerce', month: 'mar26', issues: ['PAL-1146'], description: 'One-click publish to Shopify, BigCommerce, Adobe Commerce', milestoneId: 'm8' },
  { id: 31, title: 'Social Media Export', area: 'studio', initiative: 'commerce', month: 'mar26', issues: ['PAL-1147'], description: 'Export to Instagram, Pinterest, Facebook with format presets', milestoneId: 'm8' },
  { id: 32, title: 'Auto-Hotspotting', area: 'studio', initiative: 'commerce', month: 'apr26', issues: ['PAL-1149'], description: 'Automatically detect and tag products in images', milestoneId: 'm8' },
  { id: 33, title: 'Variant-Aware Rendering', area: 'studio', initiative: 'enterprise', month: 'apr26', issues: ['PAL-1150'], description: 'Switch fabric/finish without regenerating layout', milestoneId: null },
  { id: 34, title: 'Studio Collaboration', area: 'studio', initiative: 'enterprise', month: 'may26', issues: ['PAL-1164', 'PAL-1165'], description: 'Shareable scene boards, commenting, teammate invites', milestoneId: null },
  { id: 35, title: 'Auto-Scene Generator', area: 'studio', initiative: 'enterprise', month: 'may26', issues: ['PAL-1152'], description: 'Automatically generate room scenes using brand catalog', milestoneId: null },
  { id: 36, title: 'Canva Export', area: 'studio', initiative: 'commerce', month: 'jun26', issues: ['PAL-1148'], description: 'Open image directly in Canva design editor', milestoneId: null },
  { id: 37, title: 'Batch Publishing Pipelines', area: 'studio', initiative: 'enterprise', month: 'jul26', issues: ['PAL-1153'], description: 'Scheduled, automated publishing of thousands of images', milestoneId: 'm11' },
  { id: 38, title: 'AI QA Reviewer', area: 'studio', initiative: 'enterprise', month: 'jul26', issues: ['PAL-1155'], description: 'Auto-detect brand standard violations and suggest fixes', milestoneId: 'm11' },
  { id: 39, title: 'Studio API (Headless)', area: 'studio', initiative: 'enterprise', month: 'aug26', issues: ['PAL-1163'], description: 'RESTful API for programmatic access to Studio', milestoneId: null },
  
  // Platform
  { id: 40, title: 'Widget SDK & Infrastructure', area: 'platform', initiative: 'embed', month: 'jan26', issues: ['PAL-1171', 'PAL-1172', 'PAL-1173'], description: 'Core embed infrastructure: widget.js loader, modal container, postMessage bridge', milestoneId: 'm2' },
  { id: 41, title: 'Partner Auth & Documentation', area: 'platform', initiative: 'embed', month: 'jan26', issues: ['PAL-1177', 'PAL-1185'], description: 'Server-side token generation, integration docs, TypeScript definitions', milestoneId: 'm2' },
  { id: 42, title: 'Maxa Embed UI', area: 'platform', initiative: 'launch', month: 'feb26', issues: ['PAL-1174'], description: 'Embed-optimized Palazzo interface for Maxa', milestoneId: 'm5' },
  { id: 43, title: 'Source Image Loading', area: 'platform', initiative: 'launch', month: 'feb26', issues: ['PAL-1175'], description: 'Handle incoming images from Maxa canvas', milestoneId: 'm5' },
  { id: 44, title: 'Export to Canvas Action', area: 'platform', initiative: 'launch', month: 'feb26', issues: ['PAL-1176'], description: 'Send staged images back to Maxa editor', milestoneId: 'm5' },
  { id: 45, title: 'Sandbox & Test Tokens', area: 'platform', initiative: 'embed', month: 'feb26', issues: ['PAL-1186'], description: 'Testing environment for partner development', milestoneId: null },
  { id: 46, title: "Bob's Hosted Widget", area: 'platform', initiative: 'embed', month: 'mar26', issues: ['PAL-1122', 'PAL-1123'], description: "Retail widget for Bob's Discount Furniture", milestoneId: null },
  { id: 47, title: 'API Service Enhancements', area: 'platform', initiative: 'commerce', month: 'mar26', issues: ['PAL-1127', 'PAL-1134'], description: 'Per-image style params, staging levels, job recovery', milestoneId: null },
  { id: 75, title: 'PIM Adapter Framework', area: 'platform', initiative: 'selfserve', month: 'mar26', issues: [], description: 'Unified product data model with adapter interface', milestoneId: 'm7' },
  { id: 48, title: 'Maxa E2E Testing', area: 'platform', initiative: 'launch', month: 'apr26', issues: [], description: 'Full integration testing with Maxa staging environment', milestoneId: 'm9' },
  { id: 49, title: 'Maxa Production Rollout', area: 'platform', initiative: 'launch', month: 'apr26', issues: [], description: 'Gradual rollout to all Maxa users', milestoneId: 'm9' },
  { id: 76, title: 'Conversion Attribution Analytics', area: 'platform', initiative: 'commerce', month: 'apr26', issues: [], description: 'Track staging-to-sale conversions, A/B test styles', milestoneId: null },
  { id: 50, title: 'API Key Management', area: 'platform', initiative: 'embed', month: 'may26', issues: ['PAL-1183'], description: 'Generate and rotate partner secret keys', milestoneId: 'm10' },
  { id: 51, title: 'Partner Analytics Dashboard', area: 'platform', initiative: 'embed', month: 'may26', issues: ['PAL-1184'], description: 'Usage metrics, error rates, latency tracking', milestoneId: 'm10' },
  { id: 52, title: 'Partner Configuration UI', area: 'platform', initiative: 'embed', month: 'may26', issues: [], description: 'Allowed origins, branding, feature toggles', milestoneId: 'm10' },
  { id: 53, title: 'Public API Design', area: 'platform', initiative: 'embed', month: 'dec26', issues: [], description: 'API specification and documentation', milestoneId: 'm13' },
  { id: 54, title: 'API Versioning System', area: 'platform', initiative: 'embed', month: 'dec26', issues: [], description: 'Versioned endpoints with deprecation policy', milestoneId: 'm13' },
  
  // Admin
  { id: 55, title: 'Dynamic Tenant Config', area: 'admin', initiative: 'selfserve', month: 'dec25', issues: ['PAL-1074', 'PAL-1118'], description: 'Handle tenant branding and settings dynamically', milestoneId: 'm1' },
  { id: 56, title: 'Styles Management', area: 'admin', initiative: 'selfserve', month: 'dec25', issues: ['PAL-1088', 'PAL-1124'], description: 'Admin panel for creating and assigning staging styles', milestoneId: 'm1' },
  { id: 79, title: 'Super-Admin Dashboard', area: 'admin', initiative: 'selfserve', month: 'jan26', issues: [], description: 'Central dashboard for Palazzo team to manage all tenants', milestoneId: null },
  { id: 57, title: 'Demo Images Management', area: 'admin', initiative: 'selfserve', month: 'jan26', issues: ['PAL-1080', 'PAL-1082'], description: 'Admin interface for managing demo images per tenant', milestoneId: null },
  { id: 58, title: 'Permissions & Flags', area: 'admin', initiative: 'selfserve', month: 'jan26', issues: ['PAL-1125', 'PAL-1128'], description: 'Granular permission controls and feature flags', milestoneId: null },
  { id: 59, title: 'Usage Tracking', area: 'admin', initiative: 'commerce', month: 'feb26', issues: ['PAL-1115'], description: 'Track tenantId, storeId, mode for usage analytics', milestoneId: null },
  { id: 60, title: 'Automation Testing', area: 'admin', initiative: 'selfserve', month: 'feb26', issues: ['PAL-1190'], description: 'E2E testing for admin portal reliability', milestoneId: null },
  { id: 77, title: 'Interactive Onboarding', area: 'admin', initiative: 'selfserve', month: 'mar26', issues: [], description: 'In-app guided tutorials, video walkthroughs', milestoneId: null },
  { id: 80, title: 'Usage Analytics & Billing', area: 'admin', initiative: 'commerce', month: 'mar26', issues: [], description: 'Per-tenant usage dashboards, metering, billing integration', milestoneId: null },
  { id: 81, title: 'Ops & Support Tools', area: 'admin', initiative: 'selfserve', month: 'apr26', issues: [], description: 'Bulk operations, user impersonation, session debugging', milestoneId: null }
];

export const STORAGE_KEY = 'palazzo_timeline_data';
