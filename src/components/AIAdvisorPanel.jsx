import React, { useState } from 'react';

const ANALYSIS_TYPES = [
  { 
    id: 'full', 
    label: 'Full Analysis', 
    icon: '🎯',
    description: 'Comprehensive roadmap review',
    color: 'indigo'
  },
  { 
    id: 'prioritization', 
    label: 'Prioritization', 
    icon: '📊',
    description: 'What to focus on and deprioritize',
    color: 'blue'
  },
  { 
    id: 'gaps', 
    label: 'Find Gaps', 
    icon: '🔍',
    description: 'Missing opportunities and coverage',
    color: 'emerald'
  },
  { 
    id: 'risks', 
    label: 'Risk Analysis', 
    icon: '⚠️',
    description: 'Identify threats and blockers',
    color: 'orange'
  },
  { 
    id: 'milestones', 
    label: 'Milestone Review', 
    icon: '🎯',
    description: 'Milestone health and suggestions',
    color: 'yellow'
  },
];

export default function AIAdvisorPanel({ 
  isOpen, 
  onClose, 
  opportunities, 
  milestones, 
  teamMembers,
  assignments 
}) {
  const [selectedType, setSelectedType] = useState('full');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [stats, setStats] = useState(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    
    try {
      const response = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunities,
          milestones,
          teamMembers,
          assignments,
          analysisType: selectedType
        })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Analysis failed');
      }
      
      const data = await response.json();
      setAnalysis(data.analysis);
      setStats(data.stats);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Simple markdown-like rendering
  const renderAnalysis = (text) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    const elements = [];
    let currentList = [];
    let listType = null;
    
    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="space-y-1 mb-4">
            {currentList.map((item, i) => (
              <li key={i} className="flex gap-2 text-slate-300 text-sm">
                <span className="text-slate-500 flex-shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };
    
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      
      // Headers
      if (trimmed.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={i} className="text-lg font-semibold text-white mt-6 mb-3 pb-2 border-b border-slate-700">
            {trimmed.replace('## ', '')}
          </h2>
        );
      } else if (trimmed.startsWith('# ')) {
        flushList();
        elements.push(
          <h1 key={i} className="text-xl font-bold text-white mt-4 mb-3">
            {trimmed.replace('# ', '')}
          </h1>
        );
      } else if (trimmed.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={i} className="text-base font-semibold text-slate-200 mt-4 mb-2">
            {trimmed.replace('### ', '')}
          </h3>
        );
      }
      // Bold lines (like **Title**)
      else if (trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.includes(': ')) {
        flushList();
        elements.push(
          <p key={i} className="font-semibold text-slate-200 mt-4 mb-2">
            {trimmed.replace(/\*\*/g, '')}
          </p>
        );
      }
      // List items
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
        const content = trimmed.replace(/^[-*]\s/, '').replace(/^\d+\.\s/, '');
        // Handle bold within list items
        const formatted = content.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white">$1</strong>');
        currentList.push(<span dangerouslySetInnerHTML={{ __html: formatted }} />);
      }
      // Regular paragraphs
      else if (trimmed.length > 0) {
        flushList();
        // Handle bold and inline formatting
        const formatted = trimmed
          .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white">$1</strong>')
          .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-slate-800 rounded text-indigo-300 text-xs">$1</code>');
        elements.push(
          <p key={i} className="text-slate-300 text-sm mb-3 leading-relaxed" 
             dangerouslySetInnerHTML={{ __html: formatted }} />
        );
      }
    });
    
    flushList();
    return elements;
  };

  if (!isOpen) return null;

  const selectedTypeInfo = ANALYSIS_TYPES.find(t => t.id === selectedType);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-purple-900/50 to-indigo-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">AI Roadmap Advisor</h2>
                <p className="text-xs text-slate-400">Powered by Claude • Analyzes your roadmap and suggests improvements</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Analysis Type Selection */}
        <div className="p-4 border-b border-slate-800 bg-slate-800/30">
          <div className="flex flex-wrap gap-2">
            {ANALYSIS_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  selectedType === type.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {selectedTypeInfo?.description}
          </p>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Stats Bar */}
          {!analysis && !loading && (
            <div className="grid grid-cols-5 gap-3 mb-6">
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white">{opportunities.length}</div>
                <div className="text-xs text-slate-500">Opportunities</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-400">{milestones.length}</div>
                <div className="text-xs text-slate-500">Milestones</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-emerald-400">{teamMembers.length}</div>
                <div className="text-xs text-slate-500">Team Members</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {opportunities.filter(o => o.atRisk).length}
                </div>
                <div className="text-xs text-slate-500">At Risk</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-slate-400">
                  {opportunities.filter(o => !assignments[o.id] || assignments[o.id].length === 0).length}
                </div>
                <div className="text-xs text-slate-500">Unassigned</div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
              </div>
              <p className="text-slate-400 mt-4">Claude is analyzing your roadmap...</p>
              <p className="text-slate-500 text-sm mt-1">This may take 10-20 seconds</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-red-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Analysis Failed</span>
              </div>
              <p className="text-red-300 text-sm mt-2">{error}</p>
              <p className="text-red-400/70 text-xs mt-2">
                Make sure ANTHROPIC_API_KEY is set in your Vercel environment variables.
              </p>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && !loading && (
            <div className="prose prose-invert max-w-none">
              {renderAnalysis(analysis)}
            </div>
          )}

          {/* Empty State */}
          {!analysis && !loading && !error && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold text-white mb-2">Ready to Analyze</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                Select an analysis type above and click "Run Analysis" to get AI-powered 
                insights about your roadmap, priorities, gaps, and risks.
              </p>
              <div className="flex justify-center gap-4 text-xs text-slate-500">
                <span>📊 {opportunities.length} opportunities</span>
                <span>🎯 {milestones.length} milestones</span>
                <span>👥 {teamMembers.length} team members</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-800/30">
          <div className="text-xs text-slate-500">
            {analysis && stats && (
              <span>
                Analyzed {stats.opportunities} opportunities, {stats.milestones} milestones • 
                {stats.atRisk} at risk, {stats.unassigned} unassigned
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {analysis && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(analysis);
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy
              </button>
            )}
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Run Analysis
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
