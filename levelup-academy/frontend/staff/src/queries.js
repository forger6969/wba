import { useEffect } from 'react';
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

// -------- SUPER ADMIN --------
export function useSuperDashboard() {
  const { token, user } = useAuth();
  // Finance Manager видит те же данные (super.controller.js), но через свой
  // роут (/finance/*, authorize('finance_manager','ceo')) — /super/* у него
  // 403 на всё остальное. Один и тот же хук для обеих ролей, чтобы не
  // дублировать Dashboard.jsx/Reports.jsx под каждую роль отдельно.
  const isFinance = user?.role === 'finance_manager';
  return useAuthedQuery(['super-dashboard', isFinance], () =>
    isFinance ? api.financeDashboard(token) : api.superDashboard(token));
}

/** Статистика организации за период: 7d / 30d / 90d / 12m, опционально по одному филиалу. */
export function useSuperStats(period = '30d', branchId = '') {
  const { token, user } = useAuth();
  const isFinance = user?.role === 'finance_manager';
  return useAuthedQuery(['super-stats', period, branchId, isFinance], () =>
    isFinance ? api.financeStats(token, period, branchId) : api.superStats(token, period, branchId));
}

export function useSuperBranches() {
  const { token } = useAuth();
  return useAuthedQuery(['super-branches'], () => api.superBranches(token));
}

// -------- FINANCE MANAGER --------
/** id/name/isMain своей организации — для селекторов на страницах Finance. */
export function useFinanceBranches() {
  const { token } = useAuth();
  return useAuthedQuery(['finance-branches'], () => api.financeBranches(token), { select: (d) => d.branches });
}

/** params=null — не запрашивать вовсе (например, «предыдущего месяца» не существует). */
export function useFinanceIncome(params) {
  const { token } = useAuth();
  return useAuthedQuery(['finance-income', params], () => api.financeIncome(token, params), {
    enabled: !!token && params !== null,
  });
}

export function useFinanceSalaries(params) {
  const { token } = useAuth();
  return useAuthedQuery(['finance-salaries', params], () => api.financeSalaries(token, params));
}

export function useFinanceExpenses(params) {
  const { token } = useAuth();
  return useAuthedQuery(['finance-expenses', params], () => api.financeExpenses(token, params));
}

export function useSuperBranchDetail(id) {
  const { token } = useAuth();
  return useAuthedQuery(['super-branch', id], () => api.superBranchDetail(token, id), {
    enabled: !!id,
  });
}

export function useSuperStudentDetail(id) {
  const { token } = useAuth();
  return useAuthedQuery(['super-student', id], () => api.superStudentDetail(token, id), {
    enabled: !!id,
  });
}

export function useSuperStudentsStats(period = '30d', branchId = '') {
  const { token } = useAuth();
  return useAuthedQuery(['super-students-stats', period, branchId], () => api.superStudentsStats(token, period, branchId));
}

export function useSuperGroupDetail(id) {
  const { token } = useAuth();
  return useAuthedQuery(['super-group', id], () => api.superGroupDetail(token, id), {
    enabled: !!id,
  });
}

export function useSuperAdmins() {
  const { token } = useAuth();
  return useAuthedQuery(['super-admins'], () => api.superAdmins(token));
}

export function useSuperOrganization() {
  const { token } = useAuth();
  return useAuthedQuery(['super-organization'], () => api.superGetOrganization(token));
}

export function useSuperTrainingTypes() {
  const { token } = useAuth();
  return useAuthedQuery(['super-training-types'], () => api.superTrainingTypes(token));
}

export function useSuperMethodists() {
  const { token } = useAuth();
  return useAuthedQuery(['super-methodists'], () => api.superMethodists(token));
}

// -------- SUPER ADMIN: Branch Managers --------
export function useSuperBranchManagers() {
  const { token } = useAuth();
  return useAuthedQuery(['super-branch-managers'], () => api.superBranchManagers(token));
}

// -------- BRANCH MANAGER --------
export function useBranchManagerDashboard() {
  const { token } = useAuth();
  return useAuthedQuery(['branch-manager-dashboard'], () => api.branchManagerDashboard(token));
}

