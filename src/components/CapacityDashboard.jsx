import React from 'react';
import TeamMemberBadge from './TeamMemberBadge';
import { months } from '../data/initialData';

const CapacityDashboard = ({ 
  teamMembers, 
  opportunities, 
  assignments, 
  selectedSprint, 
  setSelectedSprint,
  onOpportunityClick 
}) => {
  // Calculate capacity stats for each team member
  const getMemberStats = (member) => {
    const memberAssignments = Object.entries(assignments).flatMap(([oppId, assignList]) =>
      assignList.filter(a => a.team_member_id === member.id).map(a => ({ ...a, opportunityId: parseInt(oppId) }))
    );
    
    const sprintAssignments = memberAssignments.filter(a => {
      const opp = opportunities.find(o => o.id === a.opportunityId);
      return opp && opp.month === selectedSprint;
    });
    
    const allocatedPoints = sprintAssignments.reduce((sum, a) => sum + (a.points || 0), 0);
    const capacity = member.capacity_points_per_sprint || 18;
    const utilizationPct = Math.min(100, (allocatedPoints / capacity) * 100);
    const isOverallocated = allocatedPoints > capacity;
    const availablePoints = Math.max(0, capacity - allocatedPoints);
    
    return {
      memberAssignments,
      sprintAssignments,
      allocatedPoints,
      capacity,
      utilizationPct,
      isOverallocated,
      availablePoints
    };
  };

  // Overall team stats
  const teamStats = teamMembers.reduce((acc, member) => {
    const stats = getMemberStats(member);
    return {
      totalCapacity: acc.totalCapacity + stats.capacity,
      totalAllocated: acc.totalAllocated + stats.allocatedPoints,
      overallocatedCount: acc.overallocatedCount + (stats.isOverallocated ? 1 : 0)
    };
  }, { totalCapacity: 0, totalAllocated: 0, overallocatedCount: 0 });

  const teamUtilization = teamStats.totalCapacity > 0 
    ? Math.round((teamStats.totalAllocated / teamStats.totalCapacity) * 100) 
    : 0;

  return (
    <div className="border border-slate-200 rounded-lg bg-white shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            📊 Sprint Capacity Dashboard
          </h3>
          {teamStats.overallocatedCount > 0 && (
            <div className="px-3 py-1 bg-red-50 border border-red-200 rounded-full text-red-600 text-xs font-medium flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {teamStats.overallocatedCount} overallocated
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Team summary */}
          <div className="text-sm text-slate-500">
            Team: <span className={teamUtilization > 100 ? 'text-red-400' : teamUtilization > 80 ? 'text-amber-400' : 'text-emerald-400'}>
              {teamStats.totalAllocated}/{teamStats.totalCapacity} pts ({teamUtilization}%)
            </span>
          </div>
          <select 
            value={selectedSprint} 
            onChange={e => setSelectedSprint(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900"
          >
            {months.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      {/* Team Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {teamMembers.map(member => {
          const stats = getMemberStats(member);
          
          return (
            <div 
              key={member.id} 
              className={`p-4 rounded-lg border transition-all ${
                stats.isOverallocated 
                  ? 'border-red-500/50 bg-red-50 shadow-red-100/40 shadow-lg'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              {/* Member Header */}
              <div className="flex items-center gap-3 mb-3">
                <TeamMemberBadge member={member} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{member.name}</div>
                  <div className="text-xs text-slate-500">{member.role}</div>
                </div>
                {stats.isOverallocated && (
                  <div className="text-red-500" title="Overallocated!">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Capacity Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Capacity</span>
                  <span className={stats.isOverallocated ? 'text-red-500 font-medium' : 'text-slate-700'}>
                    {stats.allocatedPoints} / {stats.capacity} pts
                    {stats.isOverallocated && ` (+${stats.allocatedPoints - stats.capacity})`}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      stats.isOverallocated 
                        ? 'bg-red-500' 
                        : stats.utilizationPct > 80 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, stats.utilizationPct)}%` }}
                  />
                </div>
                {!stats.isOverallocated && stats.availablePoints > 0 && (
                  <div className="text-[10px] text-slate-500 mt-1">
                    {stats.availablePoints} pts available
                  </div>
                )}
              </div>

              {/* Assignments List */}
              <div className="space-y-1">
                {stats.sprintAssignments.slice(0, 4).map(a => {
                  const opp = opportunities.find(o => o.id === a.opportunityId);
                  return opp && (
                    <div 
                      key={a.opportunityId} 
                      className="text-xs text-slate-500 flex justify-between items-center cursor-pointer hover:text-slate-700 transition-colors"
                      onClick={() => onOpportunityClick?.(opp)}
                    >
                      <span className="truncate flex-1">{opp.title}</span>
                      <span className="text-slate-500 ml-2 flex-shrink-0">{a.points}p</span>
                    </div>
                  );
                })}
                {stats.sprintAssignments.length > 4 && (
                  <div className="text-xs text-slate-500">+{stats.sprintAssignments.length - 4} more</div>
                )}
                {stats.sprintAssignments.length === 0 && (
                  <div className="text-xs text-slate-500 italic">No assignments this sprint</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {teamMembers.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p>No team members configured</p>
          <p className="text-xs mt-1">Add team members using the Team button</p>
        </div>
      )}
    </div>
  );
};

export default CapacityDashboard;
