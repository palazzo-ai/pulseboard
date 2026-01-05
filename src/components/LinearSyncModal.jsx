import React, { useState, useEffect } from 'react';
import { areas, initiatives, months } from '../data/initialData';
import { getAreaName, getAreaColor, getInitiativeName, getMonthName } from '../utils/helpers';

// Confidence badge component
const ConfidenceBadge = ({ level }) => {
  const styles = {
    high: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  };
  
  return (
    <span className={`px-2 py-0.5 text-[10px] font-medium rounded border ${styles[level] || styles.low}`}>
      {level?.toUpperCase()} CONF.
    </span>
  );
};

// Section header component
const SectionHeader = ({ icon, title, count, color = 'slate' }) => {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    slate: 'text-slate-400 bg-slate-500/10 border-slate-500/30'
  };
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colors[color]}`}>
      <span>{icon}</span>
      <span className="font-medium">{title}</span>
      {count !== undefined && (
        <span className="ml-auto text-xs opacity-70">({count})</span>
      )}
    </div>
  );
};

// New opportunity card component
const NewOpportunityCard = ({ 
  recommendation, 
  onCreateOpportunity, 
  onLinkToExisting, 
  onIgnore,
  existingOpportunities 
}) => {
  const [showLinkDropdown, setShowLinkDropdown] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: recommendation.title,
    area: recommendation.area,
    initiative: recommendation.initiative,
    month: recommendation.suggestedMonth,
    description: recommendation.description
  });

  const handleCreate = () => {
    onCreateOpportunity({
      ...recommendation,
      ...editData
    });
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {editing ? (
            <input
              type="text"
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
            />
          ) : (
            <h4 className="font-medium text-white">{recommendation.title}</h4>
          )}
        </div>
        <ConfidenceBadge level={recommendation.confidence} />
      </div>

      {/* Issues */}
      <div className="flex flex-wrap gap-1">
        {recommendation.issues?.map(issue => (
          <span 
            key={issue.identifier}
            className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded font-mono"
            title={issue.title}
          >
            {issue.identifier}
          </span>
        ))}
      </div>

      {/* Suggested mapping */}
      <div className="flex flex-wrap gap-2 text-xs">
        {editing ? (
          <>
            <select
              value={editData.area}
              onChange={(e) => setEditData({ ...editData, area: e.target.value })}
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white"
            >
              {areas.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <select
              value={editData.initiative}
              onChange={(e) => setEditData({ ...editData, initiative: e.target.value })}
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white"
            >
              {initiatives.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            <select
              value={editData.month}
              onChange={(e) => setEditData({ ...editData, month: e.target.value })}
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white"
            >
              {months.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </>
        ) : (
          <>
            <span 
              className="px-2 py-0.5 rounded"
              style={{ backgroundColor: `${getAreaColor(recommendation.area)}30`, color: getAreaColor(recommendation.area) }}
            >
              {getAreaName(recommendation.area)}
            </span>
            <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded">
              {getInitiativeName(recommendation.initiative)}
            </span>
            <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded">
              {getMonthName(recommendation.suggestedMonth)}
            </span>
          </>
        )}
      </div>

      {/* Reasoning */}
      <p className="text-xs text-slate-400">
        💬 {recommendation.reasoning}
      </p>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-slate-700">
        <button
          onClick={() => setEditing(!editing)}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded transition-colors"
        >
          {editing ? 'Done Editing' : 'Edit'}
        </button>
        <button
          onClick={handleCreate}
          className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded transition-colors"
        >
          ✓ Create Opportunity
        </button>
        <div className="relative">
          <button
            onClick={() => setShowLinkDropdown(!showLinkDropdown)}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded transition-colors"
          >
            Link to Existing ▾
          </button>
          {showLinkDropdown && (
            <div className="absolute bottom-full mb-1 right-0 w-64 max-h-48 overflow-y-auto bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-10">
              {existingOpportunities.map(opp => (
                <button
                  key={opp.id}
                  onClick={() => {
                    onLinkToExisting(opp.id, recommendation.issues);
                    setShowLinkDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-slate-700 border-b border-slate-700 last:border-0"
                >
                  <div className="font-medium text-white truncate">{opp.title}</div>
                  <div className="text-slate-500">{getAreaName(opp.area)} • {getMonthName(opp.month)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => onIgnore(recommendation)}
          className="px-3 py-1.5 text-slate-500 hover:text-slate-300 text-xs rounded transition-colors"
        >
          ✗ Ignore
        </button>
      </div>
    </div>
  );
};

// Scope change card component
const ScopeChangeCard = ({ change, onAcknowledge, onFlagAtRisk, onLinkIssues }) => {
  return (
    <div className="bg-slate-800 border border-amber-600/30 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-medium text-white">{change.opportunityTitle}</h4>
          <div className="text-xs text-amber-400 mt-1">
            Issues: {change.currentIssueCount} → {change.currentIssueCount + change.newIssues.length} 
            (+{change.newIssues.length})
          </div>
        </div>
        <ConfidenceBadge level={change.confidence} />
      </div>

      {/* New issues */}
      <div>
        <div className="text-xs text-slate-500 mb-1">New issues:</div>
        <div className="flex flex-wrap gap-1">
          {change.newIssues?.map(issue => (
            <span 
              key={issue.identifier}
              className="px-2 py-0.5 bg-amber-900/30 text-amber-300 text-xs rounded font-mono"
              title={issue.title}
            >
              {issue.identifier}
            </span>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400">💬 {change.reasoning}</p>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-slate-700">
        <button
          onClick={() => onLinkIssues(change.opportunityId, change.newIssues)}
          className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors"
        >
          Link Issues
        </button>
        <button
          onClick={() => onFlagAtRisk(change.opportunityId)}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded transition-colors"
        >
          Flag at Risk
        </button>
        <button
          onClick={() => onAcknowledge(change)}
          className="px-3 py-1.5 text-slate-500 hover:text-slate-300 text-xs rounded transition-colors"
        >
          Acknowledge
        </button>
      </div>
    </div>
  );
};

// Orphaned issues section
const OrphanedIssuesSection = ({ issues, onLinkIssue, onExcludeIssue, opportunities }) => {
  const [selectedIssues, setSelectedIssues] = useState(new Set());
  const [linkTarget, setLinkTarget] = useState({});

  const toggleSelect = (identifier) => {
    const newSet = new Set(selectedIssues);
    if (newSet.has(identifier)) {
      newSet.delete(identifier);
    } else {
      newSet.add(identifier);
    }
    setSelectedIssues(newSet);
  };

  const excludeSelected = () => {
    selectedIssues.forEach(id => {
      const issue = issues.find(i => i.identifier === id);
      if (issue) onExcludeIssue(issue, 'not_roadmap');
    });
    setSelectedIssues(new Set());
  };

  return (
    <div className="space-y-2">
      {issues.map(issue => (
        <div key={issue.identifier} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg">
          <input
            type="checkbox"
            checked={selectedIssues.has(issue.identifier)}
            onChange={() => toggleSelect(issue.identifier)}
            className="w-4 h-4 rounded border-slate-600"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-400">{issue.identifier}</span>
              <span className="text-sm text-white truncate">{issue.title}</span>
            </div>
            <div className="text-xs text-slate-500">
              {issue.team} • Suggested: {getAreaName(issue.suggestedArea)}
            </div>
          </div>
          <select
            value={linkTarget[issue.identifier] || ''}
            onChange={(e) => setLinkTarget({ ...linkTarget, [issue.identifier]: e.target.value })}
            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white max-w-[180px]"
          >
            <option value="">Link to...</option>
            {opportunities.map(opp => (
              <option key={opp.id} value={opp.id}>{opp.title}</option>
            ))}
          </select>
          {linkTarget[issue.identifier] && (
            <button
              onClick={() => {
                onLinkIssue(parseInt(linkTarget[issue.identifier]), issue);
                setLinkTarget({ ...linkTarget, [issue.identifier]: '' });
              }}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
            >
              Link
            </button>
          )}
        </div>
      ))}
      
      {selectedIssues.size > 0 && (
        <button
          onClick={excludeSelected}
          className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
        >
          Exclude {selectedIssues.size} selected as non-roadmap work
        </button>
      )}
    </div>
  );
};

// Milestone health card
const MilestoneHealthCard = ({ health, onLinkIssue, opportunities }) => {
  const statusColors = {
    healthy: 'border-emerald-500/30 bg-emerald-500/10',
    at_risk: 'border-amber-500/30 bg-amber-500/10',
    critical: 'border-red-500/30 bg-red-500/10'
  };

  const statusIcons = {
    healthy: '✓',
    at_risk: '⚠',
    critical: '✗'
  };

  const feedingOpps = opportunities.filter(o => o.milestoneId === health.milestoneId);

  return (
    <div className={`border rounded-lg p-4 ${statusColors[health.status]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{statusIcons[health.status]}</span>
        <h4 className="font-medium text-white">{health.milestoneTitle}</h4>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
          health.status === 'healthy' ? 'bg-emerald-500/20 text-emerald-400' :
          health.status === 'at_risk' ? 'bg-amber-500/20 text-amber-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {health.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {health.concerns?.length > 0 && (
        <ul className="text-xs text-slate-400 mb-3 space-y-1">
          {health.concerns.map((concern, idx) => (
            <li key={idx}>• {concern}</li>
          ))}
        </ul>
      )}

      {health.unlinkedIssues?.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 mb-1">Issues that may need linking:</div>
          <div className="space-y-1">
            {health.unlinkedIssues.map(issue => (
              <div key={issue.identifier} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-slate-400">{issue.identifier}</span>
                <span className="text-slate-300 truncate flex-1">{issue.title}</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      onLinkIssue(parseInt(e.target.value), issue);
                      e.target.value = '';
                    }
                  }}
                  className="bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-xs"
                >
                  <option value="">Link →</option>
                  {feedingOpps.map(opp => (
                    <option key={opp.id} value={opp.id}>{opp.title}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Main modal component
export default function LinearSyncModal({
  isOpen,
  onClose,
  opportunities,
  milestones,
  onCreateOpportunity,
  onUpdateOpportunity,
  onLinkIssues,
  onExcludeIssue,
  lastSyncAt,
  onSyncComplete
}) {
  const [linearApiKey, setLinearApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pulseboard_linear_key') || '';
    }
    return '';
  });
  const [keyInput, setKeyInput] = useState(linearApiKey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  
  // Track dismissed items
  const [dismissedNewOpps, setDismissedNewOpps] = useState(new Set());
  const [dismissedScopeChanges, setDismissedScopeChanges] = useState(new Set());

  const saveApiKey = () => {
    setLinearApiKey(keyInput);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pulseboard_linear_key', keyInput);
    }
  };

  const runSync = async () => {
    if (!linearApiKey) {
      setError('Please enter your Linear API key');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      // Get excluded issues from localStorage
      const excludedIssues = JSON.parse(localStorage.getItem('pulseboard_excluded_issues') || '[]');

      const response = await fetch('/api/sync-linear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linearApiKey,
          lastSyncAt,
          opportunities,
          milestones,
          excludedIssues,
          areas,
          initiatives
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }

      const data = await response.json();
      setAnalysis(data);
      
      // Save sync timestamp
      if (onSyncComplete) {
        onSyncComplete(data.syncTimestamp);
      }
    } catch (err) {
      console.error('Sync error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOpportunity = (recommendation) => {
    const newOpp = {
      id: Date.now(),
      title: recommendation.title,
      description: recommendation.description || '',
      area: recommendation.area,
      initiative: recommendation.initiative,
      month: recommendation.suggestedMonth,
      issues: recommendation.issues?.map(i => i.identifier) || [],
      status: 'not_started',
      atRisk: false,
      milestoneId: null
    };
    
    onCreateOpportunity(newOpp);
    setDismissedNewOpps(prev => new Set([...prev, recommendation.title]));
  };

  const handleLinkToExisting = (opportunityId, issues) => {
    const issueIdentifiers = issues.map(i => i.identifier);
    onLinkIssues(opportunityId, issueIdentifiers);
    // Mark as handled by dismissing
    setDismissedNewOpps(prev => new Set([...prev, issues.map(i => i.identifier).join(',')]));
  };

  const handleIgnoreNewOpp = (recommendation) => {
    // Add issues to exclusion list
    const excluded = JSON.parse(localStorage.getItem('pulseboard_excluded_issues') || '[]');
    recommendation.issues?.forEach(issue => {
      if (!excluded.includes(issue.identifier)) {
        excluded.push(issue.identifier);
      }
    });
    localStorage.setItem('pulseboard_excluded_issues', JSON.stringify(excluded));
    
    setDismissedNewOpps(prev => new Set([...prev, recommendation.title]));
  };

  const handleLinkScopeChangeIssues = (opportunityId, newIssues) => {
    const issueIdentifiers = newIssues.map(i => i.identifier);
    onLinkIssues(opportunityId, issueIdentifiers);
    setDismissedScopeChanges(prev => new Set([...prev, opportunityId]));
  };

  const handleFlagAtRisk = (opportunityId) => {
    const opp = opportunities.find(o => o.id === opportunityId);
    if (opp) {
      onUpdateOpportunity({
        ...opp,
        atRisk: true,
        atRiskReason: 'Scope increase detected from Linear sync'
      });
    }
    setDismissedScopeChanges(prev => new Set([...prev, opportunityId]));
  };

  const handleAcknowledgeScopeChange = (change) => {
    setDismissedScopeChanges(prev => new Set([...prev, change.opportunityId]));
  };

  const handleLinkOrphanedIssue = (opportunityId, issue) => {
    onLinkIssues(opportunityId, [issue.identifier]);
    // Remove from analysis
    if (analysis) {
      setAnalysis({
        ...analysis,
        orphanedIssues: analysis.orphanedIssues.filter(i => i.identifier !== issue.identifier)
      });
    }
  };

  const handleExcludeIssue = (issue, reason) => {
    const excluded = JSON.parse(localStorage.getItem('pulseboard_excluded_issues') || '[]');
    if (!excluded.includes(issue.identifier)) {
      excluded.push(issue.identifier);
      localStorage.setItem('pulseboard_excluded_issues', JSON.stringify(excluded));
    }
    
    // Remove from analysis
    if (analysis) {
      setAnalysis({
        ...analysis,
        orphanedIssues: analysis.orphanedIssues.filter(i => i.identifier !== issue.identifier)
      });
    }
    
    if (onExcludeIssue) {
      onExcludeIssue(issue.identifier, reason);
    }
  };

  const handleLinkMilestoneIssue = (opportunityId, issue) => {
    onLinkIssues(opportunityId, [issue.identifier]);
    // Update analysis to remove this issue from unlinked
    if (analysis) {
      setAnalysis({
        ...analysis,
        milestoneHealth: analysis.milestoneHealth.map(h => ({
          ...h,
          unlinkedIssues: h.unlinkedIssues?.filter(i => i.identifier !== issue.identifier) || []
        }))
      });
    }
  };

  // Filter out dismissed items
  const visibleNewOpps = analysis?.newOpportunities?.filter(r => !dismissedNewOpps.has(r.title)) || [];
  const visibleScopeChanges = analysis?.scopeChanges?.filter(c => !dismissedScopeChanges.has(c.opportunityId)) || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-900/50 to-purple-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Linear Sync</h2>
              <p className="text-xs text-slate-400">
                {lastSyncAt 
                  ? `Last sync: ${new Date(lastSyncAt).toLocaleString()}`
                  : 'First sync - analyzing last 3 weeks'
                }
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* API Key */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <label className="block text-xs text-slate-400 uppercase tracking-wide mb-2">
              Linear API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                placeholder="lin_api_..."
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={saveApiKey}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Get your API key from Linear Settings → API → Personal API keys
            </p>
          </div>

          {/* Sync Button */}
          <button
            onClick={runSync}
            disabled={loading || !linearApiKey}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing with Claude...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Analyze Linear Issues
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{analysis.analyzedCount}</div>
                  <div className="text-xs text-slate-400">Issues Analyzed</div>
                </div>
                <div className="bg-emerald-900/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{visibleNewOpps.length}</div>
                  <div className="text-xs text-slate-400">New Opportunities</div>
                </div>
                <div className="bg-amber-900/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">{visibleScopeChanges.length}</div>
                  <div className="text-xs text-slate-400">Scope Changes</div>
                </div>
                <div className="bg-blue-900/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">{analysis.orphanedIssues?.length || 0}</div>
                  <div className="text-xs text-slate-400">Orphaned Issues</div>
                </div>
              </div>

              {/* New Opportunities */}
              {visibleNewOpps.length > 0 && (
                <div className="space-y-3">
                  <SectionHeader 
                    icon="🆕" 
                    title="Suggested New Opportunities" 
                    count={visibleNewOpps.length}
                    color="emerald"
                  />
                  {visibleNewOpps.map((rec, idx) => (
                    <NewOpportunityCard
                      key={idx}
                      recommendation={rec}
                      onCreateOpportunity={handleCreateOpportunity}
                      onLinkToExisting={handleLinkToExisting}
                      onIgnore={handleIgnoreNewOpp}
                      existingOpportunities={opportunities}
                    />
                  ))}
                </div>
              )}

              {/* Scope Changes */}
              {visibleScopeChanges.length > 0 && (
                <div className="space-y-3">
                  <SectionHeader 
                    icon="📈" 
                    title="Scope Changes Detected" 
                    count={visibleScopeChanges.length}
                    color="amber"
                  />
                  {visibleScopeChanges.map((change, idx) => (
                    <ScopeChangeCard
                      key={idx}
                      change={change}
                      onAcknowledge={handleAcknowledgeScopeChange}
                      onFlagAtRisk={handleFlagAtRisk}
                      onLinkIssues={handleLinkScopeChangeIssues}
                    />
                  ))}
                </div>
              )}

              {/* Orphaned Issues */}
              {analysis.orphanedIssues?.length > 0 && (
                <div className="space-y-3">
                  <SectionHeader 
                    icon="🔗" 
                    title="Orphaned Issues" 
                    count={analysis.orphanedIssues.length}
                    color="blue"
                  />
                  <OrphanedIssuesSection
                    issues={analysis.orphanedIssues}
                    onLinkIssue={handleLinkOrphanedIssue}
                    onExcludeIssue={handleExcludeIssue}
                    opportunities={opportunities}
                  />
                </div>
              )}

              {/* Milestone Health */}
              {analysis.milestoneHealth?.length > 0 && (
                <div className="space-y-3">
                  <SectionHeader 
                    icon="🎯" 
                    title="Milestone Health" 
                    count={analysis.milestoneHealth.filter(h => h.status !== 'healthy').length + ' at risk'}
                    color="purple"
                  />
                  <div className="grid gap-3">
                    {analysis.milestoneHealth.map((health, idx) => (
                      <MilestoneHealthCard
                        key={idx}
                        health={health}
                        onLinkIssue={handleLinkMilestoneIssue}
                        opportunities={opportunities}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All Clear */}
              {visibleNewOpps.length === 0 && 
               visibleScopeChanges.length === 0 && 
               (analysis.orphanedIssues?.length || 0) === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-emerald-400 font-medium">All Clear!</p>
                  <p className="text-sm mt-1">Your roadmap is in sync with Linear</p>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!loading && !analysis && !error && linearApiKey && (
            <div className="text-center py-8 text-slate-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>Click "Analyze Linear Issues" to discover roadmap updates</p>
              <p className="text-xs mt-1">Claude will analyze your Linear data and suggest changes</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
