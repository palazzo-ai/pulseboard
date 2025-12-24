import React from 'react';
import TeamMemberBadge from './TeamMemberBadge';

const AssignmentBadges = ({ 
  assignments = [], 
  onAddClick, 
  maxVisible = 3,
  showWarning = true,
  size = 'xs'
}) => {
  const visibleAssignments = assignments.slice(0, maxVisible);
  const remainingCount = Math.max(0, assignments.length - maxVisible);
  const totalPoints = assignments.reduce((sum, a) => sum + (a.points || 0), 0);
  const isUnstaffed = assignments.length === 0;

  return (
    <div className="flex items-center gap-1">
      {isUnstaffed && showWarning && (
        <div className="flex items-center gap-0.5 text-amber-500 text-[9px]" title="No team assigned">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      )}

      <div className="flex -space-x-1">
        {visibleAssignments.map((assignment, idx) => (
          <div
            key={assignment.team_member?.id || idx}
            className="relative ring-1 ring-slate-900 rounded-full"
            title={`${assignment.team_member?.name || 'Unknown'}: ${assignment.points || 0} pts`}
          >
            <TeamMemberBadge member={assignment.team_member} size={size} />
          </div>
        ))}
        
        {remainingCount > 0 && (
          <div className={`${size === 'xs' ? 'w-5 h-5 text-[8px]' : 'w-6 h-6 text-[9px]'} rounded-full bg-slate-700 flex items-center justify-center text-slate-400 font-medium ring-1 ring-slate-900`}>
            +{remainingCount}
          </div>
        )}
      </div>

      {assignments.length > 0 && (
        <span className="text-[9px] text-slate-500 ml-0.5">{totalPoints}p</span>
      )}

      {onAddClick && (
        <button
          onClick={(e) => { e.stopPropagation(); onAddClick(); }}
          className={`${size === 'xs' ? 'w-4 h-4' : 'w-5 h-5'} rounded-full border border-dashed border-slate-600 flex items-center justify-center text-slate-500 hover:border-indigo-400 hover:text-indigo-400 hover:bg-indigo-900/20 transition-colors`}
          title="Assign team"
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default AssignmentBadges;
