import { useEffect, useState } from 'react';
import { useAuth } from '../auth.jsx';
import { useChild } from '../child-context.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icons.jsx';
import { fmt } from '../format.js';
import { api } from '../api.js';
import { useI18n, fmt as fmtStr } from '../i18n/index.jsx';

/**
 * FE-PARENT-PROFILE-PREF: этих настроек нет ни в одной таблице на бэке, и
 * реального push-уведомления (service worker/VAPID) в проекте тоже нет — это
 * чисто клиентские переключатели ("звук чата в этом браузере"), поэтому
 * персистим в localStorage, а не изобретаем бэкенд под несуществующую фичу.
 */
function usePreference(key, defaultValue) {
  const [value, setValue] = useState(() => {
    const raw = localStorage.getItem(key);
    return raw === null ? defaultValue : raw === 'true';
  });
  const toggle = () => {
    setValue((v) => {
      localStorage.setItem(key, String(!v));
      return !v;
    });
  };
  return [value, toggle];
}

export default function Profile() {
  const { t } = useI18n();
  const { user, token, logout } = useAuth();
  const { selectedChild } = useChild();
  const [notifyPush, toggleNotifyPush] = usePreference('pref_notify_push', true);
  const [chatSound, toggleChatSound] = usePreference('pref_chat_sound', false);

  const [tg, setTg] = useState({ status: 'loading', data: null, deepLink: null, error: null });
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  const loadTelegramStatus = async () => {
    try {
      const res = await api.telegramStatus(token);
      setTg((current) => ({ ...current, status: 'idle', data: res.data, error: null }));
    } catch (err) {
      setTg((current) => ({ ...current, status: 'error', error: err.message || t.prof.tgError }));
    }
  };

  useEffect(() => {
    if (user?.orgFeatures?.telegramIntegration) loadTelegramStatus();
  }, [token, user?.orgFeatures?.telegramIntegration]);

  const onBindTelegram = async () => {
    setTg((current) => ({ ...current, status: 'loading', deepLink: null, error: null }));
    try {
      const res = await api.telegramBindToken(token);
      setTg((current) => ({ ...current, status: 'ready', deepLink: res.data.deepLink, error: null }));
      window.open(res.data.deepLink, '_blank', 'noopener,noreferrer');
      setTimeout(loadTelegramStatus, 4000);
    } catch (err) {
      setTg((current) => ({ ...current, status: 'error', deepLink: null, error: err.message || t.prof.tgLinkError }));
    }
  };

  const onUnlinkTelegram = async () => {
    setTg((current) => ({ ...current, status: 'loading', error: null }));
    try {
      await api.telegramUnlink(token);
      setConfirmUnlink(false);
      await loadTelegramStatus();
    } catch (err) {
      setTg((current) => ({ ...current, status: 'error', error: err.message || t.prof.tgUnlinkError }));
    }
  };

  return (
    <>
      <PageHeader title={t.prof.title} subtitle={t.prof.subtitle} />

      <div className="card bg-base-100 mb-6 border-l-4 border-l-primary">
        <div className="card-body py-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar name={`${user?.firstName} ${user?.lastName}`} size={64} />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success rounded-full border-2 border-sidebar flex items-center justify-center">
                <Icon name="check" className="w-3 h-3 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user?.firstName} {user?.lastName}</h2>
              <p className="text-sm text-base-content/55 flex items-center gap-1.5 mt-0.5">
                <Icon name="user-circle" className="w-4 h-4" />
                {t.prof.role}
              </p>
              <p className="text-xs text-base-content/40 mt-1 font-mono">{fmtStr(t.prof.code, { code: user?.loginCode ?? '' })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Child Info */}
      {selectedChild && (
        <div className="card bg-base-100 mb-6">
          <div className="card-body">
            <h3 className="card-title text-sm gap-2">
              <Icon name="user" className="w-4 h-4 text-primary" />
              {t.prof.child}
            </h3>
            <div className="flex items-center gap-3 p-3.5 rounded border border-base-300 bg-base-200/30 mt-2">
              <div className="relative">
                <Avatar name={`${selectedChild.firstName} ${selectedChild.lastName}`} size={42} />
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full border-2 border-base-100 flex items-center justify-center">
                  <Icon name="check" className="w-2.5 h-2.5 text-primary-content" strokeWidth={3} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{selectedChild.firstName} {selectedChild.lastName}</p>
                <p className="text-xs opacity-40 flex items-center gap-1.5 mt-0.5">
                  <span className="flex items-center gap-0.5">
                    <Icon name="star" className="w-3 h-3" />
                    {fmtStr(t.prof.coins, { coins: fmt(selectedChild.coins) })}
                  </span>
                  <span className="opacity-30">·</span>
                  {Number(selectedChild.totalDebt) > 0 ? (
                    <span className="text-error flex items-center gap-0.5">
                      <Icon name="wallet" className="w-3 h-3" />
                      {t.prof.debt}
                    </span>
                  ) : (
                    <span className="text-success flex items-center gap-0.5">
                      <Icon name="check-circle" className="w-3 h-3" />
                      {t.prof.noDebt}
                    </span>
                  )}
                </p>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-primary text-primary-content font-bold flex items-center gap-1">
                {t.prof.active}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="card bg-base-100 mb-6">
        <div className="card-body">
          <h3 className="card-title text-sm gap-2">
            <Icon name="cog" className="w-4 h-4 text-primary" />
            {t.prof.settings}
          </h3>
          <div className="space-y-3 mt-2">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-base-200/40 hover:bg-base-200/60 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon name="bell" className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t.prof.notifications}</p>
                  <p className="text-xs opacity-40">{t.prof.notificationsSub}</p>
                </div>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={notifyPush}
                onChange={toggleNotifyPush}
              />
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-base-200/40 hover:bg-base-200/60 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon name="chat" className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t.prof.chatSound}</p>
                  <p className="text-xs opacity-40">{t.prof.chatSoundSub}</p>
                </div>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={chatSound}
                onChange={toggleChatSound}
              />
            </div>
          </div>
        </div>
      </div>

      {/* TG-FRONT: привязка Telegram-бота — карточки нет вообще, если Main Admin
          не включил Telegram-интеграцию партнёру (Karis, 13.08.2026) */}
      {user?.orgFeatures?.telegramIntegration && (
      <div className="card bg-base-100 mb-6">
        <div className="card-body">
          <h3 className="card-title text-sm gap-2">
            <Icon name="chat" className="w-4 h-4 text-primary" />
            {t.prof.telegram}
          </h3>
          <p className="text-xs opacity-40 mt-1 mb-2">
            {t.prof.telegramDesc}
          </p>
          {tg.status === 'loading' && !tg.data && (
            <span className="loading loading-spinner loading-sm" />
          )}
          {tg.data?.linked ? (
            <div className="rounded-xl bg-base-200/50 p-4 mt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                  <Icon name="chat" className="w-5 h-5 text-info" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">
                    {tg.data.username ? `@${tg.data.username}` : tg.data.firstName || t.header.tgLinked}
                  </p>
                  <p className="text-xs text-success font-semibold">{t.prof.linked}</p>
                </div>
              </div>
              {confirmUnlink ? (
                <div className="mt-4 rounded-xl bg-error/10 p-3">
                  <p className="text-xs text-error mb-3">{t.prof.unlinkWarning}</p>
                  <div className="flex gap-2">
                    <button className="btn btn-error btn-sm flex-1 rounded-xl" onClick={onUnlinkTelegram} disabled={tg.status === 'loading'}>{t.prof.confirmUnlink}</button>
                    <button className="btn btn-ghost btn-sm flex-1 rounded-xl" onClick={() => setConfirmUnlink(false)}>{t.prof.cancel}</button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-outline btn-error btn-sm rounded-xl mt-4" onClick={() => setConfirmUnlink(true)}>{t.prof.unbind}</button>
              )}
            </div>
          ) : tg.status !== 'loading' && tg.status !== 'ready' && (
            <button
              className="btn btn-primary btn-sm rounded-xl gap-2 w-fit"
              onClick={onBindTelegram}
              disabled={tg.status === 'loading'}
            >
              {tg.status === 'loading' ? <span className="loading loading-spinner loading-xs" /> : <Icon name="chat" className="w-4 h-4" />}
              {t.prof.bind}
            </button>
          )}
          {tg.status === 'error' && (
            <p className="text-xs text-error mt-2">{tg.error}</p>
          )}
          {tg.status === 'ready' && !tg.data?.linked && (
            <a
              href={tg.deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm rounded-xl gap-2 w-fit"
            >
              <Icon name="chevron-right" className="w-4 h-4" />
              {t.prof.openTg}
            </a>
          )}
        </div>
      </div>
      )}

      {/* Logout */}
      <div className="card bg-base-100">
        <div className="card-body">
          <button className="btn btn-outline btn-error w-full rounded-xl gap-2" onClick={logout}>
            <Icon name="logout" className="w-4 h-4" />
            {t.prof.logout}
          </button>
        </div>
      </div>
    </>
  );
}
