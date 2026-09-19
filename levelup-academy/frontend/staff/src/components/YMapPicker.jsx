import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Search, X, Maximize2, Minimize2 } from 'lucide-react';

const YANDEX_KEY = import.meta.env.VITE_YANDEX_KEY;
const TASHKENT = [69.2401, 41.2995];

let scriptLoaded = false;
let scriptLoading = false;
const listeners = [];

function loadYMapsScript(key) {
  return new Promise((resolve, reject) => {
    if (window.ymaps3 && window.ymaps3.ready) {
      resolve();
      return;
    }
    if (scriptLoaded) {
      resolve();
      return;
    }
    listeners.push({ resolve, reject });
    if (scriptLoading) return;
    scriptLoading = true;

    const script = document.createElement('script');
    /* Без `theme`: JS API 3.0 такого параметра не знает и отвечает
       400 Bad Request — `Error validating query: "theme" is not allowed`.
       То есть скрипт карт не загружался вообще, независимо от ключа.
       Проверено запросом к api-maps.yandex.ru: с `theme` — 400, без него
       ключ доходит до проверки прав. */
    script.src = `https://api-maps.yandex.ru/3.0/?lang=ru_RU&apikey=${key}`;
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      listeners.forEach((l) => l.resolve());
      listeners.length = 0;
    };
    script.onerror = (e) => {
      scriptLoading = false;
      listeners.forEach((l) => l.reject(e));
      listeners.length = 0;
    };
    document.head.appendChild(script);
  });
}

function markerElement() {
  const el = document.createElement('div');
  el.innerHTML = '<div style="font-size:28px;margin-top:-28px;margin-left:-14px">📍</div>';
  return el;
}

/**
 * Координаты подсказки из её же `uri`.
 *
 * `ymaps3.suggest` отдаёт адрес и ссылку вида `ymapsbm1://geo?data=…`, но не
 * координаты. Штатный способ превратить одно в другое — `ymaps3.search({uri})`,
 * то есть Геокодер. К ключу проекта подключён только продукт «JavaScript API»,
 * и запрос к геокодеру отвечает 503 — проверено вживую, в кабинете у ключа
 * действительно один продукт.
 *
 * При этом сам `data` — это base64 (padding записан запятой), внутри которого
 * лежат долгота и широта двумя float32: `0x22 0x0a 0x0d <lng> 0x15 <lat>`.
 * Разбор сверен с ответом самого Яндекса: для семи подсказок расстояние от
 * центра, посчитанное по разобранным координатам, совпало с полем `distance`
 * из того же ответа с точностью 0.4–9 метров на дистанциях 0.3–5 км.
 *
 * Формат недокументированный и однажды может поменяться — поэтому это запасной
 * путь: сначала пробуем геокодер (он заработает сам, как только продукт будет
 * подключён), и только потом разбираем `uri`.
 */
export function coordsFromSuggestUri(uri) {
  const m = /data=([^&\s]+)/.exec(uri || '');
  if (!m) return null;

  let s = m[1].replace(/-/g, '+').replace(/_/g, '/').replace(/,/g, '=').replace(/=+$/, '');
  s += '='.repeat((4 - (s.length % 4)) % 4);

  let bin;
  try { bin = atob(s); } catch (_) { return null; }

  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  const view = new DataView(bytes.buffer);

  for (let i = 0; i + 12 <= bytes.length; i += 1) {
    if (bytes[i] === 0x22 && bytes[i + 1] === 0x0a && bytes[i + 2] === 0x0d && bytes[i + 7] === 0x15) {
      const lng = view.getFloat32(i + 3, true);
      const lat = view.getFloat32(i + 8, true);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
    }
  }
  return null;
}

/* Геокодер спрашиваем один раз за загрузку страницы: если продукт не подключён,
   каждый следующий выбор подсказки ждал бы ответа 503 впустую. */
let geocoderWorks = true;

/** Адрес организации спрятан в её подписи: «Торговый центр · улица Ахмада Дониша, 2Б». */
function addressPart(item) {
  return (item.subtitle?.text || '').split('·').pop().trim();
}

