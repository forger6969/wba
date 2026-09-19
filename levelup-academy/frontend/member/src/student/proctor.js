import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useProctor — «честный» режим прокторинга теста на стороне браузера.
 *
 * Что браузер РЕАЛЬНО может (и это здесь есть):
 *   · запросить полноэкранный режим и заметить выход из него;
 *   · заметить потерю фокуса вкладки / сворачивание (blur, visibilitychange);
 *   · заблокировать контекстное меню, копирование и выделение текста;
 *   · предупредить при попытке закрыть/перезагрузить вкладку.
 *
 * Чего браузер НЕ может (и мы это честно не обещаем):
 *   · запретить Alt+Tab / переключение окон — только заметить;
 *   · заблокировать скриншот ОС;
 *   · силой удержать в полноэкранном режиме (Esc всегда выходит).
 *
 * Каждое «покидание» теста = одно нарушение (события группируются в окне
 * 1.2 с: выход из fullscreen сам по себе даёт и blur, и visibilitychange).
 * На maxViolations-м нарушении зовём onLimit(violations) — родитель делает
 * авто-сдачу. Журнал violations уходит на бэкенд с ответом (submitTest).
 *
 * На мобильных Element.requestFullscreen часто нет — тогда fullscreen-ветка
 * отключается (needFullscreen всегда false), а слежение за фокусом остаётся.
 */

const canFullscreen = () =>
  typeof document !== 'undefined' &&
  !!(
    document.documentElement.requestFullscreen ||
    document.documentElement.webkitRequestFullscreen
  );

const isDocFullscreen = () =>
  !!(document.fullscreenElement || document.webkitFullscreenElement);

async function enterFullscreen() {
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } catch {
    /* пользователь отклонил / жест не тот — overlay останется, попробует снова */
  }
}

export function exitFullscreen() {
  try {
    if (document.exitFullscreen && isDocFullscreen()) document.exitFullscreen();
    else if (document.webkitExitFullscreen && isDocFullscreen()) document.webkitExitFullscreen();
  } catch {
    /* уже вышли */
  }
}

export function useProctor({ active, maxViolations = 3, onWarn, onLimit }) {
  const fsSupported = canFullscreen();
  const [needFullscreen, setNeedFullscreen] = useState(false);
  const [count, setCount] = useState(0);
  const violationsRef = useRef([]);
  const lastHitRef = useRef(0);
  const graceUntilRef = useRef(0);
  const limitFiredRef = useRef(false);
  // держим свежие колбэки без переподписки слушателей
  const onWarnRef = useRef(onWarn);
  const onLimitRef = useRef(onLimit);
  onWarnRef.current = onWarn;
  onLimitRef.current = onLimit;

  const registerViolation = useCallback(
    (type) => {
      const now = Date.now();
      // первые ~1 с после старта: вход в fullscreen сам даёт blur/refocus —
      // это не нарушение
      if (now < graceUntilRef.current) return;
      if (now - lastHitRef.current < 1200) return; // одно «покидание» = одно нарушение
      lastHitRef.current = now;

      violationsRef.current.push({ type, at: new Date().toISOString() });

      // Счёт берём из журнала, а не из состояния: колбэки onWarn/onLimit —
      // побочные эффекты, и внутри updater'а setCount их вызывать нельзя.
      // React в StrictMode прогоняет updater дважды, и авто-сдача с
      // предупреждением уходили бы по два раза (onLimit спасал только ref).
      const next = violationsRef.current.length;
      setCount(next);

      if (next >= maxViolations) {
        if (limitFiredRef.current) return;
        limitFiredRef.current = true;
        onLimitRef.current?.(violationsRef.current.slice());
      } else {
        onWarnRef.current?.(next, maxViolations - next);
      }
    },
    [maxViolations],
  );

  const reenterFullscreen = useCallback(() => {
    if (fsSupported) enterFullscreen();
  }, [fsSupported]);

  useEffect(() => {
    if (!active) return undefined;

    graceUntilRef.current = Date.now() + 1000;
    if (fsSupported) {
      enterFullscreen();
      setNeedFullscreen(!isDocFullscreen());
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') registerViolation('tab-hidden');
    };
    const onBlur = () => {
      // blur из-за перехода в fullscreen не считаем — его отсекает окно 1.2 с,
      // но если fullscreen активен и фокус ушёл — это реальный уход
      if (!fsSupported || isDocFullscreen()) registerViolation('window-blur');
    };
    const onFsChange = () => {
      const inFs = isDocFullscreen();
      setNeedFullscreen(active && fsSupported && !inFs);
      if (!inFs) registerViolation('fullscreen-exit');
    };
    const block = (e) => e.preventDefault();
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('contextmenu', block);
    document.addEventListener('copy', block);
    document.addEventListener('selectstart', block);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('copy', block);
      document.removeEventListener('selectstart', block);
      window.removeEventListener('beforeunload', onBeforeUnload);
      // уходим со страницы теста (навигация «назад», размонтирование) —
      // не оставляем пользователя в полноэкранном режиме
      if (fsSupported && isDocFullscreen()) exitFullscreen();
    };
  }, [active, fsSupported, registerViolation]);

  // тест закончился (active стал false) — выходим из полноэкранного
  useEffect(() => {
    if (!active && fsSupported && isDocFullscreen()) exitFullscreen();
  }, [active, fsSupported]);

  return {
    fsSupported,
    needFullscreen,
    count,
    remaining: Math.max(0, maxViolations - count),
    maxViolations,
    violationsRef,
    reenterFullscreen,
  };
}
