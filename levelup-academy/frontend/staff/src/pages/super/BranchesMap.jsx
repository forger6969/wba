import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, X, ArrowRight, GraduationCap, Wallet } from 'lucide-react';
import { loadYMapsScript, YANDEX_KEY, TASHKENT } from '../../components/YMapPicker.jsx';
import { fmt, money } from '../../format.js';
import { Card } from './_ui.jsx';

/**
 * Карта всех филиалов разом — читать, а не выбирать точку. YMapPicker несёт
 * одну метку и поиск адреса; здесь наоборот, метки все сразу, а клик по любой
 * открывает мини-карточку со статистикой, не уводя со страницы списка.
 *
 * `loadYMapsScript`/ключ переиспользуются из YMapPicker.jsx — второй
 * <script>-тег на странице не нужен, синглтон загрузки там уже есть.
 */
function pinElement(color) {
  const el = document.createElement('div');
  el.style.cursor = 'pointer';
  el.innerHTML = `<div style="font-size:26px;margin-top:-26px;margin-left:-13px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.25))">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="${color}"><path d="M12 0C7.6 0 4 3.6 4 8c0 5.4 7 15.5 7.3 15.9.2.3.6.5 1 .5.4 0 .8-.2 1-.5C13.6 23.5 20 13.4 20 8c0-4.4-3.6-8-8-8zm0 11.5A3.5 3.5 0 1 1 12 4.5a3.5 3.5 0 0 1 0 7z"/></svg>
  </div>`;
  return el;
}

export default function BranchesMap({ branches }) {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const wrapRef = useRef(null);
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(null);

  const withPoint = branches.filter((b) => b.lat != null && b.lng != null);

  useEffect(() => {
    if (!YANDEX_KEY) { setError(true); return undefined; }
    let cancelled = false;
    loadYMapsScript(YANDEX_KEY)
      .then(() => { if (!cancelled) setReady(true); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || withPoint.length === 0) return undefined;
    const ymaps3 = window.ymaps3;
    let destroyed = false;

    ymaps3.ready.then(() => {
      if (destroyed || !containerRef.current) return;
      const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } = ymaps3;

      // центр — среднее по всем точкам; при одном филиале сразу приближено к нему
      const avgLng = withPoint.reduce((s, b) => s + Number(b.lng), 0) / withPoint.length;
      const avgLat = withPoint.reduce((s, b) => s + Number(b.lat), 0) / withPoint.length;

      const map = new YMap(containerRef.current, {
        location: { center: withPoint.length ? [avgLng, avgLat] : TASHKENT, zoom: withPoint.length === 1 ? 15 : 11 },
        // scrollZoom — здесь, в отличие от YMapPicker(readOnly), не воруем
        // прокрутку страницы вслепую: карта верхним блоком, не посреди формы,
        // а без колеса зумом было управлять нечем — pinchZoom не ловит мышь.
        behaviors: ['drag', 'pinchZoom', 'dblClick', 'scrollZoom'],
      });
      map.addChild(new YMapDefaultSchemeLayer({}));
      map.addChild(new YMapDefaultFeaturesLayer({}));

      withPoint.forEach((b) => {
        const color = b.isArchived ? '#9CA3AF' : (b.debt > 0 ? '#dc2626' : '#dc2626');
        const el = pinElement(color);
        el.addEventListener('click', () => setSelected(b));
        map.addChild(new YMapMarker({ coordinates: [Number(b.lng), Number(b.lat)] }, el));
      });

      mapRef.current = map;
    });

    return () => {
      destroyed = true;
      if (mapRef.current) {
        try { mapRef.current.destroy(); } catch (_) {}
        mapRef.current = null;
      }
    };
    // withPoint меняется только когда меняется сам список филиалов — id-состав
    // достаточно ловить по длине и первому/последнему id, пересоздавать карту
    // на каждый ре-рендер страницы незачем
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, withPoint.length]);

  if (!YANDEX_KEY || error) return null; // тот же принцип, что у YMapPicker: нет карты — не мешаем работать без неё
  if (withPoint.length === 0) return null;

  return (
    <Card className="relative overflow-hidden animate-page-enter">
      <div ref={wrapRef} className="relative" style={{ height: 'min(48vh, 400px)' }}>
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-base-200 z-10">
            <span className="loading loading-spinner loading-md text-base-content/40" />
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />

        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-lg bg-base-100/90 backdrop-blur border border-base-300 px-2.5 py-1.5 text-xs font-medium text-base-content/60 shadow-sm">
          <MapPin size={13} className="text-primary" />
          {withPoint.length} {withPoint.length === 1 ? t('super.branchesMap.branchOnMapSingular') : t('super.branchesMap.branchOnMapPlural')}
        </div>

        {selected && (
          // top, не bottom: снизу у Яндекс-карты обязательная плашка атрибуции
          // (копирайт + «Открыть Яндекс Карты»), попап поверх нее не кладём
          <div className="absolute top-14 left-3 right-3 sm:right-auto sm:w-80 z-20 animate-modal-in">
            <div className="rounded-xl border border-base-300 bg-base-100 shadow-lg p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">{selected.name}</div>
                  <div className="text-xs text-base-content/50 truncate">{selected.address || t('super.branchesMap.addressNotSpecified')}</div>
                </div>
                <button
                  className="w-6 h-6 rounded-md grid place-items-center text-base-content/40 hover:bg-base-200 hover:text-base-content shrink-0"
                  onClick={() => setSelected(null)}
                  aria-label={t('super.branchesMap.close')}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1.5">
                  <GraduationCap size={14} className="text-base-content/40" />
                  <span className="font-semibold tabular-nums">{fmt(selected.students)}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Wallet size={14} className="text-base-content/40" />
                  <span className={`font-semibold tabular-nums ${selected.debt > 0 ? 'text-error' : ''}`}>{money(selected.debt)}</span>
                  <span className="text-base-content/40 text-xs">{t('super.branchesMap.debt')}</span>
                </span>
              </div>
              <Link
                to={`/branches/${selected.id}`}
                className="mt-3 flex items-center justify-center gap-1.5 btn btn-primary btn-xs w-full"
              >
                {t('super.branchesMap.openBranch')} <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