export function useBranchManagerInfo() {
  const { token } = useAuth();
  return useAuthedQuery(['branch-manager-info'], () => api.branchManagerInfo(token));
}

export function useBranchManagerIncome(month) {
  const { token } = useAuth();
  return useAuthedQuery(
    ['branch-manager-income', month],
    () => api.branchManagerIncome(token, month),
    { enabled: !!month },
  );
}

export function useBranchManagerExpenses(month) {
  const { token } = useAuth();
  return useAuthedQuery(
    ['branch-manager-expenses', month],
    () => api.branchManagerExpenses(token, month),
    { enabled: !!month },
  );
}

export function useBranchManagerReports(months = 6) {
  const { token } = useAuth();
  return useAuthedQuery(
    ['branch-manager-reports', months],
    () => api.branchManagerReports(token, months),
  );
}

export function useBranchManagerTelegramStatus() {
  const { token } = useAuth();
  return useAuthedQuery(['branch-manager-telegram-status'], () => api.branchManagerTelegramStatus(token));
}

// -------- ADMIN --------
/** Менторы организации — только чтение (заводит/редактирует их Admin филиала). */
export function useSuperMentors() {
  const { token } = useAuth();
  return useAuthedQuery(['super-mentors'], () => api.superMentors(token));
}

// -------- ADMIN --------
export function useAdminDashboard() {
  const { token } = useAuth();
  return useAuthedQuery(['admin-dashboard'], () => api.adminDashboard(token));
}

export function useAdminExpenses(qs = '') {
  const { token } = useAuth();
  return useAuthedQuery(['admin-expenses', qs], () => api.adminExpenses(token, qs));
}

export function useAdminStudents(qs = '') {
  const { token } = useAuth();
  return useAuthedQuery(['admin-students', qs], () => api.adminStudents(token, qs));
}

export function useAdminStudentDetail(id) {
  const { token } = useAuth();
  return useAuthedQuery(['admin-student', id], () => api.adminStudentDetail(token, id), { enabled: !!id });
}

export function useAdminStudentAttendance(id) {
  const { token } = useAuth();
  return useAuthedQuery(['admin-student-attendance', id], () => api.adminStudentAttendance(token, id), { enabled: !!id });
}

export function useAdminStudentTelegram(id) {
  const { token } = useAuth();
  return useAuthedQuery(['admin-student-telegram', id], () => api.adminStudentTelegram(token, id), { enabled: !!id });
}

// enabled отдельно от !!id — пароль расшифровываем на сервере только когда
// модалка реально открыта, не на каждый рендер StudentDetail.
export function useAdminStudentCredentials(id, enabled) {
  const { token } = useAuth();
  return useAuthedQuery(['admin-student-credentials', id], () => api.adminStudentCredentials(token, id), { enabled: !!id && enabled });
}

export function useAdminParentCredentials(id, enabled) {
  const { token } = useAuth();
  return useAuthedQuery(['admin-parent-credentials', id], () => api.adminParentCredentials(token, id), { enabled: !!id && enabled });
}

export function useAdminGroups(qs = '') {
  const { token } = useAuth();
  return useAuthedQuery(['admin-groups', qs], () => api.adminGroups(token, qs));
}

export function useAdminGroupDetail(id) {
  const { token } = useAuth();
  return useAuthedQuery(['admin-group', id], () => api.adminGroupDetail(token, id), { enabled: !!id });
}

export function useAdminMentors() {
  const { token } = useAuth();
  return useAuthedQuery(['admin-mentors'], () => api.adminMentors(token));
}

export function useAdminMentorDetail(id) {
  const { token } = useAuth();
  return useAuthedQuery(['admin-mentor', id], () => api.adminMentors(token).then(res => {
    const raw = res?.data || res || {};
    const mentors = raw.mentors || (Array.isArray(raw) ? raw : []);
    return { mentor: mentors.find(m => m.id === id) || null };
  }), { enabled: !!id });
}

export function useAdminTrainingTypes() {
  const { token } = useAuth();
  return useAuthedQuery(['admin-training-types'], () => api.adminTrainingTypes(token));
}

export function useAdminInvoices(qs = '') {
  const { token } = useAuth();
  return useAuthedQuery(['admin-invoices', qs], () => api.adminInvoices(token, qs));
}

