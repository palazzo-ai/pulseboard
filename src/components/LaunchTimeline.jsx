import React, { useState, useMemo, useRef, useEffect } from 'react';

// ============================================================
// LAUNCH TIMELINE — Horizontal timeline with phase bars + deadline markers
// ============================================================

const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 44;
const LEFT_PANEL_WIDTH = 180;
const DAY_WIDTH = 4;
const SECTION_HEADER_HEIGHT = 32;
const BAR_HEIGHT = 16;
const BAR_WIDTH = 200;

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

const daysBetween = (a, b) => Math.round((b - a) / (1000 * 60 * 60 * 24));
const parseDate = (str) => str ? new Date(str + (str.includes('T') ? '' : 'T00:00:00')) : null;

const PHASE_STATUS_COLORS = {
  done: '#10B981',
  in_progress: '#2563EB',
  not_started: '#CBD5E1',
};

export default function LaunchTimeline({
  clients,
  checklistsByClient,
  blockersByClient,
  selfServeData,
  launchDates,
  onSaveLaunchDate,
  onClientClick,
  filterType,
}) {
  const scrollRef = useRef(null);
  const [editingDateFor, setEditingDateFor] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  // Timeline range
  const { timelineStart, timelineEnd, totalDays, totalWidth } = useMemo(() => {
    const allDates = Object.values(launchDates || {}).map(d => parseDate(d)).filter(Boolean);
    const start = new Date(TODAY);
    start.setDate(start.getDate() - 30);

    let end = new Date(TODAY);
    end.setDate(end.getDate() + 120);
    if (allDates.length > 0) {
      const maxDate = new Date(Math.max(...allDates));
      maxDate.setDate(maxDate.getDate() + 30);
      if (maxDate > end) end = maxDate;
    }

    const totalDays = daysBetween(start, end);
    return { timelineStart: start, timelineEnd: end, totalDays, totalWidth: totalDays * DAY_WIDTH };
  }, [launchDates]);

  // Month columns
  const monthColumns = useMemo(() => {
    const cols = [];
    let d = new Date(timelineStart);
    while (d < timelineEnd) {
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const startOffset = Math.max(0, daysBetween(timelineStart, monthStart)) * DAY_WIDTH;
      const endOffset = Math.min(totalDays, daysBetween(timelineStart, monthEnd) + 1) * DAY_WIDTH;
      cols.push({
        label: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
        x: startOffset,
        width: endOffset - startOffset,
        isCurrent: monthStart.getFullYear() === TODAY.getFullYear() && monthStart.getMonth() === TODAY.getMonth(),
      });
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    return cols;
  }, [timelineStart, timelineEnd, totalDays]);

  const todayX = daysBetween(timelineStart, TODAY) * DAY_WIDTH;

  // Build rows
  const { showcaseRows, selfServeRows } = useMemo(() => {
    const showcaseRows = clients
      .filter(c => checklistsByClient[c.id])
      .map(c => {
        const checklist = checklistsByClient[c.id];
        const totalChecked = checklist.phases.reduce((s, p) => s + p.checked, 0);
        const totalTasks = checklist.phases.reduce((s, p) => s + p.total, 0);
        const blockers = (blockersByClient[c.id] || []).filter(b => b.status !== 'Done' && b.status !== 'Deployed');
        return {
          type: 'showcase',
          client: c,
          checklist,
          totalChecked,
          totalTasks,
          overallPct: totalTasks > 0 ? Math.round((totalChecked / totalTasks) * 100) : 0,
          currentPhase: checklist.phases.find(p => p.status === 'in_progress') || checklist.phases[0],
          blockerCount: blockers.length,
          targetDate: launchDates?.[c.id] || null,
        };
      })
      .sort((a, b) => {
        if (a.targetDate && !b.targetDate) return -1;
        if (!a.targetDate && b.targetDate) return 1;
        if (a.targetDate && b.targetDate) return a.targetDate.localeCompare(b.targetDate);
        return a.client.name.localeCompare(b.client.name);
      });

    const mkSelfServe = (issues, name, color, logo) => {
      const done = issues.filter(i => i.status === 'Done' || i.status === 'Deployed').length;
      return {
        type: 'selfserve',
        client: { id: name.toLowerCase().replace(/\s+/g, '-'), name, color, logo },
        issues,
        done,
        total: issues.length,
        overallPct: issues.length > 0 ? Math.round((done / issues.length) * 100) : 0,
        targetDate: launchDates?.[name.toLowerCase().replace(/\s+/g, '-')] || null,
      };
    };

    const selfServeRows = [
      mkSelfServe(selfServeData.spaces, 'Spaces Self-Serve', '#7C3AED', 'SP'),
      mkSelfServe(selfServeData.studio, 'Studio Self-Serve', '#D97706', 'ST'),
    ];

    return { showcaseRows, selfServeRows };
  }, [clients, checklistsByClient, blockersByClient, selfServeData, launchDates]);

  // Determine which sections to show
  const showShowcase = filterType === 'all' || filterType === 'showcase';
  const showSelfServe = filterType === 'all' || filterType === 'selfserve';

  // All visible rows for layout
  const allRows = [];
  if (showShowcase && showcaseRows.length > 0) {
    allRows.push({ type: 'section', label: 'Showcase Tenants' });
    showcaseRows.forEach(r => allRows.push(r));
  }
  if (showSelfServe) {
    allRows.push({ type: 'section', label: 'Self-Serve Product Launches' });
    selfServeRows.forEach(r => allRows.push(r));
  }

  // Compute y positions
  let runningY = 0;
  const rowPositions = allRows.map(row => {
    const y = runningY;
    runningY += row.type === 'section' ? SECTION_HEADER_HEIGHT : ROW_HEIGHT;
    return { ...row, y };
  });
  const totalHeight = runningY;

  // Auto-scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, todayX - 200);
    }
  }, [todayX]);

  // Render phase bar for a showcase row
  const renderPhaseBar = (row, y) => {
    const { checklist, totalTasks, overallPct, client } = row;
    const barY = y + (ROW_HEIGHT - BAR_HEIGHT) / 2;
    // Position bar so progress aligns roughly with today
    const barStartX = todayX - (BAR_WIDTH * overallPct / 100);
    let runX = barStartX;
    const segments = [];

    checklist.phases.forEach((phase, i) => {
      const segWidth = totalTasks > 0 ? (phase.total / totalTasks) * BAR_WIDTH : 0;
      if (segWidth <= 0) return;
      const color = phase.status === 'done' ? client.color :
                    phase.status === 'in_progress' ? client.color :
                    PHASE_STATUS_COLORS.not_started;
      const opacity = phase.status === 'done' ? 0.9 : phase.status === 'in_progress' ? 0.55 : 0.2;
      const isFirst = i === 0;
      const isLast = i === checklist.phases.length - 1;

      segments.push(
        <rect key={i} x={runX} y={barY} width={segWidth} height={BAR_HEIGHT}
          rx={isFirst ? 4 : 0} ry={isFirst ? 4 : 0}
          fill={color} opacity={opacity}>
          <title>{phase.name}: {phase.pct}% ({phase.checked}/{phase.total})</title>
        </rect>
      );
      // Round the last segment's right side
      if (isLast) {
        segments.push(
          <rect key={`${i}-cap`} x={runX + segWidth - 4} y={barY} width={4} height={BAR_HEIGHT}
            rx={4} ry={4} fill={color} opacity={opacity} />
        );
      }
      runX += segWidth;
    });

    // In-progress indicator line
    const progressX = barStartX + BAR_WIDTH * overallPct / 100;
    segments.push(
      <line key="progress-line" x1={progressX} y1={barY - 2} x2={progressX} y2={barY + BAR_HEIGHT + 2}
        stroke={client.color} strokeWidth={2} opacity={0.6} />
    );

    return segments;
  };

  // Render self-serve bar
  const renderSelfServeBar = (row, y) => {
    const { overallPct, client } = row;
    const barY = y + (ROW_HEIGHT - BAR_HEIGHT) / 2;
    const barStartX = todayX - (BAR_WIDTH * overallPct / 100);
    const filledWidth = BAR_WIDTH * overallPct / 100;

    return (
      <>
        <rect x={barStartX} y={barY} width={BAR_WIDTH} height={BAR_HEIGHT}
          rx={4} fill="#E2E8F0" opacity={0.5} />
        {filledWidth > 0 && (
          <rect x={barStartX} y={barY} width={filledWidth} height={BAR_HEIGHT}
            rx={4} fill={client.color} opacity={0.7} />
        )}
      </>
    );
  };

  // Render target date diamond
  const renderDiamond = (row, y) => {
    if (!row.targetDate) return null;
    const td = parseDate(row.targetDate);
    if (!td) return null;
    const tx = daysBetween(timelineStart, td) * DAY_WIDTH;
    const cy = y + ROW_HEIGHT / 2;
    const daysAway = daysBetween(TODAY, td);
    const isPast = daysAway < 0;
    const isNear = !isPast && daysAway <= 14;
    const diamondColor = isPast ? '#DC2626' : isNear ? '#D97706' : row.client.color;

    return (
      <g style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setEditingDateFor(row.client.id); }}>
        <polygon
          points={`${tx},${cy - 7} ${tx + 7},${cy} ${tx},${cy + 7} ${tx - 7},${cy}`}
          fill={diamondColor} opacity={0.9} />
        <text x={tx + 10} y={cy + 1} fill={diamondColor} fontSize={9} fontWeight={500}
          dominantBaseline="middle" style={{ pointerEvents: 'none' }}>
          {td.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </text>
        <title>Target: {td.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ({daysAway >= 0 ? `${daysAway}d away` : `${Math.abs(daysAway)}d overdue`})</title>
      </g>
    );
  };

  // Render "Set date" label
  const renderSetDate = (row, y) => {
    if (row.targetDate) return null;
    const cx = todayX + BAR_WIDTH * (1 - row.overallPct / 100) + 16;
    const cy = y + ROW_HEIGHT / 2;
    return (
      <text x={cx} y={cy} fill="#94A3B8" fontSize={9} dominantBaseline="middle"
        style={{ cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); setEditingDateFor(row.client.id); }}>
        + Set target
      </text>
    );
  };

  return (
    <div className="px-2 pb-8">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 px-1">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <div className="w-3 h-2 rounded-sm bg-blue-500 opacity-90" /> Completed
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <div className="w-3 h-2 rounded-sm bg-blue-500 opacity-50" /> In Progress
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <div className="w-3 h-2 rounded-sm bg-slate-300 opacity-30" /> Not Started
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="text-xs">◆</span> Target Date
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex" style={{ position: 'relative' }}>
          {/* Left panel - sticky */}
          <div className="flex-shrink-0 border-r border-slate-200 bg-white z-10"
            style={{ width: LEFT_PANEL_WIDTH, position: 'sticky', left: 0 }}>
            {/* Header spacer */}
            <div className="border-b border-slate-200 bg-slate-50 flex items-center px-3"
              style={{ height: HEADER_HEIGHT }}>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Client</span>
            </div>
            {/* Rows */}
            {rowPositions.map((row, idx) => {
              if (row.type === 'section') {
                return (
                  <div key={`s-${idx}`} className="flex items-center px-3 bg-slate-50/60 border-b border-slate-100"
                    style={{ height: SECTION_HEADER_HEIGHT }}>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{row.label}</span>
                  </div>
                );
              }
              const isShowcase = row.type === 'showcase';
              return (
                <div key={row.client.id}
                  className="flex items-center gap-2 px-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  style={{ height: ROW_HEIGHT }}
                  onClick={() => onClientClick?.(row.client.id)}
                  onMouseEnter={() => setHoveredRow(row.client.id)}
                  onMouseLeave={() => setHoveredRow(null)}>
                  <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                    style={{ backgroundColor: row.client.color }}>
                    {row.client.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-700 truncate">{row.client.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {isShowcase ? (row.currentPhase?.name || 'N/A') : `${row.done}/${row.total} done`}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-600 flex-shrink-0">{row.overallPct}%</span>
                  {isShowcase && row.blockerCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0"
                      title={`${row.blockerCount} active blocker${row.blockerCount !== 1 ? 's' : ''}`}>
                      {row.blockerCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Timeline area */}
          <div ref={scrollRef} className="flex-1 overflow-x-auto">
            <div style={{ width: totalWidth, position: 'relative' }}>
              {/* SVG */}
              <svg width={totalWidth} height={HEADER_HEIGHT + totalHeight}>
                {/* Month header */}
                {monthColumns.map((col, i) => (
                  <g key={i}>
                    <rect x={col.x} y={0} width={col.width} height={HEADER_HEIGHT}
                      fill={col.isCurrent ? '#EFF6FF' : (i % 2 === 0 ? '#FAFBFC' : '#F8FAFC')}
                      stroke="#E2E8F0" strokeWidth={0.5} />
                    <text x={col.x + col.width / 2} y={HEADER_HEIGHT / 2 + 1}
                      textAnchor="middle" dominantBaseline="middle"
                      fill={col.isCurrent ? '#2563EB' : '#64748B'}
                      fontSize={10} fontWeight={col.isCurrent ? 600 : 400}>
                      {col.label}
                    </text>
                  </g>
                ))}

                {/* Body area */}
                <g transform={`translate(0, ${HEADER_HEIGHT})`}>
                  {/* Month grid lines */}
                  {monthColumns.map((col, i) => (
                    <rect key={`bg-${i}`} x={col.x} y={0} width={col.width} height={totalHeight}
                      fill={col.isCurrent ? '#F8FAFF' : 'transparent'}
                      stroke="#F1F5F9" strokeWidth={0.5} />
                  ))}

                  {/* Row backgrounds and content */}
                  {rowPositions.map((row, idx) => {
                    if (row.type === 'section') {
                      return (
                        <rect key={`sr-${idx}`} x={0} y={row.y} width={totalWidth} height={SECTION_HEADER_HEIGHT}
                          fill="#FAFBFC" />
                      );
                    }

                    const isHovered = hoveredRow === row.client.id;
                    return (
                      <g key={row.client.id}>
                        <rect x={0} y={row.y} width={totalWidth} height={ROW_HEIGHT}
                          fill={isHovered ? '#F8FAFC' : 'transparent'} />
                        {/* Separator */}
                        <line x1={0} y1={row.y + ROW_HEIGHT} x2={totalWidth} y2={row.y + ROW_HEIGHT}
                          stroke="#F1F5F9" strokeWidth={1} />

                        {/* Phase bar or self-serve bar */}
                        {row.type === 'showcase' ? renderPhaseBar(row, row.y) : renderSelfServeBar(row, row.y)}

                        {/* Diamond or Set date */}
                        {renderDiamond(row, row.y)}
                        {renderSetDate(row, row.y)}
                      </g>
                    );
                  })}

                  {/* Today line */}
                  <line x1={todayX} y1={0} x2={todayX} y2={totalHeight}
                    stroke="#2563EB" strokeWidth={1.5} opacity={0.4} strokeDasharray="4 3" />
                </g>

                {/* Today marker in header */}
                <line x1={todayX} y1={0} x2={todayX} y2={HEADER_HEIGHT}
                  stroke="#2563EB" strokeWidth={2} opacity={0.5} />
                <rect x={todayX - 18} y={HEADER_HEIGHT - 14} width={36} height={12} rx={6}
                  fill="#2563EB" opacity={0.15} />
                <text x={todayX} y={HEADER_HEIGHT - 7} textAnchor="middle"
                  fill="#2563EB" fontSize={8} fontWeight={600}>
                  Today
                </text>
              </svg>

              {/* Date picker overlay (HTML, not SVG) */}
              {editingDateFor && (() => {
                const row = rowPositions.find(r => r.client?.id === editingDateFor);
                if (!row) return null;
                const td = row.targetDate ? parseDate(row.targetDate) : null;
                const posX = td ? daysBetween(timelineStart, td) * DAY_WIDTH : todayX + 60;
                const posY = HEADER_HEIGHT + row.y + ROW_HEIGHT;

                return (
                  <div className="absolute z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-3"
                    style={{ top: posY + 4, left: Math.max(8, Math.min(posX - 60, totalWidth - 180)) }}>
                    <label className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1">Target Launch Date</label>
                    <input type="date"
                      defaultValue={row.targetDate || ''}
                      onChange={(e) => {
                        onSaveLaunchDate?.(editingDateFor, e.target.value || null);
                        setEditingDateFor(null);
                      }}
                      autoFocus
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 w-full" />
                    <div className="flex gap-2 mt-2">
                      {row.targetDate && (
                        <button onClick={() => { onSaveLaunchDate?.(editingDateFor, null); setEditingDateFor(null); }}
                          className="text-[10px] text-red-400 hover:text-red-600">Remove</button>
                      )}
                      <button onClick={() => setEditingDateFor(null)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 ml-auto">Cancel</button>
                    </div>
                  </div>
                );
              })()}

              {/* Hover tooltip */}
              {hoveredRow && (() => {
                const row = rowPositions.find(r => r.client?.id === hoveredRow);
                if (!row || row.type === 'section') return null;
                const isShowcase = row.type === 'showcase';
                const td = row.targetDate ? parseDate(row.targetDate) : null;
                const posY = HEADER_HEIGHT + row.y;

                return (
                  <div className="absolute z-40 bg-white border border-slate-200 rounded-lg shadow-lg p-3 w-52 pointer-events-none"
                    style={{ top: posY - 8, left: 8 }}>
                    <div className="text-xs font-bold text-slate-700 mb-1">{row.client.name}</div>
                    {isShowcase ? (
                      <>
                        <div className="text-[10px] text-slate-500">{row.totalChecked}/{row.totalTasks} tasks ({row.overallPct}%)</div>
                        <div className="text-[10px] text-slate-500">Phase: {row.currentPhase?.name}</div>
                        {row.blockerCount > 0 && (
                          <div className="text-[10px] text-red-500 mt-1">{row.blockerCount} active blocker{row.blockerCount !== 1 ? 's' : ''}</div>
                        )}
                      </>
                    ) : (
                      <div className="text-[10px] text-slate-500">{row.done}/{row.total} issues done ({row.overallPct}%)</div>
                    )}
                    {td && (
                      <div className="text-[10px] mt-1" style={{ color: row.client.color }}>
                        Target: {td.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' '}({daysBetween(TODAY, td) >= 0 ? `${daysBetween(TODAY, td)}d away` : `${Math.abs(daysBetween(TODAY, td))}d overdue`})
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
