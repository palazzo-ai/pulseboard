import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAreaColor, getAreaName, getMonthName, parseMonthId } from '../utils/helpers';

// ========== STATUS MAPPING ==========
const mapStatus = (state) => {
  if (!state) return 'not_started';
  const type = (state.type || '').toLowerCase();
  const name = (state.name || '').toLowerCase();
  if (type === 'completed' || name === 'done') return 'done';
  if (name === 'in review') return 'in_review';
  if (type === 'started' || name === 'in progress') return 'in_progress';
  if (name === 'blocked') return 'blocked';
  return 'not_started';
};

const STATUS_CONFIG = {
  done: { label: 'Done', color: '#16A34A', bg: '#F0FDF4' },
  in_review: { label: 'In Review', color: '#7C3AED', bg: '#F5F3FF' },
  in_progress: { label: 'In Progress', color: '#2563EB', bg: '#EFF6FF' },
  blocked: { label: 'Blocked', color: '#DC2626', bg: '#FEF2F2' },
  not_started: { label: 'Not Started', color: '#9CA3AF', bg: '#F3F4F6' },
};

const PRIORITY_ICONS = {
  0: { label: 'No priority', icon: '—', color: '#9CA3AF' },
  1: { label: 'Urgent', icon: '!!!', color: '#DC2626' },
  2: { label: 'High', icon: '!!', color: '#D97706' },
  3: { label: 'Medium', icon: '!', color: '#2563EB' },
  4: { label: 'Low', icon: '·', color: '#9CA3AF' },
};

// ========== DATE HELPERS ==========
/** Get the effective target date for a milestone — use targetDate if set, else last day of month */
const getMilestoneDate = (milestone) => {
  if (milestone.targetDate) return new Date(milestone.targetDate);
  const monthDate = parseMonthId(milestone.month);
  if (!monthDate) return null;
  // Last day of that month
  return new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
};

/** Format a date as "Mar 15, 2026" */
const formatDate = (date) => {
  if (!date) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/** Get countdown text and color relative to today */
const getCountdown = (date) => {
  if (!date) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffMs = target - now;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    return { text: `${abs}d overdue`, color: '#DC2626', urgent: true };
  }
  if (diffDays === 0) return { text: 'Due today', color: '#DC2626', urgent: true };
  if (diffDays <= 7) return { text: `${diffDays}d left`, color: '#DC2626', urgent: true };
  if (diffDays <= 30) return { text: `${diffDays}d left`, color: '#D97706', urgent: false };
  return { text: `${diffDays}d left`, color: '#6B7280', urgent: false };
};

// ========== PROGRESS BAR LEGEND ==========
const BarLegend = () => (
  <div className="flex items-center gap-3 text-[10px] text-slate-500">
    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Done</span>
    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />In Progress</span>
    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Blocked</span>
    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-200 inline-block" />Todo</span>
  </div>
);

// ========== PROGRESS RING ==========
const ProgressRing = ({ percent, size = 40, strokeWidth = 4, color = '#16A34A' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-500" />
    </svg>
  );
};

