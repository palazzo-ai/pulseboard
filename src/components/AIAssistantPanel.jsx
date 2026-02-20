import React, { useState, useRef, useEffect, useCallback } from 'react';

// ============ TOOL CALL CARDS ============

function DateUpdatesCard({ toolCall, onApply, applied }) {
  const updates = toolCall.input.updates || [];
  const [dismissed, setDismissed] = useState(new Set());

  const activeUpdates = updates.filter((_, i) => !dismissed.has(i));

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-700/50 flex items-center gap-2">
        <span className="text-indigo-400 text-sm">&#128197;</span>
        <span className="text-xs font-semibold text-white">Date Updates ({activeUpdates.length})</span>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {updates.map((u, i) => dismissed.has(i) ? null : (
          <div key={i} className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-300 truncate flex-1">{u.title}</span>
            <span className="text-slate-500 ml-2 flex-shrink-0">{u.startDate} &rarr; {u.endDate}</span>
            {!applied && (
              <button onClick={() => setDismissed(prev => new Set(prev).add(i))}
                className="ml-2 text-slate-600 hover:text-slate-400 flex-shrink-0">&times;</button>
            )}
          </div>
        ))}
      </div>
      {!applied && activeUpdates.length > 0 && (
        <div className="px-3 py-2 flex gap-2">
          <button onClick={() => onApply(activeUpdates)}
            className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded transition-colors">
            Apply All
          </button>
          <button onClick={() => setDismissed(new Set(updates.map((_, i) => i)))}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded transition-colors">
            Dismiss
          </button>
        </div>
      )}
      {applied && (
        <div className="px-3 py-2 text-xs text-emerald-400 font-medium">Applied &#10003;</div>
      )}
    </div>
  );
}

function StatusUpdatesCard({ toolCall, onApply, applied }) {
  const updates = toolCall.input.updates || [];
  const statusColors = {
    not_started: 'text-slate-400', in_progress: 'text-blue-400',
    done: 'text-emerald-400', blocked: 'text-red-400',
  };
  const statusLabels = {
    not_started: 'Not Started', in_progress: 'In Progress',
    done: 'Done', blocked: 'Blocked',
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-700/50 flex items-center gap-2">
        <span className="text-amber-400 text-sm">&#9881;</span>
        <span className="text-xs font-semibold text-white">Status Updates ({updates.length})</span>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {updates.map((u, i) => (
          <div key={i} className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-300 truncate flex-1">{u.title}</span>
            {u.status && (
              <span className={`ml-2 flex-shrink-0 ${statusColors[u.status] || 'text-slate-400'}`}>
                {statusLabels[u.status] || u.status}
              </span>
            )}
            {u.atRisk && <span className="ml-1 text-amber-400 flex-shrink-0">&#9888;</span>}
          </div>
        ))}
      </div>
      {!applied ? (
        <div className="px-3 py-2">
          <button onClick={() => onApply(updates)}
            className="w-full px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded transition-colors">
            Apply All
          </button>
        </div>
      ) : (
        <div className="px-3 py-2 text-xs text-emerald-400 font-medium">Applied &#10003;</div>
      )}
    </div>
  );
}

function CreateOpportunityCard({ toolCall, onApply, applied }) {
  const opp = toolCall.input;
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-700/50 flex items-center gap-2">
        <span className="text-emerald-400 text-sm">+</span>
        <span className="text-xs font-semibold text-white">Create Opportunity</span>
      </div>
      <div className="px-3 py-2 space-y-1 text-xs">
        <div className="text-white font-medium">{opp.title}</div>
        <div className="text-slate-400">
          {opp.area} &middot; {opp.initiative} &middot; {opp.month}
        </div>
        {opp.description && <div className="text-slate-500">{opp.description}</div>}
      </div>
      {!applied ? (
        <div className="px-3 py-2">
          <button onClick={() => onApply(opp)}
            className="w-full px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded transition-colors">
            Create
          </button>
        </div>
      ) : (
        <div className="px-3 py-2 text-xs text-emerald-400 font-medium">Created &#10003;</div>
      )}
    </div>
  );
}

function MoveCard({ toolCall, onApply, applied }) {
  const moves = toolCall.input.moves || [];
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-700/50 flex items-center gap-2">
        <span className="text-violet-400 text-sm">&#8618;</span>
        <span className="text-xs font-semibold text-white">Move ({moves.length})</span>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {moves.map((m, i) => (
          <div key={i} className="px-3 py-1.5 border-b border-slate-800 text-xs">
            <span className="text-slate-300">{m.title}</span>
            <span className="text-slate-500 ml-1">
              {m.month && <>&rarr; {m.month}</>}
              {m.area && <> &middot; {m.area}</>}
            </span>
          </div>
        ))}
      </div>
      {!applied ? (
        <div className="px-3 py-2">
          <button onClick={() => onApply(moves)}
            className="w-full px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded transition-colors">
            Apply All
          </button>
        </div>
      ) : (
        <div className="px-3 py-2 text-xs text-emerald-400 font-medium">Applied &#10003;</div>
      )}
    </div>
  );
}

