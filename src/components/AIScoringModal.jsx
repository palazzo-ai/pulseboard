import React, { useState } from 'react';

const STATUSES = {
  not_started: { label: 'Not Started', color: '#6b7280', bgColor: '#6b728020' },
  in_progress: { label: 'In Progress', color: '#3b82f6', bgColor: '#3b82f620' },
  done: { label: 'Done', color: '#22c55e', bgColor: '#22c55e20' },
  blocked: { label: 'Blocked', color: '#ef4444', bgColor: '#ef444420' }
};

// Mini matrix preview showing current vs suggested position
const MiniMatrix = ({ current, suggested, onAdjust }) => {
  const [adjusted, setAdjusted] = useState(suggested);
  
  const getPosition = (impact, effort) => ({
    left: `${effort}%`,
    bottom: `${impact}%`,
  });

  const handleDrag = (e) => {
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, 100 - ((e.clientY - rect.top) / rect.height) * 100));
    setAdjusted({ impact: Math.round(y), effort: Math.round(x) });
    onAdjust({ impact: Math.round(y), effort: Math.round(x) });
  };

  return (
    <div className="relative w-24 h-24 bg-slate-900 rounded border border-slate-700 overflow-hidden">
      {/* Quadrant backgrounds */}
      <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-emerald-500/10" />
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-500/10" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-slate-500/10" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-red-500/10" />
      
      {/* Center lines */}
      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-600" />
      <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-600" />
      
      {/* Current position (gray dot) */}
      {current.impact !== null && (
        <div 
          className="absolute w-2 h-2 rounded-full bg-slate-500 border border-slate-400 transform -translate-x-1/2 translate-y-1/2"
          style={getPosition(current.impact, current.effort)}
          title={`Current: Impact ${current.impact}, Effort ${current.effort}`}
        />
      )}
      
      {/* Suggested/Adjusted position (draggable) */}
      <div 
        className="absolute w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow-lg transform -translate-x-1/2 translate-y-1/2 cursor-move hover:scale-125 transition-transform"
        style={getPosition(adjusted.impact, adjusted.effort)}
        title={`Suggested: Impact ${adjusted.impact}, Effort ${adjusted.effort}`}
        draggable
        onDrag={handleDrag}
        onDragEnd={handleDrag}
      />
    </div>
  );
};

