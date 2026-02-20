import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';

const STATUSES = {
  not_started: { label: 'Not Started', color: '#6b7280', bgColor: '#6b728020' },
  in_progress: { label: 'In Progress', color: '#3b82f6', bgColor: '#3b82f620' },
  done: { label: 'Done', color: '#22c55e', bgColor: '#22c55e20' },
  blocked: { label: 'Blocked', color: '#ef4444', bgColor: '#ef444420' }
};

// Local areas definition to avoid circular import issues
const AREAS = [
  { id: 'visualizer', name: 'Visualizer', color: '#3fb950' },
  { id: 'vinci', name: 'Vinci', color: '#38bdf8' },
  { id: 'spaces', name: 'Spaces', color: '#a371f7' },
  { id: 'showcase', name: 'Showcase', color: '#f85149' },
  { id: 'studio', name: 'Studio', color: '#f778ba' },
  { id: 'platform', name: 'Platform', color: '#d29922' },
  { id: 'admin', name: 'Admin', color: '#8b949e' }
];

// Local helper to get area color
const getAreaColorLocal = (areaId) => {
  const area = AREAS.find(a => a.id === areaId);
  return area?.color || '#8b949e';
};

// Card dimensions
const CARD_WIDTH = 160;
const CARD_HEIGHT = 72;
const CLUSTER_PADDING = 20;

// ========== INLINE SCORE EDITOR ==========
const InlineScoreEditor = ({ value, onChange, label, color = 'indigo' }) => {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSubmit = () => {
    const newValue = Math.max(0, Math.min(100, parseInt(tempValue) || 50));
    onChange(newValue);
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') {
      setTempValue(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min="0"
        max="100"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={handleKeyDown}
        className={`w-10 px-1 py-0.5 text-[10px] font-medium rounded border bg-white text-slate-800 text-center focus:outline-none focus:ring-1 focus:ring-${color}-500 border-${color}-500`}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
        setTempValue(value);
      }}
      className={`px-1.5 py-0.5 text-[10px] font-medium rounded bg-${color}-500/20 text-${color}-400 hover:bg-${color}-500/30 transition-colors`}
      title={`${label}: ${value} (click to edit)`}
    >
      {value}
    </button>
  );
};

