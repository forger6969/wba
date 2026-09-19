import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api.js';
import { useAuth } from './auth.jsx';

function useAuthedQuery(queryKey, queryFn, opts = {}) {
  const { token, logout } = useAuth();
  const q = useQuery({ queryKey, queryFn, enabled: !!token, ...opts });
  useEffect(() => {
    if (q.error?.status === 401) logout();
  }, [q.error, logout]);
  return q;
}

export function useParentChildren() {
  const { token } = useAuth();
  return useAuthedQuery(['parent-children'], () => api.parentChildren(token));
}

export function useParentOverview(childId) {
  const { token } = useAuth();
  return useAuthedQuery(['parent-overview', childId], () => api.parentOverview(token, childId), {
    enabled: !!childId,
  });
}

export function useGroupRating(childId) {
  const { token } = useAuth();
  return useAuthedQuery(['group-rating', childId], () => api.parentGroupRating(token, childId), {
    enabled: !!childId,
  });
}

/** FE-PARENT-PAGINATION: постраничная история посещаемости (в отличие от overview.recent, не ограничена 5 записями). */
export function useAttendancePage(childId, page, limit = 20) {
  const { token } = useAuth();
  return useAuthedQuery(
    ['parent-attendance', childId, page, limit],
    () => api.parentAttendance(token, childId, page, limit),
    { enabled: !!childId },
  );
}

/** FE-PARENT-PAGINATION: постраничные оценки (ДЗ или тесты). */
export function useGradesPage(childId, type, page, limit = 20) {
  const { token } = useAuth();
  return useAuthedQuery(
    ['parent-grades', childId, type, page, limit],
    () => api.parentGrades(token, childId, type, page, limit),
    { enabled: !!childId },
  );
}

export function useChatMessages(roomKey) {
  const { token } = useAuth();
  return useAuthedQuery(['chat-messages', roomKey], () => api.chatMessages(token, roomKey), {
    enabled: !!roomKey && !!token,
  });
}

/** Доступные преподаватели и существующие диалоги родителя/студента. */
export function useChatThreads() {
  const { token } = useAuth();
  return useAuthedQuery(['chat-threads'], () => api.chatThreads(token));
}

/**
 * FE-PARENT-PAGINATION: лента уведомлений — не таблица, а слияние 5 источников
 * (см. backend notifications.service.js), поэтому пагинация курсорная (`before`),
 * а не по номеру страницы. Каждая "загрузить ещё" добавляет страницу к уже
 * накопленному списку вместо замены.
 */
export function useNotifications() {
  const { token, logout } = useAuth();
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const q = useQuery({
    queryKey: ['notifications', cursor],
    queryFn: () => api.notifications(token, cursor),
    enabled: !!token,
  });

  useEffect(() => {
    if (q.error?.status === 401) logout();
  }, [q.error, logout]);

  useEffect(() => {
    if (!q.data?.data) return;
    const { items: pageItems, nextCursor: nc } = q.data.data;
    setItems((prev) => (cursor ? [...prev, ...pageItems] : pageItems));
    setNextCursor(nc);
    setLoadedOnce(true);
    // cursor намеренно не в зависимостях — накопление идёт по приходу новых данных (q.data), не по смене cursor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);

  return {
    items,
    isLoading: q.isLoading && !loadedOnce,
    isFetchingMore: q.isFetching && loadedOnce,
    hasMore: Boolean(nextCursor),
    loadMore: () => nextCursor && setCursor(nextCursor),
    error: loadedOnce ? null : q.error,
    refetch: q.refetch,
  };
}

export function useHomeworkDetail(homeworkId) {
  const { token } = useAuth();
  return useAuthedQuery(['homework-detail', homeworkId], () => api.parentHomeworkDetail(token, homeworkId), {
    enabled: !!homeworkId,
  });
}

export function useTestDetail(testId) {
  const { token } = useAuth();
  return useAuthedQuery(['test-detail', testId], () => api.parentTestDetail(token, testId), {
    enabled: !!testId,
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}
