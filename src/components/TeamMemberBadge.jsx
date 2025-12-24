import React from 'react';

const TeamMemberBadge = ({ member, size = 'sm', showName = false, showPoints = false, points = 0 }) => {
  const sizeClasses = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm'
  };

  const initials = (member?.name || '?')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-medium flex-shrink-0`}
        style={{ backgroundColor: member?.color || '#6b7280' }}
        title={member?.name || 'Unknown'}
      >
        {initials}
      </div>
      {(showName || showPoints) && (
        <div className="flex flex-col min-w-0">
          {showName && <span className="text-xs font-medium text-slate-300 truncate">{member?.name}</span>}
          {showPoints && <span className="text-[10px] text-slate-500">{points} pts</span>}
        </div>
      )}
    </div>
  );
};

export default TeamMemberBadge;
