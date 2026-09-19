import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth.jsx';
import { Building2, Globe, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useSuperOrganization, useInvalidate } from '../../queries.js';
import { api } from '../../api.js';
import { dateShort } from '../../format.js';
import PageHeader from '../../components/PageHeader.jsx';
import { SkeletonKpis } from '../../components/Skeleton.jsx';
import { Card, StatusBadge } from './_ui.jsx';

const domainRegex = /^[a-z0-9.-]+\.[a-z]{2,}$/;

const settingsSchemaFor = (t) => z.object({
  name: z.string().trim().min(2, t('super.settings.nameMin')).max(160),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(domainRegex, t('super.settings.domainInvalid'))
    .or(z.literal('')),
  lessonDurationMin: z.coerce.number().int().min(10, t('super.settings.lessonDurationMin')).max(600, t('super.settings.lessonDurationMax')),
  coinsPerStudent: z.coerce.number().int().min(0, t('super.settings.coinsMin')).max(1000, t('super.settings.coinsMax')),
});

export default function SuperSettings() {
  const { t } = useTranslation();
  const settingsSchema = useMemo(() => settingsSchemaFor(t), [t]);
  const { token } = useAuth();
  const { data, isLoading, error } = useSuperOrganization();
  const invalidate = useInvalidate();
  const [successMsg, setSuccessMsg] = useState('');
  const [serverErr, setServerErr] = useState('');
  const [busy, setBusy] = useState(false);

  const org = data?.organization;

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: { name: org?.name || '', domain: org?.domain || '', lessonDurationMin: org?.lessonDurationMin || 60, coinsPerStudent: org?.coinsPerStudent ?? 0 },
    values: org ? { name: org.name || '', domain: org.domain || '', lessonDurationMin: org.lessonDurationMin || 60, coinsPerStudent: org.coinsPerStudent ?? 0 } : undefined,
  });

  const onSubmit = async (formData) => {
    setBusy(true);
    setServerErr('');
    try {
      await api.superUpdateOrganization(token, {
        name: formData.name.trim(),
        domain: formData.domain.trim() || null,
        lessonDurationMin: formData.lessonDurationMin,
        coinsPerStudent: formData.coinsPerStudent,
      });
      invalidate('super-organization');
      setSuccessMsg(t('super.settings.savedMessage'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setServerErr(e.message || t('super.settings.saveError'));
    } finally {
      setBusy(false);
    }
  };

  if (error && error.status !== 401)
    return <div className="alert alert-error text-sm"><span>{error.message}</span></div>;

  if (isLoading || !org) {
    return (
      <div className="space-y-6 max-w-4xl">
        <PageHeader title={t('super.settings.title')} subtitle={t('super.settings.subtitle')} />
        <SkeletonKpis count={2} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title={t('super.settings.title')} subtitle={t('super.settings.subtitle')} />

      {successMsg && (
        <div className="alert alert-success text-sm flex items-center gap-2">
          <CheckCircle2 size={16} /><span>{successMsg}</span>
        </div>
      )}
      {serverErr && (
        <div className="alert alert-error text-sm"><span>{serverErr}</span></div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="md:col-span-1">
          <Card className="p-5 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Building2 size={36} className="text-primary" />
              </div>
              <h2 className="text-lg font-bold mt-3">{org.name}</h2>
              <div className="flex items-center gap-1 text-xs text-base-content/50 mt-1">
                <Globe size={12} /><span>{org.domain || t('super.settings.domainNotLinked')}</span>
              </div>
              <div className="divider my-3" />
              <div className="w-full space-y-3 text-left text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-base-content/50">{t('super.settings.statusLabel')}</span>
                  <StatusBadge tone={org.status === 'active' ? 'success' : 'neutral'}>
                    {org.status === 'active' ? t('super.settings.statusActive') : org.status}
                  </StatusBadge>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/50">{t('super.settings.createdLabel')}</span>
                  <span className="font-semibold">{dateShort(org.createdAt)}</span>
                </div>
              </div>
          </Card>
        </div>

        {/* Form + Security */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-5 md:p-6">
              <h2 className="text-base font-bold mb-4">{t('super.settings.mainSettingsTitle')}</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <label className="form-control w-full">
                  <span className="label-text mb-1.5 font-medium">{t('super.settings.orgNameLabel')}</span>
                  <input
                    {...register('name')}
                    placeholder={t('super.settings.orgNamePlaceholder')}
                    className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
                  />
                  {errors.name && <span className="text-xs text-error mt-1">{errors.name.message}</span>}
                </label>
                <label className="form-control w-full">
                  <span className="label-text mb-1.5 font-medium">{t('super.settings.domainLabel')}</span>
                  <div className="relative">
                    <input
                      {...register('domain')}
                      placeholder="levelup.uz"
                      className={`input input-bordered w-full pl-9 ${errors.domain ? 'input-error' : ''}`}
                    />
                    <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                  </div>
                  <span className="text-[11px] text-base-content/40 mt-1">
                    {t('super.settings.domainHint')}
                  </span>
                  {errors.domain && <span className="text-xs text-error mt-1">{errors.domain.message}</span>}
                </label>
                <label className="form-control w-full max-w-[220px]">
                  <span className="label-text mb-1.5 font-medium">{t('super.settings.lessonDurationLabel')}</span>
                  <input
                    type="number"
                    min={10}
                    max={600}
                    {...register('lessonDurationMin')}
                    className={`input input-bordered w-full ${errors.lessonDurationMin ? 'input-error' : ''}`}
                  />
                  <span className="text-[11px] text-base-content/40 mt-1">
                    {t('super.settings.lessonDurationHint')}
                  </span>
                  {errors.lessonDurationMin && <span className="text-xs text-error mt-1">{errors.lessonDurationMin.message}</span>}
                </label>
                <label className="form-control w-full max-w-[220px]">
                  <span className="label-text mb-1.5 font-medium">{t('super.settings.coinsPerStudentLabel')}</span>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    {...register('coinsPerStudent')}
                    className={`input input-bordered w-full ${errors.coinsPerStudent ? 'input-error' : ''}`}
                  />
                  <span className="text-[11px] text-base-content/40 mt-1">
                    {t('super.settings.coinsPerStudentHint')}
                  </span>
                  {errors.coinsPerStudent && <span className="text-xs text-error mt-1">{errors.coinsPerStudent.message}</span>}
                </label>
                <div className="flex justify-end pt-4">
                  <button type="submit" className="btn btn-primary" disabled={!isDirty || busy}>
                    {busy && <span className="loading loading-spinner loading-sm" />}
                    {t('super.settings.saveChanges')}
                  </button>
                </div>
              </form>
          </Card>

          <Card className="p-5 md:p-6">
              <h2 className="text-base font-bold mb-2 flex items-center gap-2">
                <ShieldCheck size={18} /> {t('super.settings.licenseTitle')}
              </h2>
              <p className="text-xs text-base-content/50 leading-relaxed">
                {t('super.settings.licenseHint')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs">
                <div className="p-3.5 bg-base-200/50 rounded-xl space-y-1">
                  <div className="font-bold">{t('super.settings.branchLimitLabel')}</div>
                  <div className="text-base-content/50">
                    {org.plan?.branchLimit ? t('super.settings.branchLimitValue', { count: org.plan.branchLimit }) : t('super.settings.unlimited')}
                  </div>
                </div>
                <div className="p-3.5 bg-base-200/50 rounded-xl space-y-1">
                  <div className="font-bold">{t('super.settings.diskSpaceLabel')}</div>
                  <div className="text-base-content/50">{org.plan?.diskSpace || t('super.settings.defaultDiskSpace')}</div>
                </div>
              </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