function SummaryCard({ content }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-700/50 flex items-center justify-between">
        <span className="text-xs font-semibold text-white">Summary</span>
        <button onClick={handleCopy}
          className="text-xs text-slate-400 hover:text-white transition-colors">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="px-3 py-2 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
        {content}
      </div>
    </div>
  );
}

function MilestonePlanCard({ plan, onApplyDates, onCreateOpportunity, onFocusMilestone, applied }) {
  const bufferColors = {
    healthy: 'text-emerald-400', tight: 'text-amber-400', behind: 'text-red-400',
  };
  const riskColors = {
    low: 'text-emerald-400', medium: 'text-amber-400', high: 'text-red-400',
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-sm">&#9670;</span>
          <span className="text-xs font-semibold text-white flex-1">{plan.milestone.title}</span>
          <span className="text-[10px] text-slate-500">{plan.milestone.targetDate}</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          {plan.milestone.area} &middot; {(plan.criticalPath?.length || 0) + (plan.parallelWork?.length || 0)} opportunities
        </div>
      </div>

      {/* Critical Path */}
      {plan.criticalPath?.length > 0 && (
        <div className="px-3 py-2 border-b border-slate-800">
          <div className="text-[10px] text-amber-400 uppercase tracking-widest mb-1.5 font-medium">Critical Path</div>
          <div className="space-y-1.5">
            {[...plan.criticalPath].reverse().map((item, i) => (
              <div key={item.id || i} className="flex items-start gap-2 text-xs">
                <span className="text-slate-600 text-[10px] w-4 flex-shrink-0 text-right mt-0.5">{plan.criticalPath.length - i}.</span>
                <div className="flex-1 min-w-0">
                  <div className="text-slate-200 truncate">{item.title}</div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                    <span>{item.startDate} &rarr; {item.endDate}</span>
                    <span>({item.durationDays}d)</span>
                    {item.dateSource === 'ai_estimated' && <span className="text-amber-500">est.</span>}
                  </div>
                  {item.dependsOn?.length > 0 && (
                    <div className="text-[9px] text-slate-600">
                      depends on: {item.dependsOn.map(id => {
                        const dep = plan.criticalPath.find(c => c.id === id) || plan.parallelWork?.find(p => p.id === id);
                        return dep?.title || `#${id}`;
                      }).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parallel Work */}
      {plan.parallelWork?.length > 0 && (
        <div className="px-3 py-2 border-b border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Parallel Work</div>
          {plan.parallelWork.map((item, i) => (
            <div key={item.id || i} className="text-xs text-slate-400 flex items-center gap-1.5 py-0.5">
              <span>&middot;</span>
              <span className="truncate">{item.title}</span>
              <span className="text-slate-600 flex-shrink-0">({item.durationDays}d)</span>
            </div>
          ))}
        </div>
      )}

      {/* Suggested Additions */}
      {plan.suggestedNewOpportunities?.length > 0 && (
        <div className="px-3 py-2 border-b border-slate-800">
          <div className="text-[10px] text-amber-500 uppercase tracking-widest mb-1">Suggested Additions</div>
          {plan.suggestedNewOpportunities.map((item, i) => (
            <div key={i} className="py-1">
              <div className="text-xs text-slate-300 flex items-center gap-1.5">
                <span className="text-emerald-500">+</span>
                <span className="truncate flex-1">{item.title}</span>
                <span className="text-slate-600 flex-shrink-0">({item.estimatedDays}d)</span>
              </div>
              <div className="text-[9px] text-slate-600 ml-4">{item.reason}</div>
              {!applied && (
                <button onClick={() => onCreateOpportunity({
                  title: item.title, description: item.description || item.reason,
                  area: item.area, initiative: item.initiative,
                  month: plan.milestone.month || 'feb26',
                })}
                  className="ml-4 mt-0.5 text-[9px] text-indigo-400 hover:text-indigo-300 transition-colors">
                  Create this opportunity
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Analysis */}
      {plan.analysis && (
        <div className="px-3 py-2 border-b border-slate-800 grid grid-cols-2 gap-x-3 gap-y-1">
          <div className="text-[10px]">
            <span className="text-slate-500">Buffer: </span>
            <span className={bufferColors[plan.analysis.bufferStatus] || 'text-slate-400'}>
              {plan.analysis.bufferDays}d &middot; {plan.analysis.bufferStatus}
            </span>
          </div>
          <div className="text-[10px]">
            <span className="text-slate-500">Risk: </span>
            <span className={riskColors[plan.analysis.riskLevel] || 'text-slate-400'}>
              {plan.analysis.riskLevel}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 col-span-2">
            {plan.analysis.totalDays}d work / {plan.analysis.availableDays}d available
          </div>
          {plan.analysis.risks?.length > 0 && (
            <div className="col-span-2 mt-1">
              {plan.analysis.risks.map((risk, i) => (
                <div key={i} className="text-[9px] text-amber-500/70 flex items-start gap-1">
                  <span className="flex-shrink-0 mt-0.5">&#9888;</span>
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-3 py-2 flex gap-2">
        {!applied ? (
          <>
            <button onClick={() => {
              const allItems = [...(plan.criticalPath || []), ...(plan.parallelWork || [])];
              const dateUpdates = allItems.filter(i => i.startDate && i.endDate).map(i => ({
                id: i.id, startDate: i.startDate, endDate: i.endDate,
              }));
              if (dateUpdates.length > 0) onApplyDates(dateUpdates);
            }}
              className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded transition-colors">
              Apply All Dates
            </button>
            {onFocusMilestone && (
              <button onClick={() => onFocusMilestone(plan.milestone.id)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded transition-colors">
                View on Gantt
              </button>
            )}
          </>
        ) : (
          <div className="text-xs text-emerald-400 font-medium">Dates applied &#10003;</div>
        )}
      </div>
    </div>
  );
}

// ============ TOOL CALL RENDERER ============
function ToolCallCard({ toolCall, onUpdateOpportunities, onCreateOpportunity, onFocusMilestone }) {
  const [applied, setApplied] = useState(false);
  const { name, input, result } = toolCall;

  if (name === "set_opportunity_dates" || (name === "bulk_assign_dates" && result?.type === "mutation")) {
    const updates = name === "bulk_assign_dates" ? (input.updates || result?.data?.updates || []) : input.updates;
    return (
      <DateUpdatesCard
        toolCall={{ ...toolCall, input: { updates } }}
        applied={applied}
        onApply={(activeUpdates) => {
          const mapped = activeUpdates.map(u => ({
            id: u.id, startDate: u.startDate, endDate: u.endDate,
          }));
          onUpdateOpportunities(mapped);
          setApplied(true);
        }}
      />
    );
  }

  if (name === "update_opportunity_status") {
    return (
      <StatusUpdatesCard
        toolCall={toolCall}
        applied={applied}
        onApply={(updates) => {
          const mapped = updates.map(u => {
            const fields = {};
            if (u.status) fields.status = u.status;
            if (u.atRisk !== undefined) fields.atRisk = u.atRisk;
            if (u.atRiskReason !== undefined) fields.atRiskReason = u.atRiskReason;
            return { id: u.id, ...fields };
          });
          onUpdateOpportunities(mapped);
          setApplied(true);
        }}
      />
    );
  }

  if (name === "create_opportunity") {
    return (
      <CreateOpportunityCard
        toolCall={toolCall}
        applied={applied}
        onApply={(opp) => {
          onCreateOpportunity(opp);
          setApplied(true);
        }}
      />
    );
  }

  if (name === "move_opportunity") {
    return (
      <MoveCard
        toolCall={toolCall}
        applied={applied}
        onApply={(moves) => {
          const mapped = moves.map(m => {
            const fields = {};
            if (m.month) fields.month = m.month;
            if (m.area) fields.area = m.area;
            return { id: m.id, ...fields };
          });
          onUpdateOpportunities(mapped);
          setApplied(true);
        }}
      />
    );
  }

  // For analysis/summary tool calls, we don't render a card — the text response handles it
  return null;
}

// Parse milestone_plan JSON from assistant text
function parseMilestonePlan(text) {
  if (!text) return null;
  const match = text.match(/```milestone_plan\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

// Strip the milestone_plan code block from display text
function stripPlanBlock(text) {
  if (!text) return text;
  return text.replace(/```milestone_plan\s*[\s\S]*?```/g, '').trim();
}

// ============ MAIN PANEL ============
export default function AIAssistantPanel({
  isOpen,
  onClose,
  opportunities = [],
  milestones = [],
  onUpdateOpportunities,
  onCreateOpportunity,
  onFocusMilestone,
  showNotification,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCapabilities, setShowCapabilities] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return;

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Build API messages (only role + content for the API, no UI metadata)
      const apiMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      // If sync_linear is likely needed, inject the Linear API key
      const linearApiKey = typeof window !== 'undefined'
        ? localStorage.getItem('pulseboard_linear_key') || ''
        : '';

      const roadmapState = {
        opportunities,
        milestones,
        linearApiKey, // Available for sync_linear tool
      };

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, roadmapState }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || err.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // Add assistant response with tool calls
      const assistantMessage = {
        role: 'assistant',
        content: data.message,
        toolCalls: data.toolCalls || [],
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Assistant error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, something went wrong: ${error.message}`,
        toolCalls: [],
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, opportunities, milestones]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickAction = (prompt) => {
    sendMessage(prompt);
  };

  const capabilities = [
    { icon: '&#128197;', label: 'Set dates', prompt: 'Schedule all opportunities that are missing start/end dates.', desc: 'Assign or update start/end dates' },
    { icon: '&#9881;', label: 'Update status', prompt: 'What opportunities should change status based on their current progress?', desc: 'Change status or flag at-risk' },
    { icon: '+', label: 'Create', prompt: 'I need to create a new opportunity. Help me fill in the details.', desc: 'Add a new opportunity' },
    { icon: '&#8618;', label: 'Move', prompt: 'What items should we consider moving to different months?', desc: 'Reschedule to a different month/area' },
    { icon: '&#128202;', label: 'Summary', prompt: 'Give me an executive summary of the roadmap for this quarter.', desc: 'Stakeholder-ready reports' },
    { icon: '&#9889;', label: 'Sync Linear', prompt: 'Sync with Linear and show me status recommendations.', desc: 'Pull latest issue statuses' },
    { icon: '&#128279;', label: 'Dependencies', prompt: "Analyze the dependency graph and identify the critical path.", desc: 'Critical path & bottlenecks' },
    { icon: '&#9888;', label: 'Risks', prompt: 'What opportunities are blocked or at risk?', desc: 'Find blockers & risks' },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose} />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full bg-slate-900 border-l border-slate-700 z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 380 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <h2 className="text-sm font-semibold text-white">Pulseboard Assistant</h2>
          </div>
          <button onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors text-lg leading-none">&times;</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Empty state / capabilities grid */}
          {(messages.length === 0 || showCapabilities) && !loading && (
            <div className="py-2">
              {messages.length > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">Capabilities</span>
                  <button onClick={() => setShowCapabilities(false)}
                    className="text-slate-600 hover:text-slate-400 text-xs">&times;</button>
                </div>
              )}
              {messages.length === 0 && (
                <div className="text-center mb-3">
                  <div className="text-slate-500 text-xs">What can I help you with?</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                {capabilities.map((cap) => (
                  <button key={cap.label} onClick={() => { handleQuickAction(cap.prompt); setShowCapabilities(false); }}
                    className="flex items-start gap-2 px-2.5 py-2 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/30 hover:border-slate-600 rounded-lg text-left transition-colors group">
                    <span className="text-slate-500 group-hover:text-slate-300 text-sm flex-shrink-0 mt-0.5 w-4 text-center"
                      dangerouslySetInnerHTML={{ __html: cap.icon }} />
                    <div className="min-w-0">
                      <div className="text-[11px] text-slate-300 font-medium truncate">{cap.label}</div>
                      <div className="text-[9px] text-slate-600 group-hover:text-slate-500 truncate">{cap.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            const milestonePlan = msg.role === 'assistant' ? parseMilestonePlan(msg.content) : null;
            const displayContent = msg.role === 'assistant' ? stripPlanBlock(msg.content) : msg.content;

            return (
              <div key={i}>
                {/* Message bubble */}
                {displayContent && (
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-slate-800 text-slate-300 rounded-bl-sm'
                    }`}>
                      <span className="whitespace-pre-wrap">{displayContent}</span>
                    </div>
                  </div>
                )}

                {/* Milestone plan card (parsed from text) */}
                {milestonePlan && (
                  <div className="mt-2">
                    <MilestonePlanCard
                      plan={milestonePlan}
                      onApplyDates={onUpdateOpportunities}
                      onCreateOpportunity={onCreateOpportunity}
                      onFocusMilestone={onFocusMilestone}
                    />
                  </div>
                )}

                {/* Tool call cards */}
                {msg.toolCalls?.filter(tc => tc.result?.type === 'mutation').map((tc, j) => (
                  <div key={j} className="mt-2">
                    <ToolCallCard
                      toolCall={tc}
                      onUpdateOpportunities={onUpdateOpportunities}
                      onCreateOpportunity={onCreateOpportunity}
                      onFocusMilestone={onFocusMilestone}
                    />
                  </div>
                ))}
              </div>
            );
          })}

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 rounded-lg rounded-bl-sm px-3 py-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-slate-700/50 flex-shrink-0">
          <div className="flex gap-2">
            {messages.length > 0 && !showCapabilities && (
              <button type="button" onClick={() => setShowCapabilities(true)}
                className="px-2 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-500 hover:text-slate-300 transition-colors text-xs flex-shrink-0"
                title="Show capabilities">
                /?
              </button>
            )}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              disabled={loading}
              data-assistant-input="true"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
            <button type="submit" disabled={loading || !input.trim()}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors text-xs font-medium">
              &#10148;
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
