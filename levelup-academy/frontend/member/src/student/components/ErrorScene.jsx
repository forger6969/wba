import { Component, Suspense, lazy } from 'react';
import WolfDesk from './WolfDesk.jsx';

/* Три с половиной сотни килобайт three.js не должны лежать в бандле кабинета
   ради экрана, который открывают раз в месяц — грузим отдельным чанком.
   Пока чанк едет (или если он не доехал — оффлайн, старый телефон без WebGL),
   показываем векторную сцену: экран ошибки обязан показываться всегда. */
const WolfRoom3D = lazy(() => import('./WolfRoom3D.jsx'));

class Scene3D extends Component {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  render() {
    const { variant } = this.props;
    if (this.state.crashed) return <WolfDesk variant={variant} />;
    return (
      <Suspense fallback={<WolfDesk variant={variant} />}>
        <WolfRoom3D variant={variant} />
      </Suspense>
    );
  }
}

/**
 * Сцена для экранов «сломалось»: 404 и ошибка загрузки.
 *
 * Тёмная плашка с живым фоном — дрейфующие пятна света, скользящие лучи и
 * мерцающие точки, а в центре комната волка (`WolfDesk`). Всё нарисовано
 * CSS-анимациями (`.err-*`, `.wd-*` в index.css), без картинок и видео:
 * экран должен собраться и тогда, когда сеть уже отвалилась, а вес
 * страницы от него не растёт.
 *
 * Компонент ничего не знает про переходы: кнопку/ссылку передаёт вызывающий
 * (`action`) — на 404 это ссылка на главную, в `ErrorState` — повтор запроса.
 */

/* Точки-звёзды заданы списком, а не Math.random: при каждом ререндере они
   иначе бы прыгали по сцене. Середина оставлена пустой — на узком экране
   контент занимает её целиком, и точки лезли бы прямо в текст. */
const STARS = [
  { x: 8, y: 16, r: 3, d: 0 },
  { x: 15, y: 54, r: 2, d: 1.4 },
  { x: 22, y: 28, r: 2, d: 2.6 },
  { x: 11, y: 82, r: 3, d: 0.7 },
  { x: 26, y: 71, r: 2, d: 3.1 },
  { x: 19, y: 8, r: 2, d: 1.9 },
  { x: 78, y: 12, r: 2, d: 2.2 },
  { x: 85, y: 46, r: 3, d: 0.4 },
  { x: 91, y: 78, r: 2, d: 2.9 },
  { x: 74, y: 62, r: 3, d: 1.1 },
  { x: 96, y: 26, r: 2, d: 3.4 },
  { x: 82, y: 90, r: 2, d: 1.7 },
];

export default function ErrorScene({ variant = 'error', title, text, action, compact = false }) {
  return (
    <div className={`err-scene${compact ? ' err-scene--compact' : ''}`}>
      <span className="err-orb err-orb--1" aria-hidden="true" />
      <span className="err-orb err-orb--2" aria-hidden="true" />
      <span className="err-orb err-orb--3" aria-hidden="true" />

      <div className="err-beams" aria-hidden="true">
        <span className="err-beam err-beam--1" />
        <span className="err-beam err-beam--2" />
        <span className="err-beam err-beam--3" />
      </div>

      <div className="err-stars" aria-hidden="true">
        {STARS.map((s) => (
          <span
            key={`${s.x}-${s.y}`}
            className="err-star"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r, height: s.r, animationDelay: `${s.d}s` }}
          />
        ))}
      </div>

      <div className="err-body">
        <div className="err-figure animate-scale-in">
          <Scene3D variant={variant === '404' ? '404' : 'error'} />
        </div>
        <h2 className="err-title animate-slide-up stagger-2">{title}</h2>
        {text && <p className="err-text animate-slide-up stagger-3">{text}</p>}
        {action && <div className="mt-6 animate-slide-up stagger-4">{action}</div>}
      </div>
    </div>
  );
}