// ========== OPPORTUNITY CARD ==========
const OpportunityCard = ({ 
  opportunity, 
  position,
  getInitiativeColor, 
  getAreaName,
  milestones,
  assignments,
  isDragging,
  isHighlighted,
  onMouseDown,
  onClick,
  onUpdateScores,
  scale = 1,
}) => {
  const statusInfo = STATUSES[opportunity.status] || STATUSES.not_started;
  const milestone = opportunity.milestoneId ? milestones?.find(m => m.id === opportunity.milestoneId) : null;
  const assigneeCount = assignments?.[opportunity.id]?.length || 0;
  const initiativeColor = getInitiativeColor?.(opportunity.initiative) || '#6b7280';

  // Scale card size with zoom but keep minimum readable
  const effectiveScale = Math.max(0.7, Math.min(1, scale));

  return (
    <div
      className={`
        absolute select-none transition-shadow duration-150
        ${isDragging ? 'z-50 cursor-grabbing shadow-2xl shadow-indigo-500/20' : 'z-10 cursor-grab hover:z-20'}
        ${isHighlighted ? 'ring-2 ring-yellow-400 z-30' : ''}
      `}
      style={{
        left: position.x,
        top: position.y,
        width: CARD_WIDTH * effectiveScale,
        transform: `translate(-50%, -50%) scale(${effectiveScale})`,
        transformOrigin: 'center center',
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <div
        className={`
          relative p-2 rounded-lg border transition-all duration-150
          ${isDragging
            ? 'border-indigo-500 bg-white scale-105'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-sm'
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
            <h4 className="text-[11px] font-medium text-slate-900 leading-tight line-clamp-2 flex-1">
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
          <div className="text-[9px] text-slate-400 mb-1">
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

            {/* Inline Impact/Effort scores */}
            {onUpdateScores && (
              <>
                <InlineScoreEditor
                  value={opportunity.impactScore ?? 50}
                  onChange={(v) => onUpdateScores(opportunity.id, 'impactScore', v)}
                  label="Impact"
                  color="emerald"
                />
                <InlineScoreEditor
                  value={opportunity.effortScore ?? 50}
                  onChange={(v) => onUpdateScores(opportunity.id, 'effortScore', v)}
                  label="Effort"
                  color="blue"
                />
              </>
            )}

            {/* Spacer */}
            <span className="flex-1" />

            {/* Dependencies indicator */}
            {((opportunity.blocks?.length || 0) + (opportunity.blockedBy?.length || 0)) > 0 && (
              <span className="text-[8px] text-indigo-400" title={`Blocks: ${opportunity.blocks?.length || 0}, Blocked by: ${opportunity.blockedBy?.length || 0}`}>
                🔗{(opportunity.blocks?.length || 0) + (opportunity.blockedBy?.length || 0)}
              </span>
            )}

            {/* Assignees */}
            {assigneeCount > 0 && (
              <span className="text-[8px] text-slate-400">
                👤{assigneeCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== CLUSTER CARD ==========
const ClusterCard = ({
  cluster,
  position,
  isExpanded,
  onClick,
  onToggleExpand,
  scale = 1,
}) => {
  const progressPct = cluster.opportunities.length > 0 
    ? (cluster.doneCount / cluster.opportunities.length) * 100 
    : 0;

  return (
    <div
      className="absolute select-none cursor-pointer z-20 transition-all duration-200"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
      onClick={onClick}
    >
      <div 
        className={`
          relative p-3 rounded-xl border-2 transition-all duration-200
          ${isExpanded
            ? 'border-dashed border-slate-300 bg-white/80'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-sm'
          }
          ${cluster.atRiskCount > 0 ? 'ring-2 ring-orange-500/30' : ''}
        `}
        style={{ 
          minWidth: isExpanded ? 200 : 140,
          borderColor: isExpanded ? cluster.color : undefined,
        }}
      >
        {/* Cluster type icon & label */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">
            {cluster.type === 'milestone' ? '🎯' : '🔗'}
          </span>
          <span className="text-xs font-medium text-slate-900 truncate flex-1">
            {cluster.label}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="p-1 rounded hover:bg-slate-100 transition-colors"
            title={isExpanded ? 'Collapse cluster' : 'Expand cluster'}
          >
            <svg 
              className={`w-3 h-3 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-slate-500">
            {cluster.opportunities.length} items
          </span>
          {cluster.atRiskCount > 0 && (
            <span className="text-orange-400">
              ⚠️ {cluster.atRiskCount}
            </span>
          )}
          <span className="text-emerald-400">
            ✓ {cluster.doneCount}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Avg scores */}
        <div className="mt-2 flex gap-2 text-[9px]">
          <span className="text-emerald-400/70">
            Impact: {Math.round(cluster.totalImpact)}
          </span>
          <span className="text-blue-400/70">
            Effort: {Math.round(cluster.totalEffort)}
          </span>
        </div>
      </div>
    </div>
  );
};

// ========== DEPENDENCY LINE ==========
const DependencyLine = ({ from, to, scale }) => {
  // Calculate control points for a curved line
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  
  // Offset the curve based on direction
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const offsetX = len > 0 ? (-dy / len) * 30 : 0;
  const offsetY = len > 0 ? (dx / len) * 30 : 0;

  const pathD = `M ${from.x} ${from.y} Q ${midX + offsetX} ${midY + offsetY} ${to.x} ${to.y}`;

  return (
    <g className="pointer-events-none">
      <path
        d={pathD}
        fill="none"
        stroke="#6366f1"
        strokeWidth={2 / scale}
        strokeDasharray="4 4"
        opacity={0.5}
      />
      {/* Arrow head */}
      <circle cx={to.x} cy={to.y} r={4 / scale} fill="#6366f1" opacity={0.7} />
    </g>
  );
};

// ========== MINIMAP ==========
const Minimap = ({ 
  opportunities, 
  clusters,
  viewBox, 
  canvasSize, 
  onNavigate,
  getPosition,
  getInitiativeColor,
}) => {
  const minimapSize = { width: 150, height: 100 };
  const scaleX = minimapSize.width / canvasSize.width;
  const scaleY = minimapSize.height / canvasSize.height;

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scaleX;
    const y = (e.clientY - rect.top) / scaleY;
    onNavigate(x, y);
  };

  return (
    <div 
      className="absolute bottom-4 right-4 border border-slate-200 rounded-lg bg-white/90 shadow-sm overflow-hidden cursor-crosshair"
      style={{ width: minimapSize.width, height: minimapSize.height }}
      onClick={handleClick}
    >
      {/* Quadrant backgrounds */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-emerald-500/10" />
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-500/10" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-slate-500/10" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-red-500/10" />
      </div>

      {/* Opportunity dots */}
      {opportunities.map(opp => {
        const pos = getPosition(opp);
        return (
          <div
            key={opp.id}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              left: pos.x * scaleX,
              top: pos.y * scaleY,
              backgroundColor: getInitiativeColor(opp.initiative),
              transform: 'translate(-50%, -50%)',
            }}
          />
        );
      })}

      {/* Viewport indicator */}
      <div
        className="absolute border-2 border-slate-900/50 rounded pointer-events-none"
        style={{
          left: viewBox.x * scaleX,
          top: viewBox.y * scaleY,
          width: viewBox.width * scaleX,
          height: viewBox.height * scaleY,
        }}
      />
    </div>
  );
};

