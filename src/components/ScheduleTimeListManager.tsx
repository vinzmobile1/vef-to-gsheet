import React, { useState } from "react";
import { Clock, Plus, X, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";

interface ScheduleTimeListManagerProps {
  scheduleTimes: string[];
  onChange: (times: string[]) => void;
  nextRunTimeStr?: string;
  disabled?: boolean;
}

// Normalizer for "09.00", "9:00", "14:00" -> "09:00"
function cleanTimeInput(val: string): string | null {
  if (!val) return null;
  const str = val.trim().replace(".", ":");
  const match = str.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h >= 0 && h < 24 && m >= 0 && m < 60) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return null;
}

export const ScheduleTimeListManager: React.FC<ScheduleTimeListManagerProps> = ({
  scheduleTimes,
  onChange,
  nextRunTimeStr,
  disabled = false,
}) => {
  const [inputVal, setInputVal] = useState("09:00");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const times = Array.isArray(scheduleTimes) && scheduleTimes.length > 0
    ? scheduleTimes
    : ["09:00", "14:00", "17:00"];

  const handleAddTime = (rawTime?: string) => {
    const target = rawTime || inputVal;
    const normalized = cleanTimeInput(target);
    if (!normalized) {
      setErrorMsg(`Format jam tidak valid: "${target}". Gunakan format JJ:MM atau JJ.MM (contoh: 09:00 atau 14.00)`);
      return;
    }
    setErrorMsg(null);

    if (times.includes(normalized)) {
      setErrorMsg(`Jam ${normalized} WIB sudah ada di dalam daftar jadwal.`);
      return;
    }

    const updated = [...times, normalized].sort((a, b) => {
      const [ah, am] = a.split(":").map(Number);
      const [bh, bm] = b.split(":").map(Number);
      return ah * 60 + am - (bh * 60 + bm);
    });

    onChange(updated);
    setInputVal("");
  };

  const handleRemoveTime = (timeToRemove: string) => {
    if (disabled) return;
    if (times.length <= 1) {
      setErrorMsg("Minimal harus ada 1 jam jadwal yang tersimpan.");
      return;
    }
    setErrorMsg(null);
    onChange(times.filter((t) => t !== timeToRemove));
  };

  const handleApplyPreset = (presetTimes: string[]) => {
    if (disabled) return;
    setErrorMsg(null);
    onChange(presetTimes);
  };

  return (
    <div className="space-y-4">
      {/* Timezone & Next Run Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs">
        <div className="flex items-center gap-2 text-indigo-900 font-semibold">
          <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Zona Waktu Jadwal: Asia/Jakarta (GMT+7 WIB)</span>
        </div>
        {nextRunTimeStr && (
          <div className="flex items-center gap-1.5 text-indigo-700 bg-white/90 px-2.5 py-1 rounded-lg border border-indigo-200/80 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ekspor Berikutnya: <b>{nextRunTimeStr}</b></span>
          </div>
        )}
      </div>

      {/* Input row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            disabled={disabled}
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTime();
              }
            }}
            placeholder="Contoh: 09.00, 14:00, atau 17:00"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        <button
          type="button"
          disabled={disabled || !inputVal.trim()}
          onClick={() => handleAddTime()}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Jam</span>
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Active Scheduled Times List (Chips) */}
      <div>
        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
          Daftar Jam Penarikan Otomatis Aktif ({times.length} Waktu):
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {times.map((timeStr) => (
            <div
              key={timeStr}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 text-blue-900 rounded-xl text-xs font-mono font-bold shadow-xs hover:border-blue-300 transition group"
            >
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{timeStr} WIB</span>
              {!disabled && (
                <button
                  type="button"
                  title={`Hapus jam ${timeStr}`}
                  onClick={() => handleRemoveTime(timeStr)}
                  className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Presets for convenience */}
      {!disabled && (
        <div className="pt-2 border-t border-slate-100">
          <div className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Pilihan Cepat Template Jam (1x Klik):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleApplyPreset(["09:00", "14:00", "17:00"])}
              className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 rounded-lg text-slate-700 transition"
            >
              09:00, 14:00, 17:00 (Pagi, Siang, Sore)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(["08:00", "12:00", "16:00", "20:00"])}
              className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 rounded-lg text-slate-700 transition"
            >
              4x Sehari (08:00, 12:00, 16:00, 20:00)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(["10:00", "16:00"])}
              className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 rounded-lg text-slate-700 transition"
            >
              2x Sehari (10:00, 16:00)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"])}
              className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 rounded-lg text-slate-700 transition"
            >
              Setiap 2 Jam Kerja (08.00 - 18.00)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
