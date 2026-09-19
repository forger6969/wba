import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { useInvalidate } from '../../queries.js';
import YMapPicker from '../../components/YMapPicker.jsx';
import PhoneInput from '../../components/PhoneInput.jsx';

/**
 * Форма филиала — создание и настройки.
 *
 * Живёт отдельным файлом, потому что открывается из двух мест: со списка
 * («Новый филиал») и со страницы самого филиала (шестерёнка «Настройки»).
 * Пока форма была вшита в список, редактировать филиал можно было только
 * оттуда — а список для этого не место: там на карточке ради двух ссылок
 * появлялась целая строка действий, и клик по карточке спорил с кликом по
 * «изменить». Теперь список только показывает и ведёт внутрь, а всё
 * управление филиалом — внутри филиала.
 *
 * Архивация тоже здесь: подтверждение показывается на месте формы, а не
 * вторым окном поверх первого.
 */

/**
 * Координаты храним с шестью знаками после запятой — столько же в базе
 * (NUMERIC(9,6)), это примерно 11 сантиметров на местности.
 *
 * Округлять обязательно: клик по карте отдаёт полную точность вроде
 * 41.366643253779706, и браузер отказывался принимать такое значение в поле
 * с шагом 0.000001 — «введите допустимое значение». То есть после клика по
 * карте форму нельзя было сохранить вообще.
 */
export const round6 = (n) => (n == null || Number.isNaN(Number(n)) ? null : Math.round(Number(n) * 1e6) / 1e6);

const branchSchemaFor = (t) => z.object({
  name:    z.string().trim().min(2, t('super.branchForm.nameMin')).max(80, t('super.branchForm.nameMax')),
  address: z.string().trim().max(160, t('super.branchForm.addressMax')).or(z.literal('')),
  phone:   z.string().trim()
    .refine(
      (val) => val === '' || /^\+998\d{9}$/.test(val),
      t('super.branchForm.phoneFormat'),
    )
    .or(z.literal('')),
});

const EMPTY = { name: '', address: '', phone: '' };

