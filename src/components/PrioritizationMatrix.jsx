import React, { useState, useRef, useEffect } from 'react';

const QUADRANT_LABELS = {
  topLeft: { title: 'Quick Wins', subtitle: 'High Impact, Low Effort', color: 'emerald', emoji: '🚀' },
  topRight: { title: 'Major Projects', subtitle: 'High Impact, High Effort', color: 'blue', emoji: '🎯' },
  bottomLeft: { title: 'Fill-Ins', subtitle: 'Low Impact, Low Effort', color: 'slate', emoji: '📝' },
  bottomRight: { title: 'Avoid', subtitle: 'Low Impact, High Effort', color: 'red', emoji: '⚠️' },
};

export default function PrioritizationMatrix({
  opportunities,
  milestones,
  assignments,
  onUpdateOpportunity,
  getInitiativeColor,
  getAreaName,
  filterInitiative,
  filterArea,
  filterStatus,
}) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredOpp, setHoveredOpp] = useState(null);
  const [selectedOpp, setSelectedOpp] = useState(null);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: Math.max(600, window.innerHeight - 300) });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Filter opportunities
  const filteredOpportunities = opportunities.filter(opp => {
    if (filterInitiative && opp.initiative !== filterInitiative) return false;
    if (filterArea && opp.area !== filterArea) return false;
    if (filterStatus === 'at_risk' && !opp.atRisk) return false;
    if (filterStatus && filterStatus !== 'at_risk' && opp.status !== filterStatus) return false;
    return true;
  });

  // Initialize positions for opportunities that don't have them
  const getPosition = (opp) => {
    if (opp.impactScore !== undefined && opp.effortScore !== undefined) {
      return { x: opp.effortScore, y: opp.impactScore };
    }
    // Default: random position in center area
    const hash = opp.id * 17 % 100;
    return { 
      x: 30 + (hash % 40), 
      y: 30 + (Math.floor(hash / 10) * 4) 
    };
  };

  // Convert percentage position to pixel position
  const toPixels = (pos) => ({
    x: (pos.x / 100) * dimensions.width,
    y: ((100 - pos.y) / 100) * dimensions.height, // Invert Y so high impact is at top
  });

  // Convert pixel position to percentage
  const toPercent = (px) => ({
    x: Math.max(0, Math.min(100, (px.x / dimensions.width) * 100)),
    y: Math.max(0, Math.min(100, 100 - (px.y / dimensions.height) * 100)), // Invert Y
  });

  // Get quadrant from position
  const getQuadrant = (pos) => {
    const isHighImpact = pos.y >= 50;
    const isLowEffort = pos.x < 50;
    if (isHighImpact && isLowEffort) return 'topLeft';
    if (isHighImpact && !isLowEffort) return 'topRight';
    if (!isHighImpact && isLowEffort) return 'bottomLeft';
    return 'bottomRight';
  };

  // Handle drag start
  const handleMouseDown = (e, opp) => {
    e.preventDefault();
    const pos = toPixels(getPosition(opp));
    setDragging(opp);
    setDragOffset({
      x: e.clientX - pos.x - containerRef.current.getBoundingClientRect().left,
      y: e.clientY - pos.y - containerRef.current.getBoundingClientRect().top,
    });
  };

  // Handle drag
  const handleMouseMove = (e) => {
    if (!dragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const newPx = {
      x: e.clientX - rect.left - dragOffset.x,
      y: e.clientY - rect.top - dragOffset.y,
    };
    const newPercent = toPercent(newPx);
    
    // Update the opportunity position
    onUpdateOpportunity({
      ...dragging,
      impactScore: Math.round(newPercent.y),
      effortScore: Math.round(newPercent.x),
    });
  };

  // Handle drag end
  const handleMouseUp = () => {
    setDragging(null);
  };

  // Add event listeners for drag
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, dragOffset]);

  // Group by quadrant for summary
  const quadrantCounts = filteredOpportunities.reduce((acc, opp) => {
    const quadrant = getQuadrant(getPosition(opp));
    acc[quadrant] = (acc[quadrant] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>📊</span> Impact vs Effort Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Drag opportunities to prioritize • {filteredOpportunities.length} items
          </p>
        </div>
        
        {/* Quadrant Summary */}
        <div className="flex gap-3">
          {Object.entries(QUADRANT_LABELS).map(([key, { title, emoji, color }]) => (
            <div key={key} className="text-center">
              <div className={`text-lg font-bold text-${color}-400`}>
                {quadrantCounts[key] || 0}
              </div>
              <div className="text-[10px] text-slate-500">{emoji} {title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Matrix Grid */}
      <div 
        ref={containerRef}
        className="relative bg-slate-950 cursor-crosshair select-none"
        style={{ height: dimensions.height }}
      >
        {/* Background Grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Grid lines */}
          {[...Array(11)].map((_, i) => (
            <React.Fragment key={i}>
              <line
                x1={0} y1={(i * dimensions.height) / 10}
                x2={dimensions.width} y2={(i * dimensions.height) / 10}
                stroke="#334155" strokeWidth={i === 5 ? 2 : 1}
                strokeDasharray={i === 5 ? '' : '4,4'}
              />
              <line
                x1={(i * dimensions.width) / 10} y1={0}
                x2={(i * dimensions.width) / 10} y2={dimensions.height}
                stroke="#334155" strokeWidth={i === 5 ? 2 : 1}
                strokeDasharray={i === 5 ? '' : '4,4'}
              />
            </React.Fragment>
          ))}
        </svg>

        {/* Quadrant Backgrounds */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none">
          <div className="bg-emerald-500/5 border-r-2 border-b-2 border-slate-700 flex items-start justify-start p-3">
            <div className="text-emerald-500/50 text-xs font-medium">
              🚀 Quick Wins
            </div>
          </div>
          <div className="bg-blue-500/5 border-b-2 border-slate-700 flex items-start justify-end p-3">
            <div className="text-blue-500/50 text-xs font-medium">
              🎯 Major Projects
            </div>
          </div>
          <div className="bg-slate-500/5 border-r-2 border-slate-700 flex items-end justify-start p-3">
            <div className="text-slate-500/50 text-xs font-medium">
              📝 Fill-Ins
            </div>
          </div>
          <div className="bg-red-500/5 flex items-end justify-end p-3">
            <div className="text-red-500/50 text-xs font-medium">
              ⚠️ Avoid
            </div>
          </div>
        </div>

        {/* Axis Labels */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-slate-500 text-xs font-medium whitespace-nowrap">
          ← Low Impact — High Impact →
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-slate-500 text-xs font-medium">
          ← Low Effort — High Effort →
        </div>

        {/* Opportunity Dots */}
        {filteredOpportunities.map(opp => {
          const pos = getPosition(opp);
          const px = toPixels(pos);
          const quadrant = getQuadrant(pos);
          const quadrantInfo = QUADRANT_LABELS[quadrant];
          const isHovered = hoveredOpp?.id === opp.id;
          const isSelected = selectedOpp?.id === opp.id;
          const isDragging = dragging?.id === opp.id;
          const assigneeCount = assignments[opp.id]?.length || 0;

          return (
            <div
              key={opp.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all ${
                isDragging ? 'cursor-grabbing z-50 scale-110' : 'cursor-grab z-10'
              } ${isHovered || isSelected ? 'z-40' : ''}`}
              style={{ left: px.x, top: px.y }}
              onMouseDown={(e) => handleMouseDown(e, opp)}
              onMouseEnter={() => setHoveredOpp(opp)}
              onMouseLeave={() => setHoveredOpp(null)}
              onClick={() => setSelectedOpp(selectedOpp?.id === opp.id ? null : opp)}
            >
              {/* Dot */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg transition-all ${
                  opp.atRisk ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-slate-950' : ''
                } ${isHovered || isSelected ? 'scale-125' : ''}`}
                style={{ 
                  backgroundColor: getInitiativeColor(opp.initiative),
                  boxShadow: `0 0 20px ${getInitiativeColor(opp.initiative)}40`
                }}
              >
                {opp.status === 'done' ? '✓' : assigneeCount > 0 ? assigneeCount : ''}
              </div>

              {/* Status indicator */}
              {opp.status !== 'not_started' && opp.status !== 'done' && (
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-950 ${
                  opp.status === 'in_progress' ? 'bg-blue-500' :
                  opp.status === 'blocked' ? 'bg-red-500' : 'bg-slate-500'
                }`} />
              )}

              {/* Tooltip */}
              {(isHovered || isSelected) && !isDragging && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 pointer-events-none">
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
                    <div className="font-medium text-white text-sm mb-1">{opp.title}</div>
                    <div className="text-xs text-slate-400 mb-2">{getAreaName(opp.area)}</div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`px-2 py-0.5 rounded bg-${quadrantInfo.color}-500/20 text-${quadrantInfo.color}-400`}>
                        {quadrantInfo.emoji} {quadrantInfo.title}
                      </span>
                      <span className="text-slate-500">
                        Impact: {pos.y}% • Effort: {pos.x}%
                      </span>
                    </div>
                    {opp.atRisk && (
                      <div className="mt-2 text-xs text-orange-400 flex items-center gap-1">
                        <span>⚠️</span> At Risk
                      </div>
                    )}
                  </div>
                  <div className="w-3 h-3 bg-slate-800 border-r border-b border-slate-700 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1.5" />
                </div>
              )}
            </div>
          );
        })}

        {/* Selected Opportunity Detail Panel */}
        {selectedOpp && (
          <div className="absolute right-4 top-4 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
            <div className="p-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Opportunity Details</h3>
              <button 
                onClick={() => setSelectedOpp(null)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <div className="text-white font-medium">{selectedOpp.title}</div>
                <div className="text-xs text-slate-400">{getAreaName(selectedOpp.area)}</div>
              </div>
              
              {selectedOpp.description && (
                <p className="text-xs text-slate-300">{selectedOpp.description}</p>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-700/50 rounded p-2">
                  <div className="text-slate-500">Impact</div>
                  <div className="text-white font-medium">{getPosition(selectedOpp).y}%</div>
                </div>
                <div className="bg-slate-700/50 rounded p-2">
                  <div className="text-slate-500">Effort</div>
                  <div className="text-white font-medium">{getPosition(selectedOpp).x}%</div>
                </div>
              </div>

              {/* Quick score adjustment */}
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Impact Score</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={getPosition(selectedOpp).y}
                    onChange={(e) => onUpdateOpportunity({
                      ...selectedOpp,
                      impactScore: parseInt(e.target.value),
                      effortScore: getPosition(selectedOpp).x,
                    })}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Effort Score</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={getPosition(selectedOpp).x}
                    onChange={(e) => onUpdateOpportunity({
                      ...selectedOpp,
                      impactScore: getPosition(selectedOpp).y,
                      effortScore: parseInt(e.target.value),
                    })}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>

              {selectedOpp.milestoneId && (
                <div className="text-xs">
                  <span className="text-slate-500">Milestone:</span>
                  <span className="text-yellow-400 ml-1">
                    🎯 {milestones.find(m => m.id === selectedOpp.milestoneId)?.title}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span>Dot color = Initiative</span>
          <span>• Number = Assignees</span>
          <span>• ✓ = Done</span>
          <span>• Orange ring = At Risk</span>
        </div>
        <div className="text-slate-400">
          Click to select • Drag to reposition
        </div>
      </div>
    </div>
  );
}
