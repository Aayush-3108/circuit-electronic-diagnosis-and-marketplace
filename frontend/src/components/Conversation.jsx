import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getConversationMessages, sendConversationMessage } from '../api';

export default function Conversation({ conversation, onBack }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const idToken = await user.getIdToken();
        const data = await getConversationMessages(conversation.id, idToken);
        if (!cancelled) setMessages(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    
    // Simple polling every 5s for demo purposes since we don't have websockets setup yet
    const interval = setInterval(load, 5000);
    
    return () => { 
      cancelled = true; 
      clearInterval(interval);
    };
  }, [conversation.id, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const idToken = await user.getIdToken();
      const newMsg = await sendConversationMessage(conversation.id, text, idToken);
      setMessages(prev => [...prev, newMsg]);
      setText('');
    } catch (e) {
      alert(e.message);
    } finally {
      setSending(false);
    }
  }

  const isBuyer = user.uid === conversation.buyer_uid;

  return (
    <div className="flex-1 flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-2)] flex items-center gap-4">
        <button onClick={onBack} className="btn btn-ghost p-1 px-3 text-sm border border-[var(--border)] rounded">
          ←
        </button>
        {conversation.listing_image && (
          <img src={conversation.listing_image} alt="" className="w-10 h-10 rounded object-cover" />
        )}
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{conversation.listing_title}</p>
          <p className="text-xs text-[var(--text-dim)] font-mono">
            {isBuyer ? 'Chatting with seller' : 'Chatting with buyer'}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4" ref={scrollRef}>
        {loading && messages.length === 0 && (
          <p className="text-center text-sm text-[var(--text-dim)]">Loading messages...</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-center text-sm text-[var(--text-dim)] mt-10">Start the conversation!</p>
        )}
        {messages.map(m => {
          const isMe = m.sender_uid === user.uid;
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                isMe ? 'bg-[var(--accent)] text-white rounded-br-none' : 'bg-[var(--surface-2)] text-[var(--text)] rounded-bl-none'
              }`}>
                <p>{m.text}</p>
                <p className={`text-[9px] mt-1 text-right ${isMe ? 'text-white/70' : 'text-[var(--text-dim)]'}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input area */}
      <div className="p-4 bg-[var(--surface-2)] border-t border-[var(--border)]">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="input-field flex-1"
            disabled={sending}
          />
          <button type="submit" disabled={sending || !text.trim()} className="btn btn-primary px-6">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
