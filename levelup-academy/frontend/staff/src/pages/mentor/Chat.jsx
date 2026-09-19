import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChatContacts, useChatHistory, useMe, useInvalidate } from '../../queries.js';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { getSocket } from '../../socket.js';
import { Avatar, SearchInput, EmptyState } from './_ui.jsx';
import { Send, MessageSquare, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Chat() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { data: me } = useMe();
  const invalidate = useInvalidate();
  const [searchParams, setSearchParams] = useSearchParams();
  const withId = searchParams.get('with');

  const { data: allContacts = [] } = useChatContacts();
  // Mentor can only chat with other mentors
  const mentors = allContacts.filter(c => c.role?.toLowerCase() === 'mentor');

  const [search, setSearch] = useState('');
  const filteredMentors = mentors.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  const selectedContact = mentors.find(m => String(m.id) === withId) || null;

  const roomKey = me && selectedContact 
    ? 'dm:' + (me.id < selectedContact.id ? `${me.id}:${selectedContact.id}` : `${selectedContact.id}:${me.id}`)
    : null;

  const { data: history = [] } = useChatHistory(roomKey);
  const [messages, setMessages] = useState([]);

  // Sync history when loaded
  useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  const scrollRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Socket and read receipts
  useEffect(() => {
    if (!roomKey) return;
    const socket = getSocket(token);
    
    // Mark as read initially
    api.chatMarkRead(token, roomKey).then(() => invalidate('chat-contacts')).catch(() => {});

    const onMessage = (msg) => {
      // Allow if it matches roomKey or if it is from/to the selected user
      if (
        msg.room === roomKey || 
        msg.roomKey === roomKey || 
        msg.senderId === selectedContact?.id || 
        msg.senderId === me?.id
      ) {
         setMessages(prev => {
           // Prevent duplicates if socket sends twice
           if (prev.some(m => m.id === msg.id)) return prev;
           return [...prev, msg];
         });
         api.chatMarkRead(token, roomKey).catch(() => {});
         invalidate('chat-contacts');
      }
    };
    
    socket.on('chat:dm:message', onMessage);
    return () => socket.off('chat:dm:message', onMessage);
  }, [roomKey, token, invalidate, selectedContact, me]);

  const [input, setInput] = useState('');

  const send = (e) => {
    e.preventDefault();
    if (!input.trim() || !roomKey || !selectedContact) return;
    const socket = getSocket(token);
    
    socket.emit('chat:dm:send', {
      to: selectedContact.id,
      text: input.trim()
    });
    
    setInput('');
  };

  const selectContact = (id) => {
    setSearchParams({ with: id });
  };

  const clearSelection = () => {
    setSearchParams({});
  };

  return (
    <div className="h-full flex gap-0 sm:gap-4 overflow-hidden relative pb-0 sm:pb-2">
      {/* Left panel - contacts */}
      <div className={`
        ${withId ? 'hidden sm:flex' : 'flex'}
        w-full sm:w-80 flex-shrink-0 flex-col glass-card border-0 sm:border border-[var(--border)] sm:rounded-2xl h-full
      `}>
        <div className="p-4 border-b border-[var(--border)] bg-[var(--surface)]/50 shrink-0">
          <h2 className="text-lg font-bold mb-4 text-[var(--text)]">{t('mentor.chat.colleagues')}</h2>
          <SearchInput value={search} onChange={setSearch} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredMentors.length === 0 ? (
            <div className="p-6 text-center text-sm text-[var(--text-muted)]">
              {search ? t('mentor.chat.notFound') : t('mentor.chat.noMentors')}
            </div>
          ) : (
            filteredMentors.map(m => {
              const isSelected = String(m.id) === withId;
              return (
                <button 
                  key={m.id}
                  onClick={() => selectContact(m.id)}
                  className={`
                    w-full p-4 flex items-center gap-3 text-left transition-colors border-b border-[var(--border)]/50 last:border-0
                    ${isSelected ? 'bg-[var(--surface)]' : 'hover:bg-[var(--surface)]/50'}
                  `}
                >
                  <div className="relative shrink-0">
                    <Avatar name={m.name} size="lg" />
                    {m.online && (
                      <div className="absolute bottom-[2px] right-[2px] w-3 h-3 bg-success rounded-full border-2 border-[var(--bg)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-semibold text-sm truncate text-[var(--text)]">{m.name}</span>
                      {m.lastMessageTime && (
                        <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-2">
                          {new Date(m.lastMessageTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      )}
                    </div>
                    <div className={`text-xs truncate ${m.unread ? 'text-[var(--text)] font-semibold' : 'text-[var(--text-muted)]'}`}>
                      {m.lastMessage || '...'}
                    </div>
                  </div>
                  {m.unread > 0 && (
                    <div className="w-5 h-5 shrink-0 rounded-full bg-primary text-primary-content text-[10px] flex items-center justify-center font-bold">
                      {m.unread}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel - chat messages */}
      <div className={`
        ${!withId ? 'hidden sm:flex' : 'flex'}
        flex-1 flex-col glass-card border-0 sm:border border-[var(--border)] sm:rounded-2xl h-full absolute sm:relative inset-0 sm:inset-auto z-10 sm:z-auto bg-[var(--bg)] sm:bg-transparent
      `}>
        {selectedContact ? (
          <>
            {/* Chat header */}
            <div className="p-3 sm:p-4 border-b border-[var(--border)] flex items-center gap-3 bg-[var(--surface)]/80 shrink-0">
              <button 
                className="sm:hidden w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--surface)] text-[var(--text-muted)]"
                onClick={clearSelection}
              >
                <ArrowLeft size={20} />
              </button>
              <div className="relative shrink-0">
                <Avatar name={selectedContact.name} size="md" />
                {selectedContact.online && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-[var(--bg)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[var(--text)] truncate text-sm sm:text-base">{selectedContact.name}</h3>
                <div className="text-xs text-[var(--text-muted)]">
                  {selectedContact.online ? t('mentor.chat.online') : t('mentor.chat.offline')}
                </div>
              </div>
            </div>

            {/* Chat messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--bg)]/30">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <EmptyState icon={MessageSquare} title={t('mentor.chat.noMessagesTitle')} hint={t('mentor.chat.noMessagesHint')} />
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.senderId === me?.id;
                  return (
                    <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`
                        max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 
                        ${isMe 
                          ? 'bg-primary text-primary-content rounded-tr-sm' 
                          : 'bg-[var(--surface)] text-[var(--text)] rounded-tl-sm border border-[var(--border)]'
                        }
                      `}>
                        <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                        <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-primary-content/80' : 'text-[var(--text-muted)]'}`}>
                          {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat input */}
            <form onSubmit={send} className="p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--surface)]/80 flex gap-2 items-end shrink-0">
              <textarea 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(e);
                  }
                }}
                placeholder={t('mentor.chat.placeholder')}
                className="flex-1 textarea textarea-bordered min-h-[44px] h-[44px] max-h-[120px] rounded-2xl bg-[var(--bg)] border-[var(--border)] text-[var(--text)] py-3 leading-tight resize-none focus:outline-none"
                rows={1}
              />
              <button 
                type="submit" 
                disabled={!input.trim()} 
                className="w-11 h-11 rounded-full bg-primary text-primary-content flex items-center justify-center shrink-0 disabled:opacity-50 disabled:bg-[var(--surface)] disabled:text-[var(--text-muted)] transition-colors"
              >
                <Send size={18} className="ml-0.5" />
              </button>
            </form>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <EmptyState icon={MessageSquare} title={t('mentor.chat.selectContactTitle')} hint={t('mentor.chat.selectContactHint')} />
          </div>
        )}
      </div>
    </div>
  );
}