export default function BranchFormModal({ open, mode = 'create', branch = null, onClose, onSaved }) {
  const { t } = useTranslation();
  const branchSchema = useMemo(() => branchSchemaFor(t), [t]);
  const { token } = useAuth();
  const invalidate = useInvalidate();

  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [location, setLocation] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(false);

  /* Карта считается доступной, только если она реально поднялась.
     Одного ключа мало: он может быть не настроен по HTTP referer, а сервис —
     отвечать 503. Тогда точку поставить нечем, и требовать её означало бы
     запретить создание филиалов совсем. */
  const [mapBroken, setMapBroken] = useState(!import.meta.env.VITE_YANDEX_KEY);
  const mapAvailable = !mapBroken;

  const { register, handleSubmit, reset, control, setValue, getValues, formState: { errors } } = useForm({
    resolver: zodResolver(branchSchema),
    defaultValues: EMPTY,
  });

  /* Адрес из найденной подсказки подставляем только в пустое поле: человек мог
     написать своё — «Чиланзар 12, 3 этаж, офис 5», — и терять это, потому что
     он потом двигал точку на карте, нельзя. */
  const fillAddress = (text) => {
    if (text && !getValues('address')?.trim()) {
      setValue('address', text, { shouldValidate: true });
    }
  };

  /* Заполняем форму при открытии, а не на каждое обновление `branch`:
     фоновый рефетч не должен стирать то, что человек уже набрал. */
  const branchId = branch?.id ?? null;
  useEffect(() => {
    if (!open) return;
    setErr('');
    setConfirmArchive(false);
    if (mode === 'edit' && branch) {
      reset({ name: branch.name, address: branch.address || '', phone: branch.phone || '' });
      setLocation(
        branch.lat != null && branch.lng != null
          ? { lat: Number(branch.lat), lng: Number(branch.lng) }
          : null,
      );
    } else {
      reset(EMPTY);
      setLocation(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, branchId]);

  useEffect(() => {
    if (!open) return undefined;
    /* Esc в полноэкранной карте закрывает карту, а не всё окно: иначе один
       нажатый Esc выкидывал бы из формы вместе с набранным. */
    const onKey = (e) => { if (e.key === 'Escape' && !document.fullscreenElement) onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onSubmit = async (formData) => {
    setErr('');

    /* Точка на карте обязательна при создании — по ней потом строятся маршруты
       для родителей и разбор «в каком филиале что происходит». При правке
       старого филиала не требуем: он мог быть заведён до появления карты.
       Если карта недоступна, требовать координаты бессмысленно. */
    const hasPoint = location?.lat != null && location?.lng != null;
    const halfPoint = !hasPoint && (location?.lat != null || location?.lng != null);

    // одна координата без второй — почти всегда недописанный ввод, а не намерение
    if (halfPoint) {
      setErr(t('super.branchForm.bothCoordsRequired'));
      return;
    }
    if (mode === 'create' && mapAvailable && !hasPoint) {
      setErr(t('super.branchForm.markOnMapRequired'));
      return;
    }

    setBusy(true);
    try {
      const body = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        /* При создании координаты шлём только когда они есть. При правке шлём
           всегда: null — это осознанное «снять точку», и без него отметку
           можно было поставить и подвинуть, но не убрать. */
        ...(hasPoint
          ? { lat: location.lat, lng: location.lng }
          : mode === 'edit'
            ? { lat: null, lng: null }
            : {}),
      };
      const saved = mode === 'create'
        ? await api.superCreateBranch(token, body)
        : await api.superUpdateBranch(token, branch.id, body);
      invalidate('super-branches', 'super-branch', 'super-dashboard');
      onSaved?.(saved);
      onClose?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doArchive = async () => {
    setErr('');
    setBusy(true);
    try {
      if (branch.isArchived) {
        await api.superUnarchiveBranch(token, branch.id);
      } else {
        await api.superArchiveBranch(token, branch.id);
      }
      invalidate('super-branches', 'super-branch', 'super-dashboard');
      onClose?.();
    } catch (e) {
      setErr(e.message);
      setConfirmArchive(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal modal-open">
      {/* Две колонки: слева поля, справа карта. В одну колонку карта уезжала
          за нижний край и до кнопок приходилось прокручивать форму. */}
      <div className={`modal-box border border-base-200 ${confirmArchive ? 'max-w-md' : 'max-w-6xl'}`}>
        {confirmArchive ? (
          <>
            <h3 className="font-bold text-base">
              {branch.isArchived ? t('super.branchForm.restoreTitle') : t('super.branchForm.archiveTitle')}
            </h3>
            <p className="text-sm text-base-content/60 mt-3">
              {branch.isArchived
                ? t('super.branchForm.restoreHint', { name: branch.name })
                : t('super.branchForm.archiveHint', { name: branch.name })}
            </p>
            {err && <div className="alert alert-error text-sm py-2 mt-3"><span>{err}</span></div>}
            <div className="modal-action">
              <button type="button" className="btn btn-ghost btn-sm rounded-xl" onClick={() => setConfirmArchive(false)} disabled={busy}>
                {t('super.branchForm.cancel')}
              </button>
              <button
                type="button"
                className={`btn btn-sm rounded-xl ${branch.isArchived ? 'btn-primary' : 'btn-error text-error-content'}`}
                onClick={doArchive}
                disabled={busy}
              >
                {busy && <span className="loading loading-spinner loading-sm" />}
                {branch.isArchived ? t('super.branchForm.restore') : t('super.branchForm.archive')}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-bold text-base">
              {mode === 'create' ? t('super.branchForm.newBranchTitle') : t('super.branchForm.settingsTitle', { name: branch?.name ?? t('super.branchForm.branchFallback') })}
            </h3>
            {err && <div className="alert alert-error text-sm py-2 mt-3"><span>{err}</span></div>}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
              {/* Карте отдана большая часть окна: на ней работают, а поля
                  заполняют один раз. Слева фиксированная колонка, чтобы карта
                  забирала всё оставшееся место. */}
              <div className="grid md:grid-cols-[300px_minmax(0,1fr)] gap-x-5 gap-y-3">
                <div className="space-y-3">
                  <label className="form-control w-full">
                    <span className="text-xs text-base-content/60 mb-1">{t('super.branchForm.nameLabel')}</span>
                    <input
                      {...register('name')}
                      autoFocus
                      placeholder={t('super.branchForm.namePlaceholder')}
                      className={`input input-bordered input-sm w-full rounded-lg text-base sm:text-sm ${errors.name ? 'input-error' : ''}`}
                    />
                    {errors.name && <span className="text-xs text-error mt-1">{errors.name.message}</span>}
                  </label>

                  <label className="form-control w-full">
                    <span className="text-xs text-base-content/60 mb-1">{t('super.branchForm.addressLabel')}</span>
                    <input
                      {...register('address')}
                      placeholder={t('super.branchForm.addressPlaceholder')}
                      className={`input input-bordered input-sm w-full rounded-lg text-base sm:text-sm ${errors.address ? 'input-error' : ''}`}
                    />
                    {errors.address && <span className="text-xs text-error mt-1">{errors.address.message}</span>}
                  </label>

                  <label className="form-control w-full">
                    <span className="text-xs text-base-content/60 mb-1">{t('super.branchForm.phoneLabel')}</span>
                    <Controller
                      name="phone"
                      control={control}
                      render={({ field }) => (
                        <PhoneInput
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          className={`input input-bordered input-sm w-full rounded-lg text-base sm:text-sm ${errors.phone ? 'input-error' : ''}`}
                        />
                      )}
                    />
                    {errors.phone && <span className="text-xs text-error mt-1">{errors.phone.message}</span>}
                  </label>

                  {/* Координаты полями — на случай, когда карта недоступна
                      (нет ключа, ограничения не применились), и чтобы вставить
                      готовую пару, скопированную из Яндекс Карт. */}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      aria-label={t('super.branchForm.latitudeAria')}
                      className="input input-bordered input-sm rounded-lg text-base sm:text-sm"
                      placeholder={t('super.branchForm.latitudePlaceholder')}
                      value={location?.lat ?? ''}
                      onChange={(e) => {
                        const lat = e.target.value === '' ? null : round6(e.target.value);
                        setLocation(lat === null && location?.lng == null
                          ? null
                          : { lat, lng: location?.lng ?? null });
                      }}
                    />
                    <input
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      aria-label={t('super.branchForm.longitudeAria')}
                      className="input input-bordered input-sm rounded-lg text-base sm:text-sm"
                      placeholder={t('super.branchForm.longitudePlaceholder')}
                      value={location?.lng ?? ''}
                      onChange={(e) => {
                        const lng = e.target.value === '' ? null : round6(e.target.value);
                        setLocation(lng === null && location?.lat == null
                          ? null
                          : { lat: location?.lat ?? null, lng });
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-base-content/60">
                      {t('super.branchForm.onMapLabel')}{mapAvailable && mode === 'create' && ' *'}
                    </span>
                    {location ? (
                      <button
                        type="button"
                        className="text-xs text-base-content/45 hover:text-error"
                        onClick={() => setLocation(null)}
                      >
                        {t('super.branchForm.reset')}
                      </button>
                    ) : (
                      /* Подсказка строкой у заголовка, а не плашкой поверх карты:
                         плашка закрывала часть карты и спорила с её же контролами. */
                      <span className="text-xs text-base-content/40">{t('super.branchForm.findAddressHint')}</span>
                    )}
                  </div>

                  <YMapPicker
                    value={location}
                    onChange={(p) => setLocation(p ? { lat: round6(p.lat), lng: round6(p.lng) } : null)}
                    height="min(58vh, 520px)"
                    onUnavailable={setMapBroken}
                    onPickAddress={fillAddress}
                  />
                </div>
              </div>

              <div className="modal-action items-center">
                {mode === 'edit' && (
                  <button
                    type="button"
                    className="mr-auto text-xs text-base-content/45 hover:text-error"
                    onClick={() => { setErr(''); setConfirmArchive(true); }}
                    disabled={busy}
                  >
                    {branch?.isArchived ? t('super.branchForm.restoreFromArchive') : t('super.branchForm.toArchive')}
                  </button>
                )}
                <button type="button" className="btn btn-ghost btn-sm rounded-xl" onClick={onClose} disabled={busy}>
                  {t('super.branchForm.cancel')}
                </button>
                <button type="submit" className="btn btn-primary btn-sm rounded-xl shadow-sm shadow-primary/10" disabled={busy}>
                  {busy && <span className="loading loading-spinner loading-sm" />}
                  {mode === 'create' ? t('super.branchForm.create') : t('super.branchForm.save')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
