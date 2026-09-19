import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { ChildProvider } from './child-context.jsx';
import Splash from './components/Splash.jsx';
import Layout from './components/Layout.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Login from './pages/Login.jsx';
import QrLogin from './pages/QrLogin.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Attendance from './pages/Attendance.jsx';
import Grades from './pages/Grades.jsx';
import Debt from './pages/Debt.jsx';
import Chat from './pages/Chat.jsx';
import Notifications from './pages/Notifications.jsx';
import Profile from './pages/Profile.jsx';
import { ToastProvider } from './student/components/toast.jsx';
import StudentArea from './student/StudentArea.jsx';
import StudentLayout from './student/components/Layout.jsx';
import StudentHome from './student/pages/Home.jsx';
import StudentTests from './student/pages/Tests.jsx';
import StudentTestTake from './student/pages/TestTake.jsx';
import StudentHomework from './student/pages/Homework.jsx';
import StudentVideos from './student/pages/Videos.jsx';
import StudentLessons from './student/pages/Lessons.jsx';
import StudentTopicDetail from './student/pages/TopicDetail.jsx';
import StudentLessonDetail from './student/pages/LessonDetail.jsx';
import LessonsHub from './student/pages/LessonsHub.jsx';
import StudentShop from './student/pages/Shop.jsx';
import StudentLeaderboard from './student/pages/Leaderboard.jsx';
import StudentAnnouncements from './student/pages/Announcements.jsx';
import StudentChat from './student/pages/Chat.jsx';

function Protected({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

/**
 * Единственное место, где роль решает маршрут (CONSTRAINTS.md: без ролевой
 * логики «на глазок» в компонентах — только RoleGuard + ролевые layouts).
 * Чужая роль → на "/", там HomeRedirect уже отправит её на свой кабинет.
 */
function RoleGuard({ role, children }) {
  const { user } = useAuth();
  return user?.role === role ? children : <Navigate to="/" replace />;
}

/** Karis (13.08.2026): та же идея, что RoleGuard, но по org_feature_flags —
 * прямая ссылка на /shop тоже не должна открываться, если фича выключена. */
function FeatureGuard({ feature, children }) {
  const { user } = useAuth();
  return user?.orgFeatures?.[feature] ? children : <Navigate to="/student" replace />;
}

function ParentLayout() {
  return (
    <ChildProvider>
      <Layout />
    </ChildProvider>
  );
}

function HomeRedirect() {
  const { user } = useAuth();
  if (user?.role === 'student') return <Navigate to="/student" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  const { token, loading } = useAuth();
  if (loading) return <Splash />;

  return (
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
          {/* Публичный — сам логинит по одноразовому токену, авторизация не нужна */}
          <Route path="/qr-login" element={<QrLogin />} />

        <Route
          path="/"
          element={
            <Protected>
              <HomeRedirect />
            </Protected>
          }
        />

        {/* Parent — кабинет родителя */}
        <Route
          element={
            <Protected>
              <RoleGuard role="parent">
                <ParentLayout />
              </RoleGuard>
            </Protected>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/grades" element={<Grades />} />
          <Route path="/debt" element={<Debt />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Student — кабинет ученика (перенесён из бывшего frontend/student) */}
        <Route
          element={
            <Protected>
              <RoleGuard role="student">
                <ToastProvider>
                  <StudentArea />
                </ToastProvider>
              </RoleGuard>
            </Protected>
          }
        >
          <Route element={<StudentLayout />}>
            <Route path="/student" element={<StudentHome />} />
            <Route path="/study" element={<LessonsHub />} />
            <Route path="/lessons" element={<StudentLessons />} />
            <Route path="/lessons/topics/:topicId" element={<StudentTopicDetail />} />
            <Route path="/lessons/:id" element={<StudentLessonDetail />} />
            <Route path="/tests" element={<StudentTests />} />
            <Route path="/tests/:testId" element={<StudentTestTake />} />
            <Route path="/homework" element={<StudentHomework />} />
            <Route path="/videos" element={<StudentVideos />} />
            <Route path="/shop" element={<FeatureGuard feature="shop"><StudentShop /></FeatureGuard>} />
            <Route path="/leaderboard" element={<StudentLeaderboard />} />
            <Route path="/student/announcements" element={<StudentAnnouncements />} />
          </Route>
          {/* Чат — БЕЗ StudentLayout (запрос пользователя 21.08.2026: "chat
              to'liq ochilgan bo'lsin... full ekranga ochilsin, card bo'lmasin").
              Вне сайдбара/шапки — сам экран на весь вьюпорт, свой back. */}
          <Route path="/student/chat" element={<StudentChat />} />
        </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
       </ErrorBoundary>
  );
}
