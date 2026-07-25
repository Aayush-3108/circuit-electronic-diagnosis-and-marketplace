import { useEffect, useRef, useState } from 'react';
import { sendChatMessage } from '../api';

const GREETING = {
  role: 'assistant',
  content: "Hey — I'm the Circuit assistant. Ask me about device troubleshooting, what a recommendation means, or how the app works.",
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      // Don't send the canned greeting back as conversation history
      const history = nextMessages.filter((m) => m !== GREETING);
      const { reply } = await sendChatMessage({ messages: history });
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Something went wrong: ${err.message || 'request failed'}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Open AI Chatbot'}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-warm)] text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
        style={{ boxShadow: 'var(--glow-warm)' }}
      >
        {open ? (
          <span className="font-mono text-base" aria-hidden="true">✕</span>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>

      {/* Chat window panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-40 flex w-[22rem] max-w-[calc(100vw-3rem)] flex-col rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden fade-up tech-bracket">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2.5 bg-[var(--surface-2)]">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" aria-hidden="true" />
              <p className="font-mono text-[9px] tracking-wider text-[var(--accent)] uppercase font-semibold">Circuit Assistant</p>
            </div>
            <span className="font-mono text-[8px] text-[var(--text-dim)] uppercase">LLAMA_3.3_70B</span>
          </div>

          {/* Conversations */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4"
            style={{ maxHeight: '20rem', minHeight: '14rem' }}
          >
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-[var(--radius-md)] px-3.5 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[var(--accent-warm-dim)] text-[var(--text)] border border-[var(--accent-warm)] shadow-sm'
                      : 'bg-[var(--surface-3)] text-[var(--text)] border-l-2 border-[var(--accent)] border-t border-r border-b border-[var(--border-subtle)] shadow-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {/* Typing status dots */}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 bg-[var(--surface-3)] border border-[var(--border-subtle)] px-3.5 py-2.5 rounded-[var(--radius-sm)]">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
          </div>

          {/* Input form */}
          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-[var(--border-subtle)] p-3 bg-[var(--surface-2)]">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type message..."
              className="input-field py-1.5 text-xs font-mono"
              aria-label="Type your message"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn btn-primary py-1.5 px-3 text-[9px]"
            >
              SEND
            </button>
          </form>
        </div>
      )}
    </>
  );
}
