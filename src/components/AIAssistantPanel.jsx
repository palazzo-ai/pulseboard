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

// ============ TOOL CALL RENDERER ============
function ToolCallCard({ toolCall, onUpdateOpportunities, onCreateOpportunity }) {
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

// ============ MAIN PANEL ============
export default function AIAssistantPanel({
  isOpen,
  onClose,
  opportunities = [],
  milestones = [],
  onUpdateOpportunities,
  onCreateOpportunity,
  showNotification,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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

  const quickActions = [
    { label: 'Schedule dateless', prompt: 'Schedule all opportunities that are missing start/end dates.' },
    { label: 'Sync Linear', prompt: 'Sync with Linear and show me status recommendations.' },
    { label: 'Risk report', prompt: 'Give me a risk report for the roadmap.' },
    { label: "What's blocked?", prompt: "What opportunities are blocked or at risk?" },
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
          {messages.length === 0 && !loading && (
            <div className="text-center py-8">
              <div className="text-slate-600 text-xs mb-3">Ask me anything about your roadmap</div>
              <div className="space-y-1.5">
                {quickActions.map((qa) => (
                  <button key={qa.label} onClick={() => handleQuickAction(qa.prompt)}
                    className="block w-full text-left px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-xs text-slate-400 hover:text-white transition-colors">
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              {/* Message bubble */}
              <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-slate-800 text-slate-300 rounded-bl-sm'
                }`}>
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                </div>
              </div>

              {/* Tool call cards */}
              {msg.toolCalls?.filter(tc => tc.result?.type === 'mutation').map((tc, j) => (
                <div key={j} className="mt-2">
                  <ToolCallCard
                    toolCall={tc}
                    onUpdateOpportunities={onUpdateOpportunities}
                    onCreateOpportunity={onCreateOpportunity}
                  />
                </div>
              ))}
            </div>
          ))}

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

        {/* Quick actions (when conversation is active) */}
        {messages.length > 0 && (
          <div className="px-4 py-1.5 flex gap-1.5 flex-wrap border-t border-slate-800">
            {quickActions.map((qa) => (
              <button key={qa.label} onClick={() => handleQuickAction(qa.prompt)}
                disabled={loading}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-full text-[10px] text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50">
                {qa.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-slate-700/50 flex-shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              disabled={loading}
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
