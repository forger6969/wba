import { useEffect, useState } from 'react';

const KEY = 'k_streak_v1';

/**
 * Стрик визитов подряд — считается ЛОКАЛЬНО, в localStorage этого браузера.
 * НЕ синхронизировано с бэкендом и НЕ переживает смену устройства/очистку
 * данных сайта — это сознательный компромисс: честная фича без миграций
 * и новых таблиц. Компоненты, которые это показывают (StreakFlame),
 * обязаны подписывать "на этом устройстве", чтобы не выдавать локальный
 * счётчик за настоящее достижение аккаунта.
 */
export function useDailyStreak() {
  const [days, setDays] = useState(0);

  useEffect(() => {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch {
      stored = null;
    }

    if (stored?.lastDate === todayKey) {
      setDays(stored.days || 1);
      return;
    }

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    const nextDays = stored?.lastDate === yesterdayKey ? (stored.days || 0) + 1 : 1;
    localStorage.setItem(KEY, JSON.stringify({ lastDate: todayKey, days: nextDays }));
    setDays(nextDays);
  }, []);

  return days;
}
