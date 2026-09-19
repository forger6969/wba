import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Home, BookOpen, ShoppingBag, Trophy, LogOut, Send, Bell, BellOff, Star, ChevronDown, MessageCircle,
  Megaphone, ChevronRight, Flame, Sun, Moon, MonitorSmartphone,
} from 'lucide-react';
import { useAuth } from '../../auth.jsx';
import { Avatar, C, alpha, CountUp, LevelBar, levelFromCoins, EmptyState, Modal } from './ui.jsx';
import { LANGS, useI18n } from '../../i18n/index.jsx';
import { useDailyStreak } from '../useDailyStreak.js';
import { useKidTheme } from '../theme.jsx';
import { api } from '../api.js';

/**
 * Каркас кабинета ученика (2026-08-01, v2 — без маскота, приглушённая
 * палитра, см. ui.jsx для полной хроники правок по фидбеку).
 *
 *   · монеты — CountUp (докручиваются, а не мгновенно меняются)
 *   · стрик визитов — честно посчитан локально (useDailyStreak), не
 *     выдаётся за синхронизированное с сервером достижение
 *
 * «Энергия» — задел под будущую механику (Karis: «Энергия от задач это
 * доп-фича потом сделаем»). Значение не выдумывается: прочерк, пока на
 * бэкенде нет источника, чтобы цифра не врала.
 */

/* Шапка — тёмный лес (--k-header-*). Явно зелёная, не «просто тёмная»,
   и в light, и в dark: бренд LevelUp читается в самом тёмном месте UI. */
const DARK_BG = 'linear-gradient(160deg, var(--k-header-1) 0%, var(--k-header-2) 100%)';
const SIDEBAR_W = 248;

/* Меню — минимально (4 пункта). «Мои уроки» ведёт сразу на темы (/lessons) —
   раньше вело на промежуточное меню (/study, 4 карточки Уроки/Тесты/Задания/
   Видео), но реальный, живой контент — только в methodology-дереве
   (training_types→topics→lessons), туда и должен попадать студент сразу
   (Karis, 21.08.2026, по живой обратной связи). /study не удалён — просто
   больше не единственный вход. */
const LESSON_PATHS = ['/study', '/lessons', '/tests', '/homework', '/videos'];

/* Меню строится из словаря: подписи пунктов живут в i18n (nav.*),
   маршруты и иконки — здесь. */
function buildNav(t, orgFeatures) {
  return {
    main: [{ to: '/student', label: t.nav.home, icon: Home, end: true }],
    lessons: { to: '/lessons', label: t.nav.study, icon: BookOpen },
    // Karis (13.08.2026): Shop — управляемая Main Admin'ом фича, партнёру
    // может быть не включена — тогда пункта в меню нет вообще.
    rest: [
      { to: '/student/chat', label: t.nav.chat, icon: MessageCircle },
      ...(orgFeatures?.shop ? [{ to: '/shop', label: t.nav.shop, icon: ShoppingBag }] : []),
      { to: '/leaderboard', label: t.nav.rating, icon: Trophy },
    ],
  };
}

/* Монеты нужны в шапке на всех страницах, поэтому запрос здесь: Layout
   монтируется один раз на весь /student/*. Дублирует /student/home с
   Home.jsx — дешевле, чем общий контекст ради двух чисел. */
