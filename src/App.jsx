import React, { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { 
  STATUSES, areas, initiatives, months, 
  initialMilestones, initialOpportunities, STORAGE_KEY 
} from './data/initialData';
import {
  getInitiativeColor, getAreaColor, getAreaName, getInitiativeName, getMonthName,
  getQuarters, getMonthsForQuarter, ensureStatusFields,
  dbToOpportunity, opportunityToDb, dbToMilestone, milestoneToDb,
  generateMonthId, parseMonthId, CLIENTS
} from './utils/helpers';
import {
  TeamMemberBadge, AssignmentBadges, AssignTeamMemberModal,
  TeamManagementPanel, CapacityDashboard, TimelineLanes, StatusBadge,
  PrioritizationMatrix,
  DependencyEditor, MultiSelectFilter, AIScoringModal
} from './components';
import GanttView from './components/GanttView';
import LaunchReadiness from './components/LaunchReadiness';
import AIAssistantPanel from './components/AIAssistantPanel';

export default function PalazzoTimeline() {
  // Core data state
  const [opportunities, setOpportunities] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection and editing state
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [editingOpportunity, setEditingOpportunity] = useState(null);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [isCreatingOpp, setIsCreatingOpp] = useState(false);
  const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);
  
  // Filter state - UPDATED to arrays for multi-select
  const [filterInitiative, setFilterInitiative] = useState([]);
  const [filterArea, setFilterArea] = useState([]);
  const [filterMilestone, setFilterMilestone] = useState(null); // Keep single-select for milestone dropdown
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterAssignee, setFilterAssignee] = useState([]);
  
  // View and UI state
  const [viewMode, setViewMode] = useState('all');
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [selectedSprint, setSelectedSprint] = useState('dec25');
  const [timelineRange, setTimelineRange] = useState({ start: 0, end: 6 });
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragType, setDragType] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [notification, setNotification] = useState(null);
  const [showDataModal, setShowDataModal] = useState(false);
  const [importText, setImportText] = useState('');
  
  // Team state
  const [teamMembers, setTeamMembers] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [teamPanelOpen, setTeamPanelOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignModalOpp, setAssignModalOpp] = useState(null);
  
  // AI Assistant state
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [dependencyEditorOpp, setDependencyEditorOpp] = useState(null);
  const [focusMilestoneId, setFocusMilestoneId] = useState(null);


  // AI Scoring Modal state
  const [aiScoringOpen, setAiScoringOpen] = useState(false);

  // Notification helper
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ========== DATA LOADING ==========
  useEffect(() => {
    loadData();
    loadTeamMembers();
    loadAllAssignments();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: oppsData, error: oppsError } = await supabase
        .from('opportunities').select('*').order('id');
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones').select('*').order('id');

      if (oppsError) throw oppsError;
      if (milestonesError) throw milestonesError;

      if (oppsData.length === 0 && milestonesData.length === 0) {
        await seedDatabase();
        return;
      }

      setOpportunities(oppsData.map(dbToOpportunity));
      setMilestones(milestonesData.map(dbToMilestone));
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('Failed to load data from database', 'warning');
      setOpportunities(initialOpportunities.map(ensureStatusFields));
      setMilestones(initialMilestones);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members').select('*').eq('is_active', true).order('name');
      if (error) { console.log('team_members table not found:', error.message); return; }
      setTeamMembers(data || []);
    } catch (err) { console.log('Failed to load team members:', err); }
  };

  const loadAllAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select(`id, opportunity_id, team_member_id, points, role, team_members (id, name, email, color, role)`);
      if (error) { console.log('assignments table not found:', error.message); return; }
      
      const grouped = {};
      (data || []).forEach(a => {
        const oppId = a.opportunity_id;
        if (!grouped[oppId]) grouped[oppId] = [];
        grouped[oppId].push({ ...a, team_member: a.team_members });
      });
      setAssignments(grouped);
    } catch (err) { console.log('Failed to load assignments:', err); }
  };

  // ========== DEPENDENCY HANDLERS ==========
  const handleUpdateDependencies = async (oppId, targetId, action) => {
    const opp = opportunities.find(o => o.id === oppId);
    const target = opportunities.find(o => o.id === targetId);
    if (!opp || !target) return;

    saveToUndo();
    
    let updatedOpp = { ...opp };
    let updatedTarget = { ...target };

    switch (action) {
      case 'add-blocks':
        updatedOpp.blocks = [...new Set([...(opp.blocks || []), targetId])];
        updatedTarget.blockedBy = [...new Set([...(target.blockedBy || []), oppId])];
        break;
      case 'remove-blocks':
        updatedOpp.blocks = (opp.blocks || []).filter(id => id !== targetId);
        updatedTarget.blockedBy = (target.blockedBy || []).filter(id => id !== oppId);
        break;
      case 'add-blocked-by':
        updatedOpp.blockedBy = [...new Set([...(opp.blockedBy || []), targetId])];
        updatedTarget.blocks = [...new Set([...(target.blocks || []), oppId])];
        break;
      case 'remove-blocked-by':
        updatedOpp.blockedBy = (opp.blockedBy || []).filter(id => id !== targetId);
        updatedTarget.blocks = (target.blocks || []).filter(id => id !== oppId);
        break;
    }

    setOpportunities(prev => prev.map(o => {
      if (o.id === oppId) return updatedOpp;
      if (o.id === targetId) return updatedTarget;
      return o;
    }));

    await saveOpportunity(updatedOpp);
    await saveOpportunity(updatedTarget);
    
    showNotification('Dependencies updated', 'success');
  };

  const seedDatabase = async () => {
    try {
      showNotification('Setting up database...', 'info');
      const { error: mError } = await supabase.from('milestones').insert(initialMilestones.map(milestoneToDb));
      if (mError) throw mError;
      const { error: oError } = await supabase.from('opportunities').insert(initialOpportunities.map(o => opportunityToDb(ensureStatusFields(o))));
      if (oError) throw oError;
      await loadData();
      showNotification('Database initialized!', 'success');
    } catch (error) {
      console.error('Error seeding database:', error);
      showNotification('Failed to initialize database', 'warning');
    }
  };

  // ========== SAVE OPERATIONS ==========
  const saveOpportunity = async (opp) => {
    setOpportunities(prev => prev.map(o => o.id === opp.id ? opp : o));
    try {
      const { error } = await supabase.from('opportunities').upsert(opportunityToDb(opp));
      if (error) throw error;
    } catch (error) {
      console.error('Error saving opportunity:', error);
      showNotification('Failed to save to database', 'warning');
    }
  };

  const saveMilestone = async (m) => {
    try {
      const { error } = await supabase.from('milestones').upsert(milestoneToDb(m));
      if (error) throw error;
    } catch (error) {
      console.error('Error saving milestone:', error);
      showNotification('Failed to save to database', 'warning');
    }
  };

  const deleteOpportunityFromDb = async (id) => {
    try {
      const { error } = await supabase.from('opportunities').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      showNotification('Failed to delete from database', 'warning');
    }
  };

  const deleteMilestoneFromDb = async (id) => {
    try {
      const { error } = await supabase.from('milestones').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting milestone:', error);
      showNotification('Failed to delete from database', 'warning');
    }
  };

  const saveAssignments = async (opportunityId, newAssignments) => {
    try {
      await supabase.from('assignments').delete().eq('opportunity_id', opportunityId);
      if (newAssignments.length > 0) {
        const toInsert = newAssignments.map(a => ({
          opportunity_id: opportunityId,
          team_member_id: a.team_member_id,
          points: a.points || 0,
          role: a.role || 'Contributor'
        }));
        const { error } = await supabase.from('assignments').insert(toInsert);
        if (error) throw error;
      }
      await loadAllAssignments();
      showNotification('Team assignments saved', 'success');
    } catch (err) {
      console.error('Failed to save assignments:', err);
      showNotification('Failed to save assignments', 'warning');
    }
  };

  // ========== UNDO ==========
  const saveToUndo = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-19), { opportunities, milestones }]);
  }, [opportunities, milestones]);

  const undo = () => {
    if (undoStack.length > 0) {
      const previous = undoStack[undoStack.length - 1];
      setUndoStack(prev => prev.slice(0, -1));
      setOpportunities(previous.opportunities);
      setMilestones(previous.milestones);
      showNotification('Undone', 'info');
    }
  };

  // ========== FILTERING - UPDATED for multi-select ==========
  const filteredOpportunities = opportunities.filter(opp => {
    // Initiative filter (array-based)
    if (filterInitiative.length > 0 && !filterInitiative.includes(opp.initiative)) return false;
    
    // Area filter (array-based)
    if (filterArea.length > 0 && !filterArea.includes(opp.area)) return false;
    
    // Milestone filter (single-select)
    if (filterMilestone && opp.milestoneId !== filterMilestone) return false;
    
    // Status filter (array-based with special 'at_risk' handling)
    if (filterStatus.length > 0) {
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
    
    // Assignee filter (array-based with special 'unassigned' handling)
    if (filterAssignee.length > 0) {
      const hasUnassigned = filterAssignee.includes('unassigned');
      const assigneeIds = filterAssignee.filter(a => a !== 'unassigned');
      const oppAssignments = assignments[opp.id] || [];
      const isUnassigned = oppAssignments.length === 0;
      const matchesAssignee = assigneeIds.length > 0 && oppAssignments.some(a => assigneeIds.includes(a.team_member_id));
      
      if (hasUnassigned && assigneeIds.length === 0) {
        if (!isUnassigned) return false;
      } else if (hasUnassigned) {
        if (!isUnassigned && !matchesAssignee) return false;
      } else {
        if (!matchesAssignee) return false;
      }
    }
    
    return true;
  });

  const filteredMilestones = milestones.filter(m => {
    if (filterArea.length > 0 && !filterArea.includes(m.area)) return false;
    return true;
  });

  // Helper variables for filter state
  const hasActiveFilters = filterInitiative.length > 0 || filterArea.length > 0 || filterStatus.length > 0 || filterAssignee.length > 0 || filterMilestone;

  const clearAllFilters = () => {
    setFilterInitiative([]);
    setFilterArea([]);
    setFilterStatus([]);
    setFilterAssignee([]);
    setFilterMilestone(null);
  };

  // ========== HELPERS ==========
  const getOpportunitiesForMilestone = (milestoneId) => opportunities.filter(opp => opp.milestoneId === milestoneId);
  
  const getMilestoneProgress = (milestoneId) => {
    const opps = getOpportunitiesForMilestone(milestoneId);
    if (opps.length === 0) return { total: 0, done: 0, atRisk: 0, text: 'No opportunities', hasRisk: false };
    const done = opps.filter(o => o.status === 'done').length;
    const atRisk = opps.filter(o => o.atRisk).length;
    const blocked = opps.filter(o => o.status === 'blocked').length;
    return { total: opps.length, done, atRisk, blocked, text: `${done}/${opps.length} done`, hasRisk: atRisk > 0 || blocked > 0 };
  };

  const getMilestonesForCell = (areaId, monthId) => filteredMilestones.filter(m => m.area === areaId && m.month === monthId);
  const getOpportunitiesForCell = (areaId, monthId) => filteredOpportunities.filter(opp => opp.area === areaId && opp.month === monthId);
  const quarters = getQuarters();

  // ========== DRAG AND DROP ==========
  const handleDragStart = (e, item, type) => {
    setDraggedItem(item);
    setDragType(type);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragOver = (e, areaId, monthId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ area: areaId, month: monthId });
  };

  const handleDragLeave = () => setDropTarget(null);

  const handleDrop = (e, areaId, monthId) => {
    e.preventDefault();
    if (draggedItem) {
      saveToUndo();
      if (dragType === 'opportunity') {
        const updatedOpp = { ...draggedItem, area: areaId, month: monthId };
        // Sync Gantt dates when month changes
        const newMonthDate = parseMonthId(monthId);
        if (newMonthDate) {
          if (draggedItem.startDate && draggedItem.endDate) {
            const oldStart = new Date(draggedItem.startDate + 'T00:00:00');
            const oldEnd = new Date(draggedItem.endDate + 'T00:00:00');
            const durationDays = Math.round((oldEnd - oldStart) / (1000 * 60 * 60 * 24));
            const newEnd = new Date(newMonthDate);
            newEnd.setDate(newEnd.getDate() + durationDays);
            updatedOpp.startDate = newMonthDate.toISOString().split('T')[0];
            updatedOpp.endDate = newEnd.toISOString().split('T')[0];
          } else if (!draggedItem.startDate) {
            updatedOpp.startDate = newMonthDate.toISOString().split('T')[0];
          }
        }
        setOpportunities(prev => prev.map(opp => opp.id === draggedItem.id ? updatedOpp : opp));
        saveOpportunity(updatedOpp);
        showNotification(`Moved "${draggedItem.title}"`, 'success');
      } else if (dragType === 'milestone') {
        const updatedMilestone = { ...draggedItem, area: areaId, month: monthId };
        setMilestones(prev => prev.map(m => m.id === draggedItem.id ? updatedMilestone : m));
        saveMilestone(updatedMilestone);
        showNotification(`Moved milestone "${draggedItem.title}"`, 'success');
      }
    }
    setDraggedItem(null);
    setDragType(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragType(null);
    setDropTarget(null);
  };

  // ========== CRUD OPERATIONS ==========
  const deleteOpportunity = (id) => {
    const opp = opportunities.find(o => o.id === id);
    saveToUndo();
    setOpportunities(prev => prev.filter(o => o.id !== id));
    deleteOpportunityFromDb(id);
    setSelectedOpportunity(null);
    showNotification(`Deleted "${opp?.title}"`, 'warning');
  };

  const handleSaveOpportunity = (opp) => {
    saveToUndo();
    if (isCreatingOpp) {
      setOpportunities(prev => [...prev, opp]);
      showNotification(`Created "${opp.title}"`, 'success');
    } else {
      setOpportunities(prev => prev.map(o => o.id === opp.id ? opp : o));
      showNotification(`Updated "${opp.title}"`, 'success');
    }
    saveOpportunity(opp);
    setEditingOpportunity(null);
    setIsCreatingOpp(false);
    setSelectedOpportunity(null);
  };

  const duplicateOpportunity = (opp) => {
    saveToUndo();
    const newOpp = { ...opp, id: Date.now(), title: `${opp.title} (copy)` };
    setOpportunities(prev => [...prev, newOpp]);
    saveOpportunity(newOpp);
    showNotification(`Duplicated "${opp.title}"`, 'success');
  };

  const deleteMilestone = (id) => {
    const m = milestones.find(m => m.id === id);
    saveToUndo();
    const updatedOpps = opportunities.filter(opp => opp.milestoneId === id);
    setOpportunities(prev => prev.map(opp => opp.milestoneId === id ? { ...opp, milestoneId: null } : opp));
    updatedOpps.forEach(opp => saveOpportunity({ ...opp, milestoneId: null }));
    setMilestones(prev => prev.filter(m => m.id !== id));
    deleteMilestoneFromDb(id);
    setSelectedMilestone(null);
    showNotification(`Deleted milestone "${m?.title}"`, 'warning');
  };

  const handleSaveMilestone = (m) => {
    saveToUndo();
    if (isCreatingMilestone) {
      setMilestones(prev => [...prev, m]);
      showNotification(`Created milestone "${m.title}"`, 'success');
    } else {
      setMilestones(prev => prev.map(existing => existing.id === m.id ? m : existing));
      showNotification(`Updated milestone "${m.title}"`, 'success');
    }
    saveMilestone(m);
    setEditingMilestone(null);
    setIsCreatingMilestone(false);
    setSelectedMilestone(null);
  };

  const startCreateOpportunity = (areaId, monthId) => {
    setIsCreatingOpp(true);
    setEditingOpportunity({
      id: Date.now(), title: '', area: areaId, month: monthId, initiative: 'ai',
      issues: [], description: '', milestoneId: null, status: 'not_started', atRisk: false, atRiskReason: ''
    });
  };

  const startCreateMilestone = (areaId, monthId) => {
    setIsCreatingMilestone(true);
    setEditingMilestone({ id: `m${Date.now()}`, title: '', area: areaId, month: monthId, description: '', client: null });
  };

  const openAssignModal = (opp) => {
    setAssignModalOpp(opp);
    setAssignModalOpen(true);
  };

  // Quick status change from timeline card
  const quickStatusChange = (oppId, newStatus) => {
    const opp = opportunities.find(o => o.id === oppId);
    if (!opp || opp.status === newStatus) return;
    
    saveToUndo();
    const updatedOpp = { ...opp, status: newStatus };
    setOpportunities(prev => prev.map(o => o.id === oppId ? updatedOpp : o));
    saveOpportunity(updatedOpp);
    showNotification(`Status updated to "${STATUSES[newStatus]?.label}"`, 'success');
  };

  // ========== DATA EXPORT/IMPORT ==========
  const exportData = () => {
    const data = { exportedAt: new Date().toISOString(), opportunities, milestones };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `palazzo-timeline-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Exported timeline data', 'success');
  };

  const importData = () => {
    try {
      const data = JSON.parse(importText);
      if (data.opportunities && data.milestones) {
        setOpportunities(data.opportunities);
        setMilestones(data.milestones);
        setShowDataModal(false);
        setImportText('');
        showNotification('Imported timeline data', 'success');
      } else {
        showNotification('Invalid data format', 'warning');
      }
    } catch (e) {
      showNotification('Failed to parse JSON', 'warning');
    }
  };

  const copyToClipboard = () => {
    const data = { exportedAt: new Date().toISOString(), opportunities, milestones };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    showNotification('Copied to clipboard', 'success');
  };

  const resetToDefault = () => {
    if (confirm('Reset all data to defaults? This cannot be undone.')) {
      setOpportunities(initialOpportunities);
      setMilestones(initialMilestones);
      setUndoStack([]);
      showNotification('Reset to default data', 'info');
    }
  };

  // ========== LINEAR SYNC ==========

  // ========== OVERALLOCATION WARNING ==========
  const getOverallocatedMembers = () => {
    return teamMembers.filter(member => {
      const memberPoints = Object.entries(assignments).reduce((sum, [oppId, assignList]) => {
        const opp = opportunities.find(o => o.id === parseInt(oppId));
        if (opp && opp.month === selectedSprint) {
          const memberAssign = assignList.find(a => a.team_member_id === member.id);
          if (memberAssign) return sum + (memberAssign.points || 0);
        }
        return sum;
      }, 0);
      return memberPoints > (member.capacity_points_per_sprint || 18);
    });
  };

  const overallocatedMembers = getOverallocatedMembers();

  // ========== FORM COMPONENTS ==========
  const OpportunityForm = ({ opportunity, onSave, onCancel, isNew }) => {
    const [form, setForm] = useState(opportunity);
    const [issuesText, setIssuesText] = useState(opportunity.issues.join(', '));

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!form.title.trim()) return;
      onSave({ ...form, issues: issuesText.split(',').map(s => s.trim()).filter(Boolean) });
    };

    return (
      <div className="fixed inset-0 bg-black/15 flex items-center justify-center z-50 p-4" onClick={onCancel}>
        <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b border-slate-200 sticky top-0 bg-white">
            <h2 className="text-lg font-semibold text-slate-900">{isNew ? 'Create Opportunity' : 'Edit Opportunity'}</h2>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Title *</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Enter opportunity title..." autoFocus />
            </div>

            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-20 resize-none"
                placeholder="Describe the opportunity..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Area</label>
                <select value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                  {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Month</label>
                <select value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                  {months.map(month => <option key={month.id} value={month.id}>{month.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Initiative</label>
              <select value={form.initiative} onChange={e => setForm({ ...form, initiative: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                {initiatives.map(init => <option key={init.id} value={init.id}>{init.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Feeds Into Milestone</label>
              <select value={form.milestoneId || ''} onChange={e => setForm({ ...form, milestoneId: e.target.value || null })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                <option value="">No milestone</option>
                {milestones.map(m => <option key={m.id} value={m.id}>{m.title} ({getMonthName(m.month)})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Linear Issues (comma-separated)</label>
              <input type="text" value={issuesText} onChange={e => setIssuesText(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono"
                placeholder="PAL-123, PAL-456" />
            </div>

            <div className="border-t border-slate-200 pt-4 mt-4">
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">Status & Risk</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Status</label>
                  <select value={form.status || 'not_started'} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                    {Object.entries(STATUSES).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <input type="checkbox" checked={form.atRisk || false} onChange={e => setForm({ ...form, atRisk: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 focus:ring-offset-white" />
                    <span className="text-sm text-orange-500 flex items-center gap-1">⚠ At Risk</span>
                  </label>
                </div>
              </div>
              {form.atRisk && (
                <div className="mt-3">
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Risk Reason</label>
                  <input type="text" value={form.atRiskReason || ''} onChange={e => setForm({ ...form, atRiskReason: e.target.value })}
                    className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Why is this at risk?" />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onCancel} className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm rounded-lg transition-colors">Cancel</button>
              <button type="submit" disabled={!form.title.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 text-white text-sm rounded-lg transition-colors">
                {isNew ? 'Create' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const MilestoneForm = ({ milestone, onSave, onCancel, isNew }) => {
    const [form, setForm] = useState(milestone);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!form.title.trim()) return;
      onSave(form);
    };

    return (
      <div className="fixed inset-0 bg-black/15 flex items-center justify-center z-50 p-4" onClick={onCancel}>
        <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-xl" onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b border-slate-200 bg-[#FFFBEB]">
            <h2 className="text-lg font-semibold text-[#92400E] flex items-center gap-2">{isNew ? 'Create Milestone' : 'Edit Milestone'}</h2>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Milestone Title *</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="e.g., Serhant Pilot Launch" autoFocus />
            </div>

            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 h-20 resize-none"
                placeholder="What does this milestone represent?" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Area</label>
                <select value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                  {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Target Month</label>
                <select value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                  {months.map(month => <option key={month.id} value={month.id}>{month.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Client / Partner</label>
              <select value={form.client || ''} onChange={e => setForm({ ...form, client: e.target.value || null })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                <option value="">None (Internal)</option>
                {CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onCancel} className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm rounded-lg transition-colors">Cancel</button>
              <button type="submit" disabled={!form.title.trim()} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-100 disabled:text-slate-400 text-white text-sm rounded-lg transition-colors">
                {isNew ? 'Create Milestone' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ========== LINEAR SYNC MODAL ==========

  // ========== LOADING STATE ==========
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading Pulseboard...</p>
        </div>
      </div>
    );
  }

  // ========== MAIN RENDER ==========
  return (
    <div className="min-h-screen bg-[#F4F5F7] text-slate-800 p-4">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg border text-sm font-medium ${
          notification.type === 'success' ? 'bg-white border-l-4 border-l-emerald-500 border-slate-200 text-slate-800' :
          notification.type === 'warning' ? 'bg-white border-l-4 border-l-amber-500 border-slate-200 text-slate-800' : 'bg-white border-l-4 border-l-slate-400 border-slate-200 text-slate-800'
        }`}>{notification.message}</div>
      )}

      {/* Global Overallocation Warning */}
      {overallocatedMembers.length > 0 && viewMode !== 'capacity' && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <span className="text-red-700 font-medium">Capacity Warning:</span>
            <span className="text-red-700 ml-2">
              {overallocatedMembers.map(m => m.name).join(', ')} {overallocatedMembers.length === 1 ? 'is' : 'are'} overallocated for {months.find(m => m.id === selectedSprint)?.name}
            </span>
          </div>
          <button onClick={() => setViewMode('capacity')} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded-lg">
            View Capacity
          </button>
        </div>
      )}

      {/* ========== HEADER ========== */}
      <div className="mb-6">
        {/* Row 1: Title + Actions */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Pulseboard</h1>
              <p className="text-slate-500 text-xs">Palazzo Product Roadmap</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Primary Actions */}
            <button onClick={() => setInfoOpen(prev => !prev)} className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors shadow-sm" title="How to use Pulseboard">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button onClick={() => setAssistantOpen(true)} className="p-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg transition-colors shadow-lg shadow-violet-500/20" title="AI Assistant">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </button>
            <button onClick={() => setTeamPanelOpen(true)} className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors shadow-sm" title="Team Management">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>
            <button onClick={() => setShowDataModal(true)} className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors shadow-sm" title="Data Management">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </button>
            <button onClick={undo} disabled={undoStack.length === 0} className="p-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 text-slate-600 rounded-lg transition-colors shadow-sm" title={`Undo (${undoStack.length})`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            
            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            {/* Create Actions */}
            <button onClick={() => startCreateMilestone('showcase', 'mar26')} className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-white text-slate-600 text-sm rounded-lg transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Milestone
            </button>
            <button onClick={() => startCreateOpportunity('visualizer', 'dec25')} className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-white text-slate-600 text-sm rounded-lg transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Opportunity
            </button>
          </div>
        </div>

        {/* Row 2: View Tabs */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200">
          <div className="flex">
            {[
              { key: 'all', label: 'Timeline' },
              { key: 'gantt', label: 'Gantt' },
              { key: 'prioritize', label: 'Prioritize' },
              { key: 'launches', label: 'Launches' },
              { key: 'capacity', label: 'Capacity' },
              { key: 'timeline', label: 'Team View' }
            ].map(mode => (
              <button
                key={mode.key}
                onClick={() => { setViewMode(mode.key); if (mode.key !== 'all') setTimelineFilter('all'); }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  viewMode === mode.key
                    ? 'text-slate-900 border-indigo-500'
                    : 'text-slate-400 border-transparent hover:text-slate-600'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Row 2 Right: Timeline Filter + Multi-Select Filters */}
          <div className="flex items-center gap-2 pb-2">
            {viewMode === 'all' && (
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'milestones', label: 'Milestones' },
                  { key: 'opportunities', label: 'Opportunities' }
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setTimelineFilter(opt.key)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      timelineFilter === opt.key
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            <MultiSelectFilter
              label="Initiative"
              options={initiatives}
              selected={filterInitiative}
              onChange={setFilterInitiative}
              allLabel="All Initiatives"
            />

            <MultiSelectFilter
              label="Area"
              options={areas}
              selected={filterArea}
              onChange={setFilterArea}
              allLabel="All Areas"
            />

            <MultiSelectFilter
              label="Status"
              options={[
                ...Object.entries(STATUSES).map(([key, { label, color }]) => ({ id: key, name: label, color })),
                { id: 'at_risk', name: '⚠ At Risk', color: '#f97316' }
              ]}
              selected={filterStatus}
              onChange={setFilterStatus}
              allLabel="All Statuses"
            />

            <MultiSelectFilter
              label="Assignee"
              options={[
                { id: 'unassigned', name: '⚠ Unassigned', color: '#f59e0b' },
                ...teamMembers.map(m => ({ id: m.id, name: m.name, color: m.color }))
              ]}
              selected={filterAssignee}
              onChange={setFilterAssignee}
              allLabel="All Assignees"
            />

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                title="Clear all filters"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Active Filters Chips - UPDATED for multi-select */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-slate-500">Active filters:</span>
            
            {/* Initiative chips */}
            {filterInitiative.map(id => {
              const init = initiatives.find(i => i.id === id);
              return init && (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 shadow-sm rounded-full text-xs text-slate-600">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: init.color }}></span>
                  {init.name}
                  <button onClick={() => setFilterInitiative(prev => prev.filter(i => i !== id))} className="ml-1 text-slate-400 hover:text-slate-600">×</button>
                </span>
              );
            })}

            {/* Area chips */}
            {filterArea.map(id => {
              const area = areas.find(a => a.id === id);
              return area && (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 shadow-sm rounded-full text-xs text-slate-600">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: area.color }}></span>
                  {area.name}
                  <button onClick={() => setFilterArea(prev => prev.filter(a => a !== id))} className="ml-1 text-slate-400 hover:text-slate-600">×</button>
                </span>
              );
            })}
            
            {/* Status chips */}
            {filterStatus.map(id => {
              const isAtRisk = id === 'at_risk';
              const status = STATUSES[id];
              return (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" 
                  style={{ backgroundColor: isAtRisk ? '#f9731630' : status?.bgColor, color: isAtRisk ? '#fb923c' : status?.color }}>
                  {isAtRisk ? '⚠ At Risk' : status?.label}
                  <button onClick={() => setFilterStatus(prev => prev.filter(s => s !== id))} className="ml-1 hover:opacity-70">×</button>
                </span>
              );
            })}
            
            {/* Assignee chips */}
            {filterAssignee.map(id => {
              const isUnassigned = id === 'unassigned';
              const member = teamMembers.find(m => m.id === id);
              return (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 shadow-sm rounded-full text-xs text-slate-600">
                  {isUnassigned ? '⚠ Unassigned' : member?.name}
                  <button onClick={() => setFilterAssignee(prev => prev.filter(a => a !== id))} className="ml-1 text-slate-400 hover:text-slate-600">×</button>
                </span>
              );
            })}

            {/* Milestone chip (single-select) */}
            {filterMilestone && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-full text-xs text-[#92400E]">
                {milestones.find(m => m.id === filterMilestone)?.title}
                <button onClick={() => setFilterMilestone(null)} className="ml-1 hover:opacity-70">×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Gantt View */}
      {viewMode === 'gantt' && (
        <div style={{ height: 'calc(100vh - 180px)' }}>
          <GanttView
            opportunities={opportunities}
            milestones={milestones}
            areas={areas}
            teamMembers={teamMembers}
            assignments={assignments}
            onSaveOpportunity={saveOpportunity}
            showNotification={showNotification}
            focusMilestoneId={focusMilestoneId}
            onClearFocus={() => setFocusMilestoneId(null)}
            onFocusMilestone={(id) => setFocusMilestoneId(id)}
          />
        </div>
      )}

      {/* Launch Readiness View */}
      {viewMode === 'launches' && (
        <LaunchReadiness
          opportunities={opportunities}
          milestones={milestones}
          areas={areas}
          showNotification={showNotification}
        />
      )}

      {/* Capacity Dashboard View */}
      {viewMode === 'capacity' && (
        <CapacityDashboard
          teamMembers={teamMembers}
          opportunities={opportunities}
          assignments={assignments}
          selectedSprint={selectedSprint}
          setSelectedSprint={setSelectedSprint}
          onOpportunityClick={setSelectedOpportunity}
        />
      )}

      {/* Timeline Lanes View */}
      {viewMode === 'timeline' && (
        <TimelineLanes
          teamMembers={teamMembers}
          opportunities={opportunities}
          assignments={assignments}
          timelineRange={timelineRange}
          setTimelineRange={setTimelineRange}
          onOpportunityClick={setSelectedOpportunity}
          onAssign={saveAssignments}
          showNotification={showNotification}
        />
      )}

      {/* Prioritization Matrix View - UPDATED with onOpenAIScoring and array filters */}
      {viewMode === 'prioritize' && (
        <div style={{ height: 'calc(100vh - 180px)' }}>
          <PrioritizationMatrix
            opportunities={opportunities}
            milestones={milestones}
            assignments={assignments}
            onUpdateOpportunity={(opp) => {
              saveToUndo();
              setOpportunities(prev => prev.map(o => o.id === opp.id ? opp : o));
              saveOpportunity(opp);
            }}
            onResetPrioritization={() => {
              saveToUndo();
              const reset = opportunities.map(o => ({ ...o, impactScore: null, effortScore: null }));
              setOpportunities(reset);
              reset.forEach(o => saveOpportunity(o));
            }}
            onSelectOpportunity={setSelectedOpportunity}
            onOpenAIScoring={() => setAiScoringOpen(true)}
            getInitiativeColor={getInitiativeColor}
            getAreaName={getAreaName}
            filterInitiative={filterInitiative}
            filterArea={filterArea}
            filterStatus={filterStatus}
          />
        </div>
      )}

      {/* Main Timeline Grid */}
      {viewMode === 'all' && (
        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
          <table className="w-full min-w-[1400px] border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-[#ECEEF1] border-b border-r border-gray-200/50 p-2 w-28"></th>
                {quarters.map(quarter => (
                  <th key={quarter} colSpan={getMonthsForQuarter(quarter).length} className="bg-[#ECEEF1] border-b border-gray-200/50 p-2 text-xs font-medium text-indigo-600 text-center">
                    {quarter}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 z-20 bg-[#ECEEF1] border-b border-r border-gray-200/50 p-2 text-xs font-medium text-slate-500 text-left">AREA</th>
                {months.map(month => (
                  <th key={month.id} className={`border-b border-gray-200/50 p-2 text-xs font-medium text-center min-w-[130px] ${month.current ? 'bg-[#EFF8F4] text-emerald-600 border-b-2 border-b-emerald-500' : 'bg-[#ECEEF1] text-slate-400'}`}>
                    {month.current && <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[9px] font-bold rounded mr-1">NOW</span>}
                    {month.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {areas.map(area => (
                <tr key={area.id}>
                  {/* Area row click handler - UPDATED for multi-select toggle */}
                  <td className="sticky left-0 z-10 bg-[#ECEEF1] border-r border-b border-slate-200 p-2 font-medium text-sm cursor-pointer hover:bg-slate-100"
                    style={{ color: area.color }}
                    onClick={() => {
                      if (filterArea.includes(area.id)) {
                        setFilterArea(prev => prev.filter(a => a !== area.id));
                      } else {
                        setFilterArea(prev => [...prev, area.id]);
                      }
                    }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: area.color }}></span>
                      {area.name}
                      {filterArea.includes(area.id) && <span className="text-xs">✓</span>}
                    </div>
                  </td>
                  {months.map(month => {
                    const cellMilestones = getMilestonesForCell(area.id, month.id);
                    const cellOpps = getOpportunitiesForCell(area.id, month.id);
                    const isDropTarget = dropTarget?.area === area.id && dropTarget?.month === month.id;
                    
                    return (
                      <td key={month.id}
                        className={`border-b border-slate-200 p-1.5 align-top transition-all ${month.current ? 'bg-[#EFF8F4]' : ''} ${isDropTarget ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''}`}
                        onDragOver={(e) => handleDragOver(e, area.id, month.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, area.id, month.id)}
                        onDoubleClick={() => startCreateOpportunity(area.id, month.id)}>
                        <div className="flex flex-col gap-1.5">
                          {/* Milestones */}
                          {(timelineFilter === 'all' || timelineFilter === 'milestones') && cellMilestones.map(m => {
                            const progress = getMilestoneProgress(m.id);
                            const progressPct = progress.total > 0 ? (progress.done / progress.total) * 100 : 0;
                            return (
                              <div key={m.id} draggable onDragStart={(e) => handleDragStart(e, m, 'milestone')} onDragEnd={handleDragEnd}
                                onClick={() => setSelectedMilestone(m)}
                                className={`p-2 rounded text-[11px] cursor-grab active:cursor-grabbing bg-[#FFFBEB] border border-[#FDE68A] hover:border-amber-400 rounded-lg shadow-[0_1px_2px_rgba(217,119,6,0.06)] transition-all ${draggedItem?.id === m.id && dragType === 'milestone' ? 'opacity-50' : ''} ${progress.hasRisk ? 'ring-1 ring-orange-500' : ''}`}>
                                <div className="flex items-center gap-1 text-[#92400E] font-semibold">
                                  {progress.hasRisk && <span className="text-orange-500">⚠</span>}
                                  <span>🎯</span><span className="flex-1">{m.title}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
                                  </div>
                                  <span className="text-[10px] text-yellow-600">{progress.text}</span>
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Opportunities */}
                          {(timelineFilter === 'all' || timelineFilter === 'opportunities') && cellOpps.map(opp => {
                            const linkedMilestone = opp.milestoneId ? milestones.find(m => m.id === opp.milestoneId) : null;
                            const startMonth = opp.startDate ? generateMonthId(new Date(opp.startDate + 'T00:00:00')) : null;
                            const endMonth = opp.endDate ? generateMonthId(new Date(opp.endDate + 'T00:00:00')) : null;
                            const isMultiMonth = startMonth && endMonth && startMonth !== endMonth;
                            const endMonthLabel = isMultiMonth ? getMonthName(endMonth)?.replace(/ '/, " '") : null;
                            return (
                              <div key={opp.id} draggable onDragStart={(e) => handleDragStart(e, opp, 'opportunity')} onDragEnd={handleDragEnd}
                                onClick={() => setSelectedOpportunity(opp)}
                                className={`p-1.5 rounded-lg text-[11px] cursor-grab active:cursor-grabbing transition-all hover:-translate-y-px hover:shadow-md border border-[#EAECF0] bg-[#F8FAFC] hover:bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${draggedItem?.id === opp.id && dragType === 'opportunity' ? 'opacity-50' : ''} ${opp.atRisk ? 'ring-1 ring-orange-500' : ''}`}
                                style={{ borderLeft: `3px solid ${getInitiativeColor(opp.initiative)}` }}>
                                <div className="flex items-center gap-1">
                                  {opp.atRisk && <span className="text-orange-500" title={opp.atRiskReason || 'At Risk'}>⚠</span>}
                                  <span className="font-medium text-[#1E293B] leading-tight flex-1">{opp.title}</span>
                                  {isMultiMonth && (
                                    <span className="text-[8px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded whitespace-nowrap flex-shrink-0" title={`Spans to ${endMonthLabel}`}>
                                      {'\u2192'} {endMonthLabel}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <StatusBadge status={opp.status} size="xs" onStatusChange={(newStatus) => quickStatusChange(opp.id, newStatus)} />
                                  {linkedMilestone && (
                                    <span className="text-[#B45309] text-[9px] font-medium flex items-center gap-0.5"><span className="text-[7px]">◆</span> {linkedMilestone.title}</span>
                                  )}
                                </div>
                                {/* Team Assignments */}
                                <div className="mt-1 flex items-center justify-between">
                                  <AssignmentBadges assignments={assignments[opp.id] || []} onAddClick={() => openAssignModal(opp)} maxVisible={2} size="xs" />
                                  {opp.issues && opp.issues.length > 0 && (
                                    <span className="text-[#94A3B8] text-[9px] font-mono tabular-nums">{opp.issues.length} {opp.issues.length === 1 ? 'issue' : 'issues'}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          
                          {cellMilestones.length === 0 && cellOpps.length === 0 && (
                            <div className="text-slate-700 text-center py-2 text-xs">—</div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <div><span className="text-yellow-500 font-medium">{filteredMilestones.length}</span> milestones</div>
        <div><span className="text-slate-400 font-medium">{filteredOpportunities.length}</span> opportunities</div>
        <div className="border-l border-slate-200 pl-4 flex gap-3">
          <span style={{ color: STATUSES.not_started.color }}>{opportunities.filter(o => o.status === 'not_started').length} not started</span>
          <span style={{ color: STATUSES.in_progress.color }}>{opportunities.filter(o => o.status === 'in_progress').length} in progress</span>
          <span style={{ color: STATUSES.done.color }}>{opportunities.filter(o => o.status === 'done').length} done</span>
          <span style={{ color: STATUSES.blocked.color }}>{opportunities.filter(o => o.status === 'blocked').length} blocked</span>
        </div>
        <div className="border-l border-slate-200 pl-4">
          <span className="text-orange-500">{opportunities.filter(o => o.atRisk).length} at risk</span>
        </div>
        <div><span className="text-slate-400 font-medium">{undoStack.length}</span> undo steps</div>
      </div>

      {/* Opportunity Detail Modal */}
      {selectedOpportunity && !editingOpportunity && (
        <div className="fixed inset-0 bg-black/15 flex items-center justify-center z-50 p-4" onClick={() => setSelectedOpportunity(null)}>
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {selectedOpportunity.milestoneId && (
                    <span className="inline-block px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-[10px] font-medium rounded mb-2">
                      → {milestones.find(m => m.id === selectedOpportunity.milestoneId)?.title}
                    </span>
                  )}
                  <h2 className="text-lg font-semibold text-slate-900">{selectedOpportunity.title}</h2>
                </div>
                <button onClick={() => setSelectedOpportunity(null)} className="text-slate-500 hover:text-slate-900 text-xl">×</button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-slate-300 text-sm">{selectedOpportunity.description}</p>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Area</div>
                  <div className="flex items-center gap-2" style={{ color: getAreaColor(selectedOpportunity.area) }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getAreaColor(selectedOpportunity.area) }}></span>
                    {getAreaName(selectedOpportunity.area)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Initiative</div>
                  <div className="flex items-center gap-2" style={{ color: getInitiativeColor(selectedOpportunity.initiative) }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getInitiativeColor(selectedOpportunity.initiative) }}></span>
                    {getInitiativeName(selectedOpportunity.initiative)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Target Month</div>
                  <div className="text-slate-300">{getMonthName(selectedOpportunity.month)}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Milestone</div>
                  <div className="text-slate-300">
                    {selectedOpportunity.milestoneId 
                      ? `🎯 ${milestones.find(m => m.id === selectedOpportunity.milestoneId)?.title}`
                      : '—'
                    }
                  </div>
                </div>
              </div>

              {selectedOpportunity.issues && selectedOpportunity.issues.length > 0 && (
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-2">Linear Issues</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedOpportunity.issues.map(issue => (
                      <a key={issue} href={`https://linear.app/palazzo-ai/issue/${issue}`} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-slate-50 text-indigo-600 hover:text-indigo-500 hover:bg-slate-100 text-xs rounded font-mono transition-colors cursor-pointer">{issue}</a>
                    ))}
                  </div>
                </div>
              )}

              {/* Dependencies Section */}
              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">Dependencies</h4>
                  <button
                    onClick={() => setDependencyEditorOpp(selectedOpportunity)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Manage →
                  </button>
                </div>
                
                <div className="space-y-2 text-xs">
                  {(selectedOpportunity.blockedBy?.length || 0) > 0 && (
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <div className="text-orange-400 font-medium mb-1">⚠ Blocked by {selectedOpportunity.blockedBy.length} item(s)</div>
                      <div className="text-slate-400">
                        {selectedOpportunity.blockedBy.map(id => {
                          const blocker = opportunities.find(o => o.id === id);
                          return blocker ? <div key={id} className="truncate">{blocker.title}</div> : null;
                        })}
                      </div>
                    </div>
                  )}
                  
                  {(selectedOpportunity.blocks?.length || 0) > 0 && (
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                      <div className="text-indigo-400 font-medium mb-1">→ Blocks {selectedOpportunity.blocks.length} item(s)</div>
                      <div className="text-slate-400">
                        {selectedOpportunity.blocks.map(id => {
                          const blocked = opportunities.find(o => o.id === id);
                          return blocked ? <div key={id} className="truncate">{blocked.title}</div> : null;
                        })}
                      </div>
                    </div>
                  )}
                  
                  {(selectedOpportunity.blockedBy?.length || 0) === 0 && (selectedOpportunity.blocks?.length || 0) === 0 && (
                    <div className="text-slate-500 italic">No dependencies defined</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-between">
              <div className="flex gap-2">
                <button onClick={() => deleteOpportunity(selectedOpportunity.id)} className="px-3 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-sm rounded-lg">Delete</button>
                <button onClick={() => duplicateOpportunity(selectedOpportunity)} className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm rounded-lg">Duplicate</button>
              </div>
              <button onClick={() => { setEditingOpportunity(selectedOpportunity); setIsCreatingOpp(false); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg">Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Milestone Detail Modal */}
      {selectedMilestone && !editingMilestone && (
        <div className="fixed inset-0 bg-black/15 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMilestone(null)}>
          <div className="bg-white border border-[#FDE68A] rounded-xl max-w-lg w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 bg-[#FFFBEB]">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-lg font-semibold text-yellow-400 flex items-center gap-2">🎯 {selectedMilestone.title}</h2>
                <button onClick={() => setSelectedMilestone(null)} className="text-slate-500 hover:text-slate-900 text-xl">×</button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-slate-300 text-sm">{selectedMilestone.description}</p>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Area</div>
                  <div className="flex items-center gap-2" style={{ color: getAreaColor(selectedMilestone.area) }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getAreaColor(selectedMilestone.area) }}></span>
                    {getAreaName(selectedMilestone.area)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Target Month</div>
                  <div className="text-slate-300">{getMonthName(selectedMilestone.month)}</div>
                </div>
              </div>

              <div>
                <div className="text-slate-500 text-xs uppercase tracking-wide mb-2">Contributing Opportunities ({getOpportunitiesForMilestone(selectedMilestone.id).length})</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {getOpportunitiesForMilestone(selectedMilestone.id).map(opp => (
                    <div key={opp.id} className="p-2 bg-slate-50 rounded text-xs cursor-pointer hover:bg-slate-100"
                      onClick={() => { setSelectedMilestone(null); setSelectedOpportunity(opp); }}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getInitiativeColor(opp.initiative) }}></span>
                        <span className="text-[#1E293B]">{opp.title}</span>
                        <span className="text-slate-500 ml-auto">{getMonthName(opp.month)}</span>
                      </div>
                    </div>
                  ))}
                  {getOpportunitiesForMilestone(selectedMilestone.id).length === 0 && (
                    <div className="text-slate-500 text-xs italic">No opportunities linked yet</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-between">
              <button onClick={() => deleteMilestone(selectedMilestone.id)} className="px-3 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-sm rounded-lg">Delete</button>
              <div className="flex gap-2">
                <button onClick={() => {
                  setSelectedMilestone(null);
                  setAssistantOpen(true);
                  // The assistant will receive this milestone in context — user can ask to plan it
                  setTimeout(() => {
                    const input = document.querySelector('[data-assistant-input]');
                    if (input) {
                      const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
                      nativeSet.call(input, `Plan out "${selectedMilestone.title}" milestone — what needs to happen and when?`);
                      input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                  }, 300);
                }} className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Plan
                </button>
                <button onClick={() => { setEditingMilestone(selectedMilestone); setIsCreatingMilestone(false); }} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg">Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create Forms */}
      {editingOpportunity && <OpportunityForm opportunity={editingOpportunity} onSave={handleSaveOpportunity} onCancel={() => { setEditingOpportunity(null); setIsCreatingOpp(false); }} isNew={isCreatingOpp} />}
      {editingMilestone && <MilestoneForm milestone={editingMilestone} onSave={handleSaveMilestone} onCancel={() => { setEditingMilestone(null); setIsCreatingMilestone(false); }} isNew={isCreatingMilestone} />}

      {/* AI Assistant Panel */}
      <AIAssistantPanel
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        opportunities={opportunities}
        milestones={milestones}
        onUpdateOpportunities={(updates) => {
          saveToUndo();
          updates.forEach(update => {
            const opp = opportunities.find(o => o.id === update.id);
            if (opp) {
              // Handle addIssue: append to issues array instead of overwriting
              const fields = { ...update };
              if (fields.addIssue) {
                fields.issues = [...new Set([...(opp.issues || []), fields.addIssue])];
                delete fields.addIssue;
              }
              const updated = { ...opp, ...fields };
              setOpportunities(prev => prev.map(o => o.id === update.id ? updated : o));
              saveOpportunity(updated);
            }
          });
        }}
        onCreateOpportunity={(opp) => {
          saveToUndo();
          const newOpp = { ...opp, id: Date.now(), status: opp.status || 'not_started' };
          setOpportunities(prev => [...prev, newOpp]);
          saveOpportunity(newOpp);
          showNotification(`Created "${opp.title}"`, 'success');
        }}
        onFocusMilestone={(id) => {
          setFocusMilestoneId(id);
          setViewMode('gantt');
        }}
        showNotification={showNotification}
      />

      {/* Team Management Panel */}
      <TeamManagementPanel isOpen={teamPanelOpen} onClose={() => setTeamPanelOpen(false)} teamMembers={teamMembers} onRefresh={loadTeamMembers} showNotification={showNotification} />

      {/* Assign Team Member Modal */}
      <AssignTeamMemberModal isOpen={assignModalOpen} onClose={() => { setAssignModalOpen(false); setAssignModalOpp(null); }} opportunity={assignModalOpp}
        teamMembers={teamMembers} existingAssignments={assignModalOpp ? (assignments[assignModalOpp.id] || []) : []} onSave={saveAssignments} />

      {/* Dependency Editor Modal */}
      {dependencyEditorOpp && (
        <DependencyEditor
          opportunity={dependencyEditorOpp}
          opportunities={opportunities}
          onUpdateDependencies={handleUpdateDependencies}
          onClose={() => setDependencyEditorOpp(null)}
          getAreaName={getAreaName}
          getInitiativeColor={getInitiativeColor}
        />
      )}

      {/* How to Use Info Panel */}
      {infoOpen && (
        <div className="fixed inset-0 bg-black/15 flex items-center justify-center z-50 p-4" onClick={() => setInfoOpen(false)}>
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">How to Use Pulseboard</h2>
              <button onClick={() => setInfoOpen(false)} className="text-slate-500 hover:text-slate-900 text-xl">&times;</button>
            </div>
            <div className="p-5 space-y-5 overflow-y-auto max-h-[70vh] text-sm text-slate-700 leading-relaxed">
              <div>
                <h3 className="font-semibold text-slate-900 mb-1.5">What is an Opportunity?</h3>
                <p>An <strong>opportunity</strong> is a discrete unit of product work — a feature, improvement, integration, or initiative that delivers value. Each opportunity has an owner area, belongs to a strategic initiative, and can be scored by impact and effort to help with prioritization.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1.5">Views</h3>
                <ul className="space-y-1.5 list-none pl-0">
                  <li><strong>Timeline</strong> — Month-by-month grid of all opportunities and milestones. Drag cards between months and areas to reschedule.</li>
                  <li><strong>Gantt</strong> — Date-range bars for each opportunity. Drag bars or their edges to adjust start/end dates. Place unscheduled items from the gutter.</li>
                  <li><strong>Prioritize</strong> — Impact vs Effort matrix. Drag unranked items from the sidebar onto the canvas to score them. Use "Start Over" to reset all scores.</li>
                  <li><strong>Capacity</strong> — Team workload view showing who is assigned to what and where bandwidth is available.</li>
                  <li><strong>Team View</strong> — Per-person timeline lanes showing each member's assigned work.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1.5">Key Concepts</h3>
                <ul className="space-y-1.5 list-none pl-0">
                  <li><strong>Milestones</strong> — Major delivery dates or partner commitments that opportunities roll up to. Shown as diamonds on the Gantt chart.</li>
                  <li><strong>Initiatives</strong> — Strategic themes (e.g., "Launch Partners", "AI Excellence") that group related opportunities. Each has a color shown as the left border on cards.</li>
                  <li><strong>Areas</strong> — Product areas (e.g., Visualizer, Spaces, Vinci) representing different parts of the platform.</li>
                  <li><strong>At Risk</strong> — Flag on opportunities that are in danger of slipping. Shown with an orange warning indicator.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1.5">Tips</h3>
                <ul className="space-y-1.5 list-none pl-0">
                  <li>Use the <strong>AI Assistant</strong> (sparkle button) to ask questions about your roadmap, get summaries, or identify risks.</li>
                  <li>Use <strong>AI Score All</strong> in the Prioritize view to auto-score unranked opportunities.</li>
                  <li>Click any opportunity card to see its details, edit fields, and manage team assignments.</li>
                  <li>Use filters in the toolbar to narrow down by initiative, area, or status.</li>
                  <li>All changes are saved automatically and support undo.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Management Modal */}
      {showDataModal && (
        <div className="fixed inset-0 bg-black/15 flex items-center justify-center z-50 p-4" onClick={() => setShowDataModal(false)}>
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full shadow-xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">📁 Data Management</h2>
              <button onClick={() => setShowDataModal(false)} className="text-slate-500 hover:text-slate-900 text-xl">×</button>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-300">Export Data</h3>
                <p className="text-xs text-slate-500">Download or copy your timeline data.</p>
                <div className="flex gap-2">
                  <button onClick={exportData} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors">⬇ Download JSON</button>
                  <button onClick={copyToClipboard} className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm rounded-lg transition-colors">📋 Copy to Clipboard</button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-300">Import Data</h3>
                <p className="text-xs text-slate-500">Paste exported JSON to restore a saved state.</p>
                <textarea value={importText} onChange={e => setImportText(e.target.value)}
                  className="w-full h-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder='Paste JSON here...' />
                <button onClick={importData} disabled={!importText.trim()}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm rounded-lg transition-colors">
                  ⬆ Import Data
                </button>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-medium text-red-600">Danger Zone</h3>
                <p className="text-xs text-slate-500">Reset to the original default data. This cannot be undone.</p>
                <button onClick={resetToDefault} className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm rounded-lg transition-colors">⚠ Reset to Defaults</button>
              </div>

              <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
                <div>Current data: {opportunities.length} opportunities, {milestones.length} milestones</div>
                <div>Default data: {initialOpportunities.length} opportunities, {initialMilestones.length} milestones</div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* AI Scoring Modal */}
      <AIScoringModal
        isOpen={aiScoringOpen}
        onClose={() => setAiScoringOpen(false)}
        opportunities={opportunities}
        milestones={milestones}
        assignments={assignments}
        onUpdateOpportunity={(opp) => {
          saveToUndo();
          setOpportunities(prev => prev.map(o => o.id === opp.id ? opp : o));
          saveOpportunity(opp);
        }}
        getInitiativeColor={getInitiativeColor}
        getAreaName={getAreaName}
      />
    </div>
  );
}
