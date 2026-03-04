import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { getAreaColor, getAreaName } from '../utils/helpers';

const STATUS_MAP = {
  done: { label: 'Done', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
  in_progress: { label: 'In Progress', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  in_review: { label: 'In Review', color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
  not_started: { label: 'Not Started', color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
  blocked: { label: 'Blocked', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
};

const PRIORITY_ICONS = { 1: '!!!', 2: '!!', 3: '!', 4: '·' };
const PRIORITY_COLORS = { 1: '#DC2626', 2: '#D97706', 3: '#2563EB', 4: '#9CA3AF' };

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

export default function IssueMapping({ opportunities, onSaveOpportunity, showNotification }) {
  const [allLinearIssues, setAllLinearIssues] = useState(null);
  const [linearLoading, setLinearLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState('all');
  const [filterMapping, setFilterMapping] = useState('all');
  const [selectedIssues, setSelectedIssues] = useState(new Set());
  const [expandedOpps, setExpandedOpps] = useState(new Set());
  const [moveModalIssue, setMoveModalIssue] = useState(null);
  const [dragIssue, setDragIssue] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const searchRef = useRef(null);

  // Fetch all Linear issues on mount
  useEffect(() => {
    fetchLinearIssues();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLinearIssues = async () => {
    const apiKey = localStorage.getItem('pulseboard_linear_key');
    if (!apiKey) {
      setAllLinearIssues([]);
      return;
    }
    setLinearLoading(true);
    try {
      const resp = await fetch('/api/fetch-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linearApiKey: apiKey }),
      });
      const data = await resp.json();
      if (data.error) {
        showNotification?.(`Linear fetch error: ${data.error}`, 'warning');
        setAllLinearIssues([]);
      } else {
        setAllLinearIssues(data.issues || []);
      }
    } catch (err) {
      showNotification?.(`Linear fetch failed: ${err.message}`, 'warning');
      setAllLinearIssues([]);
    } finally {
      setLinearLoading(false);
    }
  };

  // Build issue → opportunity mapping
  const issueToOpp = useMemo(() => {
    const map = {};
    opportunities.forEach(opp => {
      (opp.issues || []).forEach(iid => { map[iid] = opp.id; });
    });
    return map;
  }, [opportunities]);

  // Enrich issues with mapping status
  const allIssues = useMemo(() => {
    if (!allLinearIssues) return [];
    return allLinearIssues.map(issue => ({
      ...issue,
      teamName: issue.team?.name || null,
      opportunityId: issueToOpp[issue.identifier] || null,
      opportunity: issueToOpp[issue.identifier]
        ? opportunities.find(o => o.id === issueToOpp[issue.identifier])
        : null,
      mappedStatus: mapStatus(issue.state),
    }));
  }, [allLinearIssues, issueToOpp, opportunities]);

  // Filtered + searched issues
  const filteredIssues = useMemo(() => {
    let list = allIssues;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i =>
        i.identifier.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        (i.assignee || '').toLowerCase().includes(q)
      );
    }
    if (filterTeam !== 'all') {
      list = list.filter(i => i.teamName === filterTeam);
    }
    if (filterMapping === 'mapped') list = list.filter(i => i.opportunityId);
    if (filterMapping === 'orphaned') list = list.filter(i => !i.opportunityId);
    // Sort: orphaned first, then by priority
    list = [...list].sort((a, b) => {
      if (!a.opportunityId && b.opportunityId) return -1;
      if (a.opportunityId && !b.opportunityId) return 1;
      return (a.priority || 9) - (b.priority || 9);
    });
    return list;
  }, [allIssues, searchQuery, filterTeam, filterMapping]);

  const teams = useMemo(() => [...new Set(allIssues.map(i => i.teamName).filter(Boolean))].sort(), [allIssues]);

  const stats = useMemo(() => ({
    total: allIssues.length,
    mapped: allIssues.filter(i => i.opportunityId).length,
    orphaned: allIssues.filter(i => !i.opportunityId).length,
  }), [allIssues]);

  // --- Actions ---
  const unlinkIssue = useCallback((identifier) => {
    const oppId = issueToOpp[identifier];
    if (!oppId) return;
    const opp = opportunities.find(o => o.id === oppId);
    if (!opp) return;
    onSaveOpportunity({ ...opp, issues: opp.issues.filter(i => i !== identifier) });
    showNotification?.(`Unlinked ${identifier}`);
  }, [issueToOpp, opportunities, onSaveOpportunity, showNotification]);

  const linkIssue = useCallback((identifier, targetOppId) => {
    // Unlink from current opp if any
    const currentOppId = issueToOpp[identifier];
    if (currentOppId) {
      const oldOpp = opportunities.find(o => o.id === currentOppId);
      if (oldOpp) onSaveOpportunity({ ...oldOpp, issues: oldOpp.issues.filter(i => i !== identifier) });
    }
    // Link to new opp
    const targetOpp = opportunities.find(o => o.id === targetOppId);
    if (!targetOpp) return;
    onSaveOpportunity({ ...targetOpp, issues: [...new Set([...(targetOpp.issues || []), identifier])] });
    showNotification?.(`Linked ${identifier} → ${targetOpp.title}`);
  }, [issueToOpp, opportunities, onSaveOpportunity, showNotification]);

  const bulkLink = useCallback((oppId) => {
    if (selectedIssues.size === 0) return;
    // Unlink all selected from their current opps
    const affectedOpps = new Map();
    selectedIssues.forEach(identifier => {
      const currentOppId = issueToOpp[identifier];
      if (currentOppId && currentOppId !== oppId) {
        if (!affectedOpps.has(currentOppId)) {
          affectedOpps.set(currentOppId, { ...opportunities.find(o => o.id === currentOppId) });
        }
        const opp = affectedOpps.get(currentOppId);
        opp.issues = opp.issues.filter(i => !selectedIssues.has(i));
      }
    });
    affectedOpps.forEach(opp => onSaveOpportunity(opp));
    // Link all to target
    const targetOpp = opportunities.find(o => o.id === oppId);
    if (!targetOpp) return;
    onSaveOpportunity({ ...targetOpp, issues: [...new Set([...(targetOpp.issues || []), ...selectedIssues])] });
    showNotification?.(`Linked ${selectedIssues.size} issues → ${targetOpp.title}`);
    setSelectedIssues(new Set());
  }, [selectedIssues, issueToOpp, opportunities, onSaveOpportunity, showNotification]);

  const toggleSelect = (id) => {
    setSelectedIssues(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleExpand = (id) => {
    setExpandedOpps(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Escape') { setSelectedIssues(new Set()); setMoveModalIssue(null); setSearchQuery(''); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const hasLinearKey = !!localStorage.getItem('pulseboard_linear_key');

  // --- Issue Row ---
  const IssueRow = ({ issue, showOpp = false, compact = false }) => {
    const sc = STATUS_MAP[issue.mappedStatus] || STATUS_MAP.not_started;
    const isSelected = selectedIssues.has(issue.identifier);
    const isDragging = dragIssue === issue.identifier;

    return (
      <div
        draggable
        onDragStart={(e) => { setDragIssue(issue.identifier); e.dataTransfer.effectAllowed = 'move'; }}
        onDragEnd={() => setDragIssue(null)}
        className={`flex items-center gap-2 px-3 py-2 border-b border-slate-50 last:border-b-0 transition-all group cursor-grab active:cursor-grabbing ${
          isDragging ? 'opacity-30 scale-[0.98]' : ''
        } ${isSelected ? 'bg-indigo-50/60 border-l-2 border-l-indigo-400' : 'hover:bg-slate-50/80'}`}
      >
        <button onClick={(e) => { e.stopPropagation(); toggleSelect(issue.identifier); }}
          className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
            isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 hover:border-indigo-400'
          }`}>
          {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
        </button>

        <span className="text-xs flex-shrink-0 w-4 font-bold" style={{ color: PRIORITY_COLORS[issue.priority] || '#9CA3AF' }}
          title={issue.priorityLabel}>{PRIORITY_ICONS[issue.priority] || '·'}</span>

        <span className="text-[11px] font-mono text-slate-400 flex-shrink-0 w-[68px]">{issue.identifier}</span>

        <span className={`text-slate-700 flex-1 min-w-0 truncate ${compact ? 'text-xs' : 'text-sm'}`}>{issue.title}</span>

        {showOpp && issue.opportunity && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 max-w-[140px] truncate"
            style={{ backgroundColor: getAreaColor(issue.opportunity.area) + '12', color: getAreaColor(issue.opportunity.area), border: `1px solid ${getAreaColor(issue.opportunity.area)}25` }}>
            {issue.opportunity.title}
          </span>
        )}

        <span className="text-[10px] text-slate-400 flex-shrink-0 w-14 text-right">{issue.teamName || '—'}</span>
        <span className="text-[10px] text-slate-400 flex-shrink-0 w-16 truncate text-right">{issue.assignee || '—'}</span>

        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 w-[72px] text-center"
          style={{ backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
          {issue.state?.name || 'Unknown'}
        </span>

        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {issue.opportunityId ? (
            <>
              <button onClick={() => setMoveModalIssue(issue)} className="p-1 text-slate-400 hover:text-indigo-500 rounded" title="Move to another opportunity">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
              <button onClick={() => unlinkIssue(issue.identifier)} className="p-1 text-slate-400 hover:text-red-500 rounded" title="Unlink">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </>
          ) : (
            <button onClick={() => setMoveModalIssue(issue)} className="p-1 text-slate-400 hover:text-emerald-500 rounded" title="Link to opportunity">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          )}
          <a href={issue.url || `https://linear.app/palazzo-ai/issue/${issue.identifier}`} target="_blank" rel="noopener noreferrer"
            className="p-1 text-slate-300 hover:text-indigo-500 rounded" title="Open in Linear">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>
      </div>
    );
  };

  // --- Opportunity Group (left panel) ---
  const OppGroup = ({ opp }) => {
    const oppIssues = allIssues.filter(i => i.opportunityId === opp.id);
    const isExpanded = expandedOpps.has(opp.id);
    const isDropTgt = dropTarget === opp.id;
    const doneCount = oppIssues.filter(i => i.mappedStatus === 'done').length;

    return (
      <div
        className={`rounded-lg border transition-all ${isDropTgt ? 'border-indigo-400 bg-indigo-50/40 shadow-md' : 'border-slate-200 bg-white'}`}
        onDragOver={(e) => { e.preventDefault(); setDropTarget(opp.id); }}
        onDragLeave={() => setDropTarget(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDropTarget(null);
          if (dragIssue) {
            const currentOpp = issueToOpp[dragIssue];
            if (currentOpp && currentOpp !== opp.id) {
              // Move from one opp to another
              const oldOpp = opportunities.find(o => o.id === currentOpp);
              if (oldOpp) onSaveOpportunity({ ...oldOpp, issues: oldOpp.issues.filter(i => i !== dragIssue) });
              onSaveOpportunity({ ...opp, issues: [...new Set([...(opp.issues || []), dragIssue])] });
              showNotification?.(`Moved ${dragIssue} → ${opp.title}`);
            } else if (!currentOpp) {
              linkIssue(dragIssue, opp.id);
            }
          }
        }}
      >
        <button onClick={() => toggleExpand(opp.id)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50/50 transition-colors rounded-t-lg">
          <svg className={`w-3 h-3 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getAreaColor(opp.area) }} />
          <span className="text-sm font-medium text-slate-800 flex-1 min-w-0 truncate">{opp.title}</span>
          <span className="text-[10px] text-slate-400 flex-shrink-0">{doneCount}/{(opp.issues || []).length}</span>
          <div className="w-12 h-1.5 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${(opp.issues || []).length ? (doneCount / (opp.issues || []).length) * 100 : 0}%` }} />
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-slate-100">
            {oppIssues.length === 0 ? (
              <div className={`px-4 py-6 text-center text-xs transition-colors ${isDropTgt ? 'text-indigo-500' : 'text-slate-400'}`}>
                {isDropTgt ? 'Drop issue here to link' : 'No issues linked — drag issues here'}
              </div>
            ) : (
              oppIssues.map(issue => <IssueRow key={issue.identifier} issue={issue} compact />)
            )}
          </div>
        )}
      </div>
    );
  };

  // --- Move/Link Modal ---
  const MoveModal = () => {
    const [search, setSearch] = useState('');
    if (!moveModalIssue) return null;
    const filtered = opportunities.filter(o =>
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      (getAreaName(o.area) || '').toLowerCase().includes(search.toLowerCase())
    );
    const currentOppId = issueToOpp[moveModalIssue.identifier];

    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setMoveModalIssue(null)}>
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-[480px] max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="text-sm font-semibold text-slate-800">
              {currentOppId ? 'Move' : 'Link'} {moveModalIssue.identifier}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">{moveModalIssue.title}</div>
          </div>
          <div className="px-4 py-2 border-b border-slate-100">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400"
              placeholder="Search opportunities..." autoFocus />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map(opp => {
              const isCurrent = opp.id === currentOppId;
              return (
                <button key={opp.id} disabled={isCurrent}
                  onClick={() => {
                    linkIssue(moveModalIssue.identifier, opp.id);
                    setMoveModalIssue(null);
                  }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left border-b border-slate-50 transition-colors ${
                    isCurrent ? 'bg-slate-50 opacity-50 cursor-not-allowed' : 'hover:bg-indigo-50/50'
                  }`}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getAreaColor(opp.area) }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-800 truncate">{opp.title}</div>
                    <div className="text-[10px] text-slate-400">{getAreaName(opp.area)} · {(opp.issues || []).length} issues</div>
                  </div>
                  {isCurrent && <span className="text-[10px] text-slate-400 font-medium">Current</span>}
                </button>
              );
            })}
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 flex justify-end">
            <button onClick={() => setMoveModalIssue(null)} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1">Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  // --- Loading ---
  if (linearLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} />
          <p className="text-sm text-slate-400">Fetching issues from Linear...</p>
        </div>
      </div>
    );
  }

  // --- No Linear key ---
  if (!hasLinearKey) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Issue Mapping</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage which Linear issues belong to which opportunities</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <p className="text-slate-400 text-sm">Set your Linear API key in the Linear Sync modal to load issues.</p>
        </div>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Issue Mapping</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage which Linear issues belong to which opportunities</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIssues.size > 0 && (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
              <span className="text-xs font-medium text-indigo-700">{selectedIssues.size} selected</span>
              <select onChange={e => { if (e.target.value) bulkLink(Number(e.target.value) || e.target.value); e.target.value = ''; }}
                className="text-xs bg-white border border-indigo-200 rounded px-2 py-1 text-indigo-700 focus:outline-none">
                <option value="">Link to...</option>
                {opportunities.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
              </select>
              <button onClick={() => setSelectedIssues(new Set())} className="text-indigo-400 hover:text-indigo-600 text-xs">Clear</button>
            </div>
          )}
          <button onClick={fetchLinearIssues} disabled={linearLoading}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50" title="Refresh">
            <svg className={`w-4 h-4 ${linearLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats + Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          {[
            { label: 'Total', value: stats.total, color: '#334155' },
            { label: 'Mapped', value: stats.mapped, color: '#10B981' },
            { label: 'Orphaned', value: stats.orphaned, color: stats.orphaned > 0 ? '#D97706' : '#94A3B8' },
          ].map(s => (
            <div key={s.label} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg flex items-center gap-2">
              <span className="text-base font-bold" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input ref={searchRef} type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-64 text-sm bg-white border border-slate-200 rounded-lg pl-8 pr-8 py-1.5 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            placeholder="Search issues... ⌘K" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
        <select value={filterMapping} onChange={e => setFilterMapping(e.target.value)}
          className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20">
          <option value="all">All Issues</option>
          <option value="mapped">Mapped Only</option>
          <option value="orphaned">Orphaned Only</option>
        </select>
        <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
          className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20">
          <option value="all">All Teams</option>
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-5" style={{ height: 'calc(100vh - 280px)' }}>
        {/* Left: Opportunities */}
        <div className="w-[340px] flex-shrink-0 flex flex-col">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
            Opportunities ({opportunities.length})
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {[...opportunities]
              .sort((a, b) => {
                const aEmpty = (a.issues || []).length === 0 ? 1 : 0;
                const bEmpty = (b.issues || []).length === 0 ? 1 : 0;
                if (aEmpty !== bEmpty) return aEmpty - bEmpty;
                return a.title.localeCompare(b.title);
              })
              .map(opp => <OppGroup key={opp.id} opp={opp} />)
            }
          </div>
        </div>

        {/* Right: Issue list */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-2">
            {filterMapping === 'orphaned' ? 'Orphaned Issues' : filterMapping === 'mapped' ? 'Mapped Issues' : 'All Issues'}
            <span className="text-slate-400 font-normal">({filteredIssues.length})</span>
            {selectedIssues.size > 0 && <span className="text-indigo-500">· {selectedIssues.size} selected</span>}
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-100/60 rounded-t-lg border border-b-0 border-slate-200">
            <span className="w-4" />
            <span className="w-4" />
            <span className="w-[68px]">ID</span>
            <span className="flex-1">Title</span>
            <span className="w-14 text-right">Team</span>
            <span className="w-16 text-right">Assignee</span>
            <span className="w-[72px] text-center">Status</span>
            <span className="w-[70px]" />
          </div>

          <div className="flex-1 overflow-y-auto bg-white rounded-b-lg border border-slate-200">
            {filteredIssues.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-slate-400">
                {searchQuery ? 'No issues match your search' : 'No issues to show'}
              </div>
            ) : (
              filteredIssues.map(issue => (
                <IssueRow key={issue.identifier} issue={issue} showOpp={filterMapping !== 'mapped'} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Move/Link modal */}
      <MoveModal />
    </div>
  );
}