function useHeaderStats() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let cancelled = false;
    api.home().then((d) => { if (!cancelled) setStats(d.data); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return stats;
}

/* ── Медальон уровня — подпись кабинета ─────────────────────────────
   Кольцо прогресса до следующего уровня (SVG, честный % из настоящих
   coins) с номером уровня в центре. Живёт в шапке всегда — это «аватар
   достижений» ученика, вокруг которого построен весь кабинет. */
function LevelMedallion({ coins, size = 34 }) {
  const reduce = useReducedMotion();
  const { level, progress } = levelFromCoins(coins);
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <span className="relative shrink-0 grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="3" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={C.honey} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - (coins == null ? 0 : progress)) }}
          transition={reduce ? { duration: 0 } : { duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </svg>
      <span className="absolute k-num text-white text-[12px] leading-none">
        {coins == null ? '·' : level}
      </span>
    </span>
  );
}

/* Счётчик в HUD: маленький значок-иконка + число. Одна форма для монет
   и стрика — читаются как элементы одного табло. */
function HudStat({ icon: Icon, value, fill, title, lit = true }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={title}>
      <Icon
        size={13}
        strokeWidth={2.6}
        style={{ color: lit ? fill : 'rgba(255,255,255,0.4)' }}
        fill={lit && (Icon === Star || Icon === Flame) ? fill : 'transparent'}
      />
      {typeof value === 'number' ? (
        <CountUp value={value} className="text-[13.5px]" style={{ color: '#fff' }} />
      ) : (
        <span className="k-num text-[13.5px]" style={{ color: lit ? '#fff' : 'rgba(255,255,255,0.5)' }}>{value}</span>
      )}
    </span>
  );
}

/* ── Пункт бокового меню ───────────────────────────────────────────
   Активный: подложка forest-soft + лес-текст + лаймовая полоска слева,
   которая ПЕРЕЕЗЖАЕт между пунктами (motion layoutId), а не мигает. */
function NavItem({ to, label, icon: Icon, end, active, hue = C.forest }) {
  const reduce = useReducedMotion();
  const content = (isActive) => {
    const on = active ?? isActive;
    return (
      <span
        className="relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-[14.5px] font-extrabold transition-colors"
        style={{ color: on ? hue : C.muted, background: on ? C.forestSoft : 'transparent' }}
        onMouseEnter={(e) => { if (!on) { e.currentTarget.style.background = C.hair; } }}
        onMouseLeave={(e) => { if (!on) { e.currentTarget.style.background = 'transparent'; } }}
      >
        {on && (
          <motion.span
            layoutId="student-nav-rail"
            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
            style={{ background: hue === C.forest ? C.lime : hue }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 38 }}
          />
        )}
        <Icon size={19} strokeWidth={on ? 2.5 : 2} className="shrink-0" />
        {label}
      </span>
    );
  };
  if (active !== undefined) return <NavLink to={to} className="block">{() => content()}</NavLink>;
  return <NavLink to={to} end={end} className="block">{({ isActive }) => content(isActive)}</NavLink>;
}

/* Весь статус ученика — в одном стеклянном контейнере, а не тремя
   отдельными тёмными таблетками. */
function StatusHud({ coins, streak, t }) {
  return (
    <div
      className="flex items-center gap-2.5 h-10 pl-1 pr-3 rounded-full"
      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
    >
      <LevelMedallion coins={coins} />
      <span className="w-px h-4" style={{ background: 'rgba(255,255,255,0.14)' }} />
      <HudStat icon={Star} value={coins == null ? '···' : coins} fill={C.honey} title={t.header.coins} />
      <span className="w-px h-4" style={{ background: 'rgba(255,255,255,0.14)' }} />
      <HudStat icon={Flame} value={streak} fill={C.coral} lit={streak > 0} title={t.ui.streakTitle(streak)} />
    </div>
  );
}

/* ── Переключатель темы ────────────────────────────────────────────
   Цикл light → dark → system. Иконка меняется с поворотом (morph),
   под reduced-motion — просто без анимации. Живёт в шапке всегда. */