// ========== MAIN COMPONENT ==========
export default function PrioritizationMatrix({
  opportunities,
  milestones,
  assignments,
  onUpdateOpportunity,
  onSelectOpportunity,
  onOpenAIScoring,
  getInitiativeColor,
  getAreaName,
  filterInitiative,
  filterArea,
  filterStatus,
}) {
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  
  // Zoom & pan state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Dragging state
  const [dragging, setDragging] = useState(null);
  
  // Clustering state
  const [enableClustering, setEnableClustering] = useState(true);
  const [expandedClusters, setExpandedClusters] = useState(new Set());
  
  // Highlighted item (for dependency visualization)
  const [highlightedOpp, setHighlightedOpp] = useState(null);

  // Canvas size (larger than viewport for pan/zoom)
  const canvasSize = { width: 2000, height: 1500 };

  // Measure container
  const measureContainer = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    measureContainer();
    window.addEventListener('resize', measureContainer);
    return () => window.removeEventListener('resize', measureContainer);
  }, [measureContainer]);

  // Filter opportunities
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      if (filterInitiative?.length > 0 && !filterInitiative.includes(opp.initiative)) return false;
      if (filterArea?.length > 0 && !filterArea.includes(opp.area)) return false;
      if (filterStatus?.length > 0) {
        const hasAtRisk = filterStatus.includes('at_risk');
        const statusFilters = filterStatus.filter(s => s !== 'at_risk');
        const matchesStatus = statusFilters.length === 0 || statusFilters.includes(opp.status);
        const matchesAtRisk = hasAtRisk && opp.atRisk;
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
  }, [opportunities, filterInitiative, filterArea, filterStatus]);

  // Compute clusters
  const { clusters, standalone } = useMemo(() => {
    if (!enableClustering) {
      return { clusters: [], standalone: filteredOpportunities };
    }

    const result = { clusters: [], standalone: [] };
    const assigned = new Set();

    // Group by milestone
    milestones.forEach(milestone => {
      const milestoneOpps = filteredOpportunities.filter(o => 
        o.milestoneId === milestone.id && !assigned.has(o.id)
      );
      
      if (milestoneOpps.length > 1) {
        result.clusters.push({
          id: `milestone-${milestone.id}`,
          type: 'milestone',
          label: milestone.title,
          color: getAreaColorLocal(milestone.area),
          opportunities: milestoneOpps,
          totalImpact: milestoneOpps.reduce((sum, o) => sum + (o.impactScore ?? 50), 0) / milestoneOpps.length,
          totalEffort: milestoneOpps.reduce((sum, o) => sum + (o.effortScore ?? 50), 0) / milestoneOpps.length,
          atRiskCount: milestoneOpps.filter(o => o.atRisk).length,
          doneCount: milestoneOpps.filter(o => o.status === 'done').length,
        });
        milestoneOpps.forEach(o => assigned.add(o.id));
      }
    });

    // Group by dependencies
    const unassigned = filteredOpportunities.filter(o => !assigned.has(o.id));
    const visited = new Set();
    
    const findConnected = (opp, group) => {
      if (visited.has(opp.id)) return;
      visited.add(opp.id);
      group.push(opp);
      
      (opp.blocks || []).forEach(id => {
        const blocked = unassigned.find(o => o.id === id);
        if (blocked && !assigned.has(id)) findConnected(blocked, group);
      });
      
      (opp.blockedBy || []).forEach(id => {
        const blocker = unassigned.find(o => o.id === id);
        if (blocker && !assigned.has(id)) findConnected(blocker, group);
      });
    };

    unassigned.forEach(opp => {
      if (!visited.has(opp.id)) {
        const group = [];
        findConnected(opp, group);
        
        if (group.length > 1) {
          result.clusters.push({
            id: `deps-${group.map(o => o.id).join('-')}`,
            type: 'dependency',
            label: `${group.length} linked items`,
            color: '#6366f1',
            opportunities: group,
            totalImpact: group.reduce((sum, o) => sum + (o.impactScore ?? 50), 0) / group.length,
            totalEffort: group.reduce((sum, o) => sum + (o.effortScore ?? 50), 0) / group.length,
            atRiskCount: group.filter(o => o.atRisk).length,
            doneCount: group.filter(o => o.status === 'done').length,
          });
          group.forEach(o => assigned.add(o.id));
        }
      }
    });

    result.standalone = filteredOpportunities.filter(o => !assigned.has(o.id));
    return result;
  }, [filteredOpportunities, milestones, enableClustering]);

  // Helper function to get area color

  // Convert scores to canvas position
  const getPosition = useCallback((opp) => {
    const impact = opp.impactScore ?? 50;
    const effort = opp.effortScore ?? 50;
    
    const padding = 80;
    const usableWidth = canvasSize.width - padding * 2;
    const usableHeight = canvasSize.height - padding * 2;
    
    return {
      x: padding + (effort / 100) * usableWidth,
      y: padding + ((100 - impact) / 100) * usableHeight,
    };
  }, [canvasSize]);

  // Convert canvas position to screen position
  const canvasToScreen = useCallback((pos) => {
    return {
      x: (pos.x - offset.x) * scale,
      y: (pos.y - offset.y) * scale,
    };
  }, [offset, scale]);

  // Convert screen position to canvas position
  const screenToCanvas = useCallback((pos) => {
    return {
      x: pos.x / scale + offset.x,
      y: pos.y / scale + offset.y,
    };
  }, [offset, scale]);

  // Zoom handler
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Get canvas position under mouse before zoom
    const canvasPos = screenToCanvas({ x: mouseX, y: mouseY });
    
    // Calculate new scale
    const delta = -e.deltaY * 0.001;
    const newScale = Math.max(0.3, Math.min(3, scale + delta));
    
    // Adjust offset to zoom towards mouse position
    const newOffset = {
      x: canvasPos.x - mouseX / newScale,
      y: canvasPos.y - mouseY / newScale,
    };
    
    setScale(newScale);
    setOffset(newOffset);
  }, [scale, screenToCanvas]);

  // Pan handlers
  const handlePanStart = (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle click or Alt+click
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePanMove = useCallback((e) => {
    if (!isPanning) return;
    
    const dx = (e.clientX - panStart.x) / scale;
    const dy = (e.clientY - panStart.y) / scale;
    
    setOffset(prev => ({
      x: prev.x - dx,
      y: prev.y - dy,
    }));
    setPanStart({ x: e.clientX, y: e.clientY });
  }, [isPanning, panStart, scale]);

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  // Dragging handlers
  const handleDragStart = (e, opp) => {
    if (isPanning) return;
    e.preventDefault();
    e.stopPropagation();
    
    setDragging({
      oppId: opp.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startImpact: opp.impactScore ?? 50,
      startEffort: opp.effortScore ?? 50,
    });
  };

  const handleDragMove = useCallback((e) => {
    if (!dragging) return;
    
    const deltaX = (e.clientX - dragging.startMouseX) / scale;
    const deltaY = (e.clientY - dragging.startMouseY) / scale;
    
    const padding = 80;
    const usableWidth = canvasSize.width - padding * 2;
    const usableHeight = canvasSize.height - padding * 2;
    
    const effortDelta = (deltaX / usableWidth) * 100;
    const impactDelta = -(deltaY / usableHeight) * 100;
    
    const newEffort = Math.max(0, Math.min(100, dragging.startEffort + effortDelta));
    const newImpact = Math.max(0, Math.min(100, dragging.startImpact + impactDelta));
    
    const opp = opportunities.find(o => o.id === dragging.oppId);
    if (opp) {
      onUpdateOpportunity({
        ...opp,
        impactScore: Math.round(newImpact),
        effortScore: Math.round(newEffort),
      });
    }
  }, [dragging, scale, canvasSize, opportunities, onUpdateOpportunity]);

  const handleDragEnd = () => {
    setDragging(null);
  };

  // Global mouse listeners
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [dragging, handleDragMove]);

  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handlePanMove);
      window.addEventListener('mouseup', handlePanEnd);
      return () => {
        window.removeEventListener('mousemove', handlePanMove);
        window.removeEventListener('mouseup', handlePanEnd);
      };
    }
  }, [isPanning, handlePanMove]);

  // Minimap navigation
  const handleMinimapNavigate = (x, y) => {
    setOffset({
      x: x - containerSize.width / scale / 2,
      y: y - containerSize.height / scale / 2,
    });
  };

  // Reset view
  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  // Inline score update handler
  const handleUpdateScores = (oppId, field, value) => {
    const opp = opportunities.find(o => o.id === oppId);
    if (opp) {
      onUpdateOpportunity({ ...opp, [field]: value });
    }
  };

  // Toggle cluster expansion
  const toggleCluster = (clusterId) => {
    setExpandedClusters(prev => {
      const next = new Set(prev);
      if (next.has(clusterId)) {
        next.delete(clusterId);
      } else {
        next.add(clusterId);
      }
      return next;
    });
  };

  // Get visible opportunities (standalone + expanded clusters)
  const visibleOpportunities = useMemo(() => {
    const visible = [...standalone];
    clusters.forEach(cluster => {
      if (expandedClusters.has(cluster.id)) {
        visible.push(...cluster.opportunities);
      }
    });
    return visible;
  }, [standalone, clusters, expandedClusters]);

  // Calculate viewBox for minimap
  const viewBox = {
    x: offset.x,
    y: offset.y,
    width: containerSize.width / scale,
    height: containerSize.height / scale,
  };

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

  // Dependencies to draw
  const dependencyLines = useMemo(() => {
    const lines = [];
    if (highlightedOpp) {
      const opp = opportunities.find(o => o.id === highlightedOpp);
      if (opp) {
        // Lines to blocked items
        (opp.blocks || []).forEach(blockedId => {
          const blocked = opportunities.find(o => o.id === blockedId);
          if (blocked) {
            lines.push({
              from: canvasToScreen(getPosition(opp)),
              to: canvasToScreen(getPosition(blocked)),
              type: 'blocks',
            });
          }
        });
        // Lines from blocking items
        (opp.blockedBy || []).forEach(blockerId => {
          const blocker = opportunities.find(o => o.id === blockerId);
          if (blocker) {
            lines.push({
              from: canvasToScreen(getPosition(blocker)),
              to: canvasToScreen(getPosition(opp)),
              type: 'blockedBy',
            });
          }
        });
      }
    }
    return lines;
  }, [highlightedOpp, opportunities, getPosition, canvasToScreen]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <span>📊</span> Impact vs Effort Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Drag cards • Scroll to zoom • Alt+drag to pan • {filteredOpportunities.length} items
            {clusters.length > 0 && <span className="text-indigo-400 ml-2">({clusters.length} clusters)</span>}
            {unscoredCount > 0 && <span className="text-amber-400 ml-2">({unscoredCount} unscored)</span>}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEnableClustering(!enableClustering)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                enableClustering
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {enableClustering ? '🔗 Clustered' : '📍 Individual'}
            </button>
            
            <button
              onClick={resetView}
              className="px-2 py-1 text-xs bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded transition-colors"
              title="Reset zoom & pan"
            >
              🔄 Reset
            </button>
            
            <span className="text-xs text-slate-400 px-2">
              {Math.round(scale * 100)}%
            </span>
          </div>

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
              <div className="text-lg font-bold text-emerald-600">{quadrantCounts.quickWins}</div>
              <div className="text-slate-400">🚀 Quick Wins</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{quadrantCounts.majorProjects}</div>
              <div className="text-slate-400">🎯 Major</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-slate-500">{quadrantCounts.fillIns}</div>
              <div className="text-slate-400">📝 Fill-Ins</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-500">{quadrantCounts.avoid}</div>
              <div className="text-slate-400">⚠️ Avoid</div>
            </div>
          </div>
        </div>
      </div>

      {/* Matrix Canvas */}
      <div 
        ref={containerRef}
        className="relative h-[600px] bg-slate-50/50 overflow-hidden"
        style={{ cursor: isPanning ? 'grabbing' : dragging ? 'grabbing' : 'default' }}
        onWheel={handleWheel}
        onMouseDown={handlePanStart}
      >
        {/* Transformed content */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: canvasSize.width,
            height: canvasSize.height,
            transform: `translate(${-offset.x * scale}px, ${-offset.y * scale}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Grid background */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Quadrant backgrounds */}
            <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-emerald-500/5 border-r border-b border-slate-200/60" />
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-500/5 border-b border-slate-200/60" />
            <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-slate-500/5 border-r border-slate-200/60" />
            <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-red-500/5" />

            {/* Center lines */}
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-300/60" />
            <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-300/60" />
            
            {/* Quadrant labels */}
            <div className="absolute top-8 left-8 text-emerald-600/50 text-sm font-medium">
              🚀 Quick Wins
              <div className="text-xs text-slate-400">High Impact, Low Effort</div>
            </div>
            <div className="absolute top-8 right-8 text-right text-blue-600/50 text-sm font-medium">
              🎯 Major Projects
              <div className="text-xs text-slate-400">High Impact, High Effort</div>
            </div>
            <div className="absolute bottom-8 left-8 text-slate-500/50 text-sm font-medium">
              📝 Fill-Ins
              <div className="text-xs text-slate-400">Low Impact, Low Effort</div>
            </div>
            <div className="absolute bottom-8 right-8 text-right text-red-500/50 text-sm font-medium">
              ⚠️ Avoid
              <div className="text-xs text-slate-400">Low Impact, High Effort</div>
            </div>
          </div>

          {/* Y-axis label */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 -rotate-90 text-slate-400 text-sm font-medium whitespace-nowrap">
            ← Low Impact — High Impact →
          </div>

          {/* X-axis label */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-slate-400 text-sm font-medium">
            ← Low Effort — High Effort →
          </div>

          {/* Collapsed Clusters */}
          {clusters.filter(c => !expandedClusters.has(c.id)).map(cluster => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              position={{
                x: 80 + (cluster.totalEffort / 100) * (canvasSize.width - 160),
                y: 80 + ((100 - cluster.totalImpact) / 100) * (canvasSize.height - 160),
              }}
              isExpanded={false}
              onClick={() => toggleCluster(cluster.id)}
              onToggleExpand={() => toggleCluster(cluster.id)}
              scale={scale}
            />
          ))}

          {/* Visible Opportunity Cards */}
          {visibleOpportunities.map(opp => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              position={getPosition(opp)}
              getInitiativeColor={getInitiativeColor}
              getAreaName={getAreaName}
              milestones={milestones}
              assignments={assignments}
              isDragging={dragging?.oppId === opp.id}
              isHighlighted={highlightedOpp === opp.id || 
                (highlightedOpp && ((opp.blocks || []).includes(highlightedOpp) || (opp.blockedBy || []).includes(highlightedOpp)))}
              onMouseDown={(e) => handleDragStart(e, opp)}
              onClick={() => {
                if (!dragging) {
                  onSelectOpportunity?.(opp);
                }
              }}
              onMouseEnter={() => setHighlightedOpp(opp.id)}
              onMouseLeave={() => setHighlightedOpp(null)}
              onUpdateScores={handleUpdateScores}
              scale={scale}
            />
          ))}
        </div>

        {/* Dependency lines (drawn in screen space, on top) */}
        <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
          {dependencyLines.map((line, idx) => (
            <DependencyLine key={idx} from={line.from} to={line.to} scale={scale} />
          ))}
        </svg>

        {/* Minimap */}
        <Minimap
          opportunities={filteredOpportunities}
          clusters={clusters}
          viewBox={viewBox}
          canvasSize={canvasSize}
          onNavigate={handleMinimapNavigate}
          getPosition={getPosition}
          getInitiativeColor={getInitiativeColor}
        />

        {/* Zoom controls */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-1">
          <button
            onClick={() => setScale(s => Math.min(3, s + 0.2))}
            className="w-8 h-8 bg-white hover:bg-slate-50 text-slate-600 rounded flex items-center justify-center text-lg border border-slate-200 shadow-sm"
          >
            +
          </button>
          <button
            onClick={() => setScale(s => Math.max(0.3, s - 0.2))}
            className="w-8 h-8 bg-white hover:bg-slate-50 text-slate-600 rounded flex items-center justify-center text-lg border border-slate-200 shadow-sm"
          >
            −
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-4">
          <span>Left bar = Initiative</span>
          <span>⚠️ = At risk</span>
          <span>✓ = Done</span>
          <span>🎯 = Milestone</span>
          <span>🔗 = Dependencies</span>
        </div>
        <div className="text-slate-500">
          Drag cards • Click scores to edit • Scroll to zoom • Alt+drag to pan
        </div>
      </div>
    </div>
  );
}