// ========== SEGMENTED PROGRESS BAR ==========
const SegmentedBar = ({ done, inProgress, blocked, total }) => {
  if (total === 0) return <div className="h-2 bg-slate-100 rounded-full w-full" />;
  const todo = total - done - inProgress - blocked;
  const pDone = (done / total) * 100;
  const pProgress = (inProgress / total) * 100;
  const pBlocked = (blocked / total) * 100;
  const pTodo = (todo / total) * 100;

  return (
    <div className="h-2 rounded-full overflow-hidden flex bg-slate-100 w-full">
      {pDone > 0 && <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${pDone}%` }} />}
      {pProgress > 0 && <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${pProgress}%` }} />}
      {pBlocked > 0 && <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${pBlocked}%` }} />}
      {pTodo > 0 && <div className="h-full bg-slate-200 transition-all duration-300" style={{ width: `${pTodo}%` }} />}
    </div>
  );
};

// ========== READINESS BADGE ==========
const ReadinessBadge = ({ status }) => {
  const config = {
    launched: { label: 'Launched', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
    on_track: { label: 'On Track', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    at_risk: { label: 'At Risk', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    needs_attention: { label: 'Needs Attention', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  };
  const c = config[status] || config.on_track;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border"
      style={{ color: c.color, backgroundColor: c.bg, borderColor: c.border }}>
      {c.label}
    </span>
  );
};

// ========== MAIN COMPONENT ==========
export default function LaunchReadiness({ opportunities, milestones, areas, clients = [], showNotification, onSaveOpportunity }) {
  const [issueData, setIssueData] = useState(null);
  const [linearLoading, setLinearLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  const [expandedClients, setExpandedClients] = useState(new Set());
  const [expandedMilestones, setExpandedMilestones] = useState(new Set());
  const [expandedOpps, setExpandedOpps] = useState(new Set());
  const [filterClient, setFilterClient] = useState('all');
  const [filterReadiness, setFilterReadiness] = useState('all');

  // Get milestones with clients
  const clientMilestones = useMemo(() =>
    milestones.filter(m => m.client), [milestones]
  );

  // Collect all issue identifiers from client-linked opportunities
  const allIssueIdentifiers = useMemo(() => {
    const milestoneIds = new Set(clientMilestones.map(m => m.id));
    const ids = [];
    opportunities.forEach(opp => {
      if (opp.milestoneId && milestoneIds.has(opp.milestoneId) && opp.issues?.length) {
        ids.push(...opp.issues);
      }
    });
    return [...new Set(ids)];
  }, [opportunities, clientMilestones]);

  // Fetch Linear data
  const fetchLinearData = useCallback(async () => {
    const apiKey = typeof window !== 'undefined' ? localStorage.getItem('pulseboard_linear_key') : null;
    if (!apiKey || allIssueIdentifiers.length === 0) {
      setIssueData(new Map());
      return;
    }

    setLinearLoading(true);
    try {
      const resp = await fetch('/api/launch-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linearApiKey: apiKey, issueIdentifiers: allIssueIdentifiers }),
      });
      const data = await resp.json();
      if (data.error) {
        showNotification?.(`Linear fetch error: ${data.error}`, 'error');
        setIssueData(new Map());
      } else {
        const map = new Map();
        (data.issues || []).forEach(issue => map.set(issue.identifier, issue));
        setIssueData(map);
        setLastFetched(new Date());
      }
    } catch (err) {
      showNotification?.(`Linear fetch failed: ${err.message}`, 'error');
      setIssueData(new Map());
    } finally {
      setLinearLoading(false);
    }
  }, [allIssueIdentifiers, showNotification]);

  useEffect(() => {
    fetchLinearData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute issue stats for a list of issue identifiers
  const getIssueStats = useCallback((issueIds) => {
    if (!issueData || !issueIds?.length) return { done: 0, inProgress: 0, blocked: 0, total: issueIds?.length || 0, percent: 0 };
    let done = 0, inProgress = 0, blocked = 0;
    issueIds.forEach(id => {
      const issue = issueData.get(id);
      if (!issue) return;
      const status = mapStatus(issue.state);
      if (status === 'done') done++;
      else if (status === 'in_progress' || status === 'in_review') inProgress++;
      else if (status === 'blocked') blocked++;
    });
    return { done, inProgress, blocked, total: issueIds.length, percent: issueIds.length > 0 ? Math.round((done / issueIds.length) * 100) : 0 };
  }, [issueData]);

  // Compute readiness for a milestone
  const getMilestoneReadiness = useCallback((milestoneId) => {
    const opps = opportunities.filter(o => o.milestoneId === milestoneId);
    if (opps.length === 0) return 'on_track';
    const allDone = opps.every(o => o.status === 'done');
    if (allDone) return 'launched';
    const blockedCount = opps.filter(o => o.status === 'blocked').length;
    const atRiskCount = opps.filter(o => o.atRisk).length;
    if (blockedCount > 0 || atRiskCount > 1) return 'at_risk';
    if (atRiskCount === 1) return 'needs_attention';
    return 'on_track';
  }, [opportunities]);

  // Compute readiness for a client
  const getClientReadiness = useCallback((clientId) => {
    const cms = clientMilestones.filter(m => m.client === clientId);
    const statuses = cms.map(m => getMilestoneReadiness(m.id));
    if (statuses.every(s => s === 'launched')) return 'launched';
    if (statuses.some(s => s === 'at_risk')) return 'at_risk';
    if (statuses.some(s => s === 'needs_attention')) return 'needs_attention';
    return 'on_track';
  }, [clientMilestones, getMilestoneReadiness]);

  // Client-level issue stats
  const getClientIssueStats = useCallback((clientId) => {
    const cms = clientMilestones.filter(m => m.client === clientId);
    const milestoneIds = new Set(cms.map(m => m.id));
    const allIds = [];
    opportunities.forEach(opp => {
      if (opp.milestoneId && milestoneIds.has(opp.milestoneId) && opp.issues?.length) {
        allIds.push(...opp.issues);
      }
    });
    return getIssueStats([...new Set(allIds)]);
  }, [clientMilestones, opportunities, getIssueStats]);

  // Build grouped data
  const groupedData = useMemo(() => {
    const clientIds = [...new Set(clientMilestones.map(m => m.client))];
    return clientIds.map(clientId => {
      const client = clients.find(c => c.id === clientId) || { id: clientId, name: clientId, color: '#6B7280', logo: '??' };
      const cms = clientMilestones.filter(m => m.client === clientId);
      const readiness = getClientReadiness(clientId);
      const stats = getClientIssueStats(clientId);
      return { client, milestones: cms, readiness, stats };
    });
  }, [clientMilestones, getClientReadiness, getClientIssueStats]);

  // Filter
  const filteredData = useMemo(() => {
    let data = groupedData;
    if (filterClient !== 'all') data = data.filter(d => d.client.id === filterClient);
    if (filterReadiness !== 'all') {
      data = data.map(d => ({
        ...d,
        milestones: d.milestones.filter(m => getMilestoneReadiness(m.id) === filterReadiness),
      })).filter(d => d.milestones.length > 0);
    }
    return data;
  }, [groupedData, filterClient, filterReadiness, getMilestoneReadiness]);

  // Summary stats
  const summary = useMemo(() => {
    const total = groupedData.length;
    const launched = groupedData.filter(d => d.readiness === 'launched').length;
    const onTrack = groupedData.filter(d => d.readiness === 'on_track').length;
    const atRisk = groupedData.filter(d => d.readiness === 'at_risk' || d.readiness === 'needs_attention').length;
    return { total, launched, onTrack, atRisk };
  }, [groupedData]);

  const toggleSet = (setter, id) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const hasLinearKey = typeof window !== 'undefined' && !!localStorage.getItem('pulseboard_linear_key');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Launch Readiness</h2>
          <p className="text-xs text-slate-500 mt-0.5">Client & partner launch progress with live Linear data</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            {linearLoading ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Fetching from Linear...
              </>
            ) : lastFetched ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Live · {lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </>
            ) : !hasLinearKey ? (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                No Linear key configured
              </>
            ) : null}
          </div>
          {/* Refresh */}
          <button onClick={fetchLinearData} disabled={linearLoading}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50">
            <svg className={`w-4 h-4 ${linearLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Client Launches', value: summary.total, color: '#6366F1', bg: '#EEF2FF' },
          { label: 'Launched', value: summary.launched, color: '#16A34A', bg: '#F0FDF4' },
          { label: 'On Track', value: summary.onTrack, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'At Risk', value: summary.atRisk, color: '#DC2626', bg: '#FEF2F2' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
            <div className="text-[10px] uppercase tracking-wide font-medium" style={{ color: card.color }}>{card.label}</div>
            <div className="text-2xl font-bold mt-1" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Filters & Legend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
            className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
            <option value="all">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterReadiness} onChange={e => setFilterReadiness(e.target.value)}
            className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
            <option value="all">All Statuses</option>
            <option value="launched">Launched</option>
            <option value="on_track">On Track</option>
            <option value="needs_attention">Needs Attention</option>
            <option value="at_risk">At Risk</option>
          </select>
        </div>
        <BarLegend />
      </div>

      {/* Client List */}
      <div className="space-y-3">
        {filteredData.map(({ client, milestones: cms, readiness, stats }) => {
          const isExpanded = expandedClients.has(client.id);
          // Find the nearest upcoming target date across this client's milestones
          const clientDates = cms.map(m => getMilestoneDate(m)).filter(Boolean).sort((a, b) => a - b);
          const nextDate = clientDates.find(d => d >= new Date()) || clientDates[clientDates.length - 1];
          const clientCountdown = nextDate ? getCountdown(nextDate) : null;
          return (
            <div key={client.id} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              {/* Client Header */}
              <button onClick={() => toggleSet(setExpandedClients, client.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left">
                {/* Expand chevron */}
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {/* Logo badge */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: client.color }}>
                  {client.logo}
                </div>
                {/* Client name & badge */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{client.name}</span>
                    <ReadinessBadge status={readiness} />
                    {clientCountdown && (
                      <span className="text-[10px] font-semibold" style={{ color: clientCountdown.color }}>
                        {clientCountdown.text}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {cms.length} milestone{cms.length !== 1 ? 's' : ''} · {stats.done}/{stats.total} issues done
                    {nextDate && <span className="text-slate-400"> · Next: {formatDate(nextDate)}</span>}
                  </div>
                </div>
                {/* Progress ring */}
                <div className="relative shrink-0">
                  <ProgressRing percent={stats.percent} size={44} strokeWidth={4}
                    color={readiness === 'launched' ? '#16A34A' : readiness === 'at_risk' ? '#DC2626' : '#2563EB'} />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700">
                    {stats.percent}%
                  </span>
                </div>
              </button>

              {/* Expanded: Milestones */}
              {isExpanded && (
                <div className="border-t border-slate-100">
                  {cms.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-400 italic">No milestones linked</div>
                  ) : cms.map(milestone => {
                    const mReadiness = getMilestoneReadiness(milestone.id);
                    const mOpps = opportunities.filter(o => o.milestoneId === milestone.id);
                    const mIssueIds = [];
                    mOpps.forEach(o => { if (o.issues?.length) mIssueIds.push(...o.issues); });
                    const mStats = getIssueStats([...new Set(mIssueIds)]);
                    const isMExpanded = expandedMilestones.has(milestone.id);
                    const mDate = getMilestoneDate(milestone);
                    const mCountdown = mReadiness !== 'launched' ? getCountdown(mDate) : null;

                    return (
                      <div key={milestone.id} className="border-b border-slate-50 last:border-b-0">
                        {/* Milestone Header */}
                        <button onClick={() => toggleSet(setExpandedMilestones, milestone.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 pl-12 hover:bg-slate-50 transition-colors text-left">
                          <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${isMExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-slate-800">{milestone.title}</span>
                              <ReadinessBadge status={mReadiness} />
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium"
                                style={{ color: getAreaColor(milestone.area), borderColor: getAreaColor(milestone.area) + '40', backgroundColor: getAreaColor(milestone.area) + '10' }}>
                                {getAreaName(milestone.area)}
                              </span>
                              <span className="text-[10px] text-slate-400">{mDate ? formatDate(mDate) : getMonthName(milestone.month)}</span>
                              {mCountdown && (
                                <span className="text-[10px] font-semibold" style={{ color: mCountdown.color }}>
                                  {mCountdown.text}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex-1 max-w-[200px]">
                                <SegmentedBar done={mStats.done} inProgress={mStats.inProgress} blocked={mStats.blocked} total={mStats.total} />
                              </div>
                              <span className="text-[10px] text-slate-500 tabular-nums">{mStats.done}/{mStats.total}</span>
                            </div>
                          </div>
                        </button>

                        {/* Expanded: Opportunities */}
                        {isMExpanded && (
                          <div className="bg-slate-50/50">
                            {mOpps.length === 0 ? (
                              <div className="px-4 py-3 pl-20 text-xs text-slate-400 italic">No opportunities linked</div>
                            ) : mOpps.map(opp => {
                              const oppStats = getIssueStats(opp.issues || []);
                              const isOppExpanded = expandedOpps.has(opp.id);
                              const blockers = (opp.blockedBy || []).map(bid => opportunities.find(o => o.id === bid)).filter(Boolean);

                              return (
                                <div key={opp.id} className="border-b border-slate-100 last:border-b-0">
                                  {/* Opportunity Row */}
                                  <button onClick={() => toggleSet(setExpandedOpps, opp.id)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 pl-20 hover:bg-white/60 transition-colors text-left">
                                    <svg className={`w-3 h-3 text-slate-400 transition-transform shrink-0 ${isOppExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-medium text-slate-700">{opp.title}</span>
                                        {opp.atRisk && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium">At Risk</span>
                                        )}
                                        {opp.status === 'blocked' && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium">Blocked</span>
                                        )}
                                        {opp.status === 'done' && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 font-medium">Done</span>
                                        )}
                                      </div>
                                      {blockers.length > 0 && (
                                        <div className="text-[10px] text-red-500 mt-0.5">
                                          Blocked by: {blockers.map(b => b.title).join(', ')}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <div className="w-24">
                                        <SegmentedBar done={oppStats.done} inProgress={oppStats.inProgress} blocked={oppStats.blocked} total={oppStats.total} />
                                      </div>
                                      <span className="text-[10px] text-slate-500 tabular-nums w-8 text-right">
                                        {(opp.issues || []).length > 0 ? `${oppStats.done}/${oppStats.total}` : ''}
                                      </span>
                                    </div>
                                  </button>

                                  {/* Expanded: Issues */}
                                  {isOppExpanded && (
                                    <div className="bg-white/80 border-t border-slate-100">
                                      {(!opp.issues || opp.issues.length === 0) ? (
                                        <div className="px-4 py-2.5 pl-28 text-xs text-slate-400 italic">No issues linked</div>
                                      ) : (
                                        <div className="divide-y divide-slate-50">
                                          {[...(opp.issues || [])].sort((a, b) => {
                                            // Sort: blocked first, then in_progress, then not_started, then done
                                            const order = { blocked: 0, in_progress: 1, in_review: 1, not_started: 2, done: 3 };
                                            const issueA = issueData?.get(a);
                                            const issueB = issueData?.get(b);
                                            const sA = issueA ? mapStatus(issueA.state) : 'not_started';
                                            const sB = issueB ? mapStatus(issueB.state) : 'not_started';
                                            return (order[sA] ?? 2) - (order[sB] ?? 2);
                                          }).map(identifier => {
                                            const issue = issueData?.get(identifier);
                                            const status = issue ? mapStatus(issue.state) : 'not_started';
                                            const statusConf = STATUS_CONFIG[status];
                                            const priorityConf = PRIORITY_ICONS[issue?.priority] || PRIORITY_ICONS[0];

                                            return (
                                              <div key={identifier} className="flex items-center gap-3 px-4 py-2 pl-28 hover:bg-slate-50/50">
                                                {/* Identifier */}
                                                <a href={issue?.url || `https://linear.app/palazzo-ai/issue/${identifier}`}
                                                  target="_blank" rel="noopener noreferrer"
                                                  className="text-[10px] font-mono text-indigo-600 hover:text-indigo-800 hover:underline shrink-0 w-16">
                                                  {identifier}
                                                </a>
                                                {/* Title */}
                                                <span className="text-xs text-slate-700 flex-1 min-w-0 truncate">
                                                  {issue?.title || <span className="text-slate-400 italic">Loading...</span>}
                                                </span>
                                                {/* Priority */}
                                                <span className="text-[10px] font-bold shrink-0" style={{ color: priorityConf.color }}>
                                                  {priorityConf.icon}
                                                </span>
                                                {/* Assignee */}
                                                {issue?.assignee && (
                                                  <span className="text-[10px] text-slate-500 shrink-0 max-w-[80px] truncate">{issue.assignee}</span>
                                                )}
                                                {/* Status badge */}
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                                                  style={{ color: statusConf.color, backgroundColor: statusConf.bg }}>
                                                  {statusConf.label}
                                                </span>
                                                {/* Linear link */}
                                                <a href={issue?.url || `https://linear.app/palazzo-ai/issue/${identifier}`}
                                                  target="_blank" rel="noopener noreferrer"
                                                  className="text-slate-400 hover:text-indigo-600 shrink-0">
                                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                  </svg>
                                                </a>
                                                {/* Remove */}
                                                {onSaveOpportunity && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      const updatedOpp = { ...opp, issues: (opp.issues || []).filter(i => i !== identifier) };
                                                      onSaveOpportunity(updatedOpp);
                                                      showNotification?.(`Removed ${identifier} from ${opp.title}`);
                                                    }}
                                                    className="text-slate-300 hover:text-red-500 shrink-0 transition-colors"
                                                    title="Remove from launch">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <line x1="18" y1="6" x2="6" y2="18" strokeWidth={2} strokeLinecap="round" />
                                                      <line x1="6" y1="6" x2="18" y2="18" strokeWidth={2} strokeLinecap="round" />
                                                    </svg>
                                                  </button>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredData.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
            <p className="text-slate-400 text-sm">No client launches match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