function ThemeToggle({ t }) {
  const { mode, resolved, cycle } = useKidTheme();
  const reduce = useReducedMotion();
  const Icon = mode === 'system' ? MonitorSmartphone : resolved === 'dark' ? Moon : Sun;
  const label =
    mode === 'system' ? t.theme.system : resolved === 'dark' ? t.theme.dark : t.theme.light;
  return (
    <button
      type="button"
      onClick={cycle}
      title={`${t.theme.label}: ${label}`}
      aria-label={`${t.theme.label}: ${label}`}
      className="k-press-sm relative w-10 h-10 rounded-full grid place-items-center shrink-0 overflow-hidden transition-colors"
      style={{ background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.82)' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={`${mode}-${resolved}`}
          initial={reduce ? false : { rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="grid place-items-center"
        >
          <Icon size={18} strokeWidth={2.4} />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export default function Layout() {
  const { user, token, logout } = useAuth();
  const { lang, setLanguage, t } = useI18n();
  const navigate = useNavigate();
  // Раньше: bool + жёстко пустой EmptyState в колокольчике всегда. Теперь
  // держим сами объявления — колокольчик показывает 3 свежих + переход на
  // полную страницу, точка-индикатор загорается, когда есть непрочитанные.
  const [announcements, setAnnouncements] = useState(null); // null — ещё не грузили
  const hasAnnouncements = (announcements?.length ?? 0) > 0;
  const nav = buildNav(t, user?.orgFeatures);
  if (hasAnnouncements) nav.rest.unshift({ to: '/student/announcements', label: t.nav.announcements, icon: Megaphone });
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const stats = useHeaderStats();
  const streak = useDailyStreak();
  const inLessons = LESSON_PATHS.some((p) => location.pathname.startsWith(p));
  const name = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || t.header.studentRole;
  // Уведомления и профиль — выпадающие панели от кнопки (как в Mentor-панели),
  // не модалки по центру экрана: закрываются кликом снаружи или Escape.
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    let alive = true;
    api.announcements()
      .then((r) => { if (alive) setAnnouncements(r.announcements || []); })
      .catch(() => { if (alive) setAnnouncements([]); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onPointerDown = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    const onKeyDown = (e) => { if (e.key === 'Escape') { setShowNotifications(false); setShowProfile(false); } };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  /* TG-FRONT: привязка Telegram-бота (напоминания об оплате, объявления центра,
     вход без логин-кода).

     Раньше здесь была одна кнопка без состояния и с `catch {}`. Из-за этого:
       · привязанный ученик жал её снова и получал от бота «уже привязано»;
       · когда на сервере не задан TELEGRAM_BOT_USERNAME (эндпоинт отвечал 500),
         кнопка молча не делала НИЧЕГО — ни ошибки, ни следа в консоли.
     Теперь состояние читается с сервера, ошибка показывается, а отвязка есть
     прямо здесь — иначе потерявший доступ к Telegram не мог привязать новый
     (user_id в telegram_accounts уникален). */
  const [tg, setTg] = useState(null); // null — ещё не загружено
  const [tgBusy, setTgBusy] = useState(false);
  const [tgError, setTgError] = useState('');
  /* Кнопка привязанного Telegram открывает карточку аккаунта, а не отвязывает
     сразу: одно случайное касание — и связь потеряна, а восстановить её можно
     только заново пройдя привязку через бота. Отвязка живёт внутри карточки и
     требует второго, явного подтверждения. */
  const [tgModal, setTgModal] = useState(false);
  const [tgConfirmUnlink, setTgConfirmUnlink] = useState(false);

  const loadTgStatus = async () => {
    try {
      const res = await api.telegramStatus(token);
      setTg(res.data);
    } catch {
      // Статус — украшение: не смогли прочитать, показываем кнопку как есть.
      setTg({ configured: true, linked: false });
    }
  };

  useEffect(() => {
    loadTgStatus();
  }, []);

  const onBindTelegram = async () => {
    setTgBusy(true);
    setTgError('');
    try {
      const res = await api.telegramBindToken(token);
      window.open(res.data.deepLink, '_blank', 'noopener,noreferrer');
      // Бот подтверждает привязку не мгновенно — перечитываем через паузу,
      // чтобы кнопка сама переключилась на «привязан», без перезагрузки страницы.
      setTimeout(loadTgStatus, 4000);
    } catch (e) {
      setTgError(e?.status === 503 ? t.header.tgNotConfigured : t.header.tgBindError);
    } finally {
      setTgBusy(false);
    }
  };

  const closeTgModal = () => {
    setTgModal(false);
    // Сбрасываем шаг подтверждения: иначе повторное открытие карточки сразу
    // показало бы «точно отвязать?», хотя человек её только что открыл.
    setTgConfirmUnlink(false);
    setTgError('');
  };

  const onUnlinkTelegram = async () => {
    setTgBusy(true);
    setTgError('');
    try {
      await api.telegramUnlink(token);
      await loadTgStatus();
      closeTgModal();
    } catch {
      setTgError(t.header.tgUnlinkError);
    } finally {
      setTgBusy(false);
    }
  };

  return (
    <div className="kid min-h-screen">
      {/* ══ Шапка во всю ширину ══ */}
      <header
        className="fixed top-0 inset-x-0 z-50 h-20 flex items-center gap-2.5 sm:gap-3 px-3 sm:px-6"
        style={{ background: DARK_BG, boxShadow: '0 1px 0 rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Полный логотип 448×80 на телефоне не влезает рядом с чипом оплаты
              и кнопками — до md показываем только квадратный знак, слово на
              планшете/десктопе. */}
          <img src="/logo-mark.svg" alt="LevelUp Academy" className="h-9 w-auto md:hidden" />
          <img src="/logo-white.svg" alt="LevelUp Academy" className="h-9 w-auto hidden md:block" />
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="hidden sm:block">
            <StatusHud coins={stats ? stats.coins : null} streak={streak} t={t} />
          </div>
          {/* Мобильный минимум: медальон уровня + монеты */}
          <div
            className="sm:hidden flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <LevelMedallion coins={stats ? stats.coins : null} size={30} />
            <HudStat icon={Star} value={stats ? stats.coins : '··'} fill={C.honey} title={t.header.coins} />
          </div>

          <ThemeToggle t={t} />

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              title={t.header.notifications}
              aria-label={t.header.notifications}
              aria-expanded={showNotifications}
              onClick={() => { setShowNotifications((v) => !v); setShowProfile(false); }}
              className="k-press-sm relative w-10 h-10 rounded-full grid place-items-center shrink-0 transition-colors"
              style={{
                background: showNotifications ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.2)',
                color: showNotifications ? '#fff' : 'rgba(255,255,255,0.75)',
              }}
            >
              <Bell size={18} strokeWidth={2.4} />
              {hasAnnouncements && (
                <span
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                  style={{ background: C.lime, boxShadow: '0 0 0 2px rgba(20,42,15,0.9)' }}
                  aria-hidden="true"
                />
              )}
            </button>

            {showNotifications && (
              <div
                role="dialog"
                className="k-popover animate-scale-in fixed sm:absolute left-3 right-3 top-[4.75rem] sm:left-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-[340px] overflow-hidden z-50"
              >
                <div className="px-4 py-3 text-[14.5px] font-extrabold" style={{ color: C.text, borderBottom: `1px solid ${C.line}` }}>
                  {t.header.notifications}
                </div>
                {!hasAnnouncements ? (
                  <EmptyState
                    icon={BellOff}
                    hue="blue"
                    title={t.header.noNotifsTitle}
                    text={t.header.noNotifsText}
                  />
                ) : (
                  <>
                    <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto">
                      {announcements.slice(0, 4).map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => { setShowNotifications(false); navigate('/student/announcements'); }}
                          className="k-press-sm w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
                          style={{ borderBottom: `1px solid ${C.line}` }}
                        >
                          <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0 mt-0.5" style={{ background: alpha(C.violet, 12), color: C.violet }}>
                            <Megaphone size={15} strokeWidth={2.4} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-extrabold truncate" style={{ color: C.text }}>{a.title}</span>
                            <span className="text-[12px] font-semibold mt-0.5 line-clamp-2" style={{ color: C.muted }}>{a.body}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowNotifications(false); navigate('/student/announcements'); }}
                      className="k-press-sm w-full flex items-center justify-center gap-1.5 py-3 text-[13px] font-extrabold"
                      style={{ color: C.violet }}
                    >
                      {t.header.allAnnouncements} <ChevronRight size={14} strokeWidth={2.6} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              aria-expanded={showProfile}
              onClick={() => { setShowProfile((v) => !v); setShowNotifications(false); }}
              className="k-press-sm flex items-center gap-2 h-10 pl-1 pr-2 sm:pr-3 rounded-full transition-colors"
              style={{ background: showProfile ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.2)' }}
            >
              <Avatar name={name} size={34} />
              <div className="hidden sm:block leading-none pr-1 text-left">
                <div className="text-[13px] font-extrabold truncate max-w-[120px] text-white">{name}</div>
                <div className="text-[10px] font-bold mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{t.header.student}</div>
              </div>
              <ChevronDown size={14} strokeWidth={2.6} className={`hidden sm:block shrink-0 transition-transform ${showProfile ? 'rotate-180' : ''}`} style={{ color: 'rgba(255,255,255,0.55)' }} />
            </button>

            {showProfile && (
              <div
                role="menu"
                className="k-popover animate-scale-in fixed sm:absolute left-3 right-3 top-[4.75rem] sm:left-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-64 overflow-hidden z-50"
              >
                <div className="flex items-center gap-3 p-4" style={{ borderBottom: `1px solid ${C.line}` }}>
                  <Avatar name={name} size={44} />
                  <div className="min-w-0">
                    <div className="text-[14.5px] font-extrabold truncate" style={{ color: C.text }}>{name}</div>
                    <div className="text-[12px] font-semibold mt-0.5" style={{ color: C.muted }}>{t.header.studentRole}</div>
                  </div>
                </div>
                <div className="p-1.5">
                  {/* Telegram живёт здесь, а не в подвале сайдбара: это настройка
                      аккаунта, и место ей рядом с выходом, а не под меню разделов.
                      Скрыт целиком, когда сервер отвечает configured: false —
                      предлагать действие, которое заведомо вернёт ошибку, хуже,
                      чем не предлагать вовсе. Плюс (Karis, 13.08.2026) — Main
                      Admin мог не включить Telegram-интеграцию партнёру вообще. */}
                  {tg?.configured !== false && user?.orgFeatures?.telegramIntegration && (
                    <>
                      <button
                        role="menuitem"
                        onClick={() => {
                          setShowProfile(false);
                          if (tg?.linked) setTgModal(true);
                          else onBindTelegram();
                        }}
                        disabled={tgBusy}
                        className="k-press-sm w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-bold disabled:opacity-40"
                        style={{ color: tg?.linked ? C.text : C.info }}
                      >
                        <Send size={16} strokeWidth={2.6} className="shrink-0" />
                        <span className="truncate">
                          {tg?.linked
                            ? tg.username
                              ? `@${tg.username}`
                              : t.header.tgLinked
                            : t.header.tgBind}
                        </span>
                        {tg?.linked && (
                          <span
                            className="ml-auto text-[10px] font-extrabold px-1.5 py-0.5 rounded shrink-0"
                            style={{ background: C.successSoft, color: C.success }}
                          >
                            {t.header.tgLinkedBadge}
                          </span>
                        )}
                      </button>

                      {tgError && (
                        <div
                          className="px-3 pb-1.5 text-[11px] font-semibold leading-snug"
                          style={{ color: C.danger }}
                        >
                          {tgError}
                        </div>
                      )}

                      <div className="my-1.5 mx-3" style={{ borderTop: `1px solid ${C.line}` }} />
                    </>
                  )}

                  {/* Язык — как select: текущий язык и раскрывающийся выбор.
                      Переключатель внутри профиля, чтобы не занимать шапку. */}
                  <div className="px-3 pt-1">
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] mb-1" style={{ color: C.muted }}>
                      {t.langSwitch.label}
                    </div>
                    <div className="flex gap-1.5">
                      {LANGS.map((l) => {
                        const on = l.code === lang;
                        return (
                          <button
                            key={l.code}
                            role="menuitemradio"
                            aria-checked={on}
                            onClick={() => setLanguage(l.code)}
                            className="k-press-sm flex-1 px-3 py-2 rounded-lg text-[13px] font-extrabold transition-colors"
                            style={on
                              ? { background: C.limeSoft, color: C.limeDk, border: `1px solid ${C.limeLine}` }
                              : { background: 'transparent', color: C.muted, border: `1px solid transparent` }}
                          >
                            {l.short} · {l.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="my-1.5 mx-3" style={{ borderTop: `1px solid ${C.line}` }} />

                  <button
                    role="menuitem"
                    onClick={logout}
                    className="k-press-sm w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-bold"
                    style={{ color: C.danger }}
                  >
                    <LogOut size={16} strokeWidth={2.6} /> {t.header.logout}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ══ Сайдбар под шапкой — тот же фон, что у страницы (без разделительной
           линии, без другого оттенка — раньше был чуть темнее контента,
           это читалось как шов). Пустое место под меню занято настоящим
           виджетом прогресса, а не просто увеличенными отступами. ══ */}
      <aside
        className="hidden lg:flex fixed top-20 bottom-0 left-0 z-40 flex-col"
        style={{ width: SIDEBAR_W, borderRight: `1px solid ${C.line}` }}
      >
        <nav className="shrink-0 px-2.5 py-5 space-y-1">
          {nav.main.map(({ to, label, icon, end }) => (
            <NavItem key={to} to={to} label={label} icon={icon} end={end} />
          ))}
          {/* «Мои уроки» — активно на всём дереве уроков (/lessons, /tests…) */}
          <NavItem
            to={nav.lessons.to}
            label={nav.lessons.label}
            icon={BookOpen}
            active={inLessons}
            hue={C.violet}
          />
          {nav.rest.map(({ to, label, icon }) => (
            <NavItem key={to} to={to} label={label} icon={icon} />
          ))}
        </nav>

        <div className="flex-1" />

        {/* Виджет прогресса у низа сайдбара (настоящие данные: те же coins,
            что и в шапке). */}
        <div className="px-2.5 pb-3">
          <div className="rounded-2xl p-4" style={{ background: C.forestSoft, border: `1px solid ${C.line}` }}>
            <div className="flex items-baseline justify-between mb-2.5">
              <span className="k-eyebrow" style={{ color: C.forest }}>{t.header.progress}</span>
              {stats?.coins != null && (
                <span className="text-[11px] font-bold flex items-center gap-1" style={{ color: C.honeyDk }}>
                  <Star size={10} strokeWidth={2.6} fill={C.honey} color={C.honey} />
                  {levelFromCoins(stats.coins).toNext}
                </span>
              )}
            </div>
            <LevelBar {...levelFromCoins(stats?.coins)} hue="lime" />
          </div>
        </div>

        {/* Подвала здесь больше нет. Telegram и выход переехали в меню аккаунта
            в шапке: и то и другое — про аккаунт, а сайдбар отвечает за разделы
            кабинета. Дублировать выход в двух местах значило бы держать красную
            кнопку прямо под навигацией, куда целятся мышью чаще всего. */}
      </aside>

      {/* ══ Карточка привязанного Telegram ══
          Показывает, КАКОЙ именно аккаунт привязан: увидев чужой @username,
          ученик поймёт, что бот ушёл на телефон брата, — по одному tg_chat_id
          это было невозможно. Отвязка тут же, но в два шага. */}
      {tgModal && tg?.linked && (
        <Modal title="Telegram" onClose={closeTgModal}>
          <div className="rounded-xl p-4 mb-4" style={{ background: C.bg }}>
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl grid place-items-center shrink-0"
                style={{ background: C.infoSoft, color: C.info }}
              >
                <Send size={19} strokeWidth={2.6} />
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-extrabold truncate" style={{ color: C.text }}>
                  {tg.username ? `@${tg.username}` : tg.firstName || t.header.tgLinked}
                </div>
                {tg.firstName && tg.username && (
                  <div className="text-[12px] font-semibold truncate" style={{ color: C.muted }}>
                    {tg.firstName}
                  </div>
                )}
              </div>
            </div>
            {tg.linkedAt && (
              <div className="text-[12px] font-semibold mt-3" style={{ color: C.muted }}>
                {t.header.tgLinkedAt}{' '}
                {new Date(tg.linkedAt).toLocaleDateString(lang === 'uz' ? 'uz-UZ' : lang === 'en' ? 'en-US' : 'ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </div>
            )}
          </div>

          <div className="text-[13px] leading-relaxed mb-4" style={{ color: C.muted }}>
            {t.header.tgCommands}
          </div>

          {tgError && (
            <div className="text-[12px] font-semibold mb-3" style={{ color: C.danger }}>
              {tgError}
            </div>
          )}

          {/* Второй шаг: до него кнопка «Uzish» ничего не отвязывает. */}
          {tgConfirmUnlink ? (
            <div className="rounded-xl p-4" style={{ background: C.dangerSoft }}>
              <div className="text-[13px] font-bold mb-1" style={{ color: C.danger }}>
                {t.header.tgConfirmTitle}
              </div>
              <div className="text-[12px] leading-snug mb-3" style={{ color: C.danger }}>
                {t.header.tgConfirmText}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onUnlinkTelegram}
                  disabled={tgBusy}
                  className="k-press-sm flex-1 py-2.5 rounded-xl text-[13px] font-extrabold disabled:opacity-40"
                  style={{ background: C.danger, color: '#fff' }}
                >
                  {tgBusy ? t.header.tgBusy : t.header.tgYes}
                </button>
                <button
                  onClick={() => setTgConfirmUnlink(false)}
                  disabled={tgBusy}
                  className="k-press-sm flex-1 py-2.5 rounded-xl text-[13px] font-extrabold disabled:opacity-40"
                  style={{ background: C.card, color: C.text, border: `1px solid ${C.line}` }}
                >
                  {t.header.tgCancel}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setTgConfirmUnlink(true)}
              className="k-press-sm w-full py-2.5 rounded-xl text-[13px] font-extrabold"
              style={{ background: C.dangerSoft, color: C.danger }}
            >
              {t.header.tgUnlink}
            </button>
          )}
        </Modal>
      )}

      {/* ══ Контент ══ */}
      <main className="pt-20 lg:pl-[248px] min-h-screen">
        <motion.div
          key={location.pathname}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-[1040px] mx-auto p-4 sm:p-5 lg:p-8 pb-28 lg:pb-10"
        >
          <Outlet />
        </motion.div>
      </main>

      {/* ══ Нижняя навигация (мобильные) — 4 слота, без раскрытия ══ */}
      <nav
        /* iPhone home-indicator: панель РАСТЁТ на safe-area (calc), а не сжимает
           контент внутри фиксированной высоты — иначе иконки+подписи (≈50px)
           не помещались бы в ужатой до ~34px зоне и торчали над панелью. */
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch px-2"
        style={{
          height: 'calc(68px + env(safe-area-inset-bottom))',
          background: C.card,
          borderTop: `1px solid ${C.line}`,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <NavLink to="/student" end className="flex-1 grid place-items-center">
          {({ isActive }) => (
            <span className="k-press-sm flex flex-col items-center gap-1">
              <span
                className="w-11 h-8 rounded-xl grid place-items-center"
                style={isActive ? { background: C.action, color: '#fff' } : { background: 'transparent', color: C.muted }}
              >
                <Home size={19} strokeWidth={2.6} />
              </span>
              <span className="text-[10px] font-extrabold" style={{ color: isActive ? C.text : C.muted }}>{t.nav.mobileHome}</span>
            </span>
          )}
        </NavLink>

        <NavLink to={nav.lessons.to} className="flex-1 grid place-items-center">
          {({ isActive }) => (
            <span className="k-press-sm flex flex-col items-center gap-1">
              <span
                className="w-11 h-8 rounded-xl grid place-items-center"
                style={isActive || inLessons ? { background: C.learn, color: '#fff' } : { background: 'transparent', color: C.muted }}
              >
                <BookOpen size={19} strokeWidth={2.6} />
              </span>
              <span className="text-[10px] font-extrabold" style={{ color: isActive || inLessons ? C.text : C.muted }}>{t.nav.mobileLessons}</span>
            </span>
          )}
        </NavLink>

        {nav.rest.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className="flex-1 grid place-items-center">
            {({ isActive }) => (
              <span className="k-press-sm flex flex-col items-center gap-1">
                <span
                  className="w-11 h-8 rounded-xl grid place-items-center"
                  style={isActive ? { background: C.action, color: '#fff' } : { background: 'transparent', color: C.muted }}
                >
                  <Icon size={19} strokeWidth={2.6} />
                </span>
                <span className="text-[10px] font-extrabold" style={{ color: isActive ? C.text : C.muted }}>{label}</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
