"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AIAssistant;
// src/pages/AIAssistant.tsx
const framer_motion_1 = require("framer-motion");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const useStore_1 = require("../hooks/useStore");
const aiChat_1 = require("../services/aiChat");
// ── Markdown renderer ─────────────────────────────────────────────────────────
function renderMarkdown(text) {
    return text
        .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => `<pre class="ai-code-block"><code class="language-${lang || 'text'}">${escHtml(code.trim())}</code></pre>`)
        .replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/(\|.+\|\n?)+/g, (table) => {
        const rows = table.trim().split('\n').filter(r => r.trim());
        const isHeader = (r) => /^\|[-| :]+\|$/.test(r.trim());
        let html = '<div class="ai-table-wrap"><table class="ai-table">';
        let inBody = false;
        rows.forEach((row, i) => {
            if (isHeader(row)) {
                html += '<tbody>';
                inBody = true;
                return;
            }
            const tag = (!inBody && i === 0) ? 'th' : 'td';
            const cells = row.split('|').filter((_, ci) => ci > 0 && ci < row.split('|').length - 1);
            html += `<tr>${cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('')}</tr>`;
        });
        html += inBody ? '</tbody>' : '';
        html += '</table></div>';
        return html;
    })
        .replace(/^[ \t]*[-*] (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        .replace(/^### (.+)$/gm, '<h3 class="ai-h3">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="ai-h2">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="ai-h1">$1</h1>')
        .replace(/^---$/gm, '<hr class="ai-hr"/>')
        .replace(/\n{2,}/g, '</p><p class="ai-p">')
        .replace(/\n/g, '<br/>');
}
function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// ── Typing dots animation ─────────────────────────────────────────────────────
function TypingDots() {
    return (<div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map(i => (<framer_motion_1.motion.div key={i} className="w-2 h-2 rounded-full bg-green-400" animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}/>))}
    </div>);
}
// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
    const isUser = msg.role === 'user';
    return (<framer_motion_1.motion.div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
      <div className={`w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5
        ${isUser
            ? 'bg-green-500/20 border border-green-500/30'
            : 'bg-purple-500/20 border border-purple-500/30'}`}>
        {isUser
            ? <lucide_react_1.User size={14} className="text-green-400"/>
            : <lucide_react_1.Bot size={14} className="text-purple-400"/>}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm font-body leading-relaxed
        ${isUser
            ? 'bg-green-500/15 border border-green-500/20 text-white rounded-tr-sm'
            : msg.error
                ? 'bg-red-500/10 border border-red-500/20 text-red-300 rounded-tl-sm'
                : 'bg-dark-800 border border-white/8 text-dark-100 rounded-tl-sm ai-message'}`}>
        {msg.streaming
            ? <TypingDots />
            : isUser
                ? <p className="whitespace-pre-wrap">{msg.content}</p>
                : msg.error
                    ? <p className="text-xs text-red-300">{msg.content}</p>
                    : <div className="ai-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}/>}
      </div>
    </framer_motion_1.motion.div>);
}
// ── Conversation list item ────────────────────────────────────────────────────
function ConvItem({ conv, active, onSelect, onDelete, }) {
    return (<framer_motion_1.motion.div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer group transition-colors
        ${active ? 'bg-green-500/15 border border-green-500/20' : 'hover:bg-white/5'}`} onClick={onSelect} whileTap={{ scale: 0.97 }}>
      <lucide_react_1.MessageSquare size={13} className={active ? 'text-green-400' : 'text-dark-500'}/>
      <p className={`flex-1 text-xs font-body truncate ${active ? 'text-white' : 'text-dark-300'}`}>
        {conv.title}
      </p>
      <button onClick={e => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 text-dark-500 hover:text-red-400 transition-all">
        <lucide_react_1.Trash2 size={11}/>
      </button>
    </framer_motion_1.motion.div>);
}
// ── Suggested prompts ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
    '📐 Explain the Pythagorean theorem with examples',
    '⚗️ Summarise the laws of thermodynamics',
    '✍️ Help me outline an essay on climate change',
    '💻 What is Big O notation in simple terms?',
    '📊 How does compound interest work?',
    '🧬 Explain DNA replication step by step',
];
// ── Main component ────────────────────────────────────────────────────────────
function AIAssistant() {
    const { setActiveTab } = (0, useStore_1.useStore)();
    const [conversations, setConversations] = (0, react_1.useState)([]);
    const [activeConvId, setActiveConvId] = (0, react_1.useState)(null);
    const [showSidebar, setShowSidebar] = (0, react_1.useState)(false);
    const [input, setInput] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [retryMsg, setRetryMsg] = (0, react_1.useState)(null);
    const [convLoading, setConvLoading] = (0, react_1.useState)(true);
    const [showScrollBtn, setShowScrollBtn] = (0, react_1.useState)(false);
    const bottomRef = (0, react_1.useRef)(null);
    const inputRef = (0, react_1.useRef)(null);
    const scrollRef = (0, react_1.useRef)(null);
    /**
     * Tracks the AbortController for the in-flight request.
     * Used to cancel if the component unmounts or a new request supersedes it.
     */
    const abortControllerRef = (0, react_1.useRef)(null);
    /**
     * Tracks the conversation ID that owns the current in-flight request.
     * Guards against a slow response landing in the wrong conversation.
     */
    const inflightConvIdRef = (0, react_1.useRef)(null);
    /**
     * Prevents duplicate submissions: true while a fetch is in-flight.
     * Separate from `loading` state to avoid React batching races.
     */
    const isSendingRef = (0, react_1.useRef)(false);
    // ── Active conversation ──────────────────────────────────────────────────
    const activeConv = (0, react_1.useMemo)(() => conversations.find(c => c.id === activeConvId) ?? null, [conversations, activeConvId]);
    // ── Load conversations on mount ──────────────────────────────────────────
    (0, react_1.useEffect)(() => {
        setConvLoading(true);
        (0, aiChat_1.loadConversations)()
            .then(convs => {
            setConversations(convs);
            if (convs.length > 0)
                setActiveConvId(convs[0].id);
        })
            .finally(() => setConvLoading(false));
    }, []);
    // ── Cancel in-flight request on unmount ──────────────────────────────────
    (0, react_1.useEffect)(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);
    // ── Auto-scroll to bottom on new messages ────────────────────────────────
    const scrollToBottom = (0, react_1.useCallback)((smooth = true) => {
        bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
    }, []);
    (0, react_1.useEffect)(() => {
        scrollToBottom();
    }, [activeConv?.messages.length, scrollToBottom]);
    // ── Show scroll button when user scrolls up ──────────────────────────────
    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el)
            return;
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        setShowScrollBtn(distFromBottom > 200);
    };
    // ── Update a conversation in state + Firestore ───────────────────────────
    const upsertConv = (0, react_1.useCallback)((conv) => {
        setConversations(prev => {
            const exists = prev.find(c => c.id === conv.id);
            return exists
                ? prev.map(c => c.id === conv.id ? conv : c)
                : [conv, ...prev];
        });
        (0, aiChat_1.saveConversation)(conv); // fire and forget — non-fatal if it fails
    }, []);
    // ── New conversation ─────────────────────────────────────────────────────
    const handleNewConv = () => {
        const conv = (0, aiChat_1.createConversation)();
        setConversations(prev => [conv, ...prev]);
        setActiveConvId(conv.id);
        setShowSidebar(false);
        setInput('');
        inputRef.current?.focus();
    };
    // ── Delete conversation ──────────────────────────────────────────────────
    const handleDeleteConv = async (id) => {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConvId === id) {
            const remaining = conversations.filter(c => c.id !== id);
            setActiveConvId(remaining.length > 0 ? remaining[0].id : null);
        }
        await (0, aiChat_1.deleteConversation)(id);
    };
    // ── Send message ─────────────────────────────────────────────────────────
    const handleSend = (0, react_1.useCallback)(async (overrideText) => {
        const text = (overrideText ?? input).trim();
        // ── Duplicate / empty guard ──────────────────────────────────────────
        if (!text || isSendingRef.current)
            return;
        // Abort any still-running request before starting a new one
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        isSendingRef.current = true;
        setInput('');
        setLoading(true);
        setRetryMsg(null);
        // ── Resolve / create conversation ────────────────────────────────────
        let conv = activeConv;
        if (!conv) {
            conv = (0, aiChat_1.createConversation)();
            setConversations(prev => [conv, ...prev]);
            setActiveConvId(conv.id);
        }
        // Lock the conversation ID for this request to detect stale responses
        const thisConvId = conv.id;
        inflightConvIdRef.current = thisConvId;
        // ── Optimistic UI: add user message ──────────────────────────────────
        const userMsg = (0, aiChat_1.makeUserMessage)(text);
        const withUser = {
            ...conv,
            title: conv.messages.length === 0
                ? (text.slice(0, 60) + (text.length > 60 ? '…' : ''))
                : conv.title,
            messages: [...conv.messages, userMsg],
            updatedAt: new Date().toISOString(),
        };
        upsertConv(withUser);
        // ── Show streaming placeholder ────────────────────────────────────────
        const streamingMsg = (0, aiChat_1.makeAssistantMessage)('', { streaming: true });
        setConversations(prev => prev.map(c => c.id === thisConvId
            ? { ...withUser, messages: [...withUser.messages, streamingMsg] }
            : c));
        try {
            // callGemini handles retries + timeout internally; pass abort signal
            const replyText = await (0, aiChat_1.callGemini)(withUser.messages, controller.signal);
            // Race-condition guard: discard if the user switched conversations
            if (inflightConvIdRef.current !== thisConvId)
                return;
            const assistantMsg = (0, aiChat_1.makeAssistantMessage)(replyText);
            // Replace streaming placeholder with the real reply
            const finalConv = {
                ...withUser,
                messages: [...withUser.messages, assistantMsg],
            };
            upsertConv(finalConv);
        }
        catch (err) {
            // Ignore cancellation from unmount or superseded requests
            if (err?.message === 'Request was cancelled.' || controller.signal.aborted) {
                return;
            }
            if (import.meta.env.DEV) {
                console.error('[AIAssistant] callGemini failed after all retries:', err);
            }
            // Race-condition guard
            if (inflightConvIdRef.current !== thisConvId)
                return;
            const errMsg = (0, aiChat_1.makeAssistantMessage)(err?.message || 'Something went wrong. Please try again.', { error: true });
            // Remove streaming placeholder, add error message
            const withError = {
                ...withUser,
                messages: [...withUser.messages, errMsg],
            };
            upsertConv(withError);
            setRetryMsg(userMsg);
        }
        finally {
            // Always reset loading — even if an exception was swallowed above
            isSendingRef.current = false;
            setLoading(false);
            if (inflightConvIdRef.current === thisConvId) {
                inflightConvIdRef.current = null;
            }
        }
    }, [activeConv, input, upsertConv]);
    // ── Retry last failed message ────────────────────────────────────────────
    const handleRetry = (0, react_1.useCallback)(() => {
        if (!retryMsg || !activeConv)
            return;
        // Strip the error message from the conversation before re-sending
        const withoutError = {
            ...activeConv,
            messages: activeConv.messages.filter(m => !m.error),
        };
        upsertConv(withoutError);
        handleSend(retryMsg.content);
    }, [retryMsg, activeConv, upsertConv, handleSend]);
    // ── Input auto-resize ────────────────────────────────────────────────────
    const handleInputChange = (e) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    const messages = activeConv?.messages ?? [];
    const isEmpty = messages.length === 0;
    return (<div className="flex flex-col min-h-screen bg-dark-950 relative">

      {/* ── INLINE STYLES for markdown ──────────────────────────────────── */}
      <style>{`
        .ai-content p, .ai-p       { margin: 0.4em 0; line-height: 1.65; }
        .ai-content ul, .ai-content ol { padding-left: 1.4em; margin: 0.5em 0; }
        .ai-content li             { margin: 0.25em 0; }
        .ai-h1                     { font-size: 1.1em; font-weight: 700; margin: 0.6em 0 0.3em; color: #fff; }
        .ai-h2                     { font-size: 1.05em; font-weight: 700; margin: 0.5em 0 0.25em; color: #e5e7eb; }
        .ai-h3                     { font-size: 0.95em; font-weight: 600; margin: 0.4em 0 0.2em; color: #d1d5db; }
        .ai-hr                     { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 0.8em 0; }
        .ai-code-block             { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08);
                                     border-radius: 10px; padding: 12px 14px; overflow-x: auto;
                                     font-size: 0.78em; font-family: 'Courier New', monospace;
                                     color: #86efac; margin: 0.6em 0; line-height: 1.55; }
        .ai-inline-code            { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
                                     border-radius: 4px; padding: 1px 5px; font-size: 0.82em;
                                     font-family: monospace; color: #86efac; }
        .ai-table-wrap             { overflow-x: auto; margin: 0.6em 0; border-radius: 10px;
                                     border: 1px solid rgba(255,255,255,0.08); }
        .ai-table                  { width: 100%; border-collapse: collapse; font-size: 0.8em; }
        .ai-table th               { background: rgba(255,255,255,0.06); padding: 8px 12px;
                                     text-align: left; font-weight: 600; color: #d1d5db; }
        .ai-table td               { padding: 7px 12px; border-top: 1px solid rgba(255,255,255,0.05);
                                     color: #9ca3af; }
      `}</style>

      {/* ── SIDEBAR (conversation history) ──────────────────────────────── */}
      <framer_motion_1.AnimatePresence>
        {showSidebar && (<>
            <framer_motion_1.motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSidebar(false)}/>
            <framer_motion_1.motion.div className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-dark-900 border-r border-white/8 flex flex-col" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 350, damping: 32 }}>
              <div className="p-4 border-b border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <lucide_react_1.Bot size={16} className="text-purple-400"/>
                  <span className="text-sm font-display font-bold text-white">Conversations</span>
                </div>
                <button onClick={handleNewConv} className="w-8 h-8 rounded-xl bg-green-500/15 border border-green-500/25 flex items-center justify-center text-green-400">
                  <lucide_react_1.Plus size={14}/>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {convLoading && (<p className="text-xs text-dark-500 text-center py-4">Loading…</p>)}
                {!convLoading && conversations.length === 0 && (<p className="text-xs text-dark-500 text-center py-4">No conversations yet</p>)}
                {conversations.map(conv => (<ConvItem key={conv.id} conv={conv} active={conv.id === activeConvId} onSelect={() => { setActiveConvId(conv.id); setShowSidebar(false); }} onDelete={() => handleDeleteConv(conv.id)}/>))}
              </div>
            </framer_motion_1.motion.div>
          </>)}
      </framer_motion_1.AnimatePresence>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-14 pb-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveTab('more')} className="w-9 h-9 rounded-xl bg-dark-800 border border-white/8 flex items-center justify-center text-dark-400 hover:text-white transition-colors">
            <lucide_react_1.ChevronLeft size={18}/>
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <lucide_react_1.Sparkles size={13} className="text-purple-400"/>
              <h1 className="text-base font-display font-bold text-white">AI Study Assistant</h1>
            </div>
            <p className="text-[10px] text-dark-500 font-body">Powered by Gemini</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleNewConv} className="w-9 h-9 rounded-xl bg-dark-800 border border-white/8 flex items-center justify-center text-dark-400 hover:text-green-400 transition-colors" title="New conversation">
            <lucide_react_1.Plus size={16}/>
          </button>
          <button onClick={() => setShowSidebar(true)} className="w-9 h-9 rounded-xl bg-dark-800 border border-white/8 flex items-center justify-center text-dark-400 hover:text-white transition-colors" title="Conversation history">
            <lucide_react_1.MessageSquare size={15}/>
          </button>
        </div>
      </div>

      {/* ── MESSAGES AREA ───────────────────────────────────────────────── */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ paddingBottom: '140px' }}>
        {/* Empty state — suggestions */}
        {isEmpty && (<framer_motion_1.motion.div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-16 h-16 rounded-3xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center mb-4">
              <lucide_react_1.Bot size={28} className="text-purple-400"/>
            </div>
            <h2 className="text-lg font-display font-bold text-white mb-1">StudiByte AI</h2>
            <p className="text-xs text-dark-400 font-body mb-6 max-w-xs">
              Your intelligent academic companion. Ask me anything about your studies.
            </p>
            <div className="w-full max-w-sm space-y-2">
              {SUGGESTIONS.map((s, i) => (<framer_motion_1.motion.button key={i} onClick={() => handleSend(s.slice(2).trim())} className="w-full text-left px-4 py-2.5 rounded-xl bg-dark-800 border border-white/8 text-xs text-dark-300 hover:text-white hover:border-white/15 transition-all font-body" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }} whileTap={{ scale: 0.97 }}>
                  {s}
                </framer_motion_1.motion.button>))}
            </div>
          </framer_motion_1.motion.div>)}

        {/* Messages */}
        {messages.map(msg => (<MessageBubble key={msg.id} msg={msg}/>))}

        {/* Retry button */}
        {retryMsg && !loading && (<framer_motion_1.motion.div className="flex justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <button onClick={handleRetry} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-800 border border-white/8 text-xs text-dark-400 hover:text-white transition-colors font-body">
              <lucide_react_1.RefreshCw size={12}/> Retry last message
            </button>
          </framer_motion_1.motion.div>)}

        <div ref={bottomRef}/>
      </div>

      {/* Scroll to bottom button */}
      <framer_motion_1.AnimatePresence>
        {showScrollBtn && (<framer_motion_1.motion.button className="fixed right-4 z-30 w-9 h-9 rounded-full bg-dark-800 border border-white/10 flex items-center justify-center text-dark-400 hover:text-white shadow-lg" style={{ bottom: '100px' }} onClick={() => scrollToBottom()} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
            <lucide_react_1.ChevronDown size={16}/>
          </framer_motion_1.motion.button>)}
      </framer_motion_1.AnimatePresence>

      {/* ── INPUT AREA ──────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-4 bg-dark-950 border-t border-white/5" style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)', paddingTop: '10px' }}>
        <div className="flex items-end gap-2 max-w-full">
          <div className="flex-1 relative min-w-0">
            <textarea ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="Ask anything about your studies…" rows={1} disabled={loading} className="w-full max-w-full bg-dark-800 border border-white/10 rounded-2xl text-white font-body
                         text-sm px-4 py-3 pr-4 resize-none focus:outline-none
                         focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/40
                         placeholder-dark-500 transition-all duration-200 disabled:opacity-50" style={{ boxSizing: 'border-box', minHeight: '48px', maxHeight: '140px' }}/>
          </div>
          <framer_motion_1.motion.button onClick={() => handleSend()} disabled={!input.trim() || loading} className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all
                       disabled:opacity-40 disabled:cursor-not-allowed" style={{
            background: !input.trim() || loading
                ? 'rgba(255,255,255,0.06)'
                : 'linear-gradient(135deg, #a855f7, #7c3aed)',
            border: '1px solid rgba(168,85,247,0.3)',
        }} whileTap={!input.trim() || loading ? {} : { scale: 0.92 }}>
            {loading
            ? <framer_motion_1.motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}/>
            : <lucide_react_1.Send size={16} className="text-white ml-0.5"/>}
          </framer_motion_1.motion.button>
        </div>
        <p className="text-[10px] text-dark-600 text-center mt-2 font-body">
          Shift+Enter for new line · Enter to send
        </p>
      </div>
    </div>);
}
//# sourceMappingURL=AIAssistant.js.map