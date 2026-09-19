import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { NotificationItem } from "../types";

interface NotificationToastProps {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notifications,
  onDismiss,
}) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {notifications.map((item) => {
        const isSuccess = item.type === "success";
        const isError = item.type === "error";

        return (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border transition-all transform animate-in slide-in-from-bottom-3 duration-300 ${
              isSuccess
                ? "bg-white border-emerald-300 text-slate-800 ring-1 ring-emerald-500/10"
                : isError
                ? "bg-white border-rose-300 text-slate-800 ring-1 ring-rose-500/10"
                : "bg-white border-blue-300 text-slate-800"
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-600" />}
              {!isSuccess && !isError && <Info className="w-5 h-5 text-blue-600" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {item.title}
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                {item.message}
              </p>
              {item.rowCount !== undefined && (
                <div className="mt-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded w-fit">
                  {item.rowCount} baris diekspor
                </div>
              )}
            </div>

            <button
              onClick={() => onDismiss(item.id)}
              className="shrink-0 text-slate-400 hover:text-slate-600 p-1 rounded-md transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
