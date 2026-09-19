import { useEffect } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from './api.js';
import { useAuth } from './auth.jsx';

// общий useQuery: включается только с токеном + разлогинивает на 401
function useAuthedQuery(queryKey, queryFn, opts = {}) {
  const { token, logout } = useAuth();
  const q = useQuery({ queryKey, queryFn, enabled: !!token, ...opts });
  useEffect(() => {
    if (q.error?.status === 401) logout();
  }, [q.error, logout]);
  return q;
}

export function useDashboard() {
  const { token } = useAuth();
  return useAuthedQuery(['dashboard'], () => api.dashboard(token));
}

// Платформенный доход — наш счёт партнёрам. Отдельный endpoint, не дашборд:
// у него свои поля (activePartners, tier у каждого партнёра).
export function useRevenue() {
  const { token } = useAuth();
  return useAuthedQuery(['revenue'], () => api.revenue(token));
}

export function useVideoStorageCosts() {
  const { token } = useAuth();
  return useAuthedQuery(['videoStorageCosts'], () => api.videoStorageCosts(token));
}

export function useProfile() {
  const { token } = useAuth();
  return useAuthedQuery(['profile'], () => api.getProfile(token), { select: (d) => d.profile });
}

export function useLeads() {
  const { token } = useAuth();
  return useAuthedQuery(['leads'], () => api.leads(token), { select: (d) => d.leads });
}

export function usePricing() {
  const { token } = useAuth();
  return useAuthedQuery(['pricing'], () => api.getPricing(token), { select: (d) => d.pricing });
}

// сбросить кэш после мутаций (онбординг, статус, цены…)
export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function useAddonPrices() {
  const { token } = useAuth();
  return useAuthedQuery(['addonPrices'], () => api.addonPrices(token), { select: (d) => d.features });
}

export function usePartnerFeatures(id) {
  const { token } = useAuth();
  return useAuthedQuery(['partnerFeatures', id], () => api.partnerFeatures(token, id), { enabled: !!id });
}

export function useOrgLedger(id) {
  const { token } = useAuth();
  return useAuthedQuery(['orgLedger', id], () => api.orgLedger(token, id), {
    enabled: !!id,
    select: (d) => d.ledger,
  });
}

export function useExpenses() {
  const { token } = useAuth();
  return useAuthedQuery(['expenses'], () => api.expenses(token), { select: (d) => d.expenses });
}

export function useFinance() {
  const { token } = useAuth();
  return useAuthedQuery(['finance'], () => api.finance(token));
}

export function useFeatureRequests(status) {
  const { token } = useAuth();
  return useAuthedQuery(['featureRequests', status], () => api.featureRequests(token, status), {
    select: (d) => d.requests,
  });
}

// Центр проблем: что требует вмешательства прямо сейчас. Отдельный от
// дашборда запрос — рендерится независимо, не ждёт /main/dashboard.
export function useActionCenter() {
  const { token } = useAuth();
  return useAuthedQuery(['actionCenter'], () => api.actionCenter(token), {
    refetchInterval: 60_000, // фон обновляется сам — это дежурная панель, не разовый отчёт
  });
}

// Журнал действий платформы. Ключ включает все параметры фильтра — смена
// scope/action/offset должна бить новый запрос, а не подсовывать старый кэш.
export function useAuditLog(params) {
  const { token } = useAuth();
  return useAuthedQuery(['auditLog', params], () => api.auditLog(token, params), {
    placeholderData: keepPreviousData,
  });
}

/**
 * Аналитика сайта levelup-academy.uz (Karis 25.08.2026).
 *
 * Данные приходят из Google (Search Console + GA4) через кеш на бэкенде —
 * refetch на каждом фокусе окна тут не нужен: цифры за сутки не меняются,
 * а каждый промах кеша это восемь запросов к Google.
 */
export function useSiteAnalytics(days) {
  const { token } = useAuth();
  return useAuthedQuery(['siteAnalytics', days], () => api.siteAnalytics(token, days), {
    placeholderData: keepPreviousData, // при смене периода не мигать скелетом
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Модерация чата: один список слов на всю платформу (Karis 26.08.2026).
 * refetchInterval у слов не нужен — правит только сам Main Admin, изменение
 * видно сразу через invalidate после мутации.
 */
export function useBannedWords() {
  const { token } = useAuth();
  return useAuthedQuery(['bannedWords'], () => api.bannedWords(token), { select: (d) => d.words });
}

export function useFlaggedMessages(params) {
  const { token } = useAuth();
  return useAuthedQuery(['flaggedMessages', params], () => api.flaggedMessages(token, params), {
    placeholderData: keepPreviousData,
    refetchInterval: 60_000, // новое сработавшее сообщение может прийти в любой момент
  });
}

/**
 * Здоровье инфраструктуры: база, Redis, хранилище (Karis 26.08.2026).
 * Опрашивается каждые 30с, пока страница открыта — это ровно та страница,
 * где важно видеть смену статуса быстро, а не через минуту.
 */
export function useSystemHealth() {
  const { token } = useAuth();
  return useAuthedQuery(['systemHealth'], () => api.systemHealth(token), {
    refetchInterval: 30_000,
  });
}

/** Журнал ошибок бэкенда (Karis 26.08.2026). */
export function useErrorLog(params) {
  const { token } = useAuth();
  return useAuthedQuery(['errorLog', params], () => api.errorLog(token, params), {
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}

/** Состояние очередей BullMQ (Karis 26.08.2026). */
export function useQueueHealth() {
  const { token } = useAuth();
  return useAuthedQuery(['queueHealth'], () => api.queueHealth(token), {
    refetchInterval: 30_000,
  });
}

/** Счета и долги партнёров (Karis 26.08.2026). */
export function useInvoices(params) {
  const { token } = useAuth();
  return useAuthedQuery(['invoices', params], () => api.invoices(token, params), {
    placeholderData: keepPreviousData,
  });
}

export function useOrgDebt() {
  const { token } = useAuth();
  return useAuthedQuery(['orgDebt'], () => api.orgDebt(token), { select: (d) => d.items });
}

/** Health Score партнёров (Karis 26.08.2026). */
export function usePartnerHealth() {
  const { token } = useAuth();
  return useAuthedQuery(['partnerHealth'], () => api.partnerHealth(token), {
    select: (d) => d.items,
    refetchInterval: 60_000,
  });
}

/** Реальная активность в продукте — тесты, ДЗ, посещаемость, видео (Karis 26.08.2026). */
export function useProductActivity(days) {
  const { token } = useAuth();
  return useAuthedQuery(['productActivity', days], () => api.productActivity(token, days), {
    placeholderData: keepPreviousData,
  });
}

/** Реальный объём базы (Neon) и файлов (Storj) — пункт #9 (Karis 26.08.2026). */
export function useStorageHealth() {
  const { token } = useAuth();
  return useAuthedQuery(['storageHealth'], () => api.storageHealth(token), {
    refetchInterval: 60_000,
  });
}

export function usePartnerChanges(days) {
  const { token } = useAuth();
  return useAuthedQuery(['partnerChanges', days], () => api.partnerChanges(token, days), {
    placeholderData: keepPreviousData,
  });
}
