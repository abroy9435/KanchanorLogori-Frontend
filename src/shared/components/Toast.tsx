import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

type Variant = "success" | "error" | "info";
type Toast = {
  id: string;
  message: string;
  variant?: Variant;
  duration?: number; // ms
};

type ToastCtx = {
  push: (t: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const toast: Toast = { id, duration: 2500, variant: "info", ...t };
    setToasts((prev) => [...prev, toast]);

    // auto-remove
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, toast.duration);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container (bottom) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[99999] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

function ToastCard({ toast }: { toast: Toast }) {
  const { variant = "info", message } = toast;
  const colors =
    variant === "success"
      ? "border-green-400/40 bg-green-500/10"
      : variant === "error"
      ? "border-red-400/40 bg-red-500/10"
      : "border-blue-400/40 bg-blue-500/10";

  const Icon =
    variant === "success" ? CheckCircle2 : variant === "error" ? AlertTriangle : Info;

  return (
    <div className={`pointer-events-auto w-max max-w-[90vw] rounded-xl border ${colors} px-3 py-2 shadow-lg backdrop-blur-sm`}>
      <div className="flex items-center gap-2 text-white">
        <Icon size={18} />
        <span className="text-sm leading-snug">{message}</span>
      </div>
    </div>
  );
}
