import React, { useState, useEffect } from 'react';

// Status definitions matching App.jsx
const STATUSES = {
  not_started: { label: 'Not Started', color: '#6b7280', bgColor: '#6b728020' },
  in_progress: { label: 'In Progress', color: '#3b82f6', bgColor: '#3b82f620' },
  done: { label: 'Done', color: '#22c55e', bgColor: '#22c55e20' },
  blocked: { label: 'Blocked', color: '#ef4444', bgColor: '#ef444420' }
};

// Area and initiative data
const AREAS = [
  { id: 'visualizer', name: 'Visualizer', color: '#3fb950' },
  { id: 'vinci', name: 'Vinci', color: '#38bdf8' },
  { id: 'spaces', name: 'Spaces', color: '#a371f7' },
  { id: 'showcase', name: 'Showcase', color: '#f85149' },
  { id: 'studio', name: 'Studio', color: '#f778ba' },
  { id: 'platform', name: 'Platform', color: '#d29922' },
  { id: 'admin', name: 'Admin', color: '#8b949e' }
];

const INITIATIVES = [
  { id: 'launch', name: 'Launch Partner Commitments', color: '#f85149' },
  { id: 'selfserve', name: 'Self-Serve Scale', color: '#58a6ff' },
  { id: 'embed', name: 'Embed Everywhere', color: '#a371f7' },
  { id: 'ai', name: 'AI Model Excellence', color: '#3fb950' },
  { id: 'commerce', name: 'Commerce Enablement', color: '#d29922' },
  { id: 'enterprise', name: 'Enterprise Content Scale', color: '#f778ba' }
];

const MONTHS = [
  { id: 'dec25', name: "Dec '25" },
  { id: 'jan26', name: "Jan '26" },
  { id: 'feb26', name: "Feb '26" },
  { id: 'mar26', name: "Mar '26" },
  { id: 'apr26', name: "Apr '26" },
  { id: 'may26', name: "May '26" },
  { id: 'jun26', name: "Jun '26" },
  { id: 'jul26', name: "Jul '26" },
  { id: 'aug26', name: "Aug '26" },
  { id: 'sep26', name: "Sep '26" },
  { id: 'oct26', name: "Oct '26" },
  { id: 'nov26', name: "Nov '26" },
  { id: 'dec26', name: "Dec '26" }
];

