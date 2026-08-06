import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getConversations } from '../api';

export default function Inbox({ onOpenChat }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const idToken = await user.getIdToken();
        const data = await getConversations(idToken);
        if (!cancelled) setConversations(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  if (!user) {
    return (
      <div className="card p-8 text-center border-dashed">
        <p className="text-[var(--text-muted)]">Please sign in to view your messages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="section-label">Messages</span>
        <h1 className="text-3xl font-bold text-[var(--text)] mt-1">Inbox</h1>
      </div>

      {loading && <div className="animate-pulse h-32 bg-[var(--surface-2)] rounded-xl" />}
      {error && <p className="text-[var(--recycle)]">{error}</p>}
      
      {!loading && !error && conversations.length === 0 && (
        <div className="card p-8 text-center border-dashed">
          <p className="text-3xl mb-4">💬</p>
          <p className="text-[var(--text)] font-semibold">No messages yet</p>
          <p className="text-sm text-[var(--text-muted)]">Start a conversation from a marketplace listing.</p>
        </div>
      )}

      {!loading && conversations.length > 0 && (
        <div className="grid gap-3">
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => onOpenChat(c)}
              className="card p-4 flex gap-4 items-center hover:border-[var(--accent)] transition-colors text-left"
            >
              {c.listing_image ? (
                <img src={c.listing_image} alt="" className="w-16 h-16 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded bg-[var(--surface-2)] flex-shrink-0 flex items-center justify-center text-xl">📦</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-[var(--text)] truncate">{c.listing_title || 'Listing'}</p>
                  <p className="text-xs text-[var(--text-dim)] whitespace-nowrap ml-2">
                    {new Date(c.last_message_at).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-xs font-mono text-[var(--accent)] mt-1">
                  {c.buyer_uid === user.uid ? 'Purchasing from' : 'Selling to'} {c.buyer_uid === user.uid ? c.seller_uid.slice(0,6) : c.buyer_uid.slice(0,6)}...
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-1 truncate">
                  {c.last_message_text || 'No messages yet'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