/**
 * Точка и адрес выбранной подсказки.
 *
 * У адресов координаты лежат в самой ссылке. У организаций ссылка другая —
 * `ymapsbm1://org?oid=…`, координат в ней нет вообще. Поэтому для организации
 * спрашиваем подсказки ещё раз, уже по её улице и дому из подписи, и берём
 * координаты найденного адреса. Сверено с ответом Яндекса: для «Mega Planet»,
 * «Хумо Арена», «IT Park» и «Dono Academy» расстояние до полученной точки
 * совпало с полем `distance` самой организации в пределах 11–23 метров, то
 * есть это её здание, а не соседний квартал.
 */
async function resolveSuggestion(item, center) {
  const addr = addressPart(item);
  const isOrg = item.type === 'business';
  const address = isOrg
    ? [item.title?.text, addr].filter(Boolean).join(', ')
    : (item.value?.trim() || [item.title?.text, item.subtitle?.text].filter(Boolean).join(', '));

  if (geocoderWorks && item.uri && window.ymaps3?.search) {
    try {
      const found = await window.ymaps3.search({ uri: item.uri });
      const c = found?.[0]?.geometry?.coordinates;
      if (c) return { point: { lat: c[1], lng: c[0] }, address };
    } catch (_) {
      geocoderWorks = false;
    }
  }

  const direct = coordsFromSuggestUri(item.uri);
  if (direct) return { point: direct, address };

  if (addr.length > 3 && window.ymaps3?.suggest) {
    try {
      const alt = await window.ymaps3.suggest({ text: addr, center });
      for (const a of alt) {
        const c = coordsFromSuggestUri(a.uri);
        if (c) return { point: c, address };
      }
    } catch (_) { /* ниже вернём null — форма попросит отметить точку рукой */ }
  }

  return null;
}

/**
 * Карта Яндекса с одной точкой: выбор точки или её показ.
 *
 * `readOnly` — только показать. Тогда карта не слушает клики (случайно
 * сдвинуть филиал на странице просмотра нельзя) и не перехватывает колесо
 * мыши, иначе прокрутка страницы застревала бы на карте.
 *
 * `onUnavailable` — сообщить наверх, что карта не поднялась. Нужно, чтобы
 * форма филиала не превращалась в тупик: точку мы требуем при создании, но
 * если сам сервис недоступен (нет ключа, не применились ограничения, Яндекс
 * отвечает 503), поставить её физически нечем — и требование надо снимать,
 * иначе филиал не создать вообще.
 *
 * `onPickAddress` — адрес выбранной подсказки, чтобы форма могла подставить
 * его в своё поле.
 */
