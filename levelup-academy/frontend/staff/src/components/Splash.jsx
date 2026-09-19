// стартовый экран: логотип по центру
export default function Splash() {
  return (
    <div className="min-h-screen grid place-items-center bg-base-200">
      <div className="flex flex-col items-center gap-6">
        <img src="/logo-primary.svg" alt="LevelUp Academy" className="h-11 w-auto animate-pulse" />
        <span className="loading loading-dots loading-md text-base-content/40" />
      </div>
    </div>
  );
}
