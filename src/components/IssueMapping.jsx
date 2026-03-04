import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { areas, getAreaColor, getAreaName } from '../utils/helpers';

const STATUS_MAP = {
  done: { label: 'Done', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
  in_progress: { label: 'In Progress', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  in_review: { label: 'In Review', color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
  not_started: { label: 'Not Started', color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
  blocked: { label: 'Blocked', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
};

const PRIORITY_ICONS = { 1: '!!!', 2: '!!', 3: '!', 4: '·' };
const PRIORITY_COLORS = { 1: '#DC2626', 2: '#D97706', 3: '#2563EB', 4: '#9CA3AF' };

const STOP_WORDS = new Set(['the','a','an','and','or','for','to','in','of','with','on','at','by','is','it','as','from']);

/** Given an identifier, return [identifier, ...childIdentifiers] */
const resolveWithChildren = (identifier, allIssues) => {
  const issue = allIssues?.find(i => i.identifier === identifier);
  return [identifier, ...(issue?.children || [])];
};

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

/** Extract meaningful keywords from a title (>3 chars, no stop words) */
const extractKeywords = (title) => {
  if (!title) return [];
  return title.toLowerCase().split(/[\s\-_/]+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w))
    .map(w => w.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);
};

// ========== Inline autocomplete input ==========
const IssueAutocompleteInput = ({ allLinearIssues, onAdd, placeholder = 'PAL-1234 (Enter to add)' }) => {
  const [value, setValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const suggestions = useMemo(() => {
    if (!value.trim() || !allLinearIssues?.length) return [];
    const q = value.toLowerCase();
    return allLinearIssues
      .filter(i => i.identifier.toLowerCase().includes(q) || i.title.toLowerCase().includes(q))
      .slice(0, 5);
  }, [value, allLinearIssues]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const submit = (identifier) => {
    if (identifier) {
      onAdd(identifier);
      setValue('');
      setShowDropdown(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => { setValue(e.target.value.toUpperCase()); setShowDropdown(true); }}
        onFocus={() => setShowDropdown(true)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); submit(value.trim()); }
          if (e.key === 'Escape') setShowDropdown(false);
        }}
        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-xs font-mono focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
        placeholder={placeholder}
      />
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-[200px] overflow-y-auto">
          {suggestions.map(issue => {
            const sc = STATUS_MAP[mapStatus(issue.state)] || STATUS_MAP.not_started;
            return (
              <button key={issue.identifier} type="button"
                onClick={() => submit(issue.identifier)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-indigo-50/50 border-b border-slate-50 last:border-b-0">
                <span className="text-[10px] font-mono text-slate-500 flex-shrink-0 w-[60px]">{issue.identifier}</span>
                <span className="text-xs text-slate-700 flex-1 min-w-0 truncate">{issue.title}</span>
                <span className="text-[9px] font-medium px-1 py-0.5 rounded flex-shrink-0"
                  style={{ backgroundColor: sc.bg, color: sc.color }}>{issue.state?.name || '?'}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ========== Quick Link Dropdown (anchored, for orphaned issues) ==========
const QuickLinkDropdown = ({ issue, opportunities, onLink, onClose }) => {
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const filtered = opportunities.filter(o =>
    o.title.toLowerCase().includes(search.toLowerCase()) ||
    (getAreaName(o.area) || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 w-[280px] bg-white border border-slate-200 rounded-lg shadow-xl z-30 flex flex-col max-h-[300px]">
      <div className="px-2 py-1.5 border-b border-slate-100">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
          placeholder="Search opportunities..." autoFocus />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map(opp => (
          <button key={opp.id} onClick={() => { onLink(issue.identifier, opp.id); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-indigo-50/50 border-b border-slate-50 last:border-b-0">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getAreaColor(opp.area) }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-800 truncate">{opp.title}</div>
              <div className="text-[10px] text-slate-400">{getAreaName(opp.area)} · {(opp.issues || []).length} issues</div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && <div className="px-3 py-4 text-xs text-slate-400 text-center">No matches</div>}
      </div>
    </div>
  );
};

// ========== MAIN COMPONENT ==========
export default function IssueMapping({ opportunities, onSaveOpportunity, showNotification }) {
  const [allLinearIssues, setAllLinearIssues] = useState(null);
  const [linearLoading, setLinearLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState('all');
  const [filterMapping, setFilterMapping] = useState('all');
  const [selectedIssues, setSelectedIssues] = useState(new Set());
  const [expandedOpps, setExpandedOpps] = useState(new Set());
  const [expandedAreas, setExpandedAreas] = useState(new Set(areas.map(a => a.id)));
  const [moveModalIssue, setMoveModalIssue] = useState(null);
  const [quickLinkIssue, setQuickLinkIssue] = useState(null);
  const [dragIssue, setDragIssue] = useState(null);
  const [dragProject, setDragProject] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [oppSearch, setOppSearch] = useState('');
  const [selectedOppId, setSelectedOppId] = useState(null);
  const [expandedProjects, setExpandedProjects] = useState(new Set(['__all__']));
  const [filterProject, setFilterProject] = useState('all');
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

  // Smart suggestions: keywords from selected opp
  const selectedOppKeywords = useMemo(() => {
    if (!selectedOppId) return [];
    const opp = opportunities.find(o => o.id === selectedOppId);
    return opp ? extractKeywords(opp.title) : [];
  }, [selectedOppId, opportunities]);

  const suggestedIssueIds = useMemo(() => {
    if (selectedOppKeywords.length === 0) return new Set();
    const ids = new Set();
    allIssues.forEach(issue => {
      if (issue.opportunityId) return; // only orphaned
      const titleLower = issue.title.toLowerCase();
      const labelsLower = (issue.labels || []).join(' ').toLowerCase();
      if (selectedOppKeywords.some(kw => titleLower.includes(kw) || labelsLower.includes(kw))) {
        ids.add(issue.identifier);
      }
    });
    return ids;
  }, [selectedOppKeywords, allIssues]);

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
    if (filterProject !== 'all') {
      list = list.filter(i => (i.project || 'No Project') === filterProject);
    }
    // Sort: suggested first, then orphaned, then by priority
    list = [...list].sort((a, b) => {
      const aSugg = suggestedIssueIds.has(a.identifier) ? 0 : 1;
      const bSugg = suggestedIssueIds.has(b.identifier) ? 0 : 1;
      if (aSugg !== bSugg) return aSugg - bSugg;
      if (!a.opportunityId && b.opportunityId) return -1;
      if (a.opportunityId && !b.opportunityId) return 1;
      return (a.priority || 9) - (b.priority || 9);
    });
    return list;
  }, [allIssues, searchQuery, filterTeam, filterMapping, suggestedIssueIds]);

  const teams = useMemo(() => [...new Set(allIssues.map(i => i.teamName).filter(Boolean))].sort(), [allIssues]);
  const projects = useMemo(() => [...new Set(allIssues.map(i => i.project || 'No Project'))].sort((a, b) => {
    if (a === 'No Project') return 1;
    if (b === 'No Project') return -1;
    return a.localeCompare(b);
  }), [allIssues]);

  // Initialize expandedProjects with all projects when they first load
  useEffect(() => {
    if (projects.length > 0 && expandedProjects.has('__all__')) {
      setExpandedProjects(new Set(projects));
    }
  }, [projects]); // eslint-disable-line react-hooks/exhaustive-deps

  const groupedFilteredIssues = useMemo(() => {
    const groups = [];
    const byProject = {};
    filteredIssues.forEach(issue => {
      const proj = issue.project || 'No Project';
      if (!byProject[proj]) byProject[proj] = [];
      byProject[proj].push(issue);
    });
    // Sort project names, "No Project" last
    const sortedKeys = Object.keys(byProject).sort((a, b) => {
      if (a === 'No Project') return 1;
      if (b === 'No Project') return -1;
      return a.localeCompare(b);
    });
    sortedKeys.forEach(proj => {
      groups.push({ project: proj, issues: byProject[proj] });
    });
    return groups;
  }, [filteredIssues]);

  const stats = useMemo(() => ({
    total: allIssues.length,
    mapped: allIssues.filter(i => i.opportunityId).length,
    orphaned: allIssues.filter(i => !i.opportunityId).length,
  }), [allIssues]);

  // Filter + group opportunities for left panel
  const groupedOpportunities = useMemo(() => {
    let opps = opportunities;
    if (oppSearch) {
      const q = oppSearch.toLowerCase();
      opps = opps.filter(o => o.title.toLowerCase().includes(q));
    }
    // Group by area
    const groups = [];
    areas.forEach(area => {
      const areaOpps = opps.filter(o => o.area === area.id);
      if (areaOpps.length > 0) {
        // Sort: opps with issues first, then alphabetically
        areaOpps.sort((a, b) => {
          const aEmpty = (a.issues || []).length === 0 ? 1 : 0;
          const bEmpty = (b.issues || []).length === 0 ? 1 : 0;
          if (aEmpty !== bEmpty) return aEmpty - bEmpty;
          return a.title.localeCompare(b.title);
        });
        groups.push({ area, opps: areaOpps });
      }
    });
    return groups;
  }, [opportunities, oppSearch]);

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
    const allIds = resolveWithChildren(identifier, allLinearIssues);
    const currentOppId = issueToOpp[identifier];
    if (currentOppId) {
      const oldOpp = opportunities.find(o => o.id === currentOppId);
      if (oldOpp) onSaveOpportunity({ ...oldOpp, issues: oldOpp.issues.filter(i => !allIds.includes(i)) });
    }
    const targetOpp = opportunities.find(o => o.id === targetOppId);
    if (!targetOpp) return;
    onSaveOpportunity({ ...targetOpp, issues: [...new Set([...(targetOpp.issues || []), ...allIds])] });
    const subCount = allIds.length - 1;
    showNotification?.(`Linked ${identifier}${subCount > 0 ? ` + ${subCount} sub-issue${subCount > 1 ? 's' : ''}` : ''} → ${targetOpp.title}`);
  }, [issueToOpp, opportunities, onSaveOpportunity, showNotification, allLinearIssues]);

  const bulkLink = useCallback((oppId) => {
    if (selectedIssues.size === 0) return;
    // Resolve all selected + their children
    const allResolvedIds = new Set();
    selectedIssues.forEach(identifier => {
      resolveWithChildren(identifier, allLinearIssues).forEach(id => allResolvedIds.add(id));
    });
    const affectedOpps = new Map();
    allResolvedIds.forEach(identifier => {
      const currentOppId = issueToOpp[identifier];
      if (currentOppId && currentOppId !== oppId) {
        if (!affectedOpps.has(currentOppId)) {
          affectedOpps.set(currentOppId, { ...opportunities.find(o => o.id === currentOppId) });
        }
        const opp = affectedOpps.get(currentOppId);
        opp.issues = opp.issues.filter(i => !allResolvedIds.has(i));
      }
    });
    affectedOpps.forEach(opp => onSaveOpportunity(opp));
    const targetOpp = opportunities.find(o => o.id === oppId);
    if (!targetOpp) return;
    onSaveOpportunity({ ...targetOpp, issues: [...new Set([...(targetOpp.issues || []), ...allResolvedIds])] });
    showNotification?.(`Linked ${allResolvedIds.size} issues → ${targetOpp.title}`);
    setSelectedIssues(new Set());
  }, [selectedIssues, issueToOpp, opportunities, onSaveOpportunity, showNotification, allLinearIssues]);

  const linkProjectToOpp = useCallback((projectName, targetOppId) => {
    const projectIssues = allIssues.filter(i => (i.project || 'No Project') === projectName);
    if (projectIssues.length === 0) return;
    // Unlink from old opps
    const affectedOpps = new Map();
    projectIssues.forEach(issue => {
      const currentOppId = issue.opportunityId;
      if (currentOppId && currentOppId !== targetOppId) {
        if (!affectedOpps.has(currentOppId)) {
          affectedOpps.set(currentOppId, { ...opportunities.find(o => o.id === currentOppId) });
        }
        const opp = affectedOpps.get(currentOppId);
        opp.issues = opp.issues.filter(i => i !== issue.identifier);
      }
    });
    affectedOpps.forEach(opp => onSaveOpportunity(opp));
    const targetOpp = opportunities.find(o => o.id === targetOppId);
    if (!targetOpp) return;
    const newIds = projectIssues.map(i => i.identifier);
    onSaveOpportunity({ ...targetOpp, issues: [...new Set([...(targetOpp.issues || []), ...newIds])] });
    showNotification?.(`Linked ${projectIssues.length} issues from "${projectName}" → ${targetOpp.title}`);
  }, [allIssues, opportunities, onSaveOpportunity, showNotification]);

  const toggleSelect = (id) => {
    setSelectedIssues(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleExpand = (id) => {
    setExpandedOpps(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    // Track selected opp for smart suggestions
    setSelectedOppId(prev => prev === id ? null : id);
  };

  const toggleArea = (areaId) => {
    setExpandedAreas(prev => { const n = new Set(prev); n.has(areaId) ? n.delete(areaId) : n.add(areaId); return n; });
  };

  const toggleProject = (proj) => {
    setExpandedProjects(prev => { const n = new Set(prev); n.has(proj) ? n.delete(proj) : n.add(proj); return n; });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Escape') { setSelectedIssues(new Set()); setMoveModalIssue(null); setQuickLinkIssue(null); setSearchQuery(''); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const hasLinearKey = !!localStorage.getItem('pulseboard_linear_key');
  const selectedOpp = selectedOppId ? opportunities.find(o => o.id === selectedOppId) : null;

  // --- Issue Row ---
  const IssueRow = ({ issue, showOpp = false, compact = false, isSuggested = false }) => {
    const sc = STATUS_MAP[issue.mappedStatus] || STATUS_MAP.not_started;
    const isSelected = selectedIssues.has(issue.identifier);
    const isDragging = dragIssue === issue.identifier;
    const isQuickLinkOpen = quickLinkIssue === issue.identifier;

    return (
      <div
        draggable
        onDragStart={(e) => { setDragIssue(issue.identifier); e.dataTransfer.effectAllowed = 'move'; }}
        onDragEnd={() => setDragIssue(null)}
        className={`flex items-center gap-2 px-3 py-2 border-b border-slate-50 last:border-b-0 transition-all group cursor-grab active:cursor-grabbing ${
          isDragging ? 'opacity-30 scale-[0.98]' : ''
        } ${isSelected ? 'bg-indigo-50/60 border-l-2 border-l-indigo-400' : isSuggested ? 'bg-indigo-50/30 border-l-2 border-l-indigo-300' : 'hover:bg-slate-50/80'}`}
      >
        {/* Grip handle */}
        <span className="text-slate-300 group-hover:text-slate-400 flex-shrink-0 text-[10px] leading-none select-none" style={{ letterSpacing: '1px' }}>⠿</span>

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

        {isSuggested && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 flex-shrink-0">Suggested</span>
        )}

        {showOpp && issue.opportunity && !isSuggested && (
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

        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity relative">
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
            <>
              <button onClick={() => setQuickLinkIssue(isQuickLinkOpen ? null : issue.identifier)} className="p-1 text-slate-400 hover:text-emerald-500 rounded" title="Link to opportunity">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              {isQuickLinkOpen && (
                <QuickLinkDropdown issue={issue} opportunities={opportunities} onLink={linkIssue} onClose={() => setQuickLinkIssue(null)} />
              )}
            </>
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
    const isSelected = selectedOppId === opp.id;
    const doneCount = oppIssues.filter(i => i.mappedStatus === 'done').length;

    return (
      <div
        className={`rounded-lg border transition-all ${isDropTgt ? 'border-indigo-400 bg-indigo-50/40 shadow-md' : isSelected ? 'border-indigo-300 bg-indigo-50/20' : 'border-slate-200 bg-white'}`}
        onDragOver={(e) => { e.preventDefault(); setDropTarget(opp.id); }}
        onDragLeave={() => setDropTarget(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDropTarget(null);
          if (dragProject) {
            linkProjectToOpp(dragProject, opp.id);
            setDragProject(null);
          } else if (dragIssue) {
            const currentOpp = issueToOpp[dragIssue];
            if (currentOpp && currentOpp !== opp.id) {
              const allIds = resolveWithChildren(dragIssue, allLinearIssues);
              const oldOpp = opportunities.find(o => o.id === currentOpp);
              if (oldOpp) onSaveOpportunity({ ...oldOpp, issues: oldOpp.issues.filter(i => !allIds.includes(i)) });
              onSaveOpportunity({ ...opp, issues: [...new Set([...(opp.issues || []), ...allIds])] });
              const subCount = allIds.length - 1;
              showNotification?.(`Moved ${dragIssue}${subCount > 0 ? ` + ${subCount} sub-issue${subCount > 1 ? 's' : ''}` : ''} → ${opp.title}`);
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
              <div className={`px-4 py-4 text-center text-xs transition-colors ${isDropTgt ? 'text-indigo-500' : 'text-slate-400'}`}>
                {isDropTgt ? 'Drop issue here to link' : 'No issues linked — drag or add below'}
              </div>
            ) : (
              oppIssues.map(issue => <IssueRow key={issue.identifier} issue={issue} compact />)
            )}
            {/* Quick-assign input */}
            <div className="px-3 py-2 border-t border-slate-50">
              <IssueAutocompleteInput
                allLinearIssues={allLinearIssues}
                onAdd={(identifier) => linkIssue(identifier, opp.id)}
                placeholder="Add issue (PAL-1234)"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- Move Modal (for already-mapped issues) ---
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
            <div className="text-sm font-semibold text-slate-800">Move {moveModalIssue.identifier}</div>
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
                  onClick={() => { linkIssue(moveModalIssue.identifier, opp.id); setMoveModalIssue(null); }}
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
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20">
          <option value="all">All Projects</option>
          {projects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-5" style={{ height: 'calc(100vh - 280px)' }}>
        {/* Left: Opportunities grouped by area */}
        <div className="w-[340px] flex-shrink-0 flex flex-col">
          {/* Left panel search */}
          <div className="mb-2">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" value={oppSearch} onChange={e => setOppSearch(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-7 pr-7 py-1.5 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Filter opportunities..." />
              {oppSearch && (
                <button onClick={() => setOppSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {groupedOpportunities.map(({ area, opps }) => {
              const isAreaExpanded = expandedAreas.has(area.id);
              return (
                <div key={area.id}>
                  {/* Area header */}
                  <button onClick={() => toggleArea(area.id)}
                    className="w-full flex items-center gap-2 px-1 py-1 mb-1 text-left hover:bg-slate-50 rounded transition-colors">
                    <svg className={`w-2.5 h-2.5 text-slate-400 transition-transform flex-shrink-0 ${isAreaExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: area.color }} />
                    <span className="text-xs font-semibold text-slate-600 flex-1">{area.name}</span>
                    <span className="text-[10px] text-slate-400">{opps.length}</span>
                  </button>
                  {isAreaExpanded && (
                    <div className="space-y-1.5 ml-1">
                      {opps.map(opp => <OppGroup key={opp.id} opp={opp} />)}
                    </div>
                  )}
                </div>
              );
            })}
            {groupedOpportunities.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-slate-400">No opportunities match</div>
            )}
          </div>
        </div>

        {/* Right: Issue list */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-2">
            {filterMapping === 'orphaned' ? 'Orphaned Issues' : filterMapping === 'mapped' ? 'Mapped Issues' : 'All Issues'}
            <span className="text-slate-400 font-normal">({filteredIssues.length})</span>
            {selectedIssues.size > 0 && <span className="text-indigo-500">· {selectedIssues.size} selected</span>}
            {selectedOpp && suggestedIssueIds.size > 0 && (
              <span className="text-indigo-500 font-normal ml-1">· {suggestedIssueIds.size} suggested for "{selectedOpp.title}"</span>
            )}
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-100/60 rounded-t-lg border border-b-0 border-slate-200">
            <span className="w-4" />
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
              groupedFilteredIssues.map(({ project, issues }) => {
                const isProjectExpanded = expandedProjects.has(project);
                return (
                  <div key={project} className={dragProject === project ? 'opacity-40' : ''}>
                    <div
                      draggable
                      onDragStart={(e) => { setDragProject(project); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragEnd={() => setDragProject(null)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 bg-slate-50/80 border-b border-slate-200 hover:bg-slate-100/80 transition-colors sticky top-0 z-10 cursor-grab active:cursor-grabbing group"
                    >
                      <span className="text-slate-300 group-hover:text-slate-400 flex-shrink-0 text-[10px] leading-none select-none" style={{ letterSpacing: '1px' }}>⠿</span>
                      <button onClick={() => toggleProject(project)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                        <svg className={`w-2.5 h-2.5 text-slate-400 transition-transform flex-shrink-0 ${isProjectExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span className="text-xs font-semibold text-slate-600 flex-1">{project}</span>
                      </button>
                      <span className="text-[10px] text-slate-400">{issues.length}</span>
                    </div>
                    {isProjectExpanded && issues.map(issue => (
                      <IssueRow key={issue.identifier} issue={issue} showOpp={filterMapping !== 'mapped'}
                        isSuggested={suggestedIssueIds.has(issue.identifier)} />
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Move modal (for already-mapped issues) */}
      <MoveModal />
    </div>
  );
}
