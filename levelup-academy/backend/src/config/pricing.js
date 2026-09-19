/**
 * Karis 21.08.2026: расчёт стоимости видео-файла, загруженного методистом на
 * Storj вместо ссылки на YouTube. Реальный тариф Storj проверен на
 * https://www.storj.io/pricing (Standard plan) — $7/TB и за хранение в
 * месяц, и за исходящий трафик (egress), то есть $0.007/GB на каждое.
 * BILLED_* — с наценкой, которую задал Karis: $0.020/GB на оба показателя
 * (~2.9x к себестоимости). Эти цифры — то, что видит только Main Admin;
 * методисту (сотруднику партнёра) не показываются нигде на бэке.
 */
export const STORJ_RAW_STORAGE_USD_PER_GB_MONTH = 0.007;
export const STORJ_RAW_EGRESS_USD_PER_GB = 0.007;

export const BILLED_STORAGE_USD_PER_GB_MONTH = 0.02;
export const BILLED_EGRESS_USD_PER_GB = 0.02;

// Storj считает GB в десятичных единицах (SI), не GiB — тот же базис, что и их тариф.
const BYTES_PER_GB = 1_000_000_000;

/**
 * sizeBytes — точный размер файла (см. getObjectSize в s3.js, снят с самого
 * Storj, не с клиента). storageCostUsdPerMonth — повторяющийся ежемесячный
 * расход, пока файл лежит в бакете. costPerViewUsd — расход за ОДИН
 * просмотр/скачивание (egress); сколько раз посмотрят — заранее не известно,
 * поэтому это не "итоговая" цифра, а цена за единицу.
 */
export function calcVideoCost(sizeBytes) {
  const gb = sizeBytes / BYTES_PER_GB;
  return {
    storageCostUsdPerMonth: Number((gb * BILLED_STORAGE_USD_PER_GB_MONTH).toFixed(4)),
    costPerViewUsd: Number((gb * BILLED_EGRESS_USD_PER_GB).toFixed(6)),
  };
}