export default function YMapPicker({
  value,
  onChange,
  height = 260,
  onUnavailable,
  readOnly = false,
  onPickAddress,
}) {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const wrapRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [mapLive, setMapLive] = useState(false);
  const [error, setError] = useState(null);
  const [isFs, setIsFs] = useState(false);

  // поиск
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState('');
  const reqRef = useRef(0);
  /* После выбора в поле остаётся название выбранного — и это снова текст,
     на который подсказки открывались бы заново, поверх только что найденной
     точки. Один раз пропускаем. */
  const skipSearchRef = useRef(false);

  /* Обработчик и текущее значение — через ref: карта создаётся один раз и
     замыкает в себе то, что было на момент создания. Без этого клик по карте
     звал бы первый onChange, а метка не двигалась бы вслед за координатами,
     набранными руками в полях. */
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const fromMapRef = useRef(false);
  const prevRef = useRef(null);

  useEffect(() => { onChangeRef.current = onChange; });
  valueRef.current = value;

  if (!YANDEX_KEY) {
    onUnavailable?.(true);
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center gap-3 bg-base-200 rounded-xl border border-base-300"
      >
        <MapPin size={32} className="text-base-content/30" />
        <p className="text-sm text-base-content/50">
          {t('components.mapPicker.addEnvKeyPrefix')} <code className="bg-base-300 px-1 rounded">VITE_YANDEX_KEY</code> {t('components.mapPicker.addEnvKeySuffix')}
        </p>
      </div>
    );
  }

  useEffect(() => {
    let cancelled = false;

    loadYMapsScript(YANDEX_KEY)
      .then(() => {
        if (!cancelled) { setReady(true); onUnavailable?.(false); }
      })
      .catch(() => {
        /* Самая частая причина — не сам код, а ключ: у JS API 3.0 обязательны
           ограничения по HTTP referer, и пока они не заданы, Яндекс отвечает
           429 «limited», а с чужого домена — 403 «Invalid api key».
           Пишем это прямо, иначе поиск причины начинается с кода. */
        if (!cancelled) {
          onUnavailable?.(true);
          setError(t('components.mapPicker.loadErrorMessage'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // создание карты
  useEffect(() => {
    if (!ready || !containerRef.current) return undefined;

    const ymaps3 = window.ymaps3;
    let destroyed = false;

    ymaps3.ready.then(() => {
      if (destroyed || !containerRef.current) return;

      const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapListener } = ymaps3;
      const v = valueRef.current;

      const map = new YMap(containerRef.current, {
        location: {
          center: v?.lat != null && v?.lng != null ? [v.lng, v.lat] : TASHKENT,
          zoom: v?.lat != null && v?.lng != null ? 16 : 11,
        },
        // на странице просмотра карта не должна воровать прокрутку страницы
        ...(readOnly ? { behaviors: ['drag', 'pinchZoom', 'dblClick'] } : {}),
      });

      map.addChild(new YMapDefaultSchemeLayer({}));
      map.addChild(new YMapDefaultFeaturesLayer({}));

      if (!readOnly) {
        map.addChild(new YMapListener({
          layer: 'any',
          onClick(_, event) {
            const [lng, lat] = event.coordinates;
            // метку ставит эффект синхронизации — по значению сверху, а не тут,
            // иначе на карте была бы одна точка, а в полях другая
            fromMapRef.current = true;
            setOpen(false);
            onChangeRef.current?.({ lat, lng });
          },
        }));
      }

      mapRef.current = map;
      setMapLive(true);
    });

    return () => {
      destroyed = true;
      markerRef.current = null;
      setMapLive(false);
      if (mapRef.current) {
        try {
          mapRef.current.destroy();
        } catch (_) {}
        mapRef.current = null;
      }
    };
  }, [ready, readOnly]);

  // метка следует за значением: и за кликом, и за координатами из полей
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLive) return;

    const lat = value?.lat;
    const lng = value?.lng;
    const has = lat != null && lng != null;

    if (markerRef.current) {
      try { map.removeChild(markerRef.current); } catch (_) {}
      markerRef.current = null;
    }

    if (has) {
      const marker = new window.ymaps3.YMapMarker({ coordinates: [lng, lat] }, markerElement());
      map.addChild(marker);
      markerRef.current = marker;

      /* Подвинуть карту к точке — только если точка приехала не с самой карты
         и прыжок заметный: иначе карта дёргалась бы под курсором на каждый
         клик и на каждую цифру, набранную в поле координат. */
      const prev = prevRef.current;
      const jumped = !prev || Math.abs(prev.lat - lat) > 0.02 || Math.abs(prev.lng - lng) > 0.02;
      if (!fromMapRef.current && jumped) {
        try { map.setLocation({ center: [lng, lat], zoom: 16, duration: 300 }); } catch (_) {}
      }
    }

    prevRef.current = has ? { lat, lng } : null;
    fromMapRef.current = false;
  }, [value?.lat, value?.lng, mapLive]);

  // полноэкранный режим
  useEffect(() => {
    const onFsChange = () => setIsFs(document.fullscreenElement === wrapRef.current);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFs = () => {
    setOpen(false); // иначе после разворота список подсказок всплывал сам собой
    if (document.fullscreenElement) document.exitFullscreen?.();
    else wrapRef.current?.requestFullscreen?.();
  };

  // подсказки адресов
  useEffect(() => {
    if (readOnly || !ready) return undefined;
    if (skipSearchRef.current) { skipSearchRef.current = false; return undefined; }
    const text = q.trim();
    if (text.length < 2) { setItems([]); setSearching(false); return undefined; }

    const id = ++reqRef.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const v = valueRef.current;
        const res = await window.ymaps3.suggest({
          text,
          center: v?.lng != null ? [v.lng, v.lat] : TASHKENT,
        });
        if (id !== reqRef.current) return;
        setItems(res.slice(0, 7));
        setActive(0);
        setOpen(true);
        setSearchErr('');
      } catch (_) {
        if (id !== reqRef.current) return;
        setItems([]);
        setSearchErr(t('components.mapPicker.searchUnavailable'));
      } finally {
        if (id === reqRef.current) setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [q, ready, readOnly]);

  const pick = useCallback(async (item) => {
    setOpen(false);
    skipSearchRef.current = true;
    setQ(item.title?.text ?? '');
    setSearching(true);
    const v = valueRef.current;
    const found = await resolveSuggestion(item, v?.lng != null ? [v.lng, v.lat] : TASHKENT);
    setSearching(false);
    if (!found) {
      setSearchErr(t('components.mapPicker.coordsResolveFailed'));
      return;
    }
    setSearchErr('');
    fromMapRef.current = false; // карта должна подъехать к найденному
    onChangeRef.current?.(found.point);
    onPickAddress?.(found.address);
  }, [onPickAddress]);

  const onSearchKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[active]) pick(items[active]);
    } else if (e.key === 'Escape' && open) {
      // закрываем список, а не всё окно
      e.stopPropagation();
      setOpen(false);
    }
  };

  if (error) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center bg-base-200 rounded-xl border border-error/30 p-4"
      >
        <p className="text-sm text-error text-center">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="relative rounded-xl overflow-hidden border border-base-300 bg-base-200"
      style={{ height: isFs ? '100%' : height }}
    >
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-base-200 z-10">
          <span className="loading loading-spinner loading-md text-base-content/40" />
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />

      {!readOnly && (
        <div className="absolute top-3 left-3 right-14 z-20 max-w-md">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 pointer-events-none" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setSearchErr(''); }}
              onKeyDown={onSearchKey}
              onFocus={() => items.length && setOpen(true)}
              placeholder={t('components.mapPicker.searchPlaceholder')}
              /* Поле стоит внутри <form> и выглядит для браузера как адрес —
                 Chrome подставлял в него адрес из своего профиля, стоило
                 открыть окно. Автозаполнению тут делать нечего: это поиск по
                 карте, а не поле формы. */
              type="search"
              name="ymap-search"
              autoComplete="off"
              spellCheck={false}
              data-lpignore="true"
              /* прячем встроенный крестик Chrome — свой уже есть, и два
                 крестика подряд выглядят как ошибка вёрстки */
              className="w-full h-9 pl-9 pr-9 text-sm rounded-lg bg-base-100 border border-base-300 shadow-sm outline-none focus:border-primary [&::-webkit-search-cancel-button]:appearance-none"
            />
            {searching && (
              <span className="loading loading-spinner loading-xs absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40" />
            )}
            {!searching && q && (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/35 hover:text-base-content"
                onClick={() => { setQ(''); setItems([]); setOpen(false); setSearchErr(''); }}
                aria-label={t('components.mapPicker.clear')}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {open && items.length > 0 && (
            /* Список прокручивается внутри себя: у карты `overflow: hidden`
               ради скруглённых углов, и длинный список просто обрезался бы
               по её нижнему краю. */
            <ul className="mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {items.map((it, i) => (
                <li key={it.uri ?? i}>
                  <button
                    type="button"
                    /* Именно click, а не mousedown: на mousedown список
                       закрывался, и следующий за ним click улетал уже в карту —
                       она ставила точку туда, где просто оказался курсор. */
                    onClick={() => pick(it)}
                    onMouseEnter={() => setActive(i)}
                    className={`w-full text-left px-3 py-2 ${i === active ? 'bg-base-200' : ''}`}
                  >
                    <div className="text-sm truncate">{it.title?.text}</div>
                    {it.subtitle?.text && (
                      <div className="text-xs text-base-content/50 truncate">{it.subtitle.text}</div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {searchErr && (
            <div className="mt-1 text-xs bg-base-100 border border-base-300 rounded-lg px-3 py-1.5 text-error shadow-sm">
              {searchErr}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={toggleFs}
        title={isFs ? t('components.mapPicker.exitFullscreen') : t('components.mapPicker.fullscreen')}
        aria-label={isFs ? t('components.mapPicker.exitFullscreen') : t('components.mapPicker.fullscreen')}
        className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center rounded-lg bg-base-100 border border-base-300 shadow-sm text-base-content/60 hover:text-base-content"
      >
        {isFs ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </button>
    </div>
  );
}
