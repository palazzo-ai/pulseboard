// src/utils/helpers.js
// Pulseboard helper functions - combined with dynamic months & dependency support
// NOTE: areas and initiatives are defined here to avoid circular imports

// ========== STATUSES ==========
export const STATUSES = {
  not_started: { label: 'Not Started', color: '#9CA3AF', dotColor: '#D1D5DB', bgColor: '#F3F4F6' },
  in_progress: { label: 'In Progress', color: '#2563EB', dotColor: '#3B82F6', bgColor: '#EFF6FF' },
  done: { label: 'Done', color: '#16A34A', dotColor: '#22C55E', bgColor: '#F0FDF4' },
  blocked: { label: 'Blocked', color: '#DC2626', dotColor: '#EF4444', bgColor: '#FEF2F2' }
};

// ========== AREAS ==========
export const areas = [
  { id: 'visualizer', name: 'Visualizer', color: '#7C3AED' },
  { id: 'vinci', name: 'Vinci', color: '#059669' },
  { id: 'spaces', name: 'Spaces', color: '#0891B2' },
  { id: 'showcase', name: 'Showcase', color: '#D97706' },
  { id: 'studio', name: 'Studio', color: '#DB2777' },
  { id: 'platform', name: 'Platform', color: '#2563EB' },
  { id: 'admin', name: 'Admin', color: '#6B7280' }
];

// ========== INITIATIVES ==========
export const initiatives = [
  { id: 'launch', name: 'Launch Partner Commitments', color: '#D97706' },
  { id: 'selfserve', name: 'Self-Serve Scale', color: '#7C3AED' },
  { id: 'embed', name: 'Embed Everywhere', color: '#2563EB' },
  { id: 'ai', name: 'AI Model Excellence', color: '#DB2777' },
  { id: 'commerce', name: 'Commerce Enablement', color: '#059669' },
  { id: 'enterprise', name: 'Enterprise Content Scale', color: '#0891B2' }
];

// ========== DYNAMIC MONTHS ==========
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_ABBREV = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Get the quarter string for a given month (0-indexed)
 */
const getQuarterForMonth = (monthIndex) => {
  if (monthIndex < 3) return 'Q1';
  if (monthIndex < 6) return 'Q2';
  if (monthIndex < 9) return 'Q3';
  return 'Q4';
};

/**
 * Generate a month ID like "jan26" from date
 */
export const generateMonthId = (date) => {
  const monthAbbrev = MONTH_ABBREV[date.getMonth()];
  const yearShort = String(date.getFullYear()).slice(-2);
  return `${monthAbbrev}${yearShort}`;
};

/**
 * Generate month display name like "Jan '26"
 */
const generateMonthName = (date) => {
  const monthName = MONTH_NAMES[date.getMonth()];
  const yearShort = String(date.getFullYear()).slice(-2);
  return `${monthName} '${yearShort}`;
};

/**
 * Generate quarter string like "Q1 2026"
 */
const generateQuarter = (date) => {
  const quarter = getQuarterForMonth(date.getMonth());
  return `${quarter} ${date.getFullYear()}`;
};

/**
 * Generate an array of months for the timeline
 * @param {number} monthsBefore - How many months before current to include (default 1)
 * @param {number} monthsAfter - How many months after current to include (default 12)
 * @returns {Array} Array of month objects with id, name, quarter, current
 */
export const generateMonths = (monthsBefore = 1, monthsAfter = 12) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  const result = [];
  const startDate = new Date(currentYear, currentMonth - monthsBefore, 1);
  const totalMonths = monthsBefore + 1 + monthsAfter;
  
  for (let i = 0; i < totalMonths; i++) {
    const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    const isCurrent = date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    
    result.push({
      id: generateMonthId(date),
      name: generateMonthName(date),
      quarter: generateQuarter(date),
      current: isCurrent,
      year: date.getFullYear(),
      monthIndex: date.getMonth(),
    });
  }
  
  return result;
};

/**
 * Default months array - 1 month back, 12 months forward
 * Regenerated each time the module loads, so it stays current
 */
export const months = generateMonths(1, 12);

/**
 * Parse a month ID back to a Date object
 * @param {string} monthId - ID like "jan26"
 * @returns {Date|null}
 */
export const parseMonthId = (monthId) => {
  if (!monthId || monthId.length < 4) return null;
  
  const monthAbbrev = monthId.slice(0, 3).toLowerCase();
  const yearShort = monthId.slice(3);
  
  const monthIndex = MONTH_ABBREV.indexOf(monthAbbrev);
  if (monthIndex === -1) return null;
  
  // Assume 2000s for two-digit years
  const year = 2000 + parseInt(yearShort, 10);
  if (isNaN(year)) return null;
  
  return new Date(year, monthIndex, 1);
};