export function useAdminShopItems() {
  const { token } = useAuth();
  return useAuthedQuery(['admin-shop-items'], () => api.adminShopItems(token));
}

export function useAdminShopOrders(qs = '') {
  const { token } = useAuth();
  return useAuthedQuery(['admin-shop-orders', qs], () => api.adminShopOrders(token, qs));
}

export function useSuperShopItems(qs = '') {
  const { token } = useAuth();
  return useAuthedQuery(['super-shop-items', qs], () => api.superShopItems(token, qs));
}

export function useAdminSchedule() {
  const { token } = useAuth();
  return useAuthedQuery(['admin-schedule'], () => api.adminSchedule(token));
}

export function useAdminRooms() {
  const { token } = useAuth();
  return useAuthedQuery(['admin-rooms'], () => api.adminRooms(token));
}

export function useAdminReports(qs = '') {
  const { token } = useAuth();
  return useAuthedQuery(['admin-reports', qs], () => api.adminReports(token, qs));
}

export function useAdminGroupAttendance(groupId, date) {
  const { token } = useAuth();
  return useAuthedQuery(
    ['admin-group-attendance', groupId, date],
    () => api.adminGroupAttendance(token, groupId, date),
    { enabled: !!groupId && !!date },
  );
}

export function useAdminGroupHomework(groupId) {
  const { token } = useAuth();
  return useAuthedQuery(
    ['admin-group-homework', groupId],
    () => api.adminGroupHomework(token, groupId),
    { enabled: !!groupId },
  );
}

export function useAdminGroupFeedback(groupId) {
  const { token } = useAuth();
  return useAuthedQuery(
    ['admin-group-feedback', groupId],
    () => api.adminGroupFeedback(token, groupId),
    { enabled: !!groupId },
  );
}

export function useAdminSettings() {
  const { token } = useAuth();
  return useAuthedQuery(['admin-settings'], () => api.adminSettings(token), { retry: false });
}

// -------- MENTOR --------
export function useMentorGroups() {
  const { token } = useAuth();
  return useAuthedQuery(['mentor-groups'], () => api.mentorGroups(token));
}

export function useMentorGroupStudents(groupId) {
  const { token } = useAuth();
  return useAuthedQuery(['mentor-group-students', groupId], () => api.mentorGroupStudents(token, groupId), {
    enabled: !!groupId,
  });
}

export function useMentorAttendance(groupId, params) {
  const { token } = useAuth();
  // params: { date } ИЛИ { from, to } — прокидываем как есть (api.mentorAttendance сам выберет ветку)
  return useAuthedQuery(
    ['mentor-attendance', groupId, params],
    () => api.mentorAttendance(token, groupId, params),
    { enabled: !!groupId && !!params && (!!params.date || (!!params.from && !!params.to)) },
  );
}

/** Остаток месячного лимита коинов по группе. */
export function useMentorCoinBudget(groupId) {
  const { token } = useAuth();
  return useAuthedQuery(
    ['mentor-coin-budget', groupId],
    () => api.mentorCoinBudget(token, groupId),
    { enabled: !!groupId },
  );
}

export function useMentorHomeworkList(groupId) {
  const { token } = useAuth();
  return useAuthedQuery(['mentor-homework', groupId], () => api.mentorHomeworkList(token, groupId), {
    enabled: !!groupId,
  });
}

export function useMentorHomeworkSubmissions(homeworkId) {
  const { token } = useAuth();
  return useAuthedQuery(
    ['mentor-submissions', homeworkId],
    () => api.mentorHomeworkSubmissions(token, homeworkId),
    { enabled: !!homeworkId },
  );
}

export function useMentorCoinHistory(studentId) {
  const { token } = useAuth();
  return useAuthedQuery(['mentor-coin-history', studentId], () => api.mentorCoinHistory(token, studentId), {
    enabled: !!studentId,
  });
}

export function useMentorTests(groupId) {
  const { token } = useAuth();
  return useAuthedQuery(['mentor-tests', groupId], () => api.mentorTests(token, groupId), {
    enabled: !!groupId,
  });
}

