import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api, setOnTokenRefreshed } from './api.js';

const AuthCtx = createContext({ token: null, user: null, loading: true, login: null, loginWithGoogle: null, logout: null });

// Access-токен живёт 1 час (ACCESS_TTL в auth.service.js). Реактивный refresh
// в api.js спасает только если за час хоть один запрос уйдёт; ментор,
// открывший вкладку утром и ничего не трогавший часами, ни одного запроса
// не делает — первый же клик потом получал бы 401 и (при гонке из нескольких
// вкладок/событий) мог словить re-login. Здесь — проактивный refresh
// заранее, до истечения токена, пока вкладка просто открыта.
const PROACTIVE_REFRESH_MS = 45 * 60 * 1000; // 45 мин — с запасом до часового TTL

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

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
    /* Неудачный refresh НЕ разлогинивает (WBA, 24.09.2026).
       Раньше .catch() здесь сбрасывал токен, а обработчик висел на
       visibilitychange — то есть любое возвращение на вкладку выбрасывало
       из системы, если запрос не удался. А не удавался он постоянно: cookie
       стояла sameSite=lax при API на другом домене (починено в
       auth.controller.js), плюс бесплатный Render засыпает и первый запрос
       идёт ~50 секунд. Просроченный access-токен и без того отлавливается
       реактивно — на 401 от реального запроса (setOnTokenRefreshed выше).
       Сеть моргнула — это не повод терять сессию. */
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

    /* Возврат на вкладку сам по себе не повод бить по серверу: человек
       переключается между вкладками десятки раз в час. Обновляем, только если
       с прошлого раза прошло ощутимо много времени. */
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

  const login = async (email, password) => {
    const d = await api.loginStaff(email, password);
    setToken(d.accessToken);
    setUser(d.user);
  };

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

  /* Профиль правится на своей странице, а имя и аватар живут ещё и в шапке.
     Без этого после сохранения в шапке оставалось прежнее имя — до
     перелогина пользователь видел два разных себя одновременно. */
  const patchUser = (patch) => setUser((prev) => (prev ? { ...prev, ...patch } : prev));

  return (
    <AuthCtx.Provider value={{ token, user, loading, login, loginWithGoogle, logout, patchUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx) ?? { token: null, user: null, loading: false, login: null, loginWithGoogle: null, logout: null };
