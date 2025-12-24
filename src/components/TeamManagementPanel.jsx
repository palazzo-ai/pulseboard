import React, { useState } from 'react';
import TeamMemberBadge from './TeamMemberBadge';
import { supabase } from '../supabase';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
const ROLES = ['Engineering Lead', 'Full Stack', 'Frontend', 'Backend', 'DevOps', 'QA', 'Design', 'Product'];

const TeamMemberForm = ({ member, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    id: member?.id || null,
    name: member?.name || '',
    email: member?.email || '',
    role: member?.role || 'Full Stack',
    color: member?.color || '#6366f1',
    capacity_points_per_sprint: member?.capacity_points_per_sprint || 18
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="John Doe"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="john@palazzo.ai"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Role</label>
        <select
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Color</label>
        <div className="flex gap-2">
          {COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData({ ...formData, color })}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${formData.color === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Capacity (points/sprint)</label>
        <input
          type="number"
          min="0"
          max="50"
          value={formData.capacity_points_per_sprint}
          onChange={(e) => setFormData({ ...formData, capacity_points_per_sprint: parseInt(e.target.value) || 0 })}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(formData)}
          disabled={!formData.name}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
};

const TeamManagementPanel = ({ isOpen, onClose, teamMembers, onRefresh, showNotification }) => {
  const [editingMember, setEditingMember] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleSaveMember = async (memberData) => {
    try {
      if (memberData.id) {
        // Update existing
        const { error } = await supabase.from('team_members').update({
          name: memberData.name,
          email: memberData.email,
          role: memberData.role,
          color: memberData.color,
          capacity_points_per_sprint: memberData.capacity_points_per_sprint
        }).eq('id', memberData.id);
        if (error) throw error;
        showNotification?.(`Updated ${memberData.name}`, 'success');
      } else {
        // Create new
        const { error } = await supabase.from('team_members').insert([{
          name: memberData.name,
          email: memberData.email,
          role: memberData.role,
          color: memberData.color,
          capacity_points_per_sprint: memberData.capacity_points_per_sprint || 18
        }]);
        if (error) throw error;
        showNotification?.(`Added ${memberData.name}`, 'success');
      }
      onRefresh();
      setEditingMember(null);
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to save team member:', err);
      showNotification?.('Failed to save team member', 'warning');
    }
  };

  const handleDeactivate = async (member) => {
    if (!confirm(`Deactivate ${member.name}? They will be removed from the team list.`)) return;
    try {
      const { error } = await supabase.from('team_members').update({ is_active: false }).eq('id', member.id);
      if (error) throw error;
      showNotification?.(`Deactivated ${member.name}`, 'info');
      onRefresh();
    } catch (err) {
      console.error('Failed to deactivate:', err);
      showNotification?.('Failed to deactivate member', 'warning');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full shadow-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-emerald-900/50 to-teal-900/50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Team Management</h2>
            <p className="text-xs text-slate-400">{teamMembers.length} active members</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdding(true)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Member
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {teamMembers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p>No team members yet</p>
              <p className="text-xs mt-1">Click "Add Member" to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {teamMembers.map(member => (
                <div key={member.id} className="p-3 border border-slate-700 rounded-lg flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <TeamMemberBadge member={member} size="lg" />
                    <div>
                      <div className="font-medium text-white">{member.name}</div>
                      <div className="text-xs text-slate-500">
                        {member.role} • {member.capacity_points_per_sprint || 18} pts/sprint
                        {member.email && <span className="text-slate-600"> • {member.email}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingMember(member)}
                      className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-900/20 rounded transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeactivate(member)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                      title="Deactivate"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit/Add Modal */}
        {(editingMember || isAdding) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => { setEditingMember(null); setIsAdding(false); }}>
            <div className="bg-slate-800 border border-slate-600 rounded-xl max-w-md w-full p-4 mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-base font-semibold text-white mb-4">
                {editingMember ? 'Edit Team Member' : 'Add Team Member'}
              </h3>
              <TeamMemberForm
                member={editingMember}
                onSave={handleSaveMember}
                onCancel={() => { setEditingMember(null); setIsAdding(false); }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagementPanel;