// Section Header Component
const SectionHeader = ({ icon, title, count, color }) => {
  const colorClasses = {
    emerald: 'text-emerald-400 bg-emerald-900/30',
    amber: 'text-amber-400 bg-amber-900/30',
    blue: 'text-blue-400 bg-blue-900/30',
    red: 'text-red-400 bg-red-900/30',
    purple: 'text-purple-400 bg-purple-900/30'
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <span className={`font-semibold ${colorClasses[color]?.split(' ')[0] || 'text-slate-300'}`}>
        {title}
      </span>
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[color] || 'text-slate-400 bg-slate-800'}`}>
        {count}
      </span>
    </div>
  );
};

// Summary Stat Card
const StatCard = ({ icon, label, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-900/30 border-blue-700/50 text-blue-400',
    emerald: 'bg-emerald-900/30 border-emerald-700/50 text-emerald-400',
    amber: 'bg-amber-900/30 border-amber-700/50 text-amber-400',
    red: 'bg-red-900/30 border-red-700/50 text-red-400'
  };

  return (
    <div className={`p-3 rounded-lg border ${colorClasses[color] || 'bg-slate-800 border-slate-700'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{icon}</span>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
};

// New Opportunity Card (for suggested new opportunities from analysis)
const NewOpportunityCard = ({ recommendation, onCreateOpportunity, onLinkToExisting, onIgnore, existingOpportunities }) => {
  const [expanded, setExpanded] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState(null);

  const confidenceColors = {
    high: 'bg-emerald-900/30 text-emerald-400 border-emerald-600/50',
    medium: 'bg-amber-900/30 text-amber-400 border-amber-600/50',
    low: 'bg-slate-800 text-slate-400 border-slate-600'
  };

  const handleCreate = () => {
    onCreateOpportunity({
      title: recommendation.title,
      description: recommendation.description,
      area: recommendation.area,
      initiative: recommendation.initiative,
      month: recommendation.suggestedMonth,
      issues: recommendation.issues.map(i => i.identifier),
      status: 'not_started',
      atRisk: false,
      atRiskReason: '',
      milestoneId: null
    });
  };

  const handleLinkToExisting = () => {
    if (selectedOpp) {
      onLinkToExisting(selectedOpp, recommendation.issues.map(i => i.identifier));
      setLinkMode(false);
      setSelectedOpp(null);
    }
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
      <div 
        className="p-3 cursor-pointer hover:bg-slate-800 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${confidenceColors[recommendation.confidence]}`}>
                {recommendation.confidence.toUpperCase()}
              </span>
              <span className="text-xs text-slate-500">
                {AREAS.find(a => a.id === recommendation.area)?.name} • {MONTHS.find(m => m.id === recommendation.suggestedMonth)?.name}
              </span>
            </div>
            <h4 className="font-medium text-white truncate">{recommendation.title}</h4>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{recommendation.description}</p>
          </div>
          <svg className={`w-5 h-5 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-700 pt-3 space-y-3">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Related Issues ({recommendation.issues.length})</div>
            <div className="flex flex-wrap gap-1">
              {recommendation.issues.map(issue => (
                <span key={issue.identifier} className="px-2 py-1 bg-slate-900 text-slate-300 text-xs rounded font-mono">
                  {issue.identifier}
                </span>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-400 italic">{recommendation.reasoning}</div>

          {linkMode ? (
            <div className="space-y-2">
              <select
                value={selectedOpp || ''}
                onChange={(e) => setSelectedOpp(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an opportunity...</option>
                {existingOpportunities.map(opp => (
                  <option key={opp.id} value={opp.id}>{opp.title}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleLinkToExisting}
                  disabled={!selectedOpp}
                  className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Link Issues
                </button>
                <button
                  onClick={() => { setLinkMode(false); setSelectedOpp(null); }}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Opportunity
              </button>
              <button
                onClick={() => setLinkMode(true)}
                className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-400 text-xs font-medium rounded-lg transition-colors border border-blue-600/50"
              >
                Link to Existing
              </button>
              <button
                onClick={() => onIgnore(recommendation.title)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-400 text-xs font-medium rounded-lg transition-colors"
              >
                Ignore
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Scope Change Card
const ScopeChangeCard = ({ change, onAcknowledge, onFlagAtRisk, onLinkIssues }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-800/50 border border-amber-700/30 rounded-lg overflow-hidden">
      <div 
        className="p-3 cursor-pointer hover:bg-slate-800 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-900/30 text-amber-400 border border-amber-600/50">
                +{change.newIssues?.length || 0} NEW ISSUES
              </span>
            </div>
            <h4 className="font-medium text-white truncate">{change.opportunityTitle}</h4>
            <p className="text-xs text-slate-400 mt-1">{change.reasoning}</p>
          </div>
          <svg className={`w-5 h-5 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-700 pt-3 space-y-3">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">New Issues to Link</div>
            <div className="flex flex-wrap gap-1">
              {(change.newIssues || []).map(issue => (
                <span key={issue.identifier} className="px-2 py-1 bg-amber-900/30 text-amber-300 text-xs rounded font-mono border border-amber-600/30">
                  {issue.identifier}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onLinkIssues(change.opportunityId, (change.newIssues || []).map(i => i.identifier))}
              className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Link Issues
            </button>
            <button
              onClick={() => onFlagAtRisk(change.opportunityId, 'Scope expanded with new issues')}
              className="px-3 py-1.5 bg-orange-600/30 hover:bg-orange-600/50 text-orange-400 text-xs font-medium rounded-lg transition-colors border border-orange-600/50"
            >
              Flag At Risk
            </button>
            <button
              onClick={() => onAcknowledge(change.opportunityId)}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-400 text-xs font-medium rounded-lg transition-colors"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================
// ORPHANED ISSUE CARD - NEW COMPONENT
// =====================================
// This component allows converting orphaned Linear issues into new opportunities
const OrphanedIssueCard = ({ 
  issue, 
  onCreateOpportunity, 
  onLinkToExisting, 
  onExclude, 
  existingOpportunities,
  milestones,
  onActionComplete // New callback to notify parent when action is finalized
}) => {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState(null); // null | 'create' | 'link' | 'linked' | 'created' | 'excluded'
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [excludeReason, setExcludeReason] = useState('');
  const [actionResult, setActionResult] = useState(null); // { type: 'linked'|'created'|'excluded', target?: string }
  const [fadeOut, setFadeOut] = useState(false);
  
  // Form state for creating new opportunity
  const [newOppForm, setNewOppForm] = useState({
    title: issue.title || '',
    description: issue.reasoning || '',
    area: issue.suggestedArea || 'platform',
    initiative: 'selfserve',
    month: 'jan26',
    milestoneId: null
  });

  // Auto-remove after action with delay for visual feedback
  useEffect(() => {
    if (actionResult && onActionComplete) {
      const fadeTimer = setTimeout(() => setFadeOut(true), 2000);
      const removeTimer = setTimeout(() => {
        onActionComplete(issue.identifier, actionResult.type);
      }, 2500);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [actionResult, issue.identifier, onActionComplete]);

  const areaInfo = AREAS.find(a => a.id === issue.suggestedArea);

  const handleCreateOpportunity = () => {
    onCreateOpportunity({
      ...newOppForm,
      issues: [issue.identifier],
      status: 'not_started',
      atRisk: false,
      atRiskReason: ''
    });
    setActionResult({ type: 'created', target: newOppForm.title });
    setMode('created');
  };

  const handleLinkToExisting = () => {
    if (selectedOpp) {
      const oppName = existingOpportunities.find(o => o.id === selectedOpp)?.title || 'opportunity';
      onLinkToExisting(selectedOpp, [issue.identifier]);
      setActionResult({ type: 'linked', target: oppName });
      setMode('linked');
      setSelectedOpp(null);
    }
  };

  const handleExclude = () => {
    onExclude(issue, excludeReason || 'Not relevant to roadmap');
    setActionResult({ type: 'excluded' });
    setMode('excluded');
  };

  // If action was completed, show success state
  if (actionResult) {
    return (
      <div className={`p-3 rounded-lg border transition-all duration-500 ${
        fadeOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      } ${
        actionResult.type === 'linked' ? 'bg-blue-900/20 border-blue-600/50' :
        actionResult.type === 'created' ? 'bg-emerald-900/20 border-emerald-600/50' :
        'bg-slate-800/50 border-slate-600'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            actionResult.type === 'linked' ? 'bg-blue-600' :
            actionResult.type === 'created' ? 'bg-emerald-600' :
            'bg-slate-600'
          }`}>
            {actionResult.type === 'linked' && (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
            {actionResult.type === 'created' && (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {actionResult.type === 'excluded' && (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">{issue.identifier}</span>
              <span className={`text-xs font-medium ${
                actionResult.type === 'linked' ? 'text-blue-400' :
                actionResult.type === 'created' ? 'text-emerald-400' :
                'text-slate-400'
              }`}>
                {actionResult.type === 'linked' && '✓ Linked'}
                {actionResult.type === 'created' && '✓ Created'}
                {actionResult.type === 'excluded' && '✓ Excluded'}
              </span>
            </div>
            <div className="text-sm text-slate-300 truncate">
              {actionResult.type === 'linked' && `Linked to "${actionResult.target}"`}
              {actionResult.type === 'created' && `Created "${actionResult.target}"`}
              {actionResult.type === 'excluded' && 'Excluded from future syncs'}
            </div>
          </div>
          {!fadeOut && (
            <button
              onClick={() => { setActionResult(null); setMode(null); setFadeOut(false); }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded hover:bg-slate-700"
              title="Undo"
            >
              Undo
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-blue-700/30 rounded-lg overflow-hidden">
      {/* Header - Always visible */}
      <div 
        className="p-3 cursor-pointer hover:bg-slate-800 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-900 text-slate-300 border border-slate-600">
                {issue.identifier}
              </span>
              {areaInfo && (
                <span 
                  className="px-2 py-0.5 rounded text-[10px] font-medium"
                  style={{ 
                    backgroundColor: `${areaInfo.color}20`,
                    color: areaInfo.color,
                    borderColor: `${areaInfo.color}50`,
                    borderWidth: '1px'
                  }}
                >
                  {areaInfo.name}
                </span>
              )}
              {issue.team && (
                <span className="text-[10px] text-slate-500">{issue.team}</span>
              )}
            </div>
            <h4 className="font-medium text-white text-sm">{issue.title}</h4>
            {issue.reasoning && (
              <p className="text-xs text-slate-400 mt-1 line-clamp-1">{issue.reasoning}</p>
            )}
          </div>
          <svg className={`w-5 h-5 text-slate-500 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-700 pt-3 space-y-3">
          {/* Reasoning */}
          {issue.reasoning && (
            <div className="text-xs text-slate-400 italic bg-slate-900/50 p-2 rounded">
              {issue.reasoning}
            </div>
          )}

          {/* Mode: Create New Opportunity */}
          {mode === 'create' && (
            <div className="space-y-3 bg-emerald-900/10 border border-emerald-700/30 rounded-lg p-3">
              <div className="text-xs text-emerald-400 font-medium uppercase tracking-wide flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Opportunity
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wide mb-1">Title</label>
                <input
                  type="text"
                  value={newOppForm.title}
                  onChange={(e) => setNewOppForm({ ...newOppForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Opportunity title..."
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wide mb-1">Description</label>
                <textarea
                  value={newOppForm.description}
                  onChange={(e) => setNewOppForm({ ...newOppForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 h-16 resize-none"
                  placeholder="Brief description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wide mb-1">Area</label>
                  <select
                    value={newOppForm.area}
                    onChange={(e) => setNewOppForm({ ...newOppForm, area: e.target.value })}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {AREAS.map(area => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wide mb-1">Month</label>
                  <select
                    value={newOppForm.month}
                    onChange={(e) => setNewOppForm({ ...newOppForm, month: e.target.value })}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {MONTHS.map(month => (
                      <option key={month.id} value={month.id}>{month.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wide mb-1">Initiative</label>
                  <select
                    value={newOppForm.initiative}
                    onChange={(e) => setNewOppForm({ ...newOppForm, initiative: e.target.value })}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {INITIATIVES.map(init => (
                      <option key={init.id} value={init.id}>{init.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wide mb-1">Milestone (Optional)</label>
                  <select
                    value={newOppForm.milestoneId || ''}
                    onChange={(e) => setNewOppForm({ ...newOppForm, milestoneId: e.target.value || null })}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">No milestone</option>
                    {(milestones || []).map(m => (
                      <option key={m.id} value={m.id}>🎯 {m.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateOpportunity}
                  disabled={!newOppForm.title.trim()}
                  className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Create Opportunity
                </button>
                <button
                  onClick={() => setMode(null)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Mode: Link to Existing */}
          {mode === 'link' && (
            <div className="space-y-3 bg-blue-900/10 border border-blue-700/30 rounded-lg p-3">
              <div className="text-xs text-blue-400 font-medium uppercase tracking-wide flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Link to Existing Opportunity
              </div>

              <select
                value={selectedOpp || ''}
                onChange={(e) => setSelectedOpp(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an opportunity...</option>
                {existingOpportunities.map(opp => (
                  <option key={opp.id} value={opp.id}>
                    [{AREAS.find(a => a.id === opp.area)?.name}] {opp.title}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  onClick={handleLinkToExisting}
                  disabled={!selectedOpp}
                  className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Link Issue
                </button>
                <button
                  onClick={() => { setMode(null); setSelectedOpp(null); }}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Mode: Exclude */}
          {mode === 'exclude' && (
            <div className="space-y-3 bg-slate-900/50 border border-slate-600 rounded-lg p-3">
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                Exclude from Analysis
              </div>

              <input
                type="text"
                value={excludeReason}
                onChange={(e) => setExcludeReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="Reason (optional)..."
              />

              <div className="flex gap-2">
                <button
                  onClick={handleExclude}
                  className="flex-1 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Exclude Issue
                </button>
                <button
                  onClick={() => { setMode(null); setExcludeReason(''); }}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Default Action Buttons */}
          {mode === null && (
            <div className="flex gap-2">
              <button
                onClick={() => setMode('create')}
                className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Opportunity
              </button>
              <button
                onClick={() => setMode('link')}
                className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-400 text-xs font-medium rounded-lg transition-colors border border-blue-600/50"
              >
                Link to Existing
              </button>
              <button
                onClick={() => setMode('exclude')}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-400 text-xs font-medium rounded-lg transition-colors"
                title="Exclude from future syncs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Milestone Health Card
const MilestoneHealthCard = ({ health, onLinkIssue, opportunities }) => {
  const [expanded, setExpanded] = useState(false);
  const [linkingIssue, setLinkingIssue] = useState(null);
  const [selectedOpp, setSelectedOpp] = useState(null);

  const statusColors = {
    healthy: 'text-emerald-400 bg-emerald-900/30',
    at_risk: 'text-amber-400 bg-amber-900/30',
    critical: 'text-red-400 bg-red-900/30'
  };

  const statusIcons = {
    healthy: '✓',
    at_risk: '⚠',
    critical: '✕'
  };

  const handleLinkIssue = () => {
    if (selectedOpp && linkingIssue) {
      onLinkIssue(selectedOpp, linkingIssue);
      setLinkingIssue(null);
      setSelectedOpp(null);
    }
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
      <div 
        className="p-3 cursor-pointer hover:bg-slate-800 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${statusColors[health.status]}`}>
                {statusIcons[health.status]}
              </span>
              <h4 className="font-medium text-white">🎯 {health.milestoneTitle}</h4>
            </div>
            {health.concerns?.length > 0 && (
              <p className="text-xs text-slate-400 mt-1">{health.concerns[0]}</p>
            )}
          </div>
          {health.unlinkedIssues?.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-xs rounded-full">
              {health.unlinkedIssues.length} unlinked
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-700 pt-3 space-y-3">
          {health.concerns?.length > 0 && (
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Concerns</div>
              <ul className="text-xs text-slate-400 space-y-1">
                {health.concerns.map((concern, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-amber-500">•</span>
                    {concern}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {health.unlinkedIssues?.length > 0 && (
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Issues to Link</div>
              <div className="space-y-1">
                {health.unlinkedIssues.map(issue => (
                  <div key={issue.identifier} className="flex items-center justify-between gap-2 p-2 bg-slate-900 rounded">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-slate-400">{issue.identifier}</span>
                      <span className="text-xs text-slate-300 truncate">{issue.title}</span>
                    </div>
                    {linkingIssue === issue ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={selectedOpp || ''}
                          onChange={(e) => setSelectedOpp(Number(e.target.value))}
                          className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="">Select...</option>
                          {opportunities.map(opp => (
                            <option key={opp.id} value={opp.id}>{opp.title}</option>
                          ))}
                        </select>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleLinkIssue(); }}
                          disabled={!selectedOpp}
                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded disabled:opacity-50"
                        >
                          Link
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setLinkingIssue(null); }}
                          className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setLinkingIssue(issue); }}
                        className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-400 text-xs rounded transition-colors"
                      >
                        Link
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =====================================
// MAIN LINEAR SYNC MODAL COMPONENT
// =====================================
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
  const [keyInput, setKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  
  // Track dismissed items
  const [dismissedNewOpps, setDismissedNewOpps] = useState(new Set());
  const [dismissedScopeChanges, setDismissedScopeChanges] = useState(new Set());

  useEffect(() => {
    setKeyInput(linearApiKey);
  }, [linearApiKey]);

  const saveApiKey = () => {
    setLinearApiKey(keyInput);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pulseboard_linear_key', keyInput);
    }
  };

  // Helper to check if a suggested opportunity is a duplicate of existing
  const isDuplicateOpportunity = (suggestion) => {
    const suggestedLower = (suggestion.suggestedTitle || suggestion.title || '').toLowerCase().trim();
    
    for (const opp of opportunities) {
      const existingLower = opp.title.toLowerCase().trim();
      
      // Exact match
      if (suggestedLower === existingLower) return true;
      
      // One contains the other
      if (suggestedLower.includes(existingLower) || existingLower.includes(suggestedLower)) return true;
      
      // High word overlap
      const suggestedWords = new Set(suggestedLower.split(/\s+/).filter(w => w.length > 3));
      const existingWords = new Set(existingLower.split(/\s+/).filter(w => w.length > 3));
      
      if (suggestedWords.size > 0 && existingWords.size > 0) {
        let matchCount = 0;
        for (const word of suggestedWords) {
          if (existingWords.has(word)) matchCount++;
        }
        const overlapRatio = matchCount / Math.min(suggestedWords.size, existingWords.size);
        if (overlapRatio > 0.6) return true;
      }
      
      // Check if related issues already linked
      if (suggestion.relatedIssues && suggestion.relatedIssues.length > 0 && opp.issues && opp.issues.length > 0) {
        const suggestionIssues = new Set(suggestion.relatedIssues);
        if (opp.issues.some(i => suggestionIssues.has(i))) return true;
      }
    }
    
    return false;
  };

  const handleSync = async () => {
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
          opportunities,
          milestones,
          linearApiKey,
          excludedIssues
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }

      const data = await response.json();
      
      // Additional client-side filtering for duplicate new opportunity suggestions
      if (data.analysis?.newOpportunities) {
        data.analysis.newOpportunities = data.analysis.newOpportunities.filter(
          suggestion => !isDuplicateOpportunity(suggestion)
        );
      }
      
      setAnalysis(data.analysis || data);
      
      if (onSyncComplete) {
        onSyncComplete(new Date().toISOString());
      }
    } catch (err) {
      console.error('Sync error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handlers for actions
  const handleCreateOpportunity = (opp) => {
    onCreateOpportunity(opp);
    // Remove from newOpportunities in analysis
    if (analysis) {
      setAnalysis({
        ...analysis,
        newOpportunities: analysis.newOpportunities?.filter(n => n.title !== opp.title) || []
      });
    }
  };

  const handleLinkToExisting = (opportunityId, issues) => {
    onLinkIssues(opportunityId, issues);
  };

  const handleIgnoreNewOpp = (title) => {
    setDismissedNewOpps(prev => new Set([...prev, title]));
  };

  const handleAcknowledgeScopeChange = (oppId) => {
    setDismissedScopeChanges(prev => new Set([...prev, oppId]));
  };

  const handleFlagAtRisk = (oppId, reason) => {
    const opp = opportunities.find(o => o.id === oppId);
    if (opp) {
      onUpdateOpportunity({ ...opp, atRisk: true, atRiskReason: reason });
    }
    setDismissedScopeChanges(prev => new Set([...prev, oppId]));
  };

  const handleLinkScopeChangeIssues = (oppId, issues) => {
    onLinkIssues(oppId, issues);
    setDismissedScopeChanges(prev => new Set([...prev, oppId]));
  };

  // Handler for when orphaned issue action is finalized (after fade out)
  const handleOrphanActionComplete = (issueIdentifier, actionType) => {
    // Remove the issue from the analysis state
    if (analysis) {
      setAnalysis({
        ...analysis,
        orphanedIssues: analysis.orphanedIssues?.filter(i => i.identifier !== issueIdentifier) || []
      });
    }
  };

  // Handler for creating opportunity from orphaned issue
  const handleCreateFromOrphan = (opp) => {
    onCreateOpportunity(opp);
    // Note: Don't remove from analysis here - let the card handle the visual feedback
    // The card will call onActionComplete after the fade animation
  };

  // Handler for linking orphaned issue to existing opportunity
  const handleLinkOrphanToExisting = (opportunityId, issues) => {
    onLinkIssues(opportunityId, issues);
    // Note: Don't remove from analysis here - let the card handle the visual feedback
  };

  // Handler for excluding orphaned issue
  const handleExcludeOrphan = (issue, reason) => {
    // Save to localStorage
    const excluded = JSON.parse(localStorage.getItem('pulseboard_excluded_issues') || '[]');
    if (!excluded.find(e => e.identifier === issue.identifier)) {
      localStorage.setItem('pulseboard_excluded_issues', JSON.stringify([
        ...excluded, 
        { identifier: issue.identifier, reason, excludedAt: new Date().toISOString() }
      ]));
    }
    
    // Note: Don't remove from analysis here - let the card handle the visual feedback
    
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
        milestoneHealth: analysis.milestoneHealth?.map(h => ({
          ...h,
          unlinkedIssues: h.unlinkedIssues?.filter(i => i.identifier !== issue.identifier) || []
        })) || []
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
                  ? `Last synced ${new Date(lastSyncAt).toLocaleString()}`
                  : 'Analyze Linear issues to find roadmap opportunities'
                }
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* API Key Input */}
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
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            onClick={handleSync}
            disabled={loading || !linearApiKey}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-3">
                <StatCard 
                  icon="📊" 
                  label="Issues Analyzed" 
                  value={analysis.summary?.totalIssuesAnalyzed || 0} 
                  color="blue" 
                />
                <StatCard 
                  icon="🆕" 
                  label="New Opportunities" 
                  value={analysis.summary?.newOpportunitiesFound || 0} 
                  color="emerald" 
                />
                <StatCard 
                  icon="📈" 
                  label="Scope Changes" 
                  value={analysis.summary?.scopeChangesDetected || 0} 
                  color="amber" 
                />
                <StatCard 
                  icon="🔗" 
                  label="Orphaned Issues" 
                  value={analysis.orphanedIssues?.length || 0} 
                  color="blue" 
                />
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

              {/* Orphaned Issues - ENHANCED WITH CONVERSION */}
              {analysis.orphanedIssues?.length > 0 && (
                <div className="space-y-3">
                  <SectionHeader 
                    icon="🔗" 
                    title="Orphaned Issues" 
                    count={analysis.orphanedIssues.length}
                    color="blue"
                  />
                  <p className="text-xs text-slate-400 -mt-1 mb-2">
                    These Linear issues aren't linked to any roadmap opportunity. Create new opportunities or link them to existing ones.
                  </p>
                  {analysis.orphanedIssues.map((issue, idx) => (
                    <OrphanedIssueCard
                      key={issue.identifier || idx}
                      issue={issue}
                      onCreateOpportunity={handleCreateFromOrphan}
                      onLinkToExisting={handleLinkOrphanToExisting}
                      onExclude={handleExcludeOrphan}
                      onActionComplete={handleOrphanActionComplete}
                      existingOpportunities={opportunities}
                      milestones={milestones}
                    />
                  ))}
                </div>
              )}

              {/* Milestone Health */}
              {analysis.milestoneHealth?.length > 0 && (
                <div className="space-y-3">
                  <SectionHeader 
                    icon="🎯" 
                    title="Milestone Health" 
                    count={analysis.milestoneHealth.length}
                    color="purple"
                  />
                  {analysis.milestoneHealth.map((health, idx) => (
                    <MilestoneHealthCard
                      key={health.milestoneId || idx}
                      health={health}
                      onLinkIssue={handleLinkMilestoneIssue}
                      opportunities={opportunities}
                    />
                  ))}
                </div>
              )}

              {/* Empty State - All Clear */}
              {visibleNewOpps.length === 0 && 
               visibleScopeChanges.length === 0 && 
               !analysis.orphanedIssues?.length &&
               !analysis.milestoneHealth?.length && (
                <div className="text-center py-8 text-slate-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium text-emerald-400">All synced!</p>
                  <p className="text-xs mt-1">Your roadmap is aligned with Linear issues</p>
                </div>
              )}
            </div>
          )}

          {/* Empty State - Before Sync */}
          {!loading && !analysis && !error && linearApiKey && (
            <div className="text-center py-8 text-slate-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Click "Analyze Linear Issues" to sync your roadmap</p>
              <p className="text-xs mt-1">Claude will analyze your Linear issues and suggest updates</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
