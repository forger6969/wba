import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api, setOnTokenRefreshed } from './api.js';

const AuthCtx = createContext(null);

// Access-токен живёт 1 час (ACCESS_TTL в auth.service.js). Реактивный refresh
// в api.js спасает только если за час хоть один запрос уйдёт; если вкладка
// открыта часами без единого действия (ученик/родитель просто держит вкладку
// открытой), первый же клик потом мог получить 401 и словить re-login.
// Здесь — проактивный refresh заранее.
const PROACTIVE_REFRESH_MS = 45 * 60 * 1000; // 45 мин — с запасом до часового TTL

/**
 * Bitta saytda kirish formasi ildizda (`/login`) turadi va o'quvchi/ota-ona
 * muvaffaqiyatli kirgach shu yerga o'tadi. Sessiyani cookie orqali kutib
 * bo'lmaydi: API boshqa domenda, refresh-cookie esa SameSite=Lax — brauzer uni
 * boshqa saytga yubormaydi. Shuning uchun token bir martalik sessionStorage
 * orqali qo'lma-qo'l beriladi va o'qilishi bilan o'chiriladi.
 */
const HANDOFF_KEY = 'wba.kabinet.session';

function takeHandoff() {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(HANDOFF_KEY);
    const d = JSON.parse(raw);
    return d && d.accessToken && d.user ? d : null;
  } catch {
    return null; // shaxsiy rejim / saqlash yopiq — oddiy yo'l bilan davom etamiz
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // При старте: сначала сессия, переданная формой входа в корне сайта,
  // иначе — восстановление по refresh-cookie
  useEffect(() => {
    const handed = takeHandoff();
    if (handed) {
      setToken(handed.accessToken);
      setUser(handed.user);
      setLoading(false);
      return;
    }
    api
      .refresh()
      .then((d) => {
        setToken(d.accessToken);
        setUser(d.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Авто-refresh на 401 (из api.js) обновляет сессию здесь же, без ре-логина
  useEffect(() => {
    setOnTokenRefreshed((d) => {
      if (d) {
        setToken(d.accessToken);
        setUser(d.user);
      } else {
        setToken(null);
        setUser(null);
      }
    });
  }, []);

  // Проактивный refresh: таймер каждые 45 мин + сразу при возврате на вкладку
  // (телефон/ноутбук спал — setInterval в фоне мог не тикать).
  useEffect(() => {
    /* Неудачный refresh НЕ разлогинивает (WBA, 24.09.2026).
       Здесь это било сильнее, чем в панели сотрудников: ученик на телефоне
       сворачивает браузер по десять раз, и каждый возврат прогонял refresh, а
       любая осечка выбрасывала из кабинета. Осечка же была штатной — cookie
       стояла sameSite=lax при API на другом домене (починено в
       auth.controller.js), плюс бесплатный Render просыпается ~50 секунд.
       Мёртвую сессию и так поймает 401 на реальном запросе. */
    const tryRefresh = () => {
      if (!tokenRef.current) return;
      api
        .refresh()
        .then((d) => {
          setToken(d.accessToken);
          setUser(d.user);
        })
        .catch(() => {
          /* намеренно тихо: сессию оставляем как есть */
        });
    };

    const VISIBILITY_THROTTLE_MS = 5 * 60 * 1000;
    let lastRefreshAt = Date.now();

    const id = setInterval(() => {
      lastRefreshAt = Date.now();
      tryRefresh();
    }, PROACTIVE_REFRESH_MS);

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastRefreshAt < VISIBILITY_THROTTLE_MS) return;
      lastRefreshAt = Date.now();
      tryRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // login = ЛОГИН-КОД (не email), Google-входа у member нет
  const login = async (loginCode, password) => {
    const d = await api.loginMember(loginCode, password);
    setToken(d.accessToken);
    setUser(d.user);
  };

  /**
   * Вход через Telegram: сессия уже выдана бэкендом (он проверил, что чат
   * привязан к аккаунту), здесь её остаётся только принять. Отдельно от
   * login(), потому что пароль в этом пути не участвует вовсе.
   */
  const adoptSession = ({ accessToken, user: u }) => {
    setToken(accessToken);
    setUser(u);
  };

  const logout = async () => {
    await api.logout().catch(() => {});
    setToken(null);
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ token, user, loading, login, logout, adoptSession }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
