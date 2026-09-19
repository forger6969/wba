/**
 * Сцена экранов «сломалось»: комната волка — стол, на столе ноутбук.
 * Волк лапой сбрасывает ноутбук со стола, тот падает за кадр, и на столе
 * оказывается новый. Двигается в основном лапа: остальное живёт мелочью
 * (уши, хвост, моргание, свет экрана) — так сцена не выглядит дёрганой.
 *
 * Всё одним inline-SVG: экран ошибки обязан отрисоваться и без сети, а
 * вектор ещё и не мылится на любом экране. Движение — CSS (`.wd-*` в
 * index.css), один цикл 4.2s у всех частей, иначе удар «расходится».
 *
 * `variant`: '404' — на экране ноутбука 404, волк доволен;
 *            'error' — 500, из упавшего ноутбука идёт дымок.
 */
const FUR_DARK = '#4E5A66';
const LIME = '#dc2626';

export default function WolfDesk({ variant = '404' }) {
  const is404 = variant === '404';
  const uid = is404 ? 'wd4' : 'wd5';

  return (
    <div className="wd-scene" aria-hidden="true">
      <svg viewBox="0 0 560 340" width="100%" height="100%">
        <defs>
          <linearGradient id={`${uid}-wall`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1b2a14" />
            <stop offset="100%" stopColor="#111c0c" />
          </linearGradient>
          <linearGradient id={`${uid}-floor`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#20180f" />
            <stop offset="100%" stopColor="#140f08" />
          </linearGradient>
          <linearGradient id={`${uid}-wood`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a4a33" />
            <stop offset="100%" stopColor="#3a2f20" />
          </linearGradient>
          <linearGradient id={`${uid}-fur`} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#C0CAD6" />
            <stop offset="55%" stopColor="#93A0AD" />
            <stop offset="100%" stopColor="#6E7B88" />
          </linearGradient>
          <linearGradient id={`${uid}-fur-light`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EDF1F6" />
            <stop offset="100%" stopColor="#C5CED8" />
          </linearGradient>
          <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a444f" />
            <stop offset="100%" stopColor="#242c34" />
          </linearGradient>
          <radialGradient id={`${uid}-lamp`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffd98a" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffd98a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-screenlight`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={LIME} stopOpacity="0.22" />
            <stop offset="100%" stopColor={LIME} stopOpacity="0" />
          </linearGradient>
          <filter id={`${uid}-soft`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* ── комната ─────────────────────────────────────────────── */}
        <rect x="0" y="0" width="560" height="252" fill={`url(#${uid}-wall)`} />
        {[40, 150, 260, 370, 480].map((x) => (
          <rect key={x} x={x} y="0" width="34" height="252" fill="#ffffff" opacity="0.015" />
        ))}
        <rect x="0" y="244" width="560" height="12" fill="#0c1508" />
        <rect x="0" y="256" width="560" height="84" fill={`url(#${uid}-floor)`} />
        {[268, 288, 310, 334].map((y) => (
          <rect key={y} x="0" y={y} width="560" height="1.5" fill="#000" opacity="0.25" />
        ))}

        {/* полка с книгами */}
        <rect x="52" y="86" width="118" height="7" rx="3" fill="#2c2417" />
        {[
          { x: 60, h: 34, c: '#3f5a34' },
          { x: 72, h: 40, c: '#5c4a2c' },
          { x: 84, h: 30, c: '#35505e' },
          { x: 95, h: 38, c: '#4a3550' },
          { x: 107, h: 33, c: '#5a5230' },
        ].map((b) => (
          <rect key={b.x} x={b.x} y={86 - b.h} width={9} height={b.h} rx="1.5" fill={b.c} opacity="0.85" />
        ))}
        {/* рамка-постер академии */}
        <rect x="410" y="52" width="86" height="62" rx="4" fill="#16210f" stroke="#2f3d24" strokeWidth="3" />
        <circle cx="453" cy="83" r="17" fill="none" stroke={LIME} strokeWidth="4" opacity="0.55" />
        <path d="M446 83 l5 6 l10 -13" stroke={LIME} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.55" />

        {/* лампа */}
        <ellipse cx="300" cy="30" rx="90" ry="60" fill={`url(#${uid}-lamp)`} />
        <path d="M286 0 v14 h28 V0 z" fill="#2a3320" />
        <path d="M278 14 h44 l10 18 h-64 z" fill="#38442b" />

        {/* ── стол ───────────────────────────────────────────────── */}
        <ellipse cx="350" cy="300" rx="150" ry="14" fill="#000" opacity="0.4" filter={`url(#${uid}-soft)`} />
        <rect x="200" y="186" width="300" height="15" rx="4" fill={`url(#${uid}-wood)`} />
        <rect x="200" y="197" width="300" height="5" rx="2" fill="#000" opacity="0.28" />
        <rect x="222" y="201" width="15" height="96" rx="4" fill="#3c3122" />
        <rect x="463" y="201" width="15" height="96" rx="4" fill="#3c3122" />
        <rect x="230" y="240" width="240" height="8" rx="3" fill="#33291c" />

        {/* ── ноутбук ─────────────────────────────────────────────── */}
        <g className="wd-laptop">
          {/* свет экрана на столе */}
          <ellipse cx="310" cy="188" rx="70" ry="10" fill={LIME} opacity="0.14" filter={`url(#${uid}-soft)`} />
          {/* крышка */}
          <g transform="rotate(-6 310 150)">
            <rect x="256" y="106" width="112" height="76" rx="6" fill={`url(#${uid}-metal)`} />
            <rect x="262" y="112" width="100" height="60" rx="3" fill="#0b1507" />
            <rect className="wd-screen" x="262" y="112" width="100" height="60" rx="3" fill={LIME} opacity="0.1" />
            <text
              x="312"
              y="152"
              textAnchor="middle"
              fontSize="30"
              fontWeight="800"
              fontFamily="Manrope, system-ui, sans-serif"
              fill={LIME}
              opacity="0.9"
            >
              {is404 ? '404' : '500'}
            </text>
          </g>
          {/* база */}
          <path d="M250 182 h124 l12 12 h-148 z" fill={`url(#${uid}-metal)`} />
          <path d="M258 184 h108 l7 7 h-122 z" fill="#171d24" />
          {[186, 190].map((y) =>
            [266, 280, 294, 308, 322, 336, 350].map((x) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="9" height="2.6" rx="1" fill="#39424c" />
            )),
          )}
        </g>

        {/* дым из упавшего ноутбука — только на ошибке сервера */}
        {!is404 && (
          <g className="wd-smoke" fill="#8b96a2">
            <circle className="wd-smoke--1" cx="452" cy="286" r="9" />
            <circle className="wd-smoke--2" cx="466" cy="272" r="7" />
            <circle className="wd-smoke--3" cx="444" cy="264" r="5.5" />
          </g>
        )}

        {/* ── волк ───────────────────────────────────────────────── */}
        <g className="wd-wolf">
          {/* хвост */}
          <path
            className="wd-tail"
            d="M96 214 C 52 206, 34 244, 56 268"
            stroke={`url(#${uid}-fur)`}
            strokeWidth="26"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M58 258 C 46 264, 44 274, 52 280" stroke="#DDE4EB" strokeWidth="16" strokeLinecap="round" fill="none" />

          {/* ноги */}
          <path d="M112 244 C 106 268, 104 282, 106 294" stroke="#7C8894" strokeWidth="30" strokeLinecap="round" fill="none" />
          <path d="M150 246 C 148 270, 148 284, 150 296" stroke={`url(#${uid}-fur)`} strokeWidth="30" strokeLinecap="round" fill="none" />
          <ellipse cx="104" cy="300" rx="22" ry="9" fill="#6D7A87" />
          <ellipse cx="152" cy="302" rx="22" ry="9" fill="#8593A0" />

          {/* торс */}
          <path
            d="M96 152 C 86 200, 92 236, 104 254 L 160 256 C 174 236, 178 196, 168 152 Z"
            fill={`url(#${uid}-fur)`}
          />
          {/* светлая грудь с прядями */}
          <path
            d="M120 158 C 112 196, 116 226, 126 244 C 140 240, 150 226, 152 200 C 154 178, 150 164, 146 156 Z"
            fill={`url(#${uid}-fur-light)`}
          />
          <path d="M124 172 l7 9 l7 -9 l7 9" stroke="#B8C2CC" strokeWidth="2.5" fill="none" opacity="0.7" />

          {/* дальняя лапа вдоль тела */}
          <path d="M100 168 C 88 196, 88 216, 94 232" stroke="#75828F" strokeWidth="21" strokeLinecap="round" fill="none" />

          {/* ошейник */}
          <path d="M104 152 C 122 164, 146 164, 164 150" stroke={LIME} strokeWidth="11" strokeLinecap="round" fill="none" />
          <circle cx="134" cy="163" r="7.5" fill={LIME} />
          <circle cx="134" cy="163" r="3" fill="#16210f" opacity="0.5" />

          {/* голова */}
          <g className="wd-head">
            {/* уши */}
            <g className="wd-ear wd-ear--l">
              <path d="M104 100 L 100 58 L 132 88 Z" fill={`url(#${uid}-fur)`} />
              <path d="M108 96 L 106 70 L 124 88 Z" fill="#6a7682" />
            </g>
            <g className="wd-ear wd-ear--r">
              <path d="M156 92 L 166 54 L 184 88 Z" fill={`url(#${uid}-fur)`} />
              <path d="M160 88 L 166 66 L 178 88 Z" fill="#6a7682" />
            </g>

            {/* череп */}
            <ellipse cx="140" cy="114" rx="42" ry="36" fill={`url(#${uid}-fur)`} />
            {/* щёки прядями */}
            <path d="M100 118 l-9 12 l13 -1 l-6 12 l14 -6" fill="#8996A3" />
            <path d="M180 116 l10 11 l-13 0 l7 11 l-14 -5" fill="#8996A3" />
            {/* морда */}
            <ellipse cx="176" cy="132" rx="30" ry="19" fill={`url(#${uid}-fur-light)`} transform="rotate(7 176 132)" />
            <ellipse cx="150" cy="128" rx="26" ry="18" fill={`url(#${uid}-fur-light)`} opacity="0.85" />
            <ellipse cx="202" cy="128" rx="9" ry="7" fill="#2C333C" />
            <path d="M198 136 q 4 7 -3 10" stroke="#2C333C" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M182 142 q 12 8 22 0" stroke="#2C333C" strokeWidth="3" fill="none" strokeLinecap="round" />

            {/* глаза */}
            <g className="wd-blink">
              <ellipse cx="152" cy="106" rx="9" ry="10" fill="#F2F6FA" />
              <ellipse cx="178" cy="110" rx="8" ry="9" fill="#F2F6FA" />
              <ellipse cx="154" cy="107" rx="5.5" ry="6.5" fill={LIME} />
              <ellipse cx="180" cy="111" rx="5" ry="6" fill={LIME} />
              <ellipse cx="155" cy="107" rx="2.4" ry="3.4" fill="#15200c" />
              <ellipse cx="181" cy="111" rx="2.2" ry="3.2" fill="#15200c" />
              <circle cx="151" cy="103" r="1.8" fill="#fff" />
              <circle cx="177" cy="107" r="1.6" fill="#fff" />
            </g>
            {/* брови — прищур «ну сколько можно» */}
            <path d="M140 92 q 12 -6 24 -1" stroke={FUR_DARK} strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M170 96 q 10 -5 20 1" stroke={FUR_DARK} strokeWidth="3.6" strokeLinecap="round" fill="none" />
          </g>

          {/* ближняя лапа — та самая, что смахивает ноутбук */}
          <g className="wd-arm">
            <path
              d="M164 166 C 200 160, 232 156, 254 154"
              stroke={`url(#${uid}-fur)`}
              strokeWidth="24"
              strokeLinecap="round"
              fill="none"
            />
            <ellipse cx="258" cy="154" rx="16" ry="13" fill="#A7B2BE" transform="rotate(-8 258 154)" />
            {[248, 256, 264].map((x, i) => (
              <path
                key={x}
                d={`M${x} ${146 + i * 0.5} l4 -6`}
                stroke="#E7ECF2"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
            ))}
          </g>
        </g>

        {/* свет экрана падает на волка — гаснет вместе с ноутбуком */}
        <path className="wd-screenlight" d="M262 120 L 150 150 L 158 210 L 268 180 Z" fill={`url(#${uid}-screenlight)`} />

        {/* пыль от удара */}
        <g className="wd-dust" fill="#DCE9CC">
          <circle className="wd-dust--1" cx="286" cy="196" r="4.5" />
          <circle className="wd-dust--2" cx="300" cy="188" r="3" />
          <circle className="wd-dust--3" cx="276" cy="186" r="2.6" />
        </g>
      </svg>
    </div>
  );
}