// Individual suggestion card
const SuggestionCard = ({ 
  opportunity, 
  suggestion, 
  getInitiativeColor,
  getAreaName,
  onAccept, 
  onReject,
  onAdjust,
  accepted,
  rejected 
}) => {
  const [adjustedScores, setAdjustedScores] = useState({
    impact: suggestion.impactScore,
    effort: suggestion.effortScore
  });
  
  const currentScores = {
    impact: opportunity.impactScore ?? null,
    effort: opportunity.effortScore ?? null
  };
  
  const hasCurrentScores = currentScores.impact !== null;
  const initiativeColor = getInitiativeColor?.(opportunity.initiative) || '#6b7280';
  const statusInfo = STATUSES[opportunity.status] || STATUSES.not_started;

  const handleAdjust = (newScores) => {
    setAdjustedScores(newScores);
    onAdjust(opportunity.id, newScores);
  };

  const getQuadrantName = (impact, effort) => {
    if (impact >= 50 && effort < 50) return { name: 'Quick Win', emoji: '🚀', color: 'text-emerald-400' };
    if (impact >= 50 && effort >= 50) return { name: 'Major Project', emoji: '🎯', color: 'text-blue-400' };
    if (impact < 50 && effort < 50) return { name: 'Fill-In', emoji: '📝', color: 'text-slate-400' };
    return { name: 'Avoid', emoji: '⚠️', color: 'text-red-400' };
  };

  const quadrant = getQuadrantName(adjustedScores.impact, adjustedScores.effort);

  return (
    <div className={`
      p-3 rounded-lg border transition-all
      ${accepted ? 'bg-emerald-900/20 border-emerald-600/50' : 
        rejected ? 'bg-slate-800/30 border-slate-700/50 opacity-50' : 
        'bg-slate-800/50 border-slate-700 hover:border-slate-600'}
    `}>
      <div className="flex gap-3">
        {/* Mini Matrix */}
        <div className="flex-shrink-0">
          <MiniMatrix 
            current={currentScores}
            suggested={adjustedScores}
            onAdjust={handleAdjust}
          />
          <div className="text-center mt-1">
            <span className={`text-[10px] ${quadrant.color}`}>
              {quadrant.emoji} {quadrant.name}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start gap-2 mb-1">
            <div 
              className="w-1 h-4 rounded-full flex-shrink-0 mt-0.5"
              style={{ backgroundColor: initiativeColor }}
            />
            <h4 className="text-sm font-medium text-white leading-tight flex-1">
              {opportunity.title}
            </h4>
            <span 
              className="px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
              style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
            >
              {statusInfo.label}
            </span>
          </div>

          {/* Meta */}
          <div className="text-[11px] text-slate-500 mb-2">
            {getAreaName?.(opportunity.area) || opportunity.area}
            {opportunity.milestoneId && <span className="ml-2">🎯 Milestone linked</span>}
            {opportunity.issues?.length > 0 && <span className="ml-2">#{opportunity.issues.length} issues</span>}
          </div>

          {/* Reasoning */}
          <div className="text-[11px] text-slate-400 mb-2 leading-relaxed">
            {suggestion.reasoning}
          </div>

          {/* Scores */}
          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1">
              <span className="text-slate-500">Impact:</span>
              <span className="font-medium text-indigo-400">{adjustedScores.impact}</span>
              {hasCurrentScores && currentScores.impact !== adjustedScores.impact && (
                <span className="text-slate-600">(was {currentScores.impact})</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-500">Effort:</span>
              <span className="font-medium text-indigo-400">{adjustedScores.effort}</span>
              {hasCurrentScores && currentScores.effort !== adjustedScores.effort && (
                <span className="text-slate-600">(was {currentScores.effort})</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          {!accepted && !rejected && (
            <>
              <button
                onClick={() => onAccept(opportunity.id, adjustedScores)}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-medium rounded transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => onReject(opportunity.id)}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] font-medium rounded transition-colors"
              >
                Skip
              </button>
            </>
          )}
          {accepted && (
            <span className="text-emerald-400 text-[10px] font-medium">✓ Applied</span>
          )}
          {rejected && (
            <button
              onClick={() => onReject(opportunity.id, true)} // undo
              className="text-slate-500 hover:text-slate-300 text-[10px]"
            >
              Undo skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Modal Component
export default function AIScoringModal({
  isOpen,
  onClose,
  opportunities,
  milestones,
  assignments,
  onUpdateOpportunity,
  getInitiativeColor,
  getAreaName,
  getInitiativeName,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [accepted, setAccepted] = useState(new Set());
  const [rejected, setRejected] = useState(new Set());
  const [adjustments, setAdjustments] = useState({}); // oppId -> { impact, effort }
  const [mode, setMode] = useState('unscored'); // 'unscored' | 'all' | 'selected'

  if (!isOpen) return null;

  const unscoredOpps = opportunities.filter(o => 
    o.impactScore === undefined || o.impactScore === null ||
    o.effortScore === undefined || o.effortScore === null
  );

  const oppsToAnalyze = mode === 'unscored' ? unscoredOpps : opportunities;

  const analyzewithClaude = async () => {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setAccepted(new Set());
    setRejected(new Set());
    setAdjustments({});

    try {
      // Build context for the API
      const context = {
        opportunities: oppsToAnalyze.map(o => ({
          id: o.id,
          title: o.title,
          description: o.description || '',
          area: getAreaName?.(o.area) || o.area,
          initiative: getInitiativeName?.(o.initiative) || o.initiative,
          status: o.status,
          atRisk: o.atRisk,
          issueCount: o.issues?.length || 0,
          hasMilestone: !!o.milestoneId,
          milestoneName: o.milestoneId ? milestones?.find(m => m.id === o.milestoneId)?.title : null,
          assigneeCount: assignments?.[o.id]?.length || 0,
          currentImpact: o.impactScore ?? null,
          currentEffort: o.effortScore ?? null,
        })),
        milestones: milestones?.slice(0, 10).map(m => ({
          title: m.title,
          area: getAreaName?.(m.area) || m.area,
          month: m.month,
        })),
      };

      // Call the serverless API endpoint instead of Anthropic directly
      const response = await fetch('/api/ai-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(context)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.scores && Array.isArray(data.scores)) {
        setSuggestions(data.scores);
      } else {
        throw new Error('Invalid response format from API');
      }
      
    } catch (err) {
      console.error('AI Scoring error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = (oppId, scores) => {
    const opp = opportunities.find(o => o.id === oppId);
    if (opp) {
      onUpdateOpportunity({
        ...opp,
        impactScore: scores.impact,
        effortScore: scores.effort,
      });
      setAccepted(prev => new Set([...prev, oppId]));
      setRejected(prev => {
        const next = new Set(prev);
        next.delete(oppId);
        return next;
      });
    }
  };

  const handleReject = (oppId, undo = false) => {
    if (undo) {
      setRejected(prev => {
        const next = new Set(prev);
        next.delete(oppId);
        return next;
      });
    } else {
      setRejected(prev => new Set([...prev, oppId]));
    }
  };

  const handleAdjust = (oppId, scores) => {
    setAdjustments(prev => ({ ...prev, [oppId]: scores }));
  };

  const handleAcceptAll = () => {
    suggestions.forEach(s => {
      if (!accepted.has(s.id) && !rejected.has(s.id)) {
        const scores = adjustments[s.id] || { impact: s.impactScore, effort: s.effortScore };
        handleAccept(s.id, scores);
      }
    });
  };

  const pendingCount = suggestions.filter(s => !accepted.has(s.id) && !rejected.has(s.id)).length;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-violet-900/50 to-indigo-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <span className="text-lg">🤖</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">AI-Assisted Scoring</h2>
                <p className="text-xs text-slate-400">Let Claude suggest Impact & Effort scores</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-slate-800 bg-slate-800/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Analyze:</span>
              <button
                onClick={() => setMode('unscored')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  mode === 'unscored' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Unscored ({unscoredOpps.length})
              </button>
              <button
                onClick={() => setMode('all')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  mode === 'all' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                All ({opportunities.length})
              </button>
            </div>

            <button
              onClick={analyzewithClaude}
              disabled={loading || oppsToAnalyze.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <span>✨</span>
                  Analyze with Claude
                </>
              )}
            </button>
          </div>
          
          {oppsToAnalyze.length === 0 && (
            <p className="text-xs text-amber-400 mt-2">
              All opportunities already have scores. Switch to "All" to re-analyze.
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {suggestions.length === 0 && !loading && !error && (
            <div className="text-center py-12 text-slate-500">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-sm">Click "Analyze with Claude" to get scoring suggestions</p>
              <p className="text-xs mt-1 text-slate-600">
                Claude will analyze {oppsToAnalyze.length} opportunities and suggest Impact/Effort scores
              </p>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="space-y-3">
              {suggestions.map(suggestion => {
                const opp = opportunities.find(o => o.id === suggestion.id);
                if (!opp) return null;
                return (
                  <SuggestionCard
                    key={suggestion.id}
                    opportunity={opp}
                    suggestion={suggestion}
                    getInitiativeColor={getInitiativeColor}
                    getAreaName={getAreaName}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onAdjust={handleAdjust}
                    accepted={accepted.has(suggestion.id)}
                    rejected={rejected.has(suggestion.id)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {suggestions.length > 0 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              <span className="text-emerald-400">{accepted.size} accepted</span>
              {rejected.size > 0 && <span className="ml-2 text-slate-500">{rejected.size} skipped</span>}
              {pendingCount > 0 && <span className="ml-2">{pendingCount} pending</span>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
              >
                Close
              </button>
              {pendingCount > 0 && (
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Accept All ({pendingCount})
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
