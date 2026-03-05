import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CLIENTS } from '../utils/helpers';

// ============================================================
// LAUNCH READINESS v3 — Onboarding Checklist + P0 Blockers
// Fetches live data from Linear via /api/launch-data
// ============================================================

// --- Checklist Parser ---
function parseOnboardingChecklist(markdown) {
  if (!markdown) return { phases: [], totalChecked: 0, totalTasks: 0 };

  const phases = [];
  const sections = markdown.split(/^## /gm).filter(s => s.trim());

  for (const section of sections) {
    const lines = section.split('\n');
    const headerLine = lines[0].trim();
    if (!headerLine.match(/^[📋📞🏗🔍📦⚙🧪🚀🔬🎉]/)) continue;

    const phaseName = headerLine
      .replace(/^[📋📞🏗️🔍📦⚙️🧪🚀🔬🎉]\s*/, '')
      .replace(/\s*—.*$/, '')
      .trim();

    let checked = 0;
    let unchecked = 0;

    for (const line of lines) {
      const checkedMatch = line.match(/- \[X\]/gi);
      const uncheckedMatch = line.match(/- \[ \]/g);
      if (checkedMatch) checked += checkedMatch.length;
      if (uncheckedMatch) unchecked += uncheckedMatch.length;
    }

    const total = checked + unchecked;
    if (total > 0) {
      phases.push({
        name: phaseName,
        checked,
        total,
        pct: Math.round((checked / total) * 100),
        status: checked === total ? 'done' : checked > 0 ? 'in_progress' : 'not_started',
      });
    }
  }

  const totalChecked = phases.reduce((s, p) => s + p.checked, 0);
  const totalTasks = phases.reduce((s, p) => s + p.total, 0);

  return { phases, totalChecked, totalTasks };
}

// --- Constants ---
const PHASE_ICONS = {
  'Discovery': '📋',
  'Pre-Onboarding Call': '📞',
  'Set Up': '🏗️',
  'Pre-Ingestion (Sample Data)': '🔍',
  'Product Ingestion (Full Catalog)': '📦',
  'Tenant-Specific Flows': '⚙️',
  'Internal QA': '🧪',
  'Kickoff': '🚀',
  'Customer QA': '🔬',
  'Launch': '🎉',
};

const PHASE_STATUS_COLORS = {
  done: { color: '#10B981', bg: '#ECFDF5', label: 'Complete' },
  in_progress: { color: '#2563EB', bg: '#EFF6FF', label: 'In Progress' },
  not_started: { color: '#94A3B8', bg: '#F8FAFC', label: 'Not Started' },
};

const PRIORITY_ICONS = { 1: '🔴', 2: '🟠', 3: '🟡', 4: '🔵' };

const STATUS_COLORS = {
  'Done': '#10B981',
  'Deployed': '#10B981',
  'Post-Deploy QA': '#8B5CF6',
  'In Review': '#8B5CF6',
  'Ready For Deploy': '#8B5CF6',
  'In Progress': '#2563EB',
  'Todo': '#64748B',
  'Triage': '#94A3B8',
  'Backlog': '#94A3B8',
};

// Showcase clients for this view (subset of CLIENTS with linearLabel)
const SHOWCASE_CLIENTS = CLIENTS.filter(c =>
  ['homezone', 'mathis', 'atlantic', 'bel', 'hom', 'ashley'].includes(c.id)
);

// ============================================================
export default function LaunchReadiness({ showNotification }) {
  const [launchData, setLaunchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedClients, setExpandedClients] = useState(new Set());
  const [filterType, setFilterType] = useState('all');
  const [showArchivedBlockers, setShowArchivedBlockers] = useState(false);

  // Fetch launch data from Linear
  const fetchData = useCallback(async () => {
    const apiKey = typeof window !== 'undefined' ? localStorage.getItem('pulseboard_linear_key') : null;
    if (!apiKey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/launch-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linearApiKey: apiKey }),
      });
      const data = await resp.json();
      if (data.error) {
        showNotification?.(`Linear fetch error: ${data.error}`, 'error');
      } else {
        setLaunchData(data);
      }
    } catch (err) {
      showNotification?.(`Linear fetch failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Parse onboarding checklists → map by client
  const checklistsByClient = useMemo(() => {
    if (!launchData?.onboardingChecklists) return {};
    const map = {};
    for (const issue of launchData.onboardingChecklists) {
      // Extract client name from title: "ClientName - Tenant Onboarding Checklist" or similar
      const titleLower = issue.title.toLowerCase();
      const matched = SHOWCASE_CLIENTS.find(c =>
        titleLower.includes(c.name.toLowerCase()) ||
        titleLower.includes(c.linearLabel?.toLowerCase())
      );
      if (matched) {
        const parsed = parseOnboardingChecklist(issue.description);
        map[matched.id] = {
          issueId: issue.identifier,
          url: `https://linear.app/palazzo-ai/issue/${issue.identifier}`,
          ...parsed,
        };
      }
    }
    return map;
  }, [launchData]);

  // Group P0 blockers by client label
  const blockersByClient = useMemo(() => {
    if (!launchData?.p0Blockers) return {};
    const map = {};
    const crossClient = [];

    for (const issue of launchData.p0Blockers) {
      const matchedClients = [];
      for (const client of SHOWCASE_CLIENTS) {
        if (issue.labels.some(l => l.toLowerCase() === client.linearLabel?.toLowerCase())) {
          matchedClients.push(client.id);
        }
      }

      if (matchedClients.length === 0) {
        crossClient.push(issue);
      } else {
        // Track which other clients share this issue
        const sharedWith = matchedClients.length > 1 ? matchedClients : [];
        for (const clientId of matchedClients) {
          if (!map[clientId]) map[clientId] = [];
          map[clientId].push({
            ...issue,
            id: issue.identifier,
            status: issue.state?.name || 'Unknown',
            shared: sharedWith.filter(c => c !== clientId),
          });
        }
      }
    }

    map._crossClient = crossClient.map(issue => ({
      ...issue,
      id: issue.identifier,
      status: issue.state?.name || 'Unknown',
      affects: issue.labels.filter(l => l.toLowerCase().includes('impact') || l.toLowerCase().includes('all')),
    }));

    return map;
  }, [launchData]);

  // Self-serve issues
  const selfServeData = useMemo(() => {
    if (!launchData) return { spaces: [], studio: [] };
    return {
      spaces: (launchData.spacesIssues || []).map(i => ({
        ...i, id: i.identifier, status: i.state?.name || 'Unknown',
      })),
      studio: (launchData.studioIssues || []).map(i => ({
        ...i, id: i.identifier, status: i.state?.name || 'Unknown',
      })),
    };
  }, [launchData]);

  // Summary stats
  const summary = useMemo(() => {
    let totalPhases = 0, completedPhases = 0, totalTasks = 0, completedTasks = 0;
    Object.values(checklistsByClient).forEach(c => {
      c.phases.forEach(p => {
        totalPhases++;
        if (p.status === 'done') completedPhases++;
        totalTasks += p.total;
        completedTasks += p.checked;
      });
    });

    let activeBlockers = 0;
    Object.entries(blockersByClient).forEach(([key, arr]) => {
      if (key === '_crossClient') {
        activeBlockers += arr.filter(b => b.status !== 'Done' && b.status !== 'Deployed').length;
      } else {
        // Avoid double-counting shared blockers — count only if this is the first client
        const seen = new Set();
        arr.forEach(b => {
          if (!seen.has(b.id) && b.status !== 'Done' && b.status !== 'Deployed') {
            if (!b.shared || b.shared.length === 0) {
              activeBlockers++;
            } else {
              // Only count once for the first client alphabetically
              const allClients = [key, ...b.shared].sort();
              if (allClients[0] === key) activeBlockers++;
            }
          }
          seen.add(b.id);
        });
      }
    });

    return {
      tenantsOnboarding: Object.keys(checklistsByClient).length,
      totalTasks, completedTasks,
      totalPhases, completedPhases,
      activeBlockers,
    };
  }, [checklistsByClient, blockersByClient]);

  const toggle = (id) => setExpandedClients(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  // --- Phase Row ---
  const PhaseRow = ({ phase }) => {
    const sc = PHASE_STATUS_COLORS[phase.status];
    const icon = PHASE_ICONS[phase.name] || '📌';
    return (
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-50 last:border-b-0 hover:bg-slate-50/50">
        <span className="text-sm flex-shrink-0">{icon}</span>
        <span className="text-sm text-slate-700 flex-1 min-w-0">{phase.name}</span>
        <div className="w-32 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${phase.pct}%`, backgroundColor: sc.color }} />
            </div>
            <span className="text-[11px] text-slate-500 tabular-nums w-10 text-right">{phase.checked}/{phase.total}</span>
          </div>
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded flex-shrink-0 w-20 text-center"
          style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
      </div>
    );
  };

  // --- Blocker Issue Row ---
  const BlockerRow = ({ issue }) => {
    const color = STATUS_COLORS[issue.status] || '#94A3B8';
    const isDone = issue.status === 'Done' || issue.status === 'Deployed';
    return (
      <div className={`flex items-center gap-2.5 px-4 py-2 border-b border-slate-50 last:border-b-0 ${isDone ? 'opacity-50' : ''} group hover:bg-slate-50/50`}>
        <span className="text-xs flex-shrink-0">{PRIORITY_ICONS[issue.priority] || '·'}</span>
        <span className="text-[11px] font-mono text-slate-400 flex-shrink-0">{issue.id}</span>
        <span className={`text-sm flex-1 min-w-0 truncate ${isDone ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{issue.title}</span>
        {issue.shared && issue.shared.length > 0 && (
          <span className="text-[9px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">
            +{issue.shared.length} clients
          </span>
        )}
        {issue.assignee && <span className="text-[10px] text-slate-400 flex-shrink-0">{issue.assignee}</span>}
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ backgroundColor: color + '15', color }}>{issue.status}</span>
        <a href={issue.url || `https://linear.app/palazzo-ai/issue/${issue.id}`} target="_blank" rel="noopener noreferrer"
          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-indigo-500 transition-opacity flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      </div>
    );
  };

  // --- Client Card ---
  const ClientCard = ({ client }) => {
    const checklist = checklistsByClient[client.id];
    const blockers = blockersByClient[client.id] || [];
    const isExpanded = expandedClients.has(client.id);

    if (!checklist) return null;

    const totalChecked = checklist.phases.reduce((s, p) => s + p.checked, 0);
    const totalTasks = checklist.phases.reduce((s, p) => s + p.total, 0);
    const overallPct = totalTasks > 0 ? Math.round((totalChecked / totalTasks) * 100) : 0;
    const currentPhase = checklist.phases.find(p => p.status === 'in_progress') || checklist.phases[0];
    const activeBlockers = blockers.filter(b => b.status !== 'Done' && b.status !== 'Deployed');

    let statusLabel = 'On Track';
    let statusColor = '#2563EB';
    let statusBg = '#EFF6FF';
    if (overallPct === 100) { statusLabel = 'Ready'; statusColor = '#10B981'; statusBg = '#ECFDF5'; }
    else if (activeBlockers.length > 1) { statusLabel = 'At Risk'; statusColor = '#DC2626'; statusBg = '#FEF2F2'; }
    else if (activeBlockers.length === 1) { statusLabel = 'Needs Attention'; statusColor = '#D97706'; statusBg = '#FFFBEB'; }

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4 hover:shadow-md transition-shadow">
        <button onClick={() => toggle(client.id)}
          className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/30 transition-colors">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: client.color }}>
            {client.logo}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-bold text-slate-800">{client.name}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{ backgroundColor: statusBg, color: statusColor, border: `1px solid ${statusColor}30` }}>
                {statusLabel}
              </span>
              {activeBlockers.length > 0 && (
                <span className="text-[10px] text-red-500 font-medium">{activeBlockers.length} blocker{activeBlockers.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Phase: <span className="font-medium text-slate-700">{currentPhase?.name || 'N/A'}</span>
              <span className="text-slate-400 mx-1.5">·</span>
              {totalChecked}/{totalTasks} tasks
            </div>
          </div>
          <div className="w-40 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden flex">
                {checklist.phases.map((p, i) => (
                  <div key={i} className="h-full transition-all" title={`${p.name}: ${p.pct}%`}
                    style={{
                      width: `${(p.total / totalTasks) * 100}%`,
                      backgroundColor: PHASE_STATUS_COLORS[p.status].color,
                      opacity: p.status === 'done' ? 0.4 : p.status === 'in_progress' ? 0.85 : 0.15,
                    }} />
                ))}
              </div>
              <span className="text-sm font-bold text-slate-700 w-10 text-right">{overallPct}%</span>
            </div>
          </div>
          <span className="text-slate-400 text-sm ml-1">{isExpanded ? '▾' : '▸'}</span>
        </button>

        {isExpanded && (
          <div className="border-t border-slate-100">
            <div className="flex">
              <div className={`${blockers.length > 0 ? 'flex-1 border-r border-slate-100' : 'w-full'}`}>
                <div className="px-4 py-2 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Onboarding Phases</span>
                  <a href={checklist.url} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                    View in Linear
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                </div>
                {checklist.phases.map((phase, i) => (
                  <PhaseRow key={i} phase={phase} />
                ))}
              </div>
              {blockers.length > 0 && (
                <div className="w-[420px] flex-shrink-0">
                  <div className="px-4 py-2 bg-red-50/40 border-b border-slate-100">
                    <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wider">
                      Engineering Blockers ({activeBlockers.length} active)
                    </span>
                  </div>
                  {blockers.map(b => <BlockerRow key={b.id} issue={b} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- Self-Serve Section ---
  const SelfServeSection = ({ issues, name, color, logo, defaultExpanded }) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const done = issues.filter(i => i.status === 'Done' || i.status === 'Deployed').length;
    const inProgress = issues.filter(i => i.status === 'In Progress' || i.status === 'In Review' || i.status === 'Ready For Deploy').length;
    const pct = issues.length > 0 ? Math.round((done / issues.length) * 100) : 0;

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
        <button onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/30 transition-colors">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: color }}>
            {logo}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-800">{name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">Self-Serve</span>
            </div>
            <span className="text-xs text-slate-500">{done}/{issues.length} done · {inProgress} in progress</span>
          </div>
          <div className="w-32 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-sm font-bold text-slate-600">{pct}%</span>
            </div>
          </div>
          <span className="text-slate-400 text-sm">{expanded ? '▾' : '▸'}</span>
        </button>
        {expanded && (
          <div className="border-t border-slate-100">
            {issues.map(issue => <BlockerRow key={issue.id} issue={issue} />)}
          </div>
        )}
      </div>
    );
  };

  // --- No Linear key state ---
  if (!loading && !launchData) {
    const hasKey = typeof window !== 'undefined' && !!localStorage.getItem('pulseboard_linear_key');
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-sm text-slate-400">
            {hasKey ? 'Failed to load launch data from Linear.' : 'Set your Linear API key in settings to see launch readiness data.'}
          </p>
          {hasKey && (
            <button onClick={fetchData} className="mt-3 text-sm text-indigo-500 hover:text-indigo-700">
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} />
          <p className="text-sm text-slate-400">Parsing onboarding checklists from Linear...</p>
        </div>
      </div>
    );
  }

  const crossClientBlockers = blockersByClient._crossClient || [];

  return (
    <div>
      <div className="px-2 pt-2 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Launch Readiness</h1>
            <p className="text-sm text-slate-500 mt-0.5">Onboarding progress + engineering blockers per client</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              Live from Linear
            </div>
            <button onClick={fetchData}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700">
              <option value="all">All Launches</option>
              <option value="showcase">Showcase Tenants</option>
              <option value="selfserve">Self-Serve Products</option>
            </select>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Tenants Onboarding', value: summary.tenantsOnboarding, color: '#334155', bg: '#F8FAFC', border: '#E2E8F0' },
            { label: 'Tasks Complete', value: `${summary.completedTasks}/${summary.totalTasks}`, color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
            { label: 'Phases Done', value: `${summary.completedPhases}/${summary.totalPhases}`, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
            { label: 'Active Blockers', value: summary.activeBlockers, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
          ].map(s => (
            <div key={s.label} className="px-4 py-3 rounded-xl border" style={{ backgroundColor: s.bg, borderColor: s.border }}>
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs font-medium mt-0.5" style={{ color: s.color, opacity: 0.7 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-2 pb-8">
        {/* Cross-client P0s */}
        {(filterType === 'all' || filterType === 'showcase') && crossClientBlockers.length > 0 && (() => {
          const activeCross = crossClientBlockers.filter(b => b.status !== 'Done' && b.status !== 'Deployed');
          const archivedCross = crossClientBlockers.filter(b => b.status === 'Done' || b.status === 'Deployed');
          return (activeCross.length > 0 || archivedCross.length > 0) && (
            <div className="mb-6 bg-red-50/50 rounded-xl border border-red-200 p-4">
              <div className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">Cross-Client Platform Blockers</div>
              {activeCross.map(b => (
                <div key={b.id} className="flex items-center gap-2.5 py-1.5">
                  <span className="text-xs">{PRIORITY_ICONS[b.priority]}</span>
                  <span className="text-[11px] font-mono text-red-400">{b.id}</span>
                  <span className="text-sm text-red-700">{b.title}</span>
                  {b.affects && b.affects.length > 0 && (
                    <span className="text-[10px] text-red-400 flex-shrink-0">Affects: {b.affects.join(', ')}</span>
                  )}
                  {b.assignee && <span className="text-[10px] text-red-400 ml-auto">{b.assignee}</span>}
                  <span className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: (STATUS_COLORS[b.status] || '#94A3B8') + '15', color: STATUS_COLORS[b.status] || '#94A3B8' }}>
                    {b.status}
                  </span>
                </div>
              ))}
              {activeCross.length === 0 && (
                <div className="text-xs text-slate-400 italic py-1">No active cross-client blockers</div>
              )}
              {archivedCross.length > 0 && (
                <div className="mt-2 pt-2 border-t border-red-100">
                  <button onClick={() => setShowArchivedBlockers(!showArchivedBlockers)}
                    className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
                    <span>{showArchivedBlockers ? '▾' : '▸'}</span>
                    {archivedCross.length} resolved blocker{archivedCross.length !== 1 ? 's' : ''}
                  </button>
                  {showArchivedBlockers && (
                    <div className="mt-1.5 opacity-50">
                      {archivedCross.map(b => (
                        <div key={b.id} className="flex items-center gap-2.5 py-1.5">
                          <span className="text-xs">{PRIORITY_ICONS[b.priority]}</span>
                          <span className="text-[11px] font-mono text-red-400">{b.id}</span>
                          <span className="text-sm text-slate-400 line-through">{b.title}</span>
                          {b.assignee && <span className="text-[10px] text-slate-400 ml-auto">{b.assignee}</span>}
                          <span className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: (STATUS_COLORS[b.status] || '#94A3B8') + '15', color: STATUS_COLORS[b.status] || '#94A3B8' }}>
                            {b.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Showcase Clients */}
        {(filterType === 'all' || filterType === 'showcase') && (
          <>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">Showcase Tenants</div>
            {SHOWCASE_CLIENTS.map(c => <ClientCard key={c.id} client={c} />)}
          </>
        )}

        {/* Self-Serve Launches */}
        {(filterType === 'all' || filterType === 'selfserve') && (
          <>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-6 px-1">Self-Serve Product Launches</div>
            <SelfServeSection issues={selfServeData.spaces} name="Spaces Self-Serve" color="#7C3AED" logo="SP" defaultExpanded={false} />
            <SelfServeSection issues={selfServeData.studio} name="Studio Self-Serve" color="#D97706" logo="ST" defaultExpanded={false} />
          </>
        )}

        {/* Empty state */}
        {Object.keys(checklistsByClient).length === 0 && !loading && launchData && (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center mt-4">
            <p className="text-slate-400 text-sm">No onboarding checklists found in the "Showcase Onboarding" project</p>
          </div>
        )}
      </div>
    </div>
  );
}