export function useMentorTestResults(testId) {
  const { token } = useAuth();
  return useAuthedQuery(['mentor-test-results', testId], () => api.mentorTestResults(token, testId), {
    enabled: !!testId,
  });
}

export function useMentorGroupStats(groupId) {
  const { token } = useAuth();
  return useAuthedQuery(
    ['mentor-group-stats', groupId],
    () => api.mentorGroupStats(token, groupId),
    { enabled: !!groupId },
  );
}

export function useMentorStudentStats(studentId) {
  const { token } = useAuth();
  return useAuthedQuery(
    ['mentor-student-stats', studentId],
    () => api.mentorStudentStats(token, studentId),
    { enabled: !!studentId },
  );
}

// -------- PROFILE --------
export function useMe() {
  const { token } = useAuth();
  return useAuthedQuery(['me'], () => api.me(token));
}

export function useSuperEmployees() {
  const { token } = useAuth();
  return useAuthedQuery(['super-employees'], () => api.superEmployees(token));
}

export function usePeopleDirectory(qs = '') {
  const { token } = useAuth();
  return useAuthedQuery(['people-directory', qs], () => api.peopleDirectory(token, qs));
}

// K-DISC-FRONT: own discipline (mentor/methodist self-view, read-only)
export function useMyPenalties() {
  const { token } = useAuth();
  return useAuthedQuery(['my-penalties'], () => api.myPenalties(token));
}

export function useMyDisciplineRules() {
  const { token } = useAuth();
  return useAuthedQuery(['my-discipline-rules'], () => api.myDisciplineRules(token));
}

// -------- CHAT --------
// options нужен вызову из шапки: у методиста и супер-админа чата нет, и
// запрашивать контакты за них — гарантированный 403 в консоли на каждой странице.
export function useChatContacts(options = {}) {
  const { token } = useAuth();
  return useAuthedQuery(['chat-contacts'], () => api.chatContacts(token), {
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    ...options,
  });
}

export function useChatHistory(roomKey) {
  const { token } = useAuth();
  return useAuthedQuery(['chat-history', roomKey], () => api.chatHistory(token, roomKey), {
    enabled: !!roomKey,
    refetchInterval: roomKey ? 3000 : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}

// -------- METHODIST CONTENT --------
export function useTrainingTypes() {
  const { token } = useAuth();
  return useAuthedQuery(['training-types'], () => api.methodistTrainingTypes(token));
}

export function useTopics(trainingTypeId) {
  const { token } = useAuth();
  return useAuthedQuery(['topics', trainingTypeId], () => api.methodistTopics(token, trainingTypeId), { enabled: !!trainingTypeId });
}

export function useLessons(topicId) {
  const { token } = useAuth();
  return useAuthedQuery(['lessons', topicId], () => api.methodistLessons(token, topicId), { enabled: !!topicId });
}

export function useLessonDetails(lessonId) {
  const { token } = useAuth();
  return useAuthedQuery(['lesson', lessonId], () => api.methodistGetLesson(token, lessonId), { enabled: !!lessonId });
}

export function useQuestions(lessonId) {
  const { token } = useAuth();
  return useAuthedQuery(['questions', lessonId], () => api.methodistQuestions(token, lessonId), { enabled: !!lessonId });
}

// -------- METHODIST ANALYTICS --------
export function useMethodistAnalytics() {
  const { token } = useAuth();
  return useAuthedQuery(['methodist-analytics'], () => api.methodistDifficulty(token));
}

// -------- MAIN ADMIN --------
export function useMainDashboard() {
  const { token } = useAuth();
  return useAuthedQuery(['main-dashboard'], () => api.mainDashboard(token));
}

export function useMainLeads() {
  const { token } = useAuth();
  return useAuthedQuery(['main-leads'], () => api.mainLeads(token), { select: (d) => d.leads });
}

export function useMainPricing() {
  const { token } = useAuth();
  return useAuthedQuery(['main-pricing'], () => api.mainGetPricing(token), { select: (d) => d.pricing });
}

// -------- INVALIDATE --------
export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys) => keys.forEach((k) => {
    if (Array.isArray(k)) {
      qc.invalidateQueries({ queryKey: k });
    } else {
      qc.invalidateQueries({ queryKey: [k] });
    }
  });
}
