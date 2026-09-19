import React from "react";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { SyncLog } from "../types";

interface SyncLogsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: SyncLog[];
  onClearLogs: () => void;
  onRefreshLogs: () => void;
  isRefreshing: boolean;
}

export const SyncLogsDrawer: React.FC<SyncLogsDrawerProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  onRefreshLogs,
  isRefreshing,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Riwayat Sinkronisasi</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                  {logs.length}
                </span>
              </h2>
              <p className="text-xs text-slate-700">
                Aktivitas sinkronisasi data real-time manual & otomatis
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                id="btn-refresh-logs"
                onClick={onRefreshLogs}
                title="Muat ulang riwayat"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
              </button>
              <button
                id="btn-clear-logs"
                onClick={onClearLogs}
                title="Bersihkan riwayat"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Logs List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {logs.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Clock className="w-8 h-8 mb-2 stroke-1" />
                <p className="text-xs">Belum ada riwayat aktivitas sinkronisasi.</p>
              </div>
            ) : (
              logs.map((log) => {
                const isSuccess = log.status === "success";
                const dateObj = new Date(log.timestamp);
                const timeStr = dateObj.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });
                const dateStr = dateObj.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                });

                return (
                  <div
                    key={log.id}
                    className={`p-3.5 rounded-xl border text-xs transition-all ${
                      isSuccess
                        ? "bg-emerald-50/50 border-emerald-200/80 text-emerald-950"
                        : "bg-rose-50/50 border-rose-200/80 text-rose-950"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 font-semibold">
                        {isSuccess ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span className={isSuccess ? "text-emerald-900" : "text-rose-900"}>
                          {isSuccess ? "Sinkronisasi Berhasil" : "Sinkronisasi Gagal"}
                        </span>
                        {log.profileName && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-100/90 text-blue-800 rounded">
                            {log.profileName}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-600 font-mono">
                        {dateStr}, {timeStr}
                      </span>
                    </div>

                    <p className="text-slate-700 text-[11px] leading-relaxed mb-2">
                      {log.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1.5 border-t border-slate-200/60">
                      <span className="font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/80 border border-slate-200">
                        {log.type === "scheduled" ? "Otomatis" : "Manual"}
                      </span>
                      <div className="flex items-center gap-2">
                        {log.rowCount !== undefined && (
                          <span>{log.rowCount} baris</span>
                        )}
                        {log.durationMs !== undefined && (
                          <span>({(log.durationMs / 1000).toFixed(2)}s)</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
