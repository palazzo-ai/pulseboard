import { areas, initiatives, months } from '../data/initialData';

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
  return month?.name || 'Unknown';
};

export const getQuarters = () => [...new Set(months.map(m => m.quarter))];

export const getMonthsForQuarter = (quarter) => months.filter(m => m.quarter === quarter);

// Ensure opportunity has status fields (for backward compatibility)
export const ensureStatusFields = (opp) => ({
  ...opp,
  status: opp.status || 'not_started',
  atRisk: opp.atRisk || false,
  atRiskReason: opp.atRiskReason || ''
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
  atRiskReason: row.at_risk_reason || ''
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
  updated_at: new Date().toISOString()
});

export const dbToMilestone = (row) => ({
  id: row.id,
  title: row.title,
  area: row.area,
  month: row.month,
  description: row.description || ''
});

export const milestoneToDb = (m) => ({
  id: m.id,
  title: m.title,
  area: m.area,
  month: m.month,
  description: m.description || '',
  updated_at: new Date().toISOString()
});
