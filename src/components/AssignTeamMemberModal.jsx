import React, { useState, useEffect } from 'react';
import TeamMemberBadge from './TeamMemberBadge';

const AssignTeamMemberModal = ({ isOpen, onClose, opportunity, teamMembers = [], existingAssignments = [], onSave }) => {
  const [assignments, setAssignments] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && existingAssignments) {
      setAssignments(existingAssignments.map(a => ({
        team_member_id: a.team_member_id || a.team_member?.id,
        points: a.points || 0,
        role: a.role || 'Contributor'
      })));
    }
  }, [isOpen, existingAssignments]);

  const toggleMember = (memberId) => {
    const exists = assignments.find(a => a.team_member_id === memberId);
    if (exists) {
      setAssignments(assignments.filter(a => a.team_member_id !== memberId));
    } else {
      setAssignments([...assignments, { team_member_id: memberId, points: 5, role: 'Contributor' }]);
    }
  };

  const updateAssignment = (memberId, field, value) => {
    setAssignments(assignments.map(a => a.team_member_id === memberId ? { ...a, [field]: value } : a));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(opportunity.id, assignments);
      onClose();
    } catch (err) {
      console.error('Failed to save assignments:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;
  const totalPoints = assignments.reduce((sum, a) => sum + (a.points || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/15 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-slate-800">Assign Team</h2>
              <p className="text-xs text-slate-400 truncate">{opportunity?.title}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 p-3 bg-slate-50 rounded-lg flex justify-between items-center">
            <span className="text-sm text-slate-400">Total Estimated Points</span>
            <span className="text-lg font-semibold text-indigo-400">{totalPoints} pts</span>
          </div>

          <div className="space-y-2">
            {teamMembers.map(member => {
              const assignment = assignments.find(a => a.team_member_id === member.id);
              const isSelected = !!assignment;

              return (
                <div key={member.id} className={`p-3 rounded-lg border transition-colors ${isSelected ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-center justify-between">
                    <button onClick={() => toggleMember(member.id)} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>
                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <TeamMemberBadge member={member} size="md" showName />
                    </button>
                    <span className="text-xs text-slate-500">{member.role}</span>
                  </div>

                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wide mb-1">Points</label>
                        <input
                          type="number" min="0" max="50"
                          value={assignment.points}
                          onChange={(e) => updateAssignment(member.id, 'points', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wide mb-1">Role</label>
                        <select
                          value={assignment.role}
                          onChange={(e) => updateAssignment(member.id, 'role', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="Lead">Lead</option>
                          <option value="Contributor">Contributor</option>
                          <option value="Reviewer">Reviewer</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-slate-800 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
            {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving...</> : 'Save Assignments'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignTeamMemberModal;
