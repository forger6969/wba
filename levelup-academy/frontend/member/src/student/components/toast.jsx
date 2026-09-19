import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

const ToastCtx = createContext(() => {});

const TONE = {
  success: { cls: 'bg-success text-success-content', Icon: CheckCircle2 },
  error: { cls: 'bg-error text-error-content', Icon: XCircle },
  info: { cls: 'bg-neutral text-neutral-content', Icon: Info },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const push = useCallback((message, type = 'info') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2.5 max-w-[min(92vw,360px)]">
        {toasts.map((t) => {
          const { cls, Icon } = TONE[t.type] ?? TONE.info;
          return (
            <div
              key={t.id}
              className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg animate-slide-up ${cls}`}
              role="status"
            >
              <Icon size={17} className="shrink-0 mt-0.5" />
              <span className="min-w-0">{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
