import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabase';
import { areas, initiatives, months, parseMonthId } from '../utils/helpers';

// ============ CONSTANTS ============
const STATUS_CONFIG = {
  not_started: { color: "#64748B", label: "Not Started" },
  in_progress: { color: "#3B82F6", label: "In Progress" },
  done: { color: "#10B981", label: "Done" },
  blocked: { color: "#EF4444", label: "Blocked" },
};

const parseDate = (str) => str ? new Date(str + (str.includes('T') ? '' : 'T00:00:00')) : null;
const formatDate = (d) => d?.toISOString().split("T")[0] || '';
const daysBetween = (a, b) => Math.round((b - a) / (1000 * 60 * 60 * 24));
const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

// ============ INLINE DATE EDITOR ============
function InlineDateEditor({ item, onSave, onCancel }) {
  const [startDate, setStartDate] = useState(item.startDate || formatDate(TODAY));
  const [endDate, setEndDate] = useState(item.endDate || formatDate(addDays(TODAY, 14)));
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onCancel(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onCancel]);

  return (
    <div ref={ref} className="absolute z-50 bg-[#1a1f2e] border border-[#2a3555] rounded-lg shadow-2xl p-3 w-[260px]"
      style={{ top: '100%', left: 0, marginTop: 4 }}>
      <div className="text-[10px] text-[#6b7a94] uppercase tracking-widest mb-2 flex items-center gap-2">
        <span className="text-[#4a7dff]">●</span> Set dates for {item.identifier}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-[9px] text-[#4a5568] uppercase tracking-widest block mb-1">Start</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-[#0f1219] border border-[#2a3040] rounded px-2 py-1.5 text-[11px] text-[#c8d4e6] focus:border-[#4a7dff] focus:outline-none" />
        </div>
        <div>
          <label className="text-[9px] text-[#4a5568] uppercase tracking-widest block mb-1">End</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-[#0f1219] border border-[#2a3040] rounded px-2 py-1.5 text-[11px] text-[#c8d4e6] focus:border-[#4a7dff] focus:outline-none" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave(item, startDate, endDate)}
          className="flex-1 px-3 py-1.5 bg-[#4a7dff] hover:bg-[#5a8dff] text-white text-[11px] font-medium rounded transition-colors">
          Save
        </button>
        <button onClick={onCancel}
          className="px-3 py-1.5 bg-[#1e2433] hover:bg-[#252d3f] text-[#8896ab] text-[11px] rounded transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============ GANTT BAR (SVG) ============
function GanttBar({ item, timelineStart, dayWidth, rowY, barHeight, isSubtask, barColor, onDragEnd, onSelect, isSelected, focusOpacity = 1 }) {
  const startDate = parseDate(item.startDate);
  const endDate = parseDate(item.endDate);
  if (!startDate || !endDate) return null;

  const startOffset = daysBetween(timelineStart, startDate) * dayWidth;
  const width = Math.max(daysBetween(startDate, endDate) * dayWidth, 20);
  const statusColor = STATUS_CONFIG[item.status]?.color || "#64748B";

  const progress = item.progress != null ? item.progress / 100
    : item.status === "done" ? 1 : item.status === "in_progress" ? 0.5 : 0;

  const dragStartRef = useRef(null);

  const handleMouseDown = (e, type) => {
    e.stopPropagation();
    e.preventDefault();
    dragStartRef.current = { x: e.clientX, startDate: item.startDate, endDate: item.endDate, type };

    let lastStart = item.startDate, lastEnd = item.endDate;

    const handleMouseMove = (me) => {
      const dx = me.clientX - dragStartRef.current.x;
      const daysDelta = Math.round(dx / dayWidth);
      if (daysDelta === 0) return;
      const ref = dragStartRef.current;
      if (type === "move") {
        lastStart = formatDate(addDays(parseDate(ref.startDate), daysDelta));
        lastEnd = formatDate(addDays(parseDate(ref.endDate), daysDelta));
      } else if (type === "start") {
        const ns = addDays(parseDate(ref.startDate), daysDelta);
        if (ns < parseDate(ref.endDate)) { lastStart = formatDate(ns); lastEnd = ref.endDate; }
      } else if (type === "end") {
        const ne = addDays(parseDate(ref.endDate), daysDelta);
        if (ne > parseDate(ref.startDate)) { lastStart = ref.startDate; lastEnd = formatDate(ne); }
      }
    };

    const handleMouseUp = () => {
      if (lastStart !== item.startDate || lastEnd !== item.endDate) {
        onDragEnd(item, lastStart, lastEnd);
      }
      dragStartRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const initials = item.assigneeName ? item.assigneeName.split(' ').map(w => w[0]).join('').slice(0, 2) : null;
  const isPulseboardDate = item.dateSource?.start === "pulseboard" || item.dateSource?.end === "pulseboard";

  return (
    <g style={{ cursor: "pointer", opacity: focusOpacity }}>
      {/* Background bar */}
      <rect x={startOffset} y={rowY} width={width} height={barHeight} rx={barHeight / 2}
        fill={barColor} opacity={isSubtask ? 0.25 : 0.2}
        stroke={isSelected ? "#fff" : isPulseboardDate ? "#4a7dff" : "transparent"}
        strokeWidth={isSelected ? 1.5 : isPulseboardDate ? 1 : 0}
        strokeOpacity={isSelected ? 0.6 : 0.3}
        strokeDasharray={isPulseboardDate && !isSelected ? "3 2" : "none"}
        onMouseDown={(e) => handleMouseDown(e, "move")} onClick={() => onSelect?.(item)} />
      {/* Progress fill */}
      {progress > 0 && (
        <rect x={startOffset} y={rowY} width={Math.max(width * progress, barHeight)} height={barHeight}
          rx={barHeight / 2} fill={barColor} opacity={0.55} style={{ pointerEvents: "none" }} />
      )}
      {/* Status dot */}
      <circle cx={startOffset + 10} cy={rowY + barHeight / 2} r={3} fill={statusColor} style={{ pointerEvents: "none" }} />
      {/* Title */}
      {width > 60 && (
        <text x={startOffset + 20} y={rowY + barHeight / 2 + 1} fill="#c8d4e6"
          fontSize={isSubtask ? 10 : 11} fontWeight={isSubtask ? 400 : 500}
          dominantBaseline="middle" style={{ pointerEvents: "none" }}>
          {isSubtask && item.identifier && <tspan fill="#6b7a94" fontSize={9}>{item.identifier}  </tspan>}
          {item.title.length > Math.floor(width / 7) ? item.title.slice(0, Math.floor(width / 7)) + "…" : item.title}
        </text>
      )}
      {/* Assignee avatar */}
      {!isSubtask && initials && width > 50 && (
        <g>
          <circle cx={startOffset + width - 14} cy={rowY + barHeight / 2} r={8} fill={barColor} opacity={0.8} />
          <text x={startOffset + width - 14} y={rowY + barHeight / 2 + 1} fill="#fff" fontSize={8} fontWeight={600}
            textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: "none" }}>{initials}</text>
        </g>
      )}
      {/* Pulseboard date indicator */}
      {isPulseboardDate && (
        <circle cx={startOffset + 4} cy={rowY + 4} r={2.5} fill="#4a7dff" style={{ pointerEvents: "none" }} />
      )}
      {/* Resize handles */}
      <rect x={startOffset} y={rowY} width={6} height={barHeight} fill="transparent"
        style={{ cursor: "ew-resize" }} onMouseDown={(e) => handleMouseDown(e, "start")} />
      <rect x={startOffset + width - 6} y={rowY} width={6} height={barHeight} fill="transparent"
        style={{ cursor: "ew-resize" }} onMouseDown={(e) => handleMouseDown(e, "end")} />
    </g>
  );
}

// ============ DEPENDENCY ARROW ============
function DependencyArrow({ fromX, fromY, toX, toY, isCritical, isLinked, hasFocus }) {
  const midX = (fromX + toX) / 2;
  const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
  // Focus mode styling
  const stroke = isCritical ? '#F59E0B' : '#4a7dff';
  const width = isCritical ? 2 : 1.5;
  const dash = isCritical ? 'none' : '4 3';
  const opacity = isCritical ? 0.8 : 0.5;
  return (
    <g>
      <path d={path} fill="none" stroke={stroke} strokeWidth={width} strokeDasharray={dash} opacity={opacity} />
      <polygon points={`${toX},${toY} ${toX - 6},${toY - 3} ${toX - 6},${toY + 3}`} fill={stroke} opacity={opacity + 0.1} />
    </g>
  );
}

// ============ MAIN GANTT VIEW ============
export default function GanttView({
  opportunities = [],
  milestones = [],
  areas = [],
  teamMembers = [],
  assignments = {},
  onSaveOpportunity,
  showNotification,
  focusMilestoneId = null,
  onClearFocus,
  onFocusMilestone,
}) {
  const [viewMode, setViewMode] = useState("opportunities");
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDependencies, setShowDependencies] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [filterArea, setFilterArea] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [editingDateFor, setEditingDateFor] = useState(null); // issue being date-edited
  const [groupBy, setGroupBy] = useState("area"); // "area" | "initiative" | "none"
  const [collapsedLanes, setCollapsedLanes] = useState(new Set());
  const scrollRef = useRef(null);

  // Linear state
  const [linearIssues, setLinearIssues] = useState(null);
  const [linearLoading, setLinearLoading] = useState(false);
  const [linearError, setLinearError] = useState(null);
  const [linearProjects, setLinearProjects] = useState([]);

  // Timeline range
  const timelineStart = useMemo(() => {
    const dates = [];
    const items = viewMode === "opportunities" ? opportunities : [
      ...(linearIssues?.parentIssues || []),
      ...(linearIssues?.subIssues || []),
    ];
    items.forEach(i => { if (i.startDate) dates.push(parseDate(i.startDate)); });
    if (viewMode === "opportunities") {
      milestones.forEach(m => { const d = parseMonthId(m.month); if (d) dates.push(d); });
    }
    if (dates.length === 0) return addDays(TODAY, -30);
    return addDays(new Date(Math.min(...dates)), -14);
  }, [viewMode, opportunities, milestones, linearIssues]);

  const timelineEnd = useMemo(() => {
    const dates = [];
    const items = viewMode === "opportunities" ? opportunities : [
      ...(linearIssues?.parentIssues || []),
      ...(linearIssues?.subIssues || []),
    ];
    items.forEach(i => { if (i.endDate) dates.push(parseDate(i.endDate)); });
    if (viewMode === "opportunities") {
      milestones.forEach(m => { const d = parseMonthId(m.month); if (d) dates.push(d); });
    }
    if (dates.length === 0) return addDays(TODAY, 120);
    return addDays(new Date(Math.max(...dates)), 30);
  }, [viewMode, opportunities, milestones, linearIssues]);

  const totalDays = daysBetween(timelineStart, timelineEnd);
  const dayWidth = 4 * zoom;
  const totalWidth = totalDays * dayWidth;

  const HEADER_HEIGHT = 50;
  const ROW_HEIGHT = 36;
  const SUB_ROW_HEIGHT = 28;
  const LEFT_PANEL_WIDTH = 280;
  const BAR_HEIGHT = 26;
  const SUB_BAR_HEIGHT = 20;
  const ROW_GAP = 2;

  // ===== FETCH LINEAR ISSUES =====
  const fetchLinearIssues = useCallback(async () => {
    const linearApiKey = typeof window !== 'undefined' ? localStorage.getItem('pulseboard_linear_key') : '';
    if (!linearApiKey) {
      setLinearError('No Linear API key found. Set it in the Linear Sync modal first.');
      return;
    }
    setLinearLoading(true);
    setLinearError(null);
    try {
      const response = await fetch('/api/gantt-linear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linearApiKey }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch');
      }
      const data = await response.json();
      setLinearIssues(data);
      setLinearProjects(data.projects || []);
      showNotification?.(`Loaded ${data.totalCount} issues (${data.withDates} with dates, ${data.pulseboardDated} from Pulseboard)`, 'success');
    } catch (error) {
      console.error('Gantt Linear fetch error:', error);
      setLinearError(error.message);
    } finally {
      setLinearLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    if (viewMode === "issues" && !linearIssues && !linearLoading) fetchLinearIssues();
  }, [viewMode, linearIssues, linearLoading, fetchLinearIssues]);

  // ===== SAVE DATE OVERRIDE =====
  const saveDateOverride = useCallback(async (item, startDate, endDate) => {
    try {
      // Opportunities: save via onSaveOpportunity (updates opportunities table)
      if (!item.identifier && item.id && onSaveOpportunity) {
        await onSaveOpportunity({ ...item, startDate, endDate });
        setEditingDateFor(null);
        showNotification?.(`Dates saved for ${item.title}`, 'success');
        return;
      }

      // Linear issues: save to issue_dates table
      const response = await fetch('/api/issue-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates: {
            issueIdentifier: item.identifier,
            linearIssueId: item.id,
            startDate,
            endDate,
          },
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const detail = errData.message || errData.details || errData.error || 'Unknown error';
        throw new Error(`${errData.code || response.status}: ${detail}`);
      }

      // Update local state immediately
      setLinearIssues(prev => {
        if (!prev) return prev;
        const updateItem = (i) => {
          if (i.identifier !== item.identifier) return i;
          return {
            ...i,
            startDate,
            endDate,
            hasPulseboardDates: true,
            dateSource: { start: "pulseboard", end: "pulseboard" },
          };
        };
        return {
          ...prev,
          issues: prev.issues.map(updateItem),
          parentIssues: prev.parentIssues.map(updateItem),
          subIssues: prev.subIssues.map(updateItem),
        };
      });

      setEditingDateFor(null);
      showNotification?.(`Dates saved for ${item.identifier}`, 'success');
    } catch (error) {
      console.error('Error saving date override:', error);
      showNotification?.(`Failed to save dates: ${error.message}`, 'warning');
    }
  }, [showNotification, onSaveOpportunity]);

  // Handle drag-end on bars (also saves to Supabase)
  const handleBarDragEnd = useCallback((item, newStart, newEnd) => {
    if (viewMode === "issues" && item.identifier) {
      saveDateOverride(item, newStart, newEnd);
    }
  }, [viewMode, saveDateOverride]);

  // ===== BUILD ROWS =====
  const SWIMLANE_HEIGHT = 32;

  const oppRows = useMemo(() => {
    const filtered = opportunities.filter(o => {
      if (filterArea !== "all" && o.area !== filterArea) return false;
      if (filterStatus !== "all" && o.status !== filterStatus) return false;
      return true;
    });
    const layout = [];
    let y = HEADER_HEIGHT;

    // Pre-sort milestones by date
    const sortedMilestones = [...milestones].sort((a, b) => {
      const da = parseMonthId(a.month);
      const db = parseMonthId(b.month);
      return (da || 0) - (db || 0);
    });

    // Helper: build milestone row object
    const makeMsRow = (ms, laneId) => {
      const msDate = parseMonthId(ms.month);
      return {
        type: "milestone",
        item: { ...ms, startDate: msDate ? formatDate(msDate) : null, endDate: msDate ? formatDate(msDate) : null },
        laneId,
      };
    };

    // Helper: push opportunities then milestones within a lane
    // Opportunities linked to a milestone appear above it, then the diamond, then unlinked opps
    const pushLaneContent = (groupOpps, groupMilestones, laneId) => {
      const linkedToMs = new Set();
      groupMilestones.forEach(ms => {
        // Opportunities linked to this milestone
        const linked = groupOpps.filter(o => o.milestoneId === ms.id);
        linked.forEach(opp => {
          linkedToMs.add(opp.id);
          layout.push({ type: "opportunity", item: opp, y, height: ROW_HEIGHT, laneId });
          y += ROW_HEIGHT + ROW_GAP;
        });
        // Milestone diamond row
        const row = makeMsRow(ms, laneId);
        layout.push({ ...row, y, height: ROW_HEIGHT });
        y += ROW_HEIGHT + ROW_GAP;
      });
      // Remaining opportunities not linked to any milestone
      groupOpps.filter(o => !linkedToMs.has(o.id)).forEach(opp => {
        layout.push({ type: "opportunity", item: opp, y, height: ROW_HEIGHT, laneId });
        y += ROW_HEIGHT + ROW_GAP;
      });
    };

    if (groupBy !== "none") {
      const groups = groupBy === "area" ? areas : initiatives;
      groups.forEach(group => {
        const groupOpps = filtered.filter(o => o[groupBy] === group.id);
        // Milestones in this group (match by area for area grouping; for initiative grouping, include milestones whose area matches any opp's area in this group)
        const groupMs = groupBy === "area"
          ? sortedMilestones.filter(ms => ms.area === group.id)
          : sortedMilestones.filter(ms => groupOpps.some(o => o.milestoneId === ms.id));

        if (groupOpps.length === 0 && groupMs.length === 0) return;

        const isCollapsed = collapsedLanes.has(group.id);
        const totalCount = groupOpps.length + groupMs.length;
        layout.push({
          type: "swimlane-header",
          item: { id: `lane-${group.id}`, title: group.name, laneId: group.id, color: group.color, count: totalCount },
          y,
          height: SWIMLANE_HEIGHT,
        });
        y += SWIMLANE_HEIGHT + ROW_GAP;

        if (!isCollapsed) {
          pushLaneContent(groupOpps, groupMs, group.id);
        }
      });

      // Ungrouped opportunities (no area/initiative set)
      const ungrouped = filtered.filter(o => !o[groupBy]);
      const ungroupedMs = groupBy === "area"
        ? sortedMilestones.filter(ms => !ms.area)
        : sortedMilestones.filter(ms => ungrouped.some(o => o.milestoneId === ms.id));

      if (ungrouped.length > 0 || ungroupedMs.length > 0) {
        const isCollapsed = collapsedLanes.has("ungrouped");
        layout.push({
          type: "swimlane-header",
          item: { id: "lane-ungrouped", title: "Ungrouped", laneId: "ungrouped", color: "#4a5568", count: ungrouped.length + ungroupedMs.length },
          y,
          height: SWIMLANE_HEIGHT,
        });
        y += SWIMLANE_HEIGHT + ROW_GAP;

        if (!isCollapsed) {
          pushLaneContent(ungrouped, ungroupedMs, "ungrouped");
        }
      }
    } else {
      // Flat list — still interleave milestones with their linked opportunities
      pushLaneContent(filtered, sortedMilestones, undefined);
    }

    return { rows: layout, totalHeight: y + 40 };
  }, [opportunities, milestones, filterArea, filterStatus, groupBy, collapsedLanes]);

  const issueRows = useMemo(() => {
    if (!linearIssues) return { rows: [], totalHeight: 100 };
    let parents = linearIssues.parentIssues.filter(i => {
      if (filterProject !== "all" && i.project?.id !== filterProject) return false;
      if (filterStatus !== "all" && i.status !== filterStatus) return false;
      return true;
    });
    const layout = [];
    let y = HEADER_HEIGHT;
    parents.forEach(parent => {
      const color = parent.project?.color || "#6366F1";
      layout.push({ type: "parent", item: { ...parent, assigneeName: parent.assignee?.name }, color, y, height: ROW_HEIGHT });
      y += ROW_HEIGHT + ROW_GAP;
      if (expandedRows.has(parent.id)) {
        const children = linearIssues.subIssues.filter(s => s.parentId === parent.id);
        children.forEach(child => {
          layout.push({ type: "child", item: { ...child, assigneeName: child.assignee?.name }, parentId: parent.id, color, y, height: SUB_ROW_HEIGHT });
          y += SUB_ROW_HEIGHT + ROW_GAP;
        });
      }
    });
    return { rows: layout, totalHeight: y + 40 };
  }, [linearIssues, filterProject, filterStatus, expandedRows]);

  const currentRows = viewMode === "opportunities" ? oppRows : issueRows;

  const toggleExpand = (id) => setExpandedRows(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const toggleLane = (laneId) => setCollapsedLanes(prev => {
    const n = new Set(prev); n.has(laneId) ? n.delete(laneId) : n.add(laneId); return n;
  });

  // ===== MONTH COLUMNS =====
  const monthColumns = useMemo(() => {
    const cols = [];
    let d = new Date(timelineStart);
    while (d < timelineEnd) {
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const startOffset = Math.max(0, daysBetween(timelineStart, monthStart)) * dayWidth;
      const endOffset = Math.min(totalDays, daysBetween(timelineStart, monthEnd) + 1) * dayWidth;
      cols.push({ label: monthStart.toLocaleString("default", { month: "short", year: "2-digit" }), x: startOffset, width: endOffset - startOffset });
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    return cols;
  }, [dayWidth, totalDays, timelineStart, timelineEnd]);

  const todayOffset = daysBetween(timelineStart, TODAY) * dayWidth;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, todayOffset - 300);
  }, [todayOffset]);

  // Focus mode: compute which items are related to the focused milestone
  const focusData = useMemo(() => {
    if (!focusMilestoneId || viewMode !== "opportunities") return null;

    const ms = milestones.find(m => m.id === focusMilestoneId);
    if (!ms) return null;

    // Direct linked opportunities
    const linkedIds = new Set(opportunities.filter(o => o.milestoneId === focusMilestoneId).map(o => o.id));

    // Follow blockedBy chains to find all prerequisites
    let changed = true;
    while (changed) {
      changed = false;
      opportunities.forEach(o => {
        if (linkedIds.has(o.id)) {
          (o.blockedBy || []).forEach(depId => {
            if (!linkedIds.has(depId)) { linkedIds.add(depId); changed = true; }
          });
        }
      });
    }

    // Compute critical path (longest sequential chain)
    // Simple: follow dependency chains from items with no dependsOn to final items
    const linked = opportunities.filter(o => linkedIds.has(o.id));
    const criticalIds = new Set();

    // Find items with no blockedBy (start of chains)
    const roots = linked.filter(o => !(o.blockedBy || []).some(id => linkedIds.has(id)));
    // Find the longest chain via DFS
    const chainLength = (id, visited = new Set()) => {
      if (visited.has(id)) return 0;
      visited.add(id);
      const opp = linked.find(o => o.id === id);
      if (!opp) return 0;
      const blockers = (opp.blocks || []).filter(bid => linkedIds.has(bid));
      if (blockers.length === 0) return 1;
      return 1 + Math.max(...blockers.map(bid => chainLength(bid, new Set(visited))));
    };

    let longestChain = [];
    const traceChain = (id, chain = []) => {
      const opp = linked.find(o => o.id === id);
      if (!opp) return;
      const newChain = [...chain, id];
      const blockers = (opp.blocks || []).filter(bid => linkedIds.has(bid));
      if (blockers.length === 0) {
        if (newChain.length > longestChain.length) longestChain = newChain;
        return;
      }
      blockers.forEach(bid => traceChain(bid, newChain));
    };
    roots.forEach(r => traceChain(r.id));
    longestChain.forEach(id => criticalIds.add(id));

    // Buffer: milestone target date vs last item end date
    const msDate = ms.targetDate ? parseDate(ms.targetDate) : parseMonthId(ms.month);
    const endDates = linked.filter(o => o.endDate).map(o => parseDate(o.endDate)).filter(Boolean);
    const lastEnd = endDates.length > 0 ? new Date(Math.max(...endDates)) : null;
    const bufferDays = msDate && lastEnd ? daysBetween(lastEnd, msDate) : null;

    return { milestone: ms, linkedIds, criticalIds, bufferDays, lastEnd, msDate };
  }, [focusMilestoneId, milestones, opportunities, viewMode]);

  // Dependency arrows
  const dependencyArrows = useMemo(() => {
    if (!showDependencies || viewMode !== "opportunities") return [];
    const arrows = [];
    opportunities.forEach(opp => {
      (opp.blocks || []).forEach(targetId => {
        const target = opportunities.find(o => o.id === targetId);
        if (!target || !opp.endDate || !target.startDate) return;
        const fromRow = oppRows.rows.find(r => r.item.id === opp.id);
        const toRow = oppRows.rows.find(r => r.item.id === targetId);
        if (!fromRow || !toRow) return;
        // In focus mode, classify arrows
        const isCriticalArrow = focusData && focusData.criticalIds.has(opp.id) && focusData.criticalIds.has(targetId);
        const isLinkedArrow = focusData && focusData.linkedIds.has(opp.id) && focusData.linkedIds.has(targetId);
        arrows.push({
          fromX: daysBetween(timelineStart, parseDate(opp.endDate)) * dayWidth,
          fromY: fromRow.y + BAR_HEIGHT / 2,
          toX: daysBetween(timelineStart, parseDate(target.startDate)) * dayWidth,
          toY: toRow.y + BAR_HEIGHT / 2,
          isCritical: isCriticalArrow,
          isLinked: isLinkedArrow,
        });
      });
    });
    return arrows;
  }, [opportunities, oppRows, showDependencies, viewMode, dayWidth, timelineStart, focusData]);

  const getBarColor = (row) => {
    if (row.color) return row.color;
    const areaInfo = areas.find(a => a.id === row.item?.area);
    return areaInfo?.color || "#6366F1";
  };

  // Count dateless issues
  const datelessCount = useMemo(() => {
    if (!linearIssues) return 0;
    return linearIssues.issues.filter(i => !i.startDate || !i.endDate).length;
  }, [linearIssues]);

  return (
    <div className="flex flex-col h-full bg-[#0b0e14] text-[#c8d4e6]" style={{ fontFamily: "'JetBrains Mono', 'SF Mono', monospace" }}>
      {/* Top bar */}
      <div className="border-b border-[#1a1f2e] px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex bg-[#12161f] rounded-md border border-[#1e2433] overflow-hidden">
            {["opportunities", "issues"].map(m => (
              <button key={m} onClick={() => { setViewMode(m); setExpandedRows(new Set()); setSelectedItem(null); setEditingDateFor(null); }}
                className={`px-3 py-1.5 text-[11px] uppercase tracking-wider transition-all ${viewMode === m ? "bg-[#1a2035] text-white" : "text-[#4a5568] hover:text-[#8896ab]"}`}>
                {m}
              </button>
            ))}
          </div>

          {viewMode === "opportunities" && (
            <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)}
              className="bg-[#12161f] border border-[#1e2433] rounded px-2 py-1 text-[11px] text-[#8896ab] focus:outline-none focus:border-[#4a7dff]">
              <option value="all">All Areas</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}

          {viewMode === "issues" && (
            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}
              className="bg-[#12161f] border border-[#1e2433] rounded px-2 py-1 text-[11px] text-[#8896ab] focus:outline-none focus:border-[#4a7dff]">
              <option value="all">All Projects</option>
              {linearProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#12161f] border border-[#1e2433] rounded px-2 py-1 text-[11px] text-[#8896ab] focus:outline-none focus:border-[#4a7dff]">
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          {viewMode === "opportunities" && (
            <div className="flex bg-[#12161f] rounded-md border border-[#1e2433] overflow-hidden">
              {[{ key: "area", label: "Area" }, { key: "initiative", label: "Initiative" }, { key: "none", label: "Flat" }].map(g => (
                <button key={g.key} onClick={() => { setGroupBy(g.key); setCollapsedLanes(new Set()); }}
                  className={`px-2.5 py-1 text-[10px] uppercase tracking-wider transition-all ${groupBy === g.key ? "bg-[#1a2035] text-white" : "text-[#4a5568] hover:text-[#8896ab]"}`}>
                  {g.label}
                </button>
              ))}
            </div>
          )}

          {viewMode === "issues" && linearIssues && (
            <span className="text-[10px] text-[#4a5568]">
              {linearIssues.withDates} with dates · {datelessCount} need dates
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {focusData && (
            <div className="flex items-center gap-2 px-3 py-1 bg-[#F59E0B15] border border-[#F59E0B40] rounded-lg animate-pulse-slow">
              <span className="text-amber-400 text-xs">◆</span>
              <span className="text-amber-300 text-[11px] font-medium">Focus: {focusData.milestone.title}</span>
              {focusData.bufferDays != null && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  focusData.bufferDays > 7 ? 'bg-emerald-500/20 text-emerald-400' :
                  focusData.bufferDays > 0 ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {focusData.bufferDays > 0 ? `${focusData.bufferDays}d buffer` : `${Math.abs(focusData.bufferDays)}d over`}
                </span>
              )}
              <button onClick={onClearFocus} className="text-amber-400/60 hover:text-white text-xs ml-1 transition-colors">✕</button>
            </div>
          )}
          {viewMode === "issues" && (
            <button onClick={fetchLinearIssues} disabled={linearLoading}
              className="px-2.5 py-1 text-[11px] rounded border border-[#1e2433] text-[#6b7a94] hover:text-white hover:border-[#4a7dff] transition-all disabled:opacity-50">
              {linearLoading ? "Loading…" : "↻ Refresh"}
            </button>
          )}
          <div className="flex items-center gap-1 bg-[#12161f] rounded border border-[#1e2433] overflow-hidden">
            <button onClick={() => setZoom(z => Math.max(0.4, z - 0.2))} className="px-2 py-1 text-[#6b7a94] hover:text-white text-xs">−</button>
            <span className="text-[10px] text-[#4a5568] w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="px-2 py-1 text-[#6b7a94] hover:text-white text-xs">+</button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="flex-shrink-0 border-r border-[#1a1f2e] overflow-y-auto" style={{ width: LEFT_PANEL_WIDTH }}>
          <div className="sticky top-0 bg-[#0b0e14] z-10 border-b border-[#1a1f2e] px-3 flex items-center"
            style={{ height: HEADER_HEIGHT }}>
            <span className="text-[10px] text-[#4a5568] uppercase tracking-widest">
              {viewMode === "issues" ? "Issues / Sub-issues" : "Opportunities"}
            </span>
          </div>

          <div style={{ minHeight: currentRows.totalHeight - HEADER_HEIGHT }}>
            {viewMode === "issues" && linearLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-[#1e2433] border-t-[#4a7dff] rounded-full animate-spin mr-3" />
                <span className="text-[#6b7a94] text-sm">Loading from Linear…</span>
              </div>
            )}
            {viewMode === "issues" && linearError && (
              <div className="p-4">
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-xs">{linearError}</div>
              </div>
            )}

            {currentRows.rows.map((row) => {
              const item = row.item;

              // Focus mode: no dimming, just highlight critical path
              const leftFocusOpacity = 1;

              // Milestone row
              if (row.type === "milestone") {
                const areaInfo = areas.find(a => a.id === item.area);
                const monthName = months.find(m => m.id === item.month)?.name || item.month;
                return (
                  <div key={`row-ms-${item.id}`}
                    className={`flex items-center gap-2 px-3 border-b border-[#151a26] hover:bg-[#111520] cursor-pointer transition-colors ${
                      selectedItem?.id === item.id ? "bg-[#131825]" : ""
                    }`}
                    style={{ height: row.height + ROW_GAP, paddingLeft: 8, opacity: leftFocusOpacity }}
                    onClick={() => {
                      setSelectedItem(item);
                      if (onFocusMilestone) onFocusMilestone(item.id);
                    }}
                  >
                    <span className={`text-xs flex-shrink-0 ${focusMilestoneId === item.id ? 'text-amber-300' : 'text-yellow-400'}`} style={{ transform: "rotate(45deg)", display: "inline-block", width: 10, height: 10, lineHeight: "10px", textAlign: "center" }}>◆</span>
                    <span className={`truncate flex-1 text-xs font-medium ${focusMilestoneId === item.id ? 'text-amber-200' : 'text-yellow-300'}`}>{item.title}</span>
                    {focusMilestoneId === item.id && <span className="text-[8px] text-amber-400/60 uppercase tracking-wider flex-shrink-0">focused</span>}
                    <span className="text-[9px] text-[#4a5568] flex-shrink-0">{monthName}</span>
                  </div>
                );
              }

              // Swimlane header row
              if (row.type === "swimlane-header") {
                const isCollapsed = collapsedLanes.has(item.laneId);
                return (
                  <div key={`row-lane-${item.laneId}`}
                    className="flex items-center gap-2 px-3 border-b border-[#1a1f2e] cursor-pointer hover:bg-[#111520] transition-colors"
                    style={{ height: row.height + ROW_GAP, backgroundColor: `${item.color}08` }}
                    onClick={() => toggleLane(item.laneId)}
                  >
                    <button className="text-[#6b7a94] hover:text-[#8896ab] w-4 flex-shrink-0 text-xs">
                      {isCollapsed ? "▸" : "▾"}
                    </button>
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] font-semibold flex-1 truncate" style={{ color: item.color }}>
                      {item.title}
                    </span>
                    <span className="text-[9px] text-[#4a5568] flex-shrink-0 tabular-nums">
                      {item.count}
                    </span>
                  </div>
                );
              }

              const isParent = row.type === "opportunity" || row.type === "parent";
              const hasChildren = isParent && (
                row.type === "opportunity" ? item.issues?.length > 0 : item.childIds?.length > 0
              );
              const isExpanded = expandedRows.has(item.id);
              const statusColor = STATUS_CONFIG[item.status]?.color || "#64748B";
              const hasDates = item.startDate && item.endDate;
              const isEditing = editingDateFor === item.id;

              const isCriticalPath = focusData && focusData.criticalIds.has(item.id);

              return (
                <div key={`row-${item.id}`} className="relative">
                  <div
                    className={`flex items-center gap-2 px-3 border-b border-[#151a26] hover:bg-[#111520] cursor-pointer transition-colors ${
                      selectedItem?.id === item.id ? "bg-[#131825]" : ""
                    } ${isCriticalPath ? "bg-[#F59E0B08]" : ""}`}
                    style={{ height: row.height + ROW_GAP, paddingLeft: isParent ? (row.laneId ? 24 : 8) : 28, opacity: leftFocusOpacity }}
                    onClick={() => setSelectedItem(item)}
                  >
                    {isParent && hasChildren && (
                      <button onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}
                        className="text-[#4a5568] hover:text-[#8896ab] w-4 flex-shrink-0 text-xs">
                        {isExpanded ? "▾" : "▸"}
                      </button>
                    )}
                    {isParent && !hasChildren && <span className="w-4 flex-shrink-0" />}

                    {isCriticalPath ? (
                      <span className="w-2 h-2 rounded-full flex-shrink-0 bg-amber-400" title="Critical path" />
                    ) : (
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getBarColor(row) }} />
                    )}

                    {viewMode === "issues" && item.identifier && (
                      <span className="text-[10px] text-[#4a5568] font-mono flex-shrink-0">{item.identifier}</span>
                    )}

                    <span className={`truncate flex-1 ${isParent ? "text-xs text-[#c8d4e6] font-medium" : "text-[11px] text-[#8896ab]"}`}>
                      {item.title}
                    </span>

                    {/* Date badge / set dates button */}
                    {viewMode === "issues" && !hasDates && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingDateFor(item.id); }}
                        className="px-1.5 py-0.5 text-[9px] bg-[#4a7dff20] text-[#4a7dff] rounded hover:bg-[#4a7dff30] transition-colors flex-shrink-0"
                        title="Set dates for this issue">
                        + dates
                      </button>
                    )}

                    {viewMode === "issues" && hasDates && item.hasPulseboardDates && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingDateFor(item.id); }}
                        className="w-2 h-2 rounded-full bg-[#4a7dff] flex-shrink-0 hover:ring-2 hover:ring-[#4a7dff40]"
                        title="Edit Pulseboard dates" />
                    )}

                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                  </div>

                  {/* Inline date editor */}
                  {isEditing && (
                    <InlineDateEditor
                      item={item}
                      onSave={saveDateOverride}
                      onCancel={() => setEditingDateFor(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel — timeline */}
        <div className="flex-1 overflow-auto" ref={scrollRef}>
          <svg width={totalWidth} height={currentRows.totalHeight} className="select-none">
            {monthColumns.map((col, i) => (
              <g key={`month-${i}`}>
                <rect x={col.x} y={0} width={col.width} height={HEADER_HEIGHT} fill="#0b0e14" />
                <text x={col.x + col.width / 2} y={24} textAnchor="middle"
                  fill="#6b7a94" fontSize={11} fontWeight={600} letterSpacing={0.5}>{col.label}</text>
                {i > 0 && (
                  <line x1={col.x} y1={HEADER_HEIGHT} x2={col.x} y2={currentRows.totalHeight}
                    stroke="#1a1f2e" strokeWidth={1} strokeDasharray="3 6" opacity={0.5} />
                )}
              </g>
            ))}

            <line x1={0} y1={HEADER_HEIGHT} x2={totalWidth} y2={HEADER_HEIGHT} stroke="#1a1f2e" strokeWidth={1} />

            {currentRows.rows.map((row, i) => {
              const isCritRow = focusData && row.type !== "swimlane-header" && row.type !== "milestone" && focusData.criticalIds.has(row.item.id);
              return (
              <g key={`bg-${i}`}>
                {row.type === "swimlane-header" ? (
                  <>
                    <rect x={0} y={row.y} width={totalWidth} height={row.height}
                      fill={row.item.color} opacity={0.04} />
                    <rect x={0} y={row.y} width={3} height={row.height}
                      fill={row.item.color} opacity={0.5} />
                    <line x1={0} y1={row.y + row.height} x2={totalWidth} y2={row.y + row.height}
                      stroke={row.item.color} strokeWidth={0.5} opacity={0.2} />
                  </>
                ) : (
                  <>
                    <rect x={0} y={row.y} width={totalWidth} height={row.height}
                      fill={isCritRow ? "#1a1508" : selectedItem?.id === row.item.id ? "#131825" : row.type === "milestone" ? "#12100a" : (row.type === "issue" || row.type === "child") ? "#0a0d13" : "#0c0f16"} />
                    {isCritRow && <rect x={0} y={row.y} width={3} height={row.height} fill="#F59E0B" opacity={0.4} />}
                    <line x1={0} y1={row.y + row.height} x2={totalWidth} y2={row.y + row.height} stroke={row.type === "milestone" ? "#2a2210" : "#151a26"} strokeWidth={0.5} />
                  </>
                )}
              </g>
            );
            })}

            {/* Today */}
            <rect x={todayOffset - 1} y={0} width={2} height={currentRows.totalHeight} fill="#4a7dff" opacity={0.3} />
            <line x1={todayOffset} y1={0} x2={todayOffset} y2={currentRows.totalHeight} stroke="#4a7dff" strokeWidth={2} opacity={0.5} />
            <rect x={todayOffset - 22} y={32} width={44} height={16} rx={8} fill="#4a7dff" opacity={0.2} />
            <text x={todayOffset} y={43} textAnchor="middle" fill="#4a7dff" fontSize={9} fontWeight={600}>Today</text>

            {dependencyArrows.map((a, i) => <DependencyArrow key={`dep-${i}`} {...a} hasFocus={!!focusData} />)}

            {/* Buffer zone — only in focus mode */}
            {focusData && focusData.lastEnd && focusData.msDate && (() => {
              const bufferStartX = daysBetween(timelineStart, focusData.lastEnd) * dayWidth;
              const bufferEndX = daysBetween(timelineStart, focusData.msDate) * dayWidth;
              const bufferWidth = bufferEndX - bufferStartX;
              if (bufferWidth <= 0) return null;
              const bufferColor = focusData.bufferDays > 7 ? '#22C55E' : focusData.bufferDays > 0 ? '#F59E0B' : '#EF4444';
              return (
                <g key="buffer-zone">
                  <rect x={bufferStartX} y={HEADER_HEIGHT} width={bufferWidth} height={currentRows.totalHeight - HEADER_HEIGHT}
                    fill={bufferColor} opacity={0.06} />
                  <line x1={bufferStartX} y1={HEADER_HEIGHT} x2={bufferStartX} y2={currentRows.totalHeight}
                    stroke={bufferColor} strokeWidth={1} strokeDasharray="4 4" opacity={0.3} />
                  <rect x={bufferStartX + 4} y={HEADER_HEIGHT + 4} width={Math.min(bufferWidth - 8, 80)} height={16} rx={4}
                    fill={bufferColor} opacity={0.15} />
                  <text x={bufferStartX + 8} y={HEADER_HEIGHT + 15} fill={bufferColor} fontSize={9} fontWeight={500} opacity={0.7}>
                    {focusData.bufferDays}d buffer
                  </text>
                </g>
              );
            })()}

            {/* Milestone diamonds */}
            {currentRows.rows.filter(r => r.type === "milestone").map((row) => {
              const item = row.item;
              if (!item.startDate) return null;
              const msDate = parseDate(item.startDate);
              if (!msDate) return null;
              const xPos = daysBetween(timelineStart, msDate) * dayWidth;
              const cy = row.y + row.height / 2;
              const size = 10;
              const isSelected = selectedItem?.id === item.id;
              const isFocused = focusMilestoneId === item.id;
              const msOpacity = 1;
              return (
                <g key={`ms-${item.id}`} style={{ cursor: "pointer", opacity: msOpacity }}
                  onClick={() => {
                    setSelectedItem(item);
                    if (onFocusMilestone) onFocusMilestone(item.id);
                  }}>
                  {/* Glow when focused */}
                  {isFocused && (
                    <>
                      <circle cx={xPos} cy={cy} r={20} fill="#eab308" opacity={0.08}>
                        <animate attributeName="r" values="18;24;18" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.08;0.15;0.08" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <line x1={xPos} y1={HEADER_HEIGHT} x2={xPos} y2={currentRows.totalHeight}
                        stroke="#eab308" strokeWidth={1} strokeDasharray="4 4" opacity={0.15} />
                    </>
                  )}
                  {/* Dashed vertical line */}
                  <line x1={xPos} y1={row.y + 2} x2={xPos} y2={row.y + row.height - 2}
                    stroke="#eab308" strokeWidth={1} strokeDasharray="2 3" opacity={0.3} />
                  {/* Diamond */}
                  <polygon
                    points={`${xPos},${cy - size} ${xPos + size},${cy} ${xPos},${cy + size} ${xPos - size},${cy}`}
                    fill={isFocused ? "#F59E0B" : "#eab308"} opacity={isFocused ? 1 : isSelected ? 0.9 : 0.7}
                    stroke={isFocused ? "#fff" : isSelected ? "#fff" : "#eab308"}
                    strokeWidth={isFocused ? 2 : isSelected ? 1.5 : 0.5} />
                  {/* Label */}
                  <text x={xPos + size + 6} y={cy + 1} fill={isFocused ? "#F59E0B" : "#eab308"} fontSize={isFocused ? 11 : 10} fontWeight={isFocused ? 600 : 500}
                    dominantBaseline="middle" opacity={isFocused ? 1 : 0.8} style={{ pointerEvents: "none" }}>
                    {item.title}
                  </text>
                </g>
              );
            })}

            {/* Opportunity & issue bars */}
            {currentRows.rows.filter(r => r.type !== "milestone" && r.type !== "swimlane-header").map((row) => {
              const item = row.item;
              if (!item.startDate || !item.endDate) return null;
              const isParent = row.type === "opportunity" || row.type === "parent";
              // Focus mode: critical path in amber, everything else normal
              let barColor = getBarColor(row);
              let focusOpacity = 1;
              if (focusData && focusData.criticalIds.has(item.id)) {
                barColor = '#F59E0B'; // amber for critical path
              }
              return (
                <GanttBar key={`bar-${item.id}`} item={item} timelineStart={timelineStart} dayWidth={dayWidth}
                  rowY={row.y + (row.height - (isParent ? BAR_HEIGHT : SUB_BAR_HEIGHT)) / 2}
                  barHeight={isParent ? BAR_HEIGHT : SUB_BAR_HEIGHT}
                  isSubtask={!isParent} barColor={barColor} focusOpacity={focusOpacity}
                  onDragEnd={handleBarDragEnd} onSelect={setSelectedItem} isSelected={selectedItem?.id === item.id} />
              );
            })}
          </svg>
        </div>

        {/* Detail panel */}
        {selectedItem && (
          <div className="flex-shrink-0 border-l border-[#1a1f2e] overflow-y-auto bg-[#0d1018]" style={{ width: 300 }}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white truncate flex-1">{selectedItem.title}</h3>
                <button onClick={() => setSelectedItem(null)} className="text-[#4a5568] hover:text-white text-xs ml-2">✕</button>
              </div>

              {/* === MILESTONE DETAILS === */}
              {milestones.some(m => m.id === selectedItem.id) && (() => {
                const areaInfo = areas.find(a => a.id === selectedItem.area);
                const monthName = months.find(m => m.id === selectedItem.month)?.name;
                const linkedOpps = opportunities.filter(o => o.milestoneId === selectedItem.id);
                return (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-yellow-400 text-sm">◆</span>
                      <span className="text-[10px] text-yellow-400 uppercase tracking-widest font-medium">Milestone</span>
                    </div>

                    {areaInfo && (
                      <div className="mb-3">
                        <label className="text-[10px] text-[#4a5568] uppercase tracking-widest block mb-1">Area</label>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px]"
                          style={{ backgroundColor: `${areaInfo.color}20`, color: areaInfo.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: areaInfo.color }} />
                          {areaInfo.name}
                        </span>
                      </div>
                    )}

                    {monthName && (
                      <div className="mb-3">
                        <label className="text-[10px] text-[#4a5568] uppercase tracking-widest block mb-1">Target Month</label>
                        <span className="text-xs text-[#8896ab]">{monthName}</span>
                      </div>
                    )}

                    {selectedItem.description && (
                      <div className="mb-3">
                        <label className="text-[10px] text-[#4a5568] uppercase tracking-widest block mb-1.5">Description</label>
                        <p className="text-[11px] text-[#8896ab] leading-relaxed">{selectedItem.description}</p>
                      </div>
                    )}

                    {linkedOpps.length > 0 && (
                      <div className="mb-3">
                        <label className="text-[10px] text-[#4a5568] uppercase tracking-widest block mb-1.5">Linked Opportunities ({linkedOpps.length})</label>
                        <div className="space-y-1">
                          {linkedOpps.map(opp => (
                            <div key={opp.id} className="flex items-center gap-2 px-2 py-1 bg-[#111520] rounded text-[11px]">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_CONFIG[opp.status]?.color }} />
                              <span className="text-[#c8d4e6] truncate">{opp.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Linear issue link */}
              {selectedItem.identifier && (
                <a href={selectedItem.url || `https://linear.app/palazzo-ai/issue/${selectedItem.identifier}`} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-[#4a7dff] hover:underline mb-3 block">{selectedItem.identifier} ↗</a>
              )}

              {/* === OPPORTUNITY DETAILS === */}
              {!selectedItem.identifier && !milestones.some(m => m.id === selectedItem.id) && (
                <>
                  {/* Area & Initiative */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {selectedItem.area && (() => {
                      const area = areas.find(a => a.id === selectedItem.area);
                      return area ? (
                        <div>
                          <label className="text-[10px] text-[#4a5568] uppercase tracking-widest block mb-1">Area</label>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px]"
                            style={{ backgroundColor: `${area.color}20`, color: area.color }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: area.color }} />
                            {area.name}
                          </span>
                        </div>
                      ) : null;
                    })()}
                    {selectedItem.initiative && (() => {
                      const init = initiatives.find(i => i.id === selectedItem.initiative);
                      return init ? (
                        <div>
                          <label className="text-[10px] text-[#4a5568] uppercase tracking-widest block mb-1">Initiative</label>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px]"
                            style={{ backgroundColor: `${init.color}20`, color: init.color }}>
                            {init.name}
                          </span>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* Month */}
                  {selectedItem.month && (
                    <div className="mb-4">
                      <label className="text-[10px] text-[#4a5568] uppercase tracking-widest block mb-1">Month</label>
                      <span className="text-xs text-[#8896ab]">{months.find(m => m.id === selectedItem.month)?.name || selectedItem.month}</span>
                    </div>
                  )}

                  {/* Description */}
                  {selectedItem.description && (
                    <div className="mb-4">
                      <label className="text-[10px] text-[#4a5568] uppercase tracking-widest block mb-1.5">Description</label>
                      <p className="text-[11px] text-[#8896ab] leading-relaxed">{selectedItem.description}</p>
                    </div>
                  )}
                </>
              )}

              {/* Status, Dates, Duration (not for milestones) */}
              {!milestones.some(m => m.id === selectedItem.id) && (
                <>
                  {/* Status */}
                  <div className="mb-4">
                    <label className="text-[10px] text-[#4a5568] uppercase tracking-widest block mb-1.5">Status</label>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_CONFIG[selectedItem.status]?.color }} />
                      <span className="text-xs text-[#8896ab]">{selectedItem.stateName || STATUS_CONFIG[selectedItem.status]?.label}</span>
                    </div>
                  </div>

                  {/* Dates — editable */}
                  <div className="mb-4">
                    <label className="text-[10px] text-[#4a5568] uppercase tracking-widest block mb-1.5">
                      Dates
                      {selectedItem.hasPulseboardDates && <span className="text-[#4a7dff] ml-1">(Pulseboard)</span>}
                    </label>
                    {selectedItem.startDate && selectedItem.endDate ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] text-[#4a5568] block">Start</span>
                          <input type="date" value={selectedItem.startDate}
                            onChange={(e) => saveDateOverride(selectedItem, e.target.value, selectedItem.endDate)}
                            className="w-full bg-[#0f1219] border border-[#2a3040] rounded px-2 py-1 text-[11px] text-[#c8d4e6] focus:border-[#4a7dff] focus:outline-none" />
                        </div>
                        <div>
                          <span className="text-[9px] text-[#4a5568] block">End</span>
                          <input type="date" value={selectedItem.endDate}
                            onChange={(e) => saveDateOverride(selectedItem, selectedItem.startDate, e.target.value)}
                            className="w-full bg-[#0f1219] border border-[#2a3040] rounded px-2 py-1 text-[11px] text-[#c8d4e6] focus:border-[#4a7dff] focus:outline-none" />
                        </div>
                      </div>
                    ) : editingDateFor === selectedItem.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] text-[#4a5568] block">Start</span>
                            <input type="date" id="panel-start-date" defaultValue={formatDate(TODAY)}
                              className="w-full bg-[#0f1219] border border-[#2a3040] rounded px-2 py-1 text-[11px] text-[#c8d4e6] focus:border-[#4a7dff] focus:outline-none" />
                          </div>
                          <div>
                            <span className="text-[9px] text-[#4a5568] block">End</span>
                            <input type="date" id="panel-end-date" defaultValue={formatDate(addDays(TODAY, 14))}
                              className="w-full bg-[#0f1219] border border-[#2a3040] rounded px-2 py-1 text-[11px] text-[#c8d4e6] focus:border-[#4a7dff] focus:outline-none" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => {
                            const s = document.getElementById('panel-start-date')?.value;
                            const e = document.getElementById('panel-end-date')?.value;
                            if (s && e) saveDateOverride(selectedItem, s, e);
                          }}
                            className="flex-1 px-3 py-1.5 bg-[#4a7dff] hover:bg-[#5a8dff] text-white text-[11px] font-medium rounded transition-colors">
                            Save
                          </button>
                          <button onClick={() => setEditingDateFor(null)}
                            className="px-3 py-1.5 bg-[#1e2433] hover:bg-[#252d3f] text-[#8896ab] text-[11px] rounded transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setEditingDateFor(selectedItem.id)}
                        className="px-3 py-1.5 bg-[#4a7dff20] text-[#4a7dff] text-[11px] rounded hover:bg-[#4a7dff30] transition-colors">
                        + Set dates
                      </button>
                    )}
                  </div>

                  {/* Duration */}
                  {selectedItem.startDate && selectedItem.endDate && (
                    <div className="mb-4 px-3 py-2 bg-[#111520] rounded-md">
                      <span className="text-[10px] text-[#4a5568] uppercase tracking-widest">Duration</span>
                      <span className="text-sm text-white ml-2 font-medium">
                        {daysBetween(parseDate(selectedItem.startDate), parseDate(selectedItem.endDate))} days
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* === OPPORTUNITY-SPECIFIC FIELDS === */}
              {!selectedItem.identifier && !milestones.some(m => m.id === selectedItem.id) && (
                <>
                  {/* At Risk */}
                  {selectedItem.atRisk && (
                    <div className="mb-4 px-3 py-2 bg-[#1a0f0f] border border-[#4a2020] rounded-md">
                      <div className="flex items-center gap-1.5 text-orange-400 text-[11px] font-medium mb-0.5">
                        <span>⚠</span> At Risk
                      </div>
                      {selectedItem.atRiskReason && (
                        <p className="text-[10px] text-[#8896ab]">{selectedItem.atRiskReason}</p>
                      )}
                    </div>
                  )}

                  {/* Linked Issues */}
                  {selectedItem.issues?.length > 0 && (
                    <div className="mb-4">
                      <label className="text-[10px] text-[#4a5568] uppercase tracking-widest block mb-1.5">Linear Issues ({selectedItem.issues.length})</label>
                      <div className="flex flex-wrap gap-1">
                        {selectedItem.issues.map(issue => (
                          <a key={issue} href={`https://linear.app/palazzo-ai/issue/${issue}`} target="_blank" rel="noopener noreferrer"
                            className="px-2 py-0.5 bg-[#1a1f2e] text-[#4a7dff] hover:text-[#6b9bff] hover:bg-[#1e2538] text-[10px] rounded font-mono transition-colors">
                            {issue}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Impact & Effort */}
                  {(selectedItem.impactScore != null || selectedItem.effortScore != null) && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="px-2 py-1.5 bg-[#111520] rounded">
                        <span className="text-[9px] text-[#4a5568] uppercase tracking-widest block">Impact</span>
                        <span className="text-sm text-white font-medium">{selectedItem.impactScore ?? '—'}</span>
                      </div>
                      <div className="px-2 py-1.5 bg-[#111520] rounded">
                        <span className="text-[9px] text-[#4a5568] uppercase tracking-widest block">Effort</span>
                        <span className="text-sm text-white font-medium">{selectedItem.effortScore ?? '—'}</span>
                      </div>
                    </div>
                  )}

                  {/* Dependencies */}
                  {(selectedItem.blocks?.length > 0 || selectedItem.blockedBy?.length > 0) && (
                    <div className="mb-4">
                      <label className="text-[10px] text-[#4a5568] uppercase tracking-widest block mb-1.5">Dependencies</label>
                      {selectedItem.blockedBy?.length > 0 && (
                        <div className="mb-1">
                          <span className="text-[9px] text-red-400">Blocked by: </span>
                          {selectedItem.blockedBy.map(id => {
                            const dep = opportunities.find(o => o.id === id);
                            return <span key={id} className="text-[10px] text-[#8896ab]">{dep?.title || `#${id}`}{' '}</span>;
                          })}
                        </div>
                      )}
                      {selectedItem.blocks?.length > 0 && (
                        <div>
                          <span className="text-[9px] text-emerald-400">Blocks: </span>
                          {selectedItem.blocks.map(id => {
                            const dep = opportunities.find(o => o.id === id);
                            return <span key={id} className="text-[10px] text-[#8896ab]">{dep?.title || `#${id}`}{' '}</span>;
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Milestone */}
                  {selectedItem.milestoneId && (() => {
                    const ms = milestones.find(m => m.id === selectedItem.milestoneId);
                    return ms ? (
                      <div className="mb-4">
                        <label className="text-[10px] text-[#4a5568] uppercase tracking-widest block mb-1">Milestone</label>
                        <span className="text-xs text-yellow-400">{ms.title}</span>
                      </div>
                    ) : null;
                  })()}
                </>
              )}

              {/* === LINEAR ISSUE-SPECIFIC FIELDS === */}
              {selectedItem.identifier && (
                <>
                  {/* Assignee */}
                  {selectedItem.assignee && (
                    <div className="mb-4">
                      <label className="text-[10px] text-[#4a5568] uppercase tracking-widest block mb-1.5">Assignee</label>
                      <span className="text-xs text-[#8896ab]">{selectedItem.assignee.name}</span>
                    </div>
                  )}

                  {/* Project */}
                  {selectedItem.project && (
                    <div className="mb-4">
                      <label className="text-[10px] text-[#4a5568] uppercase tracking-widest block mb-1.5">Project</label>
                      <span className="text-xs text-[#8896ab]">{selectedItem.project.name}</span>
                    </div>
                  )}

                  {/* Labels */}
                  {selectedItem.labels?.length > 0 && (
                    <div className="mb-4">
                      <label className="text-[10px] text-[#4a5568] uppercase tracking-widest block mb-1.5">Labels</label>
                      <div className="flex flex-wrap gap-1">
                        {selectedItem.labels.map((l, i) => (
                          <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-[#1a1f2e] text-[#8896ab]">{l.name}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sub-issues */}
                  {selectedItem.childIds?.length > 0 && (
                    <div className="mb-4">
                      <label className="text-[10px] text-[#4a5568] uppercase tracking-widest block mb-1.5">Sub-issues ({selectedItem.childIds.length})</label>
                      <div className="space-y-1">
                        {selectedItem.childIdentifiers?.map((id, i) => (
                          <div key={i} className="text-[11px] text-[#6b7a94] font-mono">{id}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
