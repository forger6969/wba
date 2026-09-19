/**
 * Звук нового сообщения.
 *
 * Синтезируется через Web Audio, а не грузится файлом: mp3 пришлось бы класть
 * в assets, тянуть лишний запрос и держать в репозитории бинарник ради 200 мс
 * звука. Две ноты вверх (G5 → C6) — короткий вежливый сигнал, а не «системная
 * ошибка».
 *
 * Автовоспроизведение в браузере запрещено до первого действия пользователя:
 * созданный заранее AudioContext стартует в состоянии `suspended`, и первый же
 * звук был бы проглочен молча. Поэтому контекст создаётся лениво, а `unlock()`
 * вызывается из обработчика реального клика.
 */

const STORAGE_KEY = 'notify_sound_enabled';

let ctx = null;

/** Включён ли звук. По умолчанию да — иначе фича незаметна. */
export function isSoundEnabled() {
  return localStorage.getItem(STORAGE_KEY) !== 'off';
}

export function setSoundEnabled(on) {
  localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
}

function getContext() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;          // очень старый браузер — молча без звука
  ctx = new Ctor();
  return ctx;
}

/**
 * Разблокировать аудио. Дёргать из обработчика клика/нажатия клавиши —
 * браузер разрешает возобновить контекст только внутри жеста пользователя.
 */
export function unlockSound() {
  const audio = getContext();
  if (audio && audio.state === 'suspended') audio.resume().catch(() => {});
}

/** Проиграть сигнал. Тихо ничего не делает, если звук выключен или запрещён. */
export function playNotificationSound() {
  if (!isSoundEnabled()) return;

  const audio = getContext();
  // `suspended` = пользователь ещё не взаимодействовал со страницей. Пытаться
  // играть бессмысленно, а resume() вне жеста браузер отклонит.
  if (!audio || audio.state === 'suspended') return;

  const now = audio.currentTime;
  const gain = audio.createGain();
  gain.connect(audio.destination);

  // Общая огибающая: мгновенная атака, мягкий спад. Без неё синус даёт щелчок
  // на старте и обрыве.
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

  [
    { freq: 784, at: 0,    dur: 0.16 },   // G5
    { freq: 1047, at: 0.11, dur: 0.30 },  // C6
  ].forEach(({ freq, at, dur }) => {
    const osc = audio.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + at);
    osc.connect(gain);
    osc.start(now + at);
    osc.stop(now + at + dur);
  });

  // Узлы одноразовые: не отключить gain — и они копятся на каждом сообщении.
  window.setTimeout(() => gain.disconnect(), 600);
}
