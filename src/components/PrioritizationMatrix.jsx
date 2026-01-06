import React, { useState, useRef, useCallback } from 'react';

const STATUSES = {
  not_started: { label: 'Not Started', color: '#6b7280', bgColor: '#6b728020' },
  in_progress: { label: 'In Progress', color: '#3b82f6', bgColor: '#3b82f620' },
  done: { label: 'Done', color: '#22c55e', bgColor: '#22c55e20' },
  blocked: { label: 'Blocked', color: '#ef4444', bgColor: '#ef444420' }
};

// Card dimensions
const CARD_WIDTH = 160;
const CARD_HEIGHT = 72;

// Opportunity Card Component - positioned absolutely on the canvas
const OpportunityCard = ({ 
  opportunity, 
  position,
  getInitiativeColor, 
  getAreaName,
  milestones,
  assignments,
  isDragging,
  onMouseDown,
  onClick,
}) => {
  const statusInfo = STATUSES[opportunity.status] || STATUSES.not_started;
  const milestone = opportunity.milestoneId ? milestones?.find(m => m.id === opportunity.milestoneId) : null;
  const assigneeCount = assignments?.[opportunity.id]?.length || 0;
  const initiativeColor = getInitiativeColor?.(opportunity.initiative) || '#6b7280';

  return (
    <div
      className={`
        absolute select-none transition-shadow duration-150
        ${isDragging ? 'z-50 cursor-grabbing shadow-2xl shadow-indigo-500/30' : 'z-10 cursor-grab hover:z-20'}
      `}
      style={{
        left: position.x,
        top: position.y,
        width: CARD_WIDTH,
        transform: 'translate(-50%, -50%)',
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <div
        className={`
          relative p-2 rounded-lg border transition-all duration-150
          ${isDragging 
            ? 'border-indigo-500 bg-slate-800 scale-105' 
            : 'border-slate-700/60 bg-slate-800/90 hover:border-slate-500 hover:bg-slate-800'
          }
          ${opportunity.atRisk ? 'ring-1 ring-orange-500/50' : ''}
        `}
      >
        {/* Initiative color bar */}
        <div 
          className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full"
          style={{ backgroundColor: initiativeColor }}
        />

        {/* Content */}
        <div className="pl-2">
          {/* Title row */}
          <div className="flex items-start justify-between gap-1 mb-0.5">
            <h4 className="text-[11px] font-medium text-white leading-tight line-clamp-2 flex-1">
              {opportunity.title}
            </h4>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {opportunity.atRisk && (
                <span className="text-[10px]" title="At Risk">⚠️</span>
              )}
              {opportunity.status === 'done' && (
                <span className="text-emerald-400 text-[10px]">✓</span>
              )}
            </div>
          </div>

          {/* Area */}
          <div className="text-[9px] text-slate-500 mb-1">
            {getAreaName?.(opportunity.area) || opportunity.area}
          </div>

          {/* Metadata row */}
          <div className="flex items-center gap-1 flex-wrap">
            {/* Status badge */}
            <span 
              className="px-1 py-0.5 rounded text-[8px] font-medium"
              style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
            >
              {statusInfo.label}
            </span>

            {/* Milestone */}
            {milestone && (
              <span className="text-[8px] text-yellow-500/70 flex items-center gap-0.5 truncate max-w-[60px]">
                🎯 {milestone.title}
              </span>
            )}

            {/* Spacer */}
            <span className="flex-1" />

            {/* Assignees */}
            {assigneeCount > 0 && (
              <span className="text-[8px] text-slate-500">
                👤{assigneeCount}
              </span>
            )}

            {/* Issues */}
            {opportunity.issues?.length > 0 && (
              <span className="text-[8px] text-slate-500">
                #{opportunity.issues.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function PrioritizationMatrix({
  opportunities,
  milestones,
  assignments,
  onUpdateOpportunity,
  onSelectOpportunity,
  onOpenAIScoring, // NEW: callback to open AI scoring modal
  getInitiativeColor,
  getAreaName,
  filterInitiative,
  filterArea,
  filterStatus,
}) {
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null); // { oppId, startX, startY, startImpact, startEffort }
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Measure container
  const measureContainer = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    }
  }, []);

  // Measure on mount and resize
  React.useEffect(() => {
    measureContainer();
    window.addEventListener('resize', measureContainer);
    return () => window.removeEventListener('resize', measureContainer);
  }, [measureContainer]);

  // Filter opportunities (supports multi-select arrays)
  const filteredOpportunities = opportunities.filter(opp => {
    // Initiative filter (array)
    if (filterInitiative?.length > 0 && !filterInitiative.includes(opp.initiative)) return false;
    // Area filter (array)
    if (filterArea?.length > 0 && !filterArea.includes(opp.area)) return false;
    // Status filter (array, with special 'at_risk' handling)
    if (filterStatus?.length > 0) {
      const hasAtRisk = filterStatus.includes('at_risk');
      const statusFilters = filterStatus.filter(s => s !== 'at_risk');
      const matchesStatus = statusFilters.length === 0 || statusFilters.includes(opp.status);
      const matchesAtRisk = hasAtRisk && opp.atRisk;
      // If only at_risk selected, show only at-risk items
      // If statuses selected, show matching statuses OR at-risk items (if at_risk also selected)
      if (hasAtRisk && statusFilters.length === 0) {
        if (!opp.atRisk) return false;
      } else if (hasAtRisk) {
        if (!matchesStatus && !matchesAtRisk) return false;
      } else {
        if (!matchesStatus) return false;
      }
    }
    return true;
  });

  // Convert impact/effort scores to pixel positions
  // Impact (Y): 0 = bottom, 100 = top
  // Effort (X): 0 = left, 100 = right
  const getPosition = (opp) => {
    const impact = opp.impactScore ?? 50;
    const effort = opp.effortScore ?? 50;
    
    const padding = 40; // Keep cards away from edges
    const usableWidth = containerSize.width - padding * 2;
    const usableHeight = containerSize.height - padding * 2;
    
    return {
      x: padding + (effort / 100) * usableWidth,
      y: padding + ((100 - impact) / 100) * usableHeight, // Invert Y so high impact is at top
    };
  };

  // Convert pixel position back to scores
  const getScoresFromPosition = (x, y) => {
    const padding = 40;
    const usableWidth = containerSize.width - padding * 2;
    const usableHeight = containerSize.height - padding * 2;
    
    const effort = Math.max(0, Math.min(100, ((x - padding) / usableWidth) * 100));
    const impact = Math.max(0, Math.min(100, 100 - ((y - padding) / usableHeight) * 100));
    
    return { impact, effort };
  };

  // Mouse handlers for dragging
  const handleMouseDown = (e, opp) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerRef.current.getBoundingClientRect();
    setDragging({
      oppId: opp.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startImpact: opp.impactScore ?? 50,
      startEffort: opp.effortScore ?? 50,
      containerRect: rect,
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    
    const deltaX = e.clientX - dragging.startMouseX;
    const deltaY = e.clientY - dragging.startMouseY;
    
    const padding = 40;
    const usableWidth = containerSize.width - padding * 2;
    const usableHeight = containerSize.height - padding * 2;
    
    // Convert pixel delta to score delta
    const effortDelta = (deltaX / usableWidth) * 100;
    const impactDelta = -(deltaY / usableHeight) * 100; // Negative because Y is inverted
    
    const newEffort = Math.max(0, Math.min(100, dragging.startEffort + effortDelta));
    const newImpact = Math.max(0, Math.min(100, dragging.startImpact + impactDelta));
    
    // Find and update the opportunity
    const opp = opportunities.find(o => o.id === dragging.oppId);
    if (opp) {
      onUpdateOpportunity({
        ...opp,
        impactScore: Math.round(newImpact),
        effortScore: Math.round(newEffort),
      });
    }
  }, [dragging, containerSize, opportunities, onUpdateOpportunity]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Attach global mouse listeners when dragging
  React.useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Stats
  const quadrantCounts = {
    quickWins: filteredOpportunities.filter(o => (o.impactScore ?? 50) >= 50 && (o.effortScore ?? 50) < 50).length,
    majorProjects: filteredOpportunities.filter(o => (o.impactScore ?? 50) >= 50 && (o.effortScore ?? 50) >= 50).length,
    fillIns: filteredOpportunities.filter(o => (o.impactScore ?? 50) < 50 && (o.effortScore ?? 50) < 50).length,
    avoid: filteredOpportunities.filter(o => (o.impactScore ?? 50) < 50 && (o.effortScore ?? 50) >= 50).length,
  };

  const unscoredCount = opportunities.filter(o => 
    o.impactScore === undefined || o.impactScore === null ||
    o.effortScore === undefined || o.effortScore === null
  ).length;

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>📊</span> Impact vs Effort Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Drag cards to any position • {filteredOpportunities.length} items
            {unscoredCount > 0 && (
              <span className="text-amber-400 ml-2">({unscoredCount} unscored)</span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* AI Assist Button */}
          {onOpenAIScoring && (
            <button
              onClick={onOpenAIScoring}
              className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-medium rounded-lg transition-all flex items-center gap-1.5"
            >
              <span>🤖</span>
              AI Assist
              {unscoredCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px]">
                  {unscoredCount}
                </span>
              )}
            </button>
          )}
          
          {/* Quadrant Summary */}
          <div className="flex gap-4 text-xs">
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-400">{quadrantCounts.quickWins}</div>
              <div className="text-slate-500">🚀 Quick Wins</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">{quadrantCounts.majorProjects}</div>
              <div className="text-slate-500">🎯 Major</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-slate-400">{quadrantCounts.fillIns}</div>
              <div className="text-slate-500">📝 Fill-Ins</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-400">{quadrantCounts.avoid}</div>
              <div className="text-slate-500">⚠️ Avoid</div>
            </div>
          </div>
        </div>
      </div>

      {/* Matrix Canvas */}
      <div 
        ref={containerRef}
        className="relative h-[600px] bg-slate-950/50 overflow-hidden"
        style={{ cursor: dragging ? 'grabbing' : 'default' }}
      >
        {/* Grid background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Quadrant backgrounds */}
          <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-emerald-500/5 border-r border-b border-slate-700/30" />
          <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-500/5 border-b border-slate-700/30" />
          <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-slate-500/5 border-r border-slate-700/30" />
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-red-500/5" />
          
          {/* Center lines */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-700/50" />
          <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-700/50" />
          
          {/* Quadrant labels */}
          <div className="absolute top-3 left-3 text-emerald-500/40 text-xs font-medium">
            🚀 Quick Wins
            <div className="text-[10px] text-slate-600">High Impact, Low Effort</div>
          </div>
          <div className="absolute top-3 right-3 text-right text-blue-500/40 text-xs font-medium">
            🎯 Major Projects
            <div className="text-[10px] text-slate-600">High Impact, High Effort</div>
          </div>
          <div className="absolute bottom-3 left-3 text-slate-500/40 text-xs font-medium">
            📝 Fill-Ins
            <div className="text-[10px] text-slate-600">Low Impact, Low Effort</div>
          </div>
          <div className="absolute bottom-3 right-3 text-right text-red-500/40 text-xs font-medium">
            ⚠️ Avoid
            <div className="text-[10px] text-slate-600">Low Impact, High Effort</div>
          </div>
        </div>

        {/* Y-axis label */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-slate-500 text-xs font-medium whitespace-nowrap">
          ← Low Impact — High Impact →
        </div>

        {/* X-axis label */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-slate-500 text-xs font-medium">
          ← Low Effort — High Effort →
        </div>

        {/* Opportunity Cards */}
        {filteredOpportunities.map(opp => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
            position={getPosition(opp)}
            getInitiativeColor={getInitiativeColor}
            getAreaName={getAreaName}
            milestones={milestones}
            assignments={assignments}
            isDragging={dragging?.oppId === opp.id}
            onMouseDown={(e) => handleMouseDown(e, opp)}
            onClick={() => !dragging && onSelectOpportunity?.(opp)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-4">
          <span>Left bar = Initiative</span>
          <span>⚠️ = At risk</span>
          <span>✓ = Done</span>
          <span>🎯 = Milestone</span>
        </div>
        <div className="text-slate-400">
          Drag cards anywhere to adjust Impact & Effort scores
        </div>
      </div>
    </div>
  );
}
