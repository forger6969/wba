import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api, setOnTokenRefreshed } from './api.js';

const AuthCtx = createContext(null);

// Access-токен живёт 1 час (ACCESS_TTL в auth.service.js). Реактивный refresh
// в api.js спасает только если за час хоть один запрос уйдёт; если вкладка
// открыта часами без единого действия, первый же клик потом мог получить
// 401 и словить re-login. Здесь — проактивный refresh заранее.
const PROACTIVE_REFRESH_MS = 45 * 60 * 1000; // 45 мин — с запасом до часового TTL

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // пока пытаемся восстановить сессию
  const tokenRef = useRef(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // при загрузке пробуем восстановить сессию через refresh-cookie
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
  // (ноутбук спал/вкладка была свёрнута — setInterval в фоне мог не тикать).
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

  const login = async (email, password) => {
    const d = await api.loginMain(email, password);
    setToken(d.accessToken);
    setUser(d.user);
  };

  // вход через Google (Firebase popup → Google id-token → наш JWT)
  const loginWithGoogle = async () => {
    const { signInWithGoogle } = await import('./firebase.js');
    const idToken = await signInWithGoogle();
    const d = await api.googleLogin(idToken);
    setToken(d.accessToken);
    setUser(d.user);
  };

  const logout = async () => {
    await api.logout().catch(() => {});
    setToken(null);
    setUser(null);
  };

  // Профиль правится на странице настроек (PATCH /api/main/profile). Без этого
  // шапка и инициалы продолжали бы показывать старое имя до перелогина —
  // сохранение выглядело бы не сработавшим.
  const patchUser = (fields) => setUser((u) => (u ? { ...u, ...fields } : u));

  return (
    <AuthCtx.Provider value={{ token, user, loading, login, loginWithGoogle, logout, patchUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