/**
 * Check if a month ID is in the past
 */
export const isMonthPast = (monthId) => {
  const date = parseMonthId(monthId);
  if (!date) return false;
  
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return date < currentMonthStart;
};

/**
 * Check if a month ID is the current month
 */
export const isMonthCurrent = (monthId) => {
  const date = parseMonthId(monthId);
  if (!date) return false;
  
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

/**
 * Get months between two month IDs (inclusive)
 */
export const getMonthsBetween = (startId, endId) => {
  const startDate = parseMonthId(startId);
  const endDate = parseMonthId(endId);
  if (!startDate || !endDate) return [];
  
  const result = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    result.push({
      id: generateMonthId(current),
      name: generateMonthName(current),
      quarter: generateQuarter(current),
      current: isMonthCurrent(generateMonthId(current)),
    });
    current.setMonth(current.getMonth() + 1);
  }
  
  return result;
};

// ========== COLOR/NAME HELPERS ==========

export const getInitiativeColor = (initiativeId) => {
  const initiative = initiatives.find(i => i.id === initiativeId);
  return initiative?.color || '#8b949e';
};

export const getAreaColor = (areaId) => {
  const area = areas.find(a => a.id === areaId);
  return area?.color || '#8b949e';
};

export const getAreaName = (areaId) => {
  const area = areas.find(a => a.id === areaId);
  return area?.name || 'Unknown';
};

export const getInitiativeName = (initiativeId) => {
  const initiative = initiatives.find(i => i.id === initiativeId);
  return initiative?.name || 'Unknown';
};

export const getMonthName = (monthId) => {
  const month = months.find(m => m.id === monthId);
  return month?.name || monthId;
};

export const getQuarters = () => [...new Set(months.map(m => m.quarter))];

export const getMonthsForQuarter = (quarter) => months.filter(m => m.quarter === quarter);

// ========== DATA CONVERSION ==========

// Ensure opportunity has all required fields (for backward compatibility)
export const ensureStatusFields = (opp) => ({
  ...opp,
  status: opp.status || 'not_started',
  atRisk: opp.atRisk || false,
  atRiskReason: opp.atRiskReason || '',
  impactScore: opp.impactScore ?? 50,
  effortScore: opp.effortScore ?? 50,
  blocks: opp.blocks || [],
  blockedBy: opp.blockedBy || []
});

// Convert DB row to app format
export const dbToOpportunity = (row) => ({
  id: row.id,
  title: row.title,
  area: row.area,
  initiative: row.initiative,
  month: row.month,
  description: row.description || '',
  milestoneId: row.milestone_id,
  issues: row.issues || [],
  status: row.status || 'not_started',
  atRisk: row.at_risk || false,
  atRiskReason: row.at_risk_reason || '',
  // Scoring fields
  impactScore: row.impact_score ?? 50,
  effortScore: row.effort_score ?? 50,
  // Dependency fields
  blocks: row.blocks || [],
  blockedBy: row.blocked_by || [],
  // Gantt date fields
  startDate: row.start_date || null,
  endDate: row.end_date || null,
  estimatedDays: row.estimated_days || null
});

// Convert app format to DB row
export const opportunityToDb = (opp) => ({
  id: opp.id,
  title: opp.title,
  area: opp.area,
  initiative: opp.initiative,
  month: opp.month,
  description: opp.description || '',
  milestone_id: opp.milestoneId,
  issues: opp.issues || [],
  status: opp.status || 'not_started',
  at_risk: opp.atRisk || false,
  at_risk_reason: opp.atRiskReason || '',
  // Scoring fields
  impact_score: opp.impactScore ?? 50,
  effort_score: opp.effortScore ?? 50,
  // Dependency fields
  blocks: opp.blocks || [],
  blocked_by: opp.blockedBy || [],
  // Gantt date fields
  start_date: opp.startDate || null,
  end_date: opp.endDate || null,
  estimated_days: opp.estimatedDays || null,
  updated_at: new Date().toISOString()
});

// Milestone conversions
export const dbToMilestone = (row) => ({
  id: row.id,
  title: row.title,
  area: row.area,
  month: row.month,
  description: row.description || '',
  targetDate: row.target_date || null
});

export const milestoneToDb = (m) => ({
  id: m.id,
  title: m.title,
  area: m.area,
  month: m.month,
  description: m.description || '',
  target_date: m.targetDate || null,
  updated_at: new Date().toISOString()
});

// ========== DEPENDENCY HELPERS ==========

/**
 * Add a blocking relationship between two opportunities
 */
