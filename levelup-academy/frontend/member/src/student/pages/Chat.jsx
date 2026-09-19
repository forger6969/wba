import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, Users, MessageCircle } from 'lucide-react';
import { useAuth } from '../../auth.jsx';
import { useChatMessages, useChatThreads } from '../../queries.js';
import { api } from '../../api.js';
import { getSocket, useSocketConnected } from '../../socket.js';
import { Avatar, EmptyState, C, alpha, shade } from '../components/ui.jsx';
import { fmtDate } from '../format.js';
import { useI18n, getLang } from '../../i18n/index.jsx';

/* Локаль часов — с тем же откатом на ru-RU, что и в format.js: в редких
   окружениях без данных узбекской локали Intl бросает RangeError. */
const HOUR_LOCALE = { uz: 'uz-UZ', en: 'en-US', ru: 'ru-RU' };
const clockLocale = () => {
  const loc = HOUR_LOCALE[getLang()] || 'ru-RU';
  try {
    new Intl.DateTimeFormat(loc).format(new Date());
    return loc;
  } catch {
    return 'ru-RU';
  }
};

/**
 * Чат ученика с наставником/админом — роут /student/chat, ВНЕ StudentLayout
 * (см. App.jsx). Второй редизайн 21.08.2026: первая версия (карточка внутри
 * обычной страницы с сайдбаром) не подошла — запрос "chat to'liq ochilgan
 * bo'lsin... full ekranga, card bo'lmasin". Теперь это отдельный полноэкранный
 * messenger-view без сайдбара/шапки приложения вообще, со своим back —
 * тот же паттерн, что у WhatsApp/Telegram: открыл чат — он и есть весь экран.
 */

const GROUP_WINDOW_MS = 5 * 60 * 1000;

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString(clockLocale(), { hour: '2-digit', minute: '2-digit' });
}

function formatDayLabel(iso, t) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return t.chat.today;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return t.chat.yesterday;
  // fmtDate: day/month-short/year, с безопасным откатом локали (format.js)
  return fmtDate(iso, getLang());
}

