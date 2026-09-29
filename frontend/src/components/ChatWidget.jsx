import { useEffect, useRef, useState } from 'react';
import { sendChatMessage } from '../api';
import { ChatIcon, CloseIcon } from './Icons';

const GREETING = {
  role: 'assistant',
  content: "Hello! I'm your ReCircuit assistant. Ask me about device diagnostics, marketplace trading, or hardware upgrade options.",
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
      const history = nextMessages.filter((m) => m !== GREETING);
      const { reply } = await sendChatMessage({ messages: history });
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Unable to connect: ${err.message || 'please check backend connection'}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close assistant' : 'Open ReCircuit assistant'}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
      >
        {open ? (
          <CloseIcon className="w-5 h-5" />
        ) : (
          <ChatIcon className="w-5 h-5" />
        )}
      </button>

      {/* Chat window panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-40 flex w-[22rem] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3 bg-[var(--surface-2)]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
              <p className="text-xs text-[var(--text)] font-semibold">ReCircuit Assistant</p>
            </div>
            <span className="text-[10px] text-[var(--accent)] font-medium">Ready</span>
          </div>

          {/* Conversations */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
            style={{ maxHeight: '20rem', minHeight: '14rem' }}
          >
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[var(--accent)] text-white font-medium'
                      : 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border-subtle)]'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {/* Typing status dots */}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 bg-[var(--surface-2)] border border-[var(--border-subtle)] px-3 py-2 rounded-xl">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-dim)] animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-dim)] animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-dim)] animate-pulse" />
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
              placeholder="Ask about diagnostics or parts..."
              className="input-field py-2 text-xs"
              aria-label="Type your message"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn btn-primary py-2 px-3 text-xs font-semibold"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
