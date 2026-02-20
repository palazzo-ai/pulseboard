import React, { useState } from 'react';
import TeamMemberBadge from './TeamMemberBadge';
import { months, STATUSES } from '../data/initialData';
import { getInitiativeColor } from '../utils/helpers';

const TimelineLanes = ({ 
  teamMembers, 
  opportunities, 
  assignments,
  timelineRange,
  setTimelineRange,
  onOpportunityClick,
  onAssign,
  showNotification
}) => {
  const [draggedOpp, setDraggedOpp] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const visibleMonths = months.slice(timelineRange.start, timelineRange.end + 1);

  // Get opportunities for a team member
  const getMemberOpportunities = (memberId) => {
    return opportunities.filter(opp => {
      const oppAssignments = assignments[opp.id] || [];
      return oppAssignments.some(a => a.team_member_id === memberId);
    });
  };

  // Get unassigned opportunities
  const getUnassignedOpportunities = () => {
    return opportunities.filter(opp => !assignments[opp.id] || assignments[opp.id].length === 0);
  };

  // Handle drag start
  const handleDragStart = (e, opp) => {
    setDraggedOpp(opp);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', opp.id.toString());
  };

  // Handle drag over team member lane
  const handleDragOver = (e, memberId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(memberId);
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDropTarget(null);
  };

  // Handle drop on team member lane
  const handleDrop = async (e, memberId) => {
    e.preventDefault();
    if (!draggedOpp) return;

    const existingAssignments = assignments[draggedOpp.id] || [];
    const alreadyAssigned = existingAssignments.some(a => a.team_member_id === memberId);

    if (!alreadyAssigned) {
      // Add this team member to the opportunity's assignments
      await onAssign(draggedOpp.id, [
        ...existingAssignments.map(a => ({
          team_member_id: a.team_member_id,
          points: a.points,
          role: a.role
        })),
        { team_member_id: memberId, points: 5, role: 'Contributor' }
      ]);
      
      const member = teamMembers.find(m => m.id === memberId);
      showNotification?.(`Assigned ${member?.name || 'team member'} to "${draggedOpp.title}"`, 'success');
    } else {
      showNotification?.('Already assigned to this opportunity', 'info');
    }

    setDraggedOpp(null);
    setDropTarget(null);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedOpp(null);
    setDropTarget(null);
  };

  // Opportunity card component
  const OpportunityCard = ({ opp, isDragging = false }) => {
    const statusInfo = STATUSES[opp.status] || STATUSES.not_started;
    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, opp)}
        onDragEnd={handleDragEnd}
        onClick={() => onOpportunityClick?.(opp)}
        className={`p-1.5 rounded text-[10px] cursor-grab active:cursor-grabbing transition-all hover:translate-x-0.5 shadow-sm hover:shadow ${
          opp.atRisk ? 'ring-1 ring-orange-500' : ''
        } ${isDragging ? 'opacity-50' : ''}`}
        style={{ 
          backgroundColor: `${getInitiativeColor(opp.initiative)}20`,
          borderLeft: `2px solid ${getInitiativeColor(opp.initiative)}`
        }}
      >
        <div className="flex items-center gap-1">
          {opp.atRisk && <span className="text-orange-500">⚠</span>}
          <span className="font-medium text-slate-700 truncate">{opp.title}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span
            className="px-1 py-0.5 rounded text-[8px] font-medium"
            style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
          >
            {statusInfo.label}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          👤 Team Timeline
          <span className="text-xs text-slate-500 font-normal ml-2">
            Drag opportunities to assign team members
          </span>
        </h3>
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => setTimelineRange({ 
              start: Math.max(0, timelineRange.start - 3), 
              end: Math.max(3, timelineRange.end - 3) 
            })}
            disabled={timelineRange.start === 0}
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs text-slate-700 border border-slate-200"
          >
            ← Earlier
          </button>
          <span className="text-sm text-slate-500 min-w-[140px] text-center">
            {months[timelineRange.start]?.name} - {months[timelineRange.end]?.name}
          </span>
          <button 
            onClick={() => setTimelineRange({ 
              start: Math.min(months.length - 7, timelineRange.start + 3), 
              end: Math.min(months.length - 1, timelineRange.end + 3) 
            })}
            disabled={timelineRange.end >= months.length - 1}
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs text-slate-700 border border-slate-200"
          >
            Later →
          </button>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Month Headers */}
          <div className="flex border-b border-slate-200 bg-[#ECEEF1]">
            <div className="w-48 flex-shrink-0 p-2 text-xs font-medium text-slate-500 border-r border-slate-200">
              Team Member
            </div>
            {visibleMonths.map(month => (
              <div 
                key={month.id} 
                className={`flex-1 p-2 text-xs font-medium text-center border-r border-slate-200 last:border-r-0 ${
                  month.current ? 'bg-[#EFF8F4] text-emerald-700' : 'text-slate-500'
                }`}
              >
                {month.name}
              </div>
            ))}
          </div>

          {/* Team Member Lanes */}
          {teamMembers.map(member => {
            const memberOpps = getMemberOpportunities(member.id);
            const isDropping = dropTarget === member.id;
            
            return (
              <div 
                key={member.id} 
                className={`flex min-h-[80px] border-b border-slate-200 transition-colors ${
                  isDropping ? 'bg-indigo-50' : 'hover:bg-slate-50'
                }`}
                onDragOver={(e) => handleDragOver(e, member.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, member.id)}
              >
                {/* Member Info */}
                <div className="w-48 flex-shrink-0 p-3 bg-[#ECEEF1] border-r border-slate-200 flex items-center gap-2">
                  <TeamMemberBadge member={member} size="sm" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{member.name}</div>
                    <div className="text-[10px] text-slate-500">{member.role}</div>
                  </div>
                </div>

                {/* Month Columns */}
                <div className="flex-1 flex relative">
                  {isDropping && (
                    <div className="absolute inset-0 border-2 border-dashed border-indigo-500 rounded pointer-events-none z-10 flex items-center justify-center">
                      <span className="bg-indigo-500 text-white text-xs px-2 py-1 rounded shadow-sm">
                        Drop to assign {member.name}
                      </span>
                    </div>
                  )}
                  {visibleMonths.map((month) => {
                    const monthOpps = memberOpps.filter(o => o.month === month.id);
                    return (
                      <div 
                        key={month.id}
                        className={`flex-1 p-1.5 border-r border-slate-200 last:border-r-0 ${
                          month.current ? 'bg-[#EFF8F4]' : ''
                        }`}
                      >
                        <div className="space-y-1">
                          {monthOpps.map(opp => (
                            <OpportunityCard 
                              key={opp.id} 
                              opp={opp} 
                              isDragging={draggedOpp?.id === opp.id}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Unassigned Lane */}
          <div className="flex min-h-[100px] bg-[#FFFBEB]">
            <div className="w-48 flex-shrink-0 p-3 bg-[#FFFBEB] border-r border-slate-200 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-amber-700">Unassigned</div>
                <div className="text-[10px] text-slate-500">Drag to team above</div>
              </div>
            </div>

            <div className="flex-1 flex relative">
              {visibleMonths.map((month) => {
                const unassignedOpps = getUnassignedOpportunities().filter(o => o.month === month.id);
                return (
                  <div 
                    key={month.id}
                    className={`flex-1 p-1.5 border-r border-slate-200 last:border-r-0 ${
                      month.current ? 'bg-[#EFF8F4]' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      {unassignedOpps.map(opp => (
                        <div
                          key={opp.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, opp)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onOpportunityClick?.(opp)}
                          className={`p-1.5 rounded text-[10px] cursor-grab active:cursor-grabbing border border-dashed border-[#FDE68A] bg-[#FFFBEB] transition-all hover:border-amber-400 shadow-sm ${
                            draggedOpp?.id === opp.id ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-amber-500">⚠</span>
                            <span className="font-medium text-slate-700 truncate">{opp.title}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span 
                              className="px-1 py-0.5 rounded text-[8px] font-medium"
                              style={{ 
                                backgroundColor: STATUSES[opp.status]?.bgColor, 
                                color: STATUSES[opp.status]?.color 
                              }}
                            >
                              {STATUSES[opp.status]?.label}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {teamMembers.length === 0 && (
        <div className="p-8 text-center text-slate-500">
          <p>No team members configured</p>
          <p className="text-xs mt-1">Add team members using the Team button to see the timeline view</p>
        </div>
      )}
    </div>
  );
};

export default TimelineLanes;