function Bubble({ m, mine, groupStart, groupEnd, isLast }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${groupEnd ? 'mb-3' : 'mb-[3px]'}`}>
      <div
        className={`max-w-[82%] sm:max-w-[60%] px-4 py-2.5 ${isLast ? 'k-pop-in' : ''}`}
        style={{
          background: mine ? `linear-gradient(155deg, ${C.lime}, ${shade(C.lime, 24)})` : C.card,
          color: mine ? '#fff' : C.text,
          boxShadow: mine ? `0 2px 10px ${alpha(C.lime, 25)}` : 'var(--k-e1)',
          border: mine ? 'none' : `1px solid ${C.line}`,
          borderRadius: 20,
          borderTopRightRadius: mine && groupStart ? 7 : 20,
          borderBottomRightRadius: mine && groupEnd ? 7 : 20,
          borderTopLeftRadius: !mine && groupStart ? 7 : 20,
          borderBottomLeftRadius: !mine && groupEnd ? 7 : 20,
        }}
      >
        <p className="text-[14.5px] whitespace-pre-wrap break-words leading-relaxed" style={{ letterSpacing: '-0.005em' }}>
          {m.body}
        </p>
        {groupEnd && (
          <span
            className="block text-right text-[10.5px] mt-1 tabular-nums font-medium"
            style={{ color: mine ? 'rgba(255,255,255,0.8)' : C.muted }}
          >
            {formatTime(m.created_at)}
          </span>
        )}
      </div>
    </div>
  );
}

function ContactPill({ r, isActive, roleLabel, onClick }) {
  const name = `${r.first_name || ''} ${r.last_name || ''}`.trim();
  return (
    <button
      onClick={onClick}
      className="k-press-sm relative shrink-0 flex items-center gap-2 pl-1.5 pr-4 py-1 rounded-full text-[13.5px] font-bold"
      style={{
        background: isActive ? `linear-gradient(155deg, ${C.lime}, ${shade(C.lime, 24)})` : alpha(C.text, 6),
        color: isActive ? '#fff' : C.text,
        boxShadow: isActive ? `0 3px 10px ${alpha(C.lime, 30)}` : 'none',
        transition: 'background 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s cubic-bezier(0.16,1,0.3,1), color 0.2s',
      }}
    >
      <span className="relative shrink-0">
        <Avatar name={name} size={30} />
        {r.unread_count > 0 && (
          <span
            className="k-num absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full grid place-items-center text-[9.5px] font-extrabold text-white"
            style={{ background: C.coral, boxShadow: `0 0 0 2px ${C.card}` }}
          >
            {r.unread_count > 99 ? '99+' : r.unread_count}
          </span>
        )}
      </span>
      <span className="flex flex-col items-start leading-tight py-0.5">
        <span className="truncate max-w-[140px]" style={{ letterSpacing: '-0.005em' }}>{name}</span>
        {roleLabel && (
          <span
            className="truncate max-w-[140px] text-[10px] font-bold uppercase tracking-wide"
            style={{ color: isActive ? 'rgba(255,255,255,0.8)' : C.muted }}
          >
            {roleLabel}
          </span>
        )}
      </span>
    </button>
  );
}

export default function Chat() {
  const { token, user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const connected = useSocketConnected(token);

  const [activeStaffId, setActiveStaffId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const boxRef = useRef(null);
  const socketRef = useRef(null);
  const textareaRef = useRef(null);

  const { data: threadsData, isLoading: threadsLoading, refetch: refetchThreads } = useChatThreads();
  const threads = threadsData?.data || [];
  const activeThread = threads.find((th) => th.id === activeStaffId) || null;
  const roomKey = activeStaffId && user?.id ? `dm:${activeStaffId}:${user.id}` : null;
  const { data, isLoading: messagesLoading } = useChatMessages(roomKey);

  // staff_role приходит с бэка (backend/src/modules/chat/chat.access.js:
  // listMyThreads → u.role AS staff_role) — mentor или admin. Показываем
  // рядом с именем, чтобы было видно, кто есть кто (запрос пользователя
  // 21.08.2026: "Mentor yonida ismi yonida mentor deb yozilsin").
  const roleLabelFor = (role) => (role === 'mentor' ? t.chat.mentor : role === 'admin' ? t.chat.admin : null);

  useEffect(() => {
    if (!activeStaffId && threads[0]?.id) setActiveStaffId(threads[0].id);
  }, [activeStaffId, threads]);

  useEffect(() => {
    if (data?.data?.messages) setMessages(data.data.messages);
  }, [data]);

  useEffect(() => {
    if (!roomKey || !token) return;
    api.chatMarkRead(token, roomKey).then(() => refetchThreads()).catch(() => {});
  }, [roomKey, token, refetchThreads]);

  useEffect(() => {
    if (!token) return;
    socketRef.current = getSocket(token);
  }, [token]);

  useEffect(() => {
    if (!socketRef.current || !roomKey) return;
    const s = socketRef.current;
    const handler = (msg) => {
      if (msg.room_key !== roomKey) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.sender_id !== user?.id) {
        api.chatMarkRead(token, roomKey).then(() => refetchThreads()).catch(() => {});
      }
    };
    s.on('chat:dm:message', handler);
    return () => s.off('chat:dm:message', handler);
  }, [roomKey, token, user?.id, refetchThreads]);

  useEffect(() => {
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages]);

  const rows = useMemo(
    () => messages.map((m, i) => {
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const mine = m.sender_id === user?.id;
      const sameAs = (other) => other
        && other.sender_id === m.sender_id
        && Math.abs(new Date(m.created_at) - new Date(other.created_at)) < GROUP_WINDOW_MS;
      const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
      return {
        m,
        mine,
        newDay,
        groupStart: newDay || !sameAs(prev),
        groupEnd: !sameAs(next) || (next && new Date(next.created_at).toDateString() !== new Date(m.created_at).toDateString()),
        isLast: i === messages.length - 1,
      };
    }),
    [messages, user?.id],
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !socketRef.current || sending || !activeStaffId) return;
    setSending(true);
    setSendError('');
    socketRef.current.emit('chat:dm:reply', { staffId: activeStaffId, body: text }, (res) => {
      setSending(false);
      if (res?.ok) {
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      } else {
        setSendError(res?.error || t.chat.sendError);
      }
    });
  }, [input, sending, activeStaffId, t]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = input.trim() && !sending && activeStaffId && connected;

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: C.bg }}>
      {/* Шапка — назад + личность собеседника, материал поверх контента снизу */}
      <div
        className="shrink-0 flex items-center gap-3 px-3 sm:px-4"
        style={{
          height: 62,
          paddingTop: 'env(safe-area-inset-top, 0px)',
          background: alpha(C.card, 82),
          backdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        <button
          onClick={() => navigate('/student')}
          className="k-press-sm shrink-0 w-9 h-9 rounded-full grid place-items-center"
          style={{ background: alpha(C.text, 6), color: C.text }}
          aria-label="back"
        >
          <ChevronLeft size={20} strokeWidth={2.6} />
        </button>
        <span className="shrink-0 w-9 h-9 rounded-full grid place-items-center" style={{ background: alpha(C.violet, 12) }}>
          <MessageCircle size={18} strokeWidth={2.3} color={C.violet} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-[16.5px] font-extrabold leading-tight truncate" style={{ color: C.text, letterSpacing: '-0.01em' }}>
              {activeThread ? `${activeThread.first_name || ''} ${activeThread.last_name || ''}`.trim() : t.chat.title}
            </h1>
            {activeThread && roleLabelFor(activeThread.staff_role) && (
              <span
                className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-md"
                style={{ background: alpha(C.violet, 12), color: C.violet }}
              >
                {roleLabelFor(activeThread.staff_role)}
              </span>
            )}
          </div>
          <p className="text-[11.5px] font-semibold truncate" style={{ color: connected ? C.lime : C.muted }}>
            {activeThread ? (connected ? t.chat.online : t.chat.offline) : t.chat.subtitle}
          </p>
        </div>
      </div>

      {/* Контакты */}
      <div
        className="shrink-0 flex items-center gap-2 overflow-x-auto px-3 sm:px-4 py-2.5"
        style={{ background: alpha(C.card, 65), backdropFilter: 'blur(20px) saturate(180%)', borderBottom: `1px solid ${C.line}` }}
      >
        {threadsLoading && <div className="animate-pulse h-9 w-40 rounded-full" style={{ background: C.line }} />}
        {!threadsLoading && threads.length === 0 && (
          <span className="text-[13px] font-semibold" style={{ color: C.muted }}>{t.chat.noContacts}</span>
        )}
        {threads.map((r) => (
          <ContactPill
            key={r.id}
            r={r}
            isActive={activeStaffId === r.id}
            roleLabel={roleLabelFor(r.staff_role)}
            onClick={() => { setActiveStaffId(r.id); setMessages([]); setSendError(''); }}
          />
        ))}
      </div>

      {/* Лента — занимает всё оставшееся место */}
      <div ref={boxRef} className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 py-4">
        {messagesLoading && rows.length === 0 && activeStaffId && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={i % 2 ? 'flex justify-end' : ''}>
                <div className="animate-pulse h-11 w-2/5 rounded-[20px]" style={{ background: C.line }} />
              </div>
            ))}
          </div>
        )}

        {!threadsLoading && threads.length === 0 && (
          <div className="h-full grid place-items-center">
            <EmptyState icon={Users} hue="violet" title={t.chat.noContacts} text={t.chat.noContactsText} />
          </div>
        )}

        {activeStaffId && !messagesLoading && rows.length === 0 && (
          <div className="h-full grid place-items-center">
            <EmptyState icon={MessageCircle} hue="lime" title={t.chat.noMessages} text={t.chat.noMessagesText} />
          </div>
        )}

        {rows.map(({ m, mine, newDay, groupStart, groupEnd, isLast }) => (
          <div key={m.id}>
            {newDay && (
              <div className="flex justify-center my-4 sticky top-0 z-[1]">
                <span
                  className="text-[10.5px] font-extrabold uppercase tracking-wider rounded-full px-3.5 py-1.5"
                  style={{
                    color: C.muted,
                    background: alpha(C.card, 78),
                    backdropFilter: 'blur(12px) saturate(180%)',
                    boxShadow: 'var(--k-e1)',
                  }}
                >
                  {formatDayLabel(m.created_at, t)}
                </span>
              </div>
            )}
            <Bubble m={m} mine={mine} groupStart={groupStart} groupEnd={groupEnd} isLast={isLast} />
          </div>
        ))}
      </div>

      {/* Ввод — прибит к низу вьюпорта */}
      <div
        className="shrink-0 px-3 sm:px-4 pt-2.5"
        style={{
          paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom, 0px))',
          background: alpha(C.card, 82),
          backdropFilter: 'blur(20px) saturate(180%)',
          borderTop: `1px solid ${C.line}`,
        }}
      >
        {sendError && <p className="mb-1.5 text-[11.5px] font-bold" style={{ color: C.coral }}>{sendError}</p>}
        <div className="flex items-end gap-2.5">
          <textarea
            ref={textareaRef}
            rows={1}
            className="flex-1 min-w-0 resize-none rounded-[20px] px-4 py-2.5 text-[14.5px] leading-relaxed outline-none"
            style={{
              background: C.card,
              border: `1px solid ${C.line}`,
              color: C.text,
              maxHeight: 100,
              letterSpacing: '-0.005em',
              transition: 'border-color 0.15s ease',
            }}
            placeholder={activeStaffId ? t.chat.placeholder : t.chat.placeholderNoContact}
            value={input}
            maxLength={4000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!activeStaffId || !connected}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="k-press shrink-0 w-11 h-11 rounded-full grid place-items-center disabled:cursor-not-allowed"
            style={{
              background: canSend ? `linear-gradient(155deg, ${C.lime}, ${shade(C.lime, 24)})` : C.line,
              color: canSend ? '#fff' : C.muted,
              boxShadow: canSend ? `0 3px 10px ${alpha(C.lime, 30)}` : 'none',
              transition: 'background 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s cubic-bezier(0.16,1,0.3,1)',
            }}
            aria-label="send"
          >
            {sending ? (
              <span className="animate-spin w-4 h-4 rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send size={18} strokeWidth={2.4} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
