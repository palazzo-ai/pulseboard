import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

// --- Constants ---
const CARD_W = 152;
const CARD_H = 56;
const PADDING = 12;

const statusCfg = {
  not_started: { label: 'Not started', color: '#9CA3AF', dot: '#D1D5DB', bg: '#F3F4F6' },
  in_progress: { label: 'In progress', color: '#2563EB', dot: '#3B82F6', bg: '#EFF6FF' },
  done:        { label: 'Done',        color: '#16A34A', dot: '#22C55E', bg: '#F0FDF4' },
  blocked:     { label: 'Blocked',     color: '#DC2626', dot: '#EF4444', bg: '#FEF2F2' },
};

const quadrantMeta = {
  quickWins:     { label: 'Quick Wins',     emoji: '\u{1F680}', accent: '#059669' },
  majorProjects: { label: 'Strategic Bets',  emoji: '\u{1F3AF}', accent: '#2563EB' },
  fillIns:       { label: 'Low Priority',    emoji: '\u{1F4CB}', accent: '#6B7280' },
  avoid:         { label: 'Reconsider',      emoji: '\u26A0\uFE0F',  accent: '#DC2626' },
};

function getQuadrant(impact, effort) {
  if (impact >= 50 && effort < 50)  return 'quickWins';
  if (impact >= 50 && effort >= 50) return 'majorProjects';
  if (impact < 50  && effort < 50)  return 'fillIns';
  return 'avoid';
}

// --- StatusDot ---
function StatusDot({ status }) {
  const c = statusCfg[status] || statusCfg.not_started;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 9, fontWeight: 500, color: c.color,
      backgroundColor: c.bg, padding: '0px 5px 0px 4px',
      borderRadius: 8, lineHeight: '16px', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: c.dot }} />
      {c.label}
    </span>
  );
}

