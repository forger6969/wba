import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api, setOnTokenRefreshed } from './api.js';

const AuthCtx = createContext(null);

// Access-токен живёт 1 час (ACCESS_TTL в auth.service.js). Реактивный refresh
// в api.js спасает только если за час хоть один запрос уйдёт; если вкладка
// открыта часами без единого действия (ученик/родитель просто держит вкладку
// открытой), первый же клик потом мог получить 401 и словить re-login.
// Здесь — проактивный refresh заранее.
const PROACTIVE_REFRESH_MS = 45 * 60 * 1000; // 45 мин — с запасом до часового TTL

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // При старте пробуем восстановить сессию по refresh-cookie
  useEffect(() => {
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
    const tryRefresh = () => {
      if (!tokenRef.current) return;
      api
        .refresh()
        .then((d) => {
          setToken(d.accessToken);
          setUser(d.user);
        })
        .catch(() => {
          setToken(null);
          setUser(null);
        });
    };

    const id = setInterval(tryRefresh, PROACTIVE_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tryRefresh();
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
