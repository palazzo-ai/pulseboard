import React, { useState, useMemo } from 'react';

// Component for managing dependencies on a single opportunity
export default function DependencyEditor({
  opportunity,
  opportunities,
  onUpdateDependencies,
  onClose,
  getAreaName,
  getInitiativeColor,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('blocks'); // 'blocks' | 'blockedBy'

  // Get current dependencies
  const currentBlocks = opportunity.blocks || [];
  const currentBlockedBy = opportunity.blockedBy || [];

  // Filter available opportunities for adding
  const availableOpportunities = useMemo(() => {
    const excludeIds = new Set([
      opportunity.id,
      ...currentBlocks,
      ...currentBlockedBy,
    ]);

    return opportunities.filter(o => {
      if (excludeIds.has(o.id)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return o.title.toLowerCase().includes(q) || 
               o.area.toLowerCase().includes(q) ||
               (o.issues || []).some(i => i.toLowerCase().includes(q));
      }
      return true;
    });
  }, [opportunities, opportunity.id, currentBlocks, currentBlockedBy, searchQuery]);

  // Get full opportunity objects for current dependencies
  const blocksOpps = opportunities.filter(o => currentBlocks.includes(o.id));
  const blockedByOpps = opportunities.filter(o => currentBlockedBy.includes(o.id));

  // Add a dependency
  const handleAddDependency = (targetOpp, type) => {
    if (type === 'blocks') {
      // This opportunity blocks targetOpp
      onUpdateDependencies(opportunity.id, targetOpp.id, 'add-blocks');
    } else {
      // This opportunity is blocked by targetOpp
      onUpdateDependencies(opportunity.id, targetOpp.id, 'add-blocked-by');
    }
  };

  // Remove a dependency
  const handleRemoveDependency = (targetId, type) => {
    if (type === 'blocks') {
      onUpdateDependencies(opportunity.id, targetId, 'remove-blocks');
    } else {
      onUpdateDependencies(opportunity.id, targetId, 'remove-blocked-by');
    }
  };

  const OppListItem = ({ opp, actionType, onAction, actionLabel, actionColor = 'indigo' }) => (
    <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg group">
      <div 
        className="w-1 h-8 rounded-full flex-shrink-0"
        style={{ backgroundColor: getInitiativeColor?.(opp.initiative) || '#6b7280' }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">{opp.title}</div>
        <div className="text-[10px] text-slate-500">
          {getAreaName?.(opp.area)} • {opp.status}
        </div>
      </div>
      <button
        onClick={() => onAction(opp)}
        className={`px-2 py-1 text-xs rounded transition-colors opacity-0 group-hover:opacity-100 bg-${actionColor}-600 hover:bg-${actionColor}-500 text-white`}
      >
        {actionLabel}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-indigo-900/50 to-purple-900/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>🔗</span> Manage Dependencies
              </h2>
              <p className="text-xs text-slate-400 mt-1 truncate max-w-md">
                {opportunity.title}
              </p>
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
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('blocks')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'blocks'
                ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span className="mr-2">→</span>
            Blocks ({blocksOpps.length})
            <span className="text-[10px] text-slate-500 ml-2 block">
              Items that depend on this
            </span>
          </button>
          <button
            onClick={() => setActiveTab('blockedBy')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'blockedBy'
                ? 'text-orange-400 border-b-2 border-orange-400 bg-orange-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span className="mr-2">←</span>
            Blocked By ({blockedByOpps.length})
            <span className="text-[10px] text-slate-500 ml-2 block">
              Items this depends on
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Current Dependencies */}
          <div>
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              {activeTab === 'blocks' ? 'Currently Blocks' : 'Currently Blocked By'}
            </h3>
            
            {(activeTab === 'blocks' ? blocksOpps : blockedByOpps).length === 0 ? (
              <div className="text-sm text-slate-500 italic p-4 bg-slate-800/30 rounded-lg text-center">
                No {activeTab === 'blocks' ? 'downstream dependencies' : 'upstream dependencies'} yet
              </div>
            ) : (
              <div className="space-y-2">
                {(activeTab === 'blocks' ? blocksOpps : blockedByOpps).map(opp => (
                  <OppListItem
                    key={opp.id}
                    opp={opp}
                    actionLabel="Remove"
                    actionColor="red"
                    onAction={() => handleRemoveDependency(opp.id, activeTab)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700" />

          {/* Add New Dependency */}
          <div>
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              Add {activeTab === 'blocks' ? 'Downstream Dependency' : 'Upstream Dependency'}
            </h3>
            
            {/* Search */}
            <div className="relative mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search opportunities..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Available Opportunities */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {availableOpportunities.length === 0 ? (
                <div className="text-sm text-slate-500 italic p-4 bg-slate-800/30 rounded-lg text-center">
                  {searchQuery ? 'No matching opportunities' : 'All opportunities are already linked'}
                </div>
              ) : (
                availableOpportunities.slice(0, 20).map(opp => (
                  <OppListItem
                    key={opp.id}
                    opp={opp}
                    actionLabel={activeTab === 'blocks' ? '+ This Blocks' : '+ Blocks This'}
                    actionColor={activeTab === 'blocks' ? 'indigo' : 'orange'}
                    onAction={(o) => handleAddDependency(o, activeTab)}
                  />
                ))
              )}
              {availableOpportunities.length > 20 && (
                <div className="text-xs text-slate-500 text-center py-2">
                  {availableOpportunities.length - 20} more opportunities... use search to filter
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with explanation */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-800/30">
          <div className="text-[10px] text-slate-500 flex items-start gap-3">
            <div className="flex-1">
              <strong className="text-indigo-400">→ Blocks:</strong> Work that cannot start until this opportunity is done
            </div>
            <div className="flex-1">
              <strong className="text-orange-400">← Blocked By:</strong> Work that must finish before this can start
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Small inline badge to show dependency count on opportunity cards
export function DependencyBadge({ opportunity, onClick }) {
  const blocksCount = opportunity.blocks?.length || 0;
  const blockedByCount = opportunity.blockedBy?.length || 0;
  const total = blocksCount + blockedByCount;

  if (total === 0) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded text-[9px] font-medium transition-colors"
      title={`${blocksCount} blocked by this, ${blockedByCount} blocking this`}
    >
      <span>🔗</span>
      <span>{total}</span>
      {blockedByCount > 0 && (
        <span className="text-orange-400 ml-0.5">⚠</span>
      )}
    </button>
  );
}