export const addDependency = (blocker, blocked) => {
  const updatedBlocker = {
    ...blocker,
    blocks: [...new Set([...(blocker.blocks || []), blocked.id])]
  };
  const updatedBlocked = {
    ...blocked,
    blockedBy: [...new Set([...(blocked.blockedBy || []), blocker.id])]
  };
  return { blocker: updatedBlocker, blocked: updatedBlocked };
};

/**
 * Remove a blocking relationship between two opportunities
 */
export const removeDependency = (blocker, blocked) => {
  const updatedBlocker = {
    ...blocker,
    blocks: (blocker.blocks || []).filter(id => id !== blocked.id)
  };
  const updatedBlocked = {
    ...blocked,
    blockedBy: (blocked.blockedBy || []).filter(id => id !== blocker.id)
  };
  return { blocker: updatedBlocker, blocked: updatedBlocked };
};

/**
 * Get all opportunities that directly block the given opportunity
 */
export const getBlockers = (opportunity, allOpportunities) => {
  const blockerIds = opportunity.blockedBy || [];
  return allOpportunities.filter(o => blockerIds.includes(o.id));
};

/**
 * Get all opportunities directly blocked by the given opportunity
 */
export const getBlocked = (opportunity, allOpportunities) => {
  const blockedIds = opportunity.blocks || [];
  return allOpportunities.filter(o => blockedIds.includes(o.id));
};

/**
 * Check if completing opportunity A would unblock opportunity B
 */
export const wouldUnblock = (oppA, oppB) => {
  return (oppB.blockedBy || []).includes(oppA.id);
};

// ========== CLUSTERING HELPERS ==========

/**
 * Group opportunities into clusters based on:
 * 1. Same milestone (primary grouping)
 * 2. Explicit blocking dependencies
 */
export const computeClusters = (opportunities, milestones) => {
  const clusters = [];
  const assigned = new Set();

  // Pass 1: Group by milestone
  milestones.forEach(milestone => {
    const milestoneOpps = opportunities.filter(o => 
      o.milestoneId === milestone.id && !assigned.has(o.id)
    );
    
    if (milestoneOpps.length > 1) {
      const cluster = {
        id: `milestone-${milestone.id}`,
        type: 'milestone',
        label: milestone.title,
        color: getAreaColor(milestone.area),
        opportunities: milestoneOpps,
        totalImpact: milestoneOpps.reduce((sum, o) => sum + (o.impactScore ?? 50), 0) / milestoneOpps.length,
        totalEffort: milestoneOpps.reduce((sum, o) => sum + (o.effortScore ?? 50), 0) / milestoneOpps.length,
        atRiskCount: milestoneOpps.filter(o => o.atRisk).length,
        doneCount: milestoneOpps.filter(o => o.status === 'done').length,
      };
      clusters.push(cluster);
      milestoneOpps.forEach(o => assigned.add(o.id));
    }
  });

  // Pass 2: Group by explicit dependencies (connected components)
  const unassigned = opportunities.filter(o => !assigned.has(o.id));
  
  const visited = new Set();
  const findConnected = (opp, group) => {
    if (visited.has(opp.id)) return;
    visited.add(opp.id);
    group.push(opp);
    
    (opp.blocks || []).forEach(id => {
      const blocked = unassigned.find(o => o.id === id);
      if (blocked && !assigned.has(id)) findConnected(blocked, group);
    });
    
    (opp.blockedBy || []).forEach(id => {
      const blocker = unassigned.find(o => o.id === id);
      if (blocker && !assigned.has(id)) findConnected(blocker, group);
    });
  };

  unassigned.forEach(opp => {
    if (!visited.has(opp.id)) {
      const group = [];
      findConnected(opp, group);
      
      if (group.length > 1) {
        const cluster = {
          id: `deps-${group.map(o => o.id).join('-')}`,
          type: 'dependency',
          label: `${group.length} linked items`,
          color: '#6366f1',
          opportunities: group,
          totalImpact: group.reduce((sum, o) => sum + (o.impactScore ?? 50), 0) / group.length,
          totalEffort: group.reduce((sum, o) => sum + (o.effortScore ?? 50), 0) / group.length,
          atRiskCount: group.filter(o => o.atRisk).length,
          doneCount: group.filter(o => o.status === 'done').length,
        };
        clusters.push(cluster);
        group.forEach(o => assigned.add(o.id));
      }
    }
  });

  const standalone = opportunities.filter(o => !assigned.has(o.id));

  return { clusters, standalone };
};

/**
 * Get the center position for a cluster
 */
export const getClusterCenter = (cluster, getPosition) => {
  const positions = cluster.opportunities.map(o => getPosition(o));
  return {
    x: positions.reduce((sum, p) => sum + p.x, 0) / positions.length,
    y: positions.reduce((sum, p) => sum + p.y, 0) / positions.length
  };
};
