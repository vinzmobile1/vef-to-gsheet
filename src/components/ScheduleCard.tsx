import React from "react";
import {
  Clock,
  Calendar,
  Zap,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  Sliders,
  ShieldAlert,
  Sun,
  Moon,
  RotateCw,
} from "lucide-react";
import { ScheduleConfig, WorkHoursStatus } from "../types";

interface ScheduleCardProps {
  scheduleConfig: ScheduleConfig;
  workHoursStatus: WorkHoursStatus;
  onUpdateSchedule: (updated: Partial<ScheduleConfig>) => void;
  onTriggerNow: () => void;
  isTriggering: boolean;
  onOpenSettings: () => void;
}

export const ScheduleCard: React.FC<ScheduleCardProps> = ({
  scheduleConfig,
  workHoursStatus,
  onUpdateSchedule,
  onTriggerNow,
  isTriggering,
  onOpenSettings,
}) => {
  const intervals = [
    { label: "Setiap 3 Jam", value: 3, badge: "Populer" },
    { label: "Setiap 6 Jam", value: 6, badge: "Rekomendasi" },
    { label: "Setiap 1 Jam", value: 1 },
    { label: "Setiap 12 Jam", value: 12 },
  ];

  const formatNextRun = (timestamp: number | null) => {
    if (!timestamp) return "-";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: scheduleConfig.timezone || "Asia/Jakarta",
    });
  };

  const formatLastRun = (timestamp: number | null) => {
    if (!timestamp) return "Belum pernah";
    const date = new Date(timestamp);
    return (
      date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: scheduleConfig.timezone || "Asia/Jakarta",
      }) + " WIB"
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              scheduleConfig.enabled
                ? "bg-indigo-50 text-indigo-600"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Penjadwalan Otomatis (Background Sync)
              </h2>
              {scheduleConfig.enabled ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Aktif
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Nonaktif
                </span>
              )}
            </div>
            <p className="text-xs text-slate-700">
              Tarik data berkala 3 atau 6 jam sekali dengan proteksi batas jam kerja
            </p>
          </div>
        </div>

        {/* Big Switch Toggle */}
        <div className="flex items-center gap-3">
          <button
            id="toggle-schedule-enabled"
            type="button"
            onClick={() => onUpdateSchedule({ enabled: !scheduleConfig.enabled })}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              scheduleConfig.enabled ? "bg-indigo-600" : "bg-slate-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                scheduleConfig.enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-xs font-semibold text-slate-700 select-none">
            {scheduleConfig.enabled ? "Jadwal Aktif" : "Jadwal Mati"}
          </span>
        </div>
      </div>

      {/* Interval Selector */}
      <div className="pt-5">
        <label className="block text-xs font-semibold text-slate-700 mb-2.5 uppercase tracking-wider">
          Frekuensi Tarik Data Otomatis
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {intervals.map((item) => {
            const isSelected = scheduleConfig.intervalHours === item.value;
            return (
              <button
                key={item.value}
                id={`btn-interval-${item.value}h`}
                type="button"
                onClick={() => onUpdateSchedule({ intervalHours: item.value })}
                className={`relative p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
                    : "bg-slate-50/60 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs sm:text-sm font-bold ${
                      isSelected ? "text-indigo-900" : "text-slate-800"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                        isSelected
                          ? "bg-indigo-200/80 text-indigo-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-700">
                  {item.value === 3
                    ? "Setiap 3 jam (otomatis)"
                    : item.value === 6
                    ? "Setiap 6 jam (otomatis)"
                    : `Interval ${item.value} jam`}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Automation Status & Metrics Bar */}
      <div className="mt-5 p-4 rounded-xl border bg-slate-50/80 border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                scheduleConfig.enabled
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  Penjadwalan Otomatis ({scheduleConfig.intervalHours} Jam)
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    scheduleConfig.enabled
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {scheduleConfig.enabled ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-0.5">
                {scheduleConfig.enabled
                  ? `Sistem mengekspor data otomatis setiap ${scheduleConfig.intervalHours} jam berdasarkan jadwal.`
                  : "Otomasi penarikan terjadwal sedang dimatikan."}
              </p>
            </div>
          </div>

          <button
            id="btn-edit-schedule-settings"
            type="button"
            onClick={onOpenSettings}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 shrink-0 self-start sm:self-center"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Pengaturan</span>
          </button>
        </div>

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-200/60 text-xs">
          <div>
            <span className="text-slate-600 block text-[11px]">Terakhir Sinkron</span>
            <span className="font-semibold text-slate-800">
              {formatLastRun(scheduleConfig.lastRunTimestamp)}
            </span>
          </div>
          <div>
            <span className="text-slate-600 block text-[11px]">Jadwal Selanjutnya</span>
            <span className="font-semibold text-slate-800">
              {scheduleConfig.enabled
                ? `${formatNextRun(scheduleConfig.nextRunTimestamp)} WIB`
                : "Jadwal Mati"}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
            <button
              id="btn-trigger-schedule-now"
              type="button"
              onClick={onTriggerNow}
              disabled={isTriggering}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isTriggering ? "animate-spin text-blue-600" : ""}`} />
              <span>Tes Tarik Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