// --- Main Component ---
export default function PrioritizationMatrix({
  opportunities,
  milestones,
  assignments,
  onUpdateOpportunity,
  onResetPrioritization,
  onSelectOpportunity,
  onOpenAIScoring,
  getInitiativeColor,
  getAreaName,
  filterInitiative,
  filterArea,
  filterStatus,
}) {
  const [dragging, setDragging] = useState(null);   // { id, offsetX, offsetY, fromInbox }
  const [dragPos, setDragPos] = useState(null);      // { x, y } canvas pixel coords
  const [selected, setSelected] = useState(null);
  const [showClusters, setShowClusters] = useState(true);
  const [showDone, setShowDone] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const canvasRef = useRef(null);

  // --- Filter ---
  const filtered = useMemo(() => {
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

  // --- Split scored / unscored ---
  const scored = useMemo(
    () => filtered.filter(o => o.impactScore != null && o.effortScore != null),
    [filtered],
  );
  const unscored = useMemo(
    () => filtered.filter(o => o.impactScore == null || o.effortScore == null),
    [filtered],
  );
  const visible = useMemo(
    () => showDone ? scored : scored.filter(o => o.status !== 'done'),
    [scored, showDone],
  );

  // --- Coordinate helpers ---
  const getCanvasRect = () => {
    if (!canvasRef.current) return null;
    return { width: canvasRef.current.offsetWidth, height: canvasRef.current.offsetHeight };
  };

  const scoreToPx = useCallback((impact, effort, rect) => {
    if (!rect) return { x: 0, y: 0 };
    const x = PADDING + (effort / 100) * (rect.width - PADDING * 2 - CARD_W);
    const y = PADDING + ((100 - impact) / 100) * (rect.height - PADDING * 2 - CARD_H);
    return { x, y };
  }, []);

  const pxToScore = useCallback((px, py, rect) => {
    if (!rect) return { impactScore: 50, effortScore: 50 };
    const effortScore = Math.round(Math.max(0, Math.min(100,
      ((px - PADDING) / (rect.width - PADDING * 2 - CARD_W)) * 100)));
    const impactScore = Math.round(Math.max(0, Math.min(100,
      100 - ((py - PADDING) / (rect.height - PADDING * 2 - CARD_H)) * 100)));
    return { impactScore, effortScore };
  }, []);

  // --- Drag: canvas card ---
  const handleCanvasMouseDown = (e, opp) => {
    e.stopPropagation();
    const rect = getCanvasRect();
    if (!rect) return;
    const canvasBounds = canvasRef.current.getBoundingClientRect();
    const pos = scoreToPx(opp.impactScore, opp.effortScore, rect);
    setDragging({
      id: opp.id,
      offsetX: e.clientX - canvasBounds.left - pos.x,
      offsetY: e.clientY - canvasBounds.top - pos.y,
      fromInbox: false,
    });
    setDragPos(pos);
  };

  // --- Drag: inbox card ---
  const handleInboxDragStart = (e, opp) => {
    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    if (!canvasBounds) return;
    setDragging({
      id: opp.id,
      offsetX: CARD_W / 2,
      offsetY: CARD_H / 2,
      fromInbox: true,
    });
    setDragPos({
      x: e.clientX - canvasBounds.left - CARD_W / 2,
      y: e.clientY - canvasBounds.top - CARD_H / 2,
    });
  };

  // --- Global drag listeners ---
  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e) => {
      const canvasBounds = canvasRef.current?.getBoundingClientRect();
      if (!canvasBounds) return;
      setDragPos({
        x: e.clientX - canvasBounds.left - dragging.offsetX,
        y: e.clientY - canvasBounds.top - dragging.offsetY,
      });
    };

    const handleUp = () => {
      if (dragPos && canvasRef.current) {
        const rect = getCanvasRect();
        const { impactScore, effortScore } = pxToScore(dragPos.x, dragPos.y, rect);
        const opp = opportunities.find(o => o.id === dragging.id);
        if (opp) {
          onUpdateOpportunity({ ...opp, impactScore, effortScore });
        }
      }
      setDragging(null);
      setDragPos(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, dragPos, pxToScore, opportunities, onUpdateOpportunity]);

  // --- Milestone cluster groups ---
  const milestoneGroups = useMemo(() => {
    const groups = {};
    visible.forEach(o => {
      if (o.milestoneId) {
        if (!groups[o.milestoneId]) groups[o.milestoneId] = [];
        groups[o.milestoneId].push(o);
      }
    });
    return groups;
  }, [visible]);

  // --- Quadrant stats ---
  const quadrantStats = useMemo(() => {
    const stats = {};
    Object.keys(quadrantMeta).forEach(q => {
      const items = visible.filter(o => getQuadrant(o.impactScore, o.effortScore) === q);
      stats[q] = {
        total: items.length,
        atRisk: items.filter(o => o.atRisk).length,
        notStarted: items.filter(o => o.status === 'not_started').length,
      };
    });
    return stats;
  }, [visible]);

  // --- Cluster overlays ---
  function ClusterOverlays({ rect }) {
    if (!showClusters || !rect) return null;
    return Object.entries(milestoneGroups).map(([mId, items]) => {
      if (items.length < 2) return null;
      const ms = milestones.find(m => m.id === mId);
      if (!ms) return null;
      const positions = items.map(o => {
        const p = scoreToPx(o.impactScore, o.effortScore, rect);
        return { cx: p.x + CARD_W / 2, cy: p.y + CARD_H / 2 };
      });
      const pad = 20;
      const minX = Math.min(...positions.map(p => p.cx)) - CARD_W / 2 - pad;
      const maxX = Math.max(...positions.map(p => p.cx)) + CARD_W / 2 + pad;
      const minY = Math.min(...positions.map(p => p.cy)) - CARD_H / 2 - pad;
      const maxY = Math.max(...positions.map(p => p.cy)) + CARD_H / 2 + pad;
      const clusterColor = getInitiativeColor?.(ms.initiative) || '#6B7280';
      return (
        <div key={mId} style={{
          position: 'absolute', left: minX, top: minY,
          width: maxX - minX, height: maxY - minY,
          border: `1.5px dashed ${clusterColor}50`,
          borderRadius: 12,
          backgroundColor: `${clusterColor}06`,
          pointerEvents: 'none', zIndex: 1,
        }}>
          <span style={{
            position: 'absolute', top: -9, left: 10,
            fontSize: 9, fontWeight: 600, color: clusterColor,
            backgroundColor: '#F4F5F7', padding: '0 4px',
            letterSpacing: '0.02em',
          }}>
            {'\u25C6'} {ms.title}
          </span>
        </div>
      );
    });
  }

  // --- Card click ---
  const handleCardClick = (opp) => {
    setSelected(selected === opp.id ? null : opp.id);
    onSelectOpportunity?.(opp);
  };

  return (
    <div style={{
      display: 'flex', height: '100%', backgroundColor: '#F4F5F7',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      borderRadius: 12, overflow: 'hidden',
      border: '1px solid #E2E8F0',
    }}>
      {/* === INBOX SIDEBAR === */}
      <div style={{
        width: 220, minWidth: 220, backgroundColor: '#fff',
        borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column',
      }}>
        {/* Inbox header */}
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>Unranked</span>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: unscored.length > 0 ? '#EA580C' : '#16A34A',
              backgroundColor: unscored.length > 0 ? '#FFF7ED' : '#F0FDF4',
              padding: '1px 7px', borderRadius: 10,
              border: `1px solid ${unscored.length > 0 ? '#FDBA7440' : '#BBF7D040'}`,
            }}>
              {unscored.length}
            </span>
          </div>
          <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, lineHeight: 1.4, margin: '4px 0 0' }}>
            Drag onto the matrix to force-rank
          </p>
        </div>

        {/* Inbox items */}
        <div style={{ flex: 1, overflow: 'auto', padding: '6px 8px' }}>
          {unscored.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: '#CBD5E1' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{'\u2713'}</div>
              <div style={{ fontSize: 11 }}>All items ranked</div>
            </div>
          )}
          {unscored.map(opp => {
            const ic = getInitiativeColor?.(opp.initiative) || '#6B7280';
            const isDraggingThis = dragging?.id === opp.id;
            const milestone = opp.milestoneId ? milestones.find(m => m.id === opp.milestoneId) : null;
            const assigneeCount = assignments?.[opp.id]?.length || 0;
            return (
              <div
                key={opp.id}
                onMouseDown={(e) => handleInboxDragStart(e, opp)}
                onClick={() => handleCardClick(opp)}
                style={{
                  padding: '6px 8px', borderRadius: 7, marginBottom: 4, cursor: 'grab',
                  backgroundColor: isDraggingThis ? `${ic}10` : '#F8FAFC',
                  border: `1px solid ${isDraggingThis ? ic + '40' : '#EAECF0'}`,
                  borderLeft: `3px solid ${ic}`,
                  opacity: isDraggingThis ? 0.4 : 1,
                  transition: 'opacity 0.1s',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 500, color: '#1E293B', lineHeight: '14px' }}>{opp.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                  <span style={{ fontSize: 9, color: '#64748B', fontWeight: 500 }}>
                    {getAreaName?.(opp.area) || opp.area}
                  </span>
                  {milestone && (
                    <span style={{ fontSize: 8, color: '#B45309' }}>{'\u25C6'} {milestone.title}</span>
                  )}
                  {assigneeCount > 0 && (
                    <span style={{ fontSize: 8, color: '#94A3B8', marginLeft: 'auto' }}>
                      {'\uD83D\uDC64'}{assigneeCount}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* AI batch score */}
        {unscored.length > 0 && onOpenAIScoring && (
          <div style={{ padding: '8px 10px', borderTop: '1px solid #F1F5F9' }}>
            <button
              onClick={onOpenAIScoring}
              style={{
                width: '100%', padding: '7px 10px', borderRadius: 7,
                background: 'linear-gradient(135deg, #6366F1, #7C3AED)',
                border: 'none', color: '#fff', fontSize: 11, fontWeight: 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              AI Score All ({unscored.length})
            </button>
          </div>
        )}
      </div>

      {/* === MATRIX AREA === */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <div style={{
          padding: '10px 18px', backgroundColor: '#fff', borderBottom: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>Impact vs Effort</h2>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>{visible.length} items ranked</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748B', cursor: 'pointer' }}>
              <input type="checkbox" checked={showClusters} onChange={e => setShowClusters(e.target.checked)}
                style={{ accentColor: '#6366F1', width: 13, height: 13 }} />
              Milestone clusters
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748B', cursor: 'pointer' }}>
              <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)}
                style={{ accentColor: '#6366F1', width: 13, height: 13 }} />
              Show done
            </label>
            {onResetPrioritization && scored.length > 0 && (
              confirmReset ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 500 }}>Reset all {scored.length} items?</span>
                  <button
                    onClick={() => { onResetPrioritization(); setConfirmReset(false); }}
                    style={{
                      padding: '4px 8px', borderRadius: 6,
                      backgroundColor: '#DC2626', border: 'none', color: '#fff',
                      fontSize: 10, fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    style={{
                      padding: '4px 8px', borderRadius: 6,
                      backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#64748B',
                      fontSize: 10, fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmReset(true)}
                  style={{
                    padding: '5px 10px', borderRadius: 7,
                    backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0',
                    color: '#64748B', fontSize: 11, fontWeight: 500,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 4v6h6M23 20v-6h-6" />
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                  </svg>
                  Start Over
                </button>
              )
            )}
            {onOpenAIScoring && (
              <button
                onClick={onOpenAIScoring}
                style={{
                  marginLeft: 4, padding: '5px 10px', borderRadius: 7,
                  background: 'linear-gradient(135deg, #6366F1, #7C3AED)',
                  border: 'none', color: '#fff', fontSize: 11, fontWeight: 500,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                AI Assist
              </button>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }} ref={canvasRef}>
          {/* Quadrant backgrounds */}
          <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
            <div style={{ backgroundColor: '#F0FDF408', borderRight: '1px dashed #D1D5DB', borderBottom: '1px dashed #D1D5DB' }} />
            <div style={{ backgroundColor: '#EFF6FF06', borderBottom: '1px dashed #D1D5DB' }} />
            <div style={{ backgroundColor: '#F9FAFB', borderRight: '1px dashed #D1D5DB' }} />
            <div style={{ backgroundColor: '#FEF2F204' }} />
          </div>

          {/* Quadrant labels */}
          {[
            { q: 'quickWins',     top: 16, left: 16 },
            { q: 'majorProjects', top: 16, right: 16 },
            { q: 'fillIns',       bottom: 16, left: 16 },
            { q: 'avoid',         bottom: 16, right: 16 },
          ].map(({ q, ...pos }) => {
            const meta = quadrantMeta[q];
            const stats = quadrantStats[q] || { total: 0, atRisk: 0, notStarted: 0 };
            return (
              <div key={q} style={{ position: 'absolute', ...pos, zIndex: 2, pointerEvents: 'none' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: meta.accent, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{meta.emoji}</span> {meta.label}
                </div>
                <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 2 }}>
                  {stats.total} items
                  {stats.atRisk > 0 && <span style={{ color: '#EA580C', marginLeft: 4 }}>{'\u00B7'} {stats.atRisk} at risk</span>}
                  {stats.notStarted > 0 && <span style={{ marginLeft: 4 }}>{'\u00B7'} {stats.notStarted} unstarted</span>}
                </div>
              </div>
            );
          })}

          {/* Axis labels */}
          <div style={{
            position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%) rotate(-90deg)',
            fontSize: 10, fontWeight: 600, color: '#CBD5E1', letterSpacing: '0.08em',
            transformOrigin: 'center', whiteSpace: 'nowrap', zIndex: 2, pointerEvents: 'none',
          }}>
            {'\u2190'} LOW IMPACT {'\u2014'} HIGH IMPACT {'\u2192'}
          </div>
          <div style={{
            position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
            fontSize: 10, fontWeight: 600, color: '#CBD5E1', letterSpacing: '0.08em',
            zIndex: 2, pointerEvents: 'none',
          }}>
            {'\u2190'} LOW EFFORT {'\u2014'} HIGH EFFORT {'\u2192'}
          </div>

          {/* Milestone cluster overlays */}
          {canvasRef.current && <ClusterOverlays rect={getCanvasRect()} />}

          {/* Cards */}
          {visible.map(opp => {
            const rect = getCanvasRect();
            if (!rect) return null;
            const isDraggingThis = dragging?.id === opp.id && !dragging.fromInbox;
            const pos = isDraggingThis && dragPos ? dragPos : scoreToPx(opp.impactScore, opp.effortScore, rect);
            const ic = getInitiativeColor?.(opp.initiative) || '#6B7280';
            const isDone = opp.status === 'done';
            const isSelected = selected === opp.id;
            const assigneeCount = assignments?.[opp.id]?.length || 0;

            return (
              <div
                key={opp.id}
                onMouseDown={(e) => handleCanvasMouseDown(e, opp)}
                onClick={() => handleCardClick(opp)}
                style={{
                  position: 'absolute',
                  left: pos.x, top: pos.y,
                  width: CARD_W, height: CARD_H,
                  zIndex: isDraggingThis ? 50 : isSelected ? 20 : 5,
                  cursor: isDraggingThis ? 'grabbing' : 'grab',
                  transition: isDraggingThis ? 'none' : 'left 0.2s ease, top 0.2s ease, opacity 0.2s, box-shadow 0.15s',
                  opacity: isDone && !isDraggingThis ? 0.35 : isDraggingThis ? 0.9 : 1,
                }}
              >
                <div style={{
                  width: '100%', height: '100%',
                  backgroundColor: isSelected ? `${ic}0A` : isDraggingThis ? '#fff' : '#F8FAFC',
                  borderLeft: `3px solid ${opp.atRisk ? '#EA580C' : ic}`,
                  borderTop: `1px solid ${isSelected ? ic + '35' : '#EAECF0'}`,
                  borderRight: `1px solid ${isSelected ? ic + '35' : '#EAECF0'}`,
                  borderBottom: `1px solid ${isSelected ? ic + '35' : '#EAECF0'}`,
                  borderRadius: 8,
                  padding: '5px 7px',
                  boxShadow: isDraggingThis
                    ? '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)'
                    : isSelected
                      ? `0 0 0 1.5px ${ic}40, 0 2px 8px ${ic}10`
                      : '0 1px 3px rgba(0,0,0,0.05)',
                  transform: isDraggingThis ? 'scale(1.04)' : 'none',
                  transition: isDraggingThis ? 'none' : 'all 0.15s ease',
                  overflow: 'hidden',
                }}>
                  {/* Title */}
                  <div style={{
                    fontSize: 10.5, fontWeight: 500, color: '#1E293B',
                    lineHeight: '13px', letterSpacing: '-0.01em',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {opp.atRisk && <span style={{ color: '#EA580C', marginRight: 2 }}>{'\u26A0'}</span>}
                    {isDone && <span style={{ color: '#16A34A', marginRight: 2 }}>{'\u2713'}</span>}
                    {opp.title}
                  </div>
                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <StatusDot status={opp.status} />
                    {assigneeCount > 0 && (
                      <span style={{ fontSize: 8, color: '#94A3B8' }}>
                        {'\uD83D\uDC64'}{assigneeCount}
                      </span>
                    )}
                    <span style={{ fontSize: 8, color: '#64748B', fontWeight: 600, marginLeft: 'auto' }}>
                      {getAreaName?.(opp.area) || opp.area}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Dragged inbox item ghost on canvas */}
          {dragging?.fromInbox && dragPos && (() => {
            const opp = opportunities.find(o => o.id === dragging.id);
            if (!opp) return null;
            const ic = getInitiativeColor?.(opp.initiative) || '#6B7280';
            const rect = getCanvasRect();
            const scores = rect ? pxToScore(dragPos.x, dragPos.y, rect) : null;
            return (
              <div style={{
                position: 'absolute', left: dragPos.x, top: dragPos.y,
                width: CARD_W, height: CARD_H, zIndex: 50, pointerEvents: 'none',
              }}>
                <div style={{
                  width: '100%', height: '100%',
                  backgroundColor: '#fff',
                  borderLeft: `3px solid ${ic}`,
                  borderTop: `1px solid ${ic}40`,
                  borderRight: `1px solid ${ic}40`,
                  borderBottom: `1px solid ${ic}40`,
                  borderRadius: 8, padding: '5px 7px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
                  transform: 'scale(1.04)',
                }}>
                  <div style={{ fontSize: 10.5, fontWeight: 500, color: '#1E293B', lineHeight: '13px' }}>{opp.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <StatusDot status={opp.status} />
                    {scores && (
                      <span style={{ fontSize: 8, color: '#94A3B8', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
                        I:{scores.impactScore} E:{scores.effortScore}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer legend */}
        <div style={{
          padding: '6px 18px', backgroundColor: '#fff', borderTop: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: '#94A3B8',
        }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <span>Left border = initiative color</span>
            <span>{'\u26A0'} = at risk</span>
            <span style={{ opacity: 0.4 }}>{'\u25A1'} = done (faded)</span>
            <span>{'\u25C6'} = milestone cluster</span>
          </div>
          <span>Drag cards to force-rank by position</span>
        </div>
      </div>
    </div>
  );
}
